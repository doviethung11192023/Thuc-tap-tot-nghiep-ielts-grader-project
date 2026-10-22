import asyncio
import httpx
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from jose import jwt
from datetime import datetime, timedelta

JWT_SECRET = "peozqycguicekozognbbpeozqycguicekozognbbPeOzQyCgUiCeKoZoGnBb"
BASE_URL = "http://127.0.0.1:8000"

def create_mock_jwt(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": "authenticated",
        "app_metadata": {"role": role},
        "user_metadata": {"full_name": f"Test {role.capitalize()}"},
        "exp": datetime.utcnow() + timedelta(hours=2)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def run_tests():
    from app.db.supabase import supabase

    print("=== [1] LAY THONG TIN TAI KHOAN ADMIN SAN CO ===")
    admin_users = supabase.table("users").select("*").eq("role", "admin").limit(1).execute()
    if not admin_users.data:
        print("ERROR: Khong tim thay admin trong DB")
        return
    admin_user = admin_users.data[0]
    admin_id = admin_user["id"]
    admin_email = admin_user["email"]
    print(f"Admin: {admin_email} (ID: {admin_id})")

    admin_token = create_mock_jwt(admin_id, admin_email, "admin")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        # TEST 1: GET /api/v1/users/me (Admin)
        print("\n--- TEST 1: GET /api/v1/users/me (Admin) ---")
        res = await client.get("/api/v1/users/me", headers=admin_headers)
        print("Status:", res.status_code)
        assert res.status_code == 200, res.text
        print("Profile:", res.json())

        # TEST 2: PUT /api/v1/users/me (Voice Consent & Update)
        print("\n--- TEST 2: PUT /api/v1/users/me (Voice Consent) ---")
        res = await client.put("/api/v1/users/me", json={"full_name": "Admin System", "voice_consent": True}, headers=admin_headers)
        print("Status:", res.status_code)
        assert res.status_code == 200, res.text
        print("Updated:", res.json()["data"]["voice_consent_at"])

        # TEST 3: PUT & GET /api/v1/users/me/goals (Learner Goals UC-05)
        print("\n--- TEST 3: PUT & GET /api/v1/users/me/goals (UC-05) ---")
        goals_payload = {
            "target_overall": 7.5,
            "target_listening": 8.0,
            "target_reading": 7.5,
            "target_writing": 7.0,
            "target_speaking": 7.5,
            "test_date": "2026-12-31"
        }
        res = await client.put("/api/v1/users/me/goals", json=goals_payload, headers=admin_headers)
        print("PUT Goals Status:", res.status_code)
        assert res.status_code == 200, res.text

        res = await client.get("/api/v1/users/me/goals", headers=admin_headers)
        print("GET Goals Status:", res.status_code)
        assert res.status_code == 200, res.text
        print("Goals data:", res.json()["data"])
        assert res.json()["data"]["target_overall"] == 7.5

        # TEST 4: Invalid Band Score Validation (e.g. 7.3)
        print("\n--- TEST 4: Invalid Band Score (7.3) Expect 422 ---")
        invalid_res = await client.put("/api/v1/users/me/goals", json={"target_overall": 7.3}, headers=admin_headers)
        print("Invalid Band Status:", invalid_res.status_code)
        assert invalid_res.status_code == 422, invalid_res.text
        print("Validation error caught successfully!")

        # TEST 5: Admin POST /api/v1/admin/experts (Create Expert UC-19, FR-03)
        print("\n--- TEST 5: POST /api/v1/admin/experts (UC-19) ---")
        import random
        random_suffix = random.randint(1000, 9999)
        expert_email = f"expert_{random_suffix}@ieltsgrader.edu.vn"
        expert_create_payload = {
            "email": expert_email,
            "full_name": f"Teacher Expert {random_suffix}",
            "bio": "IELTS Examiner Certified, 8.5 Overall",
            "max_active_reviews": 7
        }
        res = await client.post("/api/v1/admin/experts", json=expert_create_payload, headers=admin_headers)
        print("Create Expert Status:", res.status_code)
        assert res.status_code == 201, res.text
        expert_resp_data = res.json()["data"]
        expert_id = expert_resp_data["id"]
        print("Created Expert:", expert_resp_data["email"], "ID:", expert_id, "is_activated:", expert_resp_data.get("is_activated"))
        assert expert_resp_data.get("is_activated") == False, "New expert must be unactivated initially"

        # TEST 5A_RESEND: Admin resends invite email
        print("\n--- TEST 5A_RESEND: POST /api/v1/admin/users/{user_id}/resend-invite ---")
        res_resend = await client.post(f"/api/v1/admin/users/{expert_id}/resend-invite", headers=admin_headers)
        print("Resend Invite Status:", res_resend.status_code)
        assert res_resend.status_code == 200, res_resend.text
        resend_json = res_resend.json()
        print("Resend response:", resend_json["meta"]["message"], "email_sent:", resend_json["data"].get("email_sent"), "setup_link present:", bool(resend_json["data"].get("setup_link")))
        assert "setup_link" in resend_json["data"] or resend_json["data"].get("email_sent") is not None

        # TEST 5B: Admin POST /api/v1/admin/admins (Create / Promote Admin UC-19)
        print("\n--- TEST 5B: POST /api/v1/admin/admins (UC-19) ---")
        new_admin_email = f"co_admin_{random_suffix}@ieltsgrader.edu.vn"
        admin_create_payload = {
            "email": new_admin_email,
            "full_name": f"Co-Admin Manager {random_suffix}"
        }
        res_admin = await client.post("/api/v1/admin/admins", json=admin_create_payload, headers=admin_headers)
        print("Create Admin Status:", res_admin.status_code)
        assert res_admin.status_code == 201, res_admin.text
        new_admin_data = res_admin.json()["data"]
        new_admin_id = new_admin_data["id"]
        print("Created Admin:", new_admin_data["email"], "Role:", new_admin_data["role"], "is_activated:", new_admin_data.get("is_activated"))
        assert new_admin_data["role"] == "admin"
        assert new_admin_data.get("is_activated") == False

        # TEST 5C: Duplicate Admin Creation Expect 400
        print("\n--- TEST 5C: Duplicate Admin Creation Expect 400 ---")
        dup_res = await client.post("/api/v1/admin/admins", json=admin_create_payload, headers=admin_headers)
        print("Duplicate Admin Status:", dup_res.status_code)
        assert dup_res.status_code == 400, dup_res.text
        print("Duplicate Admin correctly rejected with 400!")

        # TEST 5D: Newly created Admin can call Admin endpoints
        print("\n--- TEST 5D: Newly created Admin accesses Admin Endpoints ---")
        new_admin_token = create_mock_jwt(new_admin_id, new_admin_email, "admin")
        new_admin_headers = {"Authorization": f"Bearer {new_admin_token}"}
        res_verify = await client.get("/api/v1/admin/users", params={"role": "admin"}, headers=new_admin_headers)
        print("New Admin listing users -> Status:", res_verify.status_code)
        assert res_verify.status_code == 200, res_verify.text
        print("New Admin verified successfully!")

        # TEST 6: GET /api/v1/admin/users with role filter (UC-19)
        print("\n--- TEST 6: GET /api/v1/admin/users?role=expert ---")
        res = await client.get("/api/v1/admin/users", params={"role": "expert"}, headers=admin_headers)
        print("List Experts Status:", res.status_code)
        assert res.status_code == 200, res.text
        experts_list = res.json()["data"]["items"]
        print(f"Total Experts found: {len(experts_list)}")
        assert any(e["id"] == expert_id for e in experts_list), "Expert not found in list"

        # TEST 6B: Activate User Account (POST /api/v1/users/me/activate)
        print("\n--- TEST 6B: POST /api/v1/users/me/activate ---")
        expert_token = create_mock_jwt(expert_id, expert_email, "expert")
        expert_headers = {"Authorization": f"Bearer {expert_token}"}
        res_activate = await client.post("/api/v1/users/me/activate", headers=expert_headers)
        print("Activate Status:", res_activate.status_code)
        # Verify user is now activated via /api/v1/users/me
        res_me = await client.get("/api/v1/users/me", headers=expert_headers)
        assert res_me.status_code == 200
        assert res_me.json()["is_activated"] == True
        print("Expert activation verified successfully: is_activated=True!")

        # TEST 7: Expert endpoints (GET /expert/me, PATCH /expert/me/availability - UC-14)
        print("\n--- TEST 7: Expert Endpoints (UC-14) ---")
        res = await client.get("/api/v1/expert/me", headers=expert_headers)
        print("GET /expert/me Status:", res.status_code)
        assert res.status_code == 200, res.text
        print("Expert Profile:", res.json())
        assert res.json()["is_available"] == False

        res = await client.patch("/api/v1/expert/me/availability", json={"is_available": True, "max_active_reviews": 10}, headers=expert_headers)
        print("PATCH /expert/me/availability Status:", res.status_code)
        assert res.status_code == 200, res.text
        assert res.json()["is_available"] == True
        assert res.json()["max_active_reviews"] == 10
        print("Availability updated to True!")

        # TEST 8: RBAC Security Gate Checks
        print("\n--- TEST 8: RBAC Security Restrictions ---")
        # Learner trying to access Admin endpoints
        student_user = supabase.table("users").select("*").eq("role", "student").limit(1).execute()
        if student_user.data:
            student_id = student_user.data[0]["id"]
            student_email = student_user.data[0]["email"]
            student_token = create_mock_jwt(student_id, student_email, "student")
            student_headers = {"Authorization": f"Bearer {student_token}"}

            # Student tries to call admin endpoint -> 403
            res = await client.get("/api/v1/admin/users", headers=student_headers)
            print("Student accessing Admin users -> Status:", res.status_code)
            assert res.status_code == 403, "Expected 403 for student"

            # Student tries to call expert endpoint -> 403
            res = await client.get("/api/v1/expert/me", headers=student_headers)
            print("Student accessing Expert me -> Status:", res.status_code)
            assert res.status_code == 403, "Expected 403 for student"

            # Expert tries to call admin endpoint -> 403
            res = await client.get("/api/v1/admin/users", headers=expert_headers)
            print("Expert accessing Admin users -> Status:", res.status_code)
            assert res.status_code == 403, "Expected 403 for expert"

            print("All RBAC Gates passed with strict 403 Forbidden!")

        # TEST 9: Lock/Unlock Account & Audit Log (UC-19)
        print("\n--- TEST 9: Lock/Unlock Account & Audit Log ---")
        lock_res = await client.put(f"/api/v1/admin/users/{expert_id}/status", json={"is_active": False, "reason": "Test suspension"}, headers=admin_headers)
        print("Lock Status:", lock_res.status_code)
        assert lock_res.status_code == 200

        # Verify locked user cannot make requests (403 Inactive user)
        locked_test_res = await client.get("/api/v1/expert/me", headers=expert_headers)
        print("Locked user calling API -> Status:", locked_test_res.status_code)
        assert locked_test_res.status_code == 403, f"Expected 403 but got {locked_test_res.status_code}"

        # Unlock user
        unlock_res = await client.put(f"/api/v1/admin/users/{expert_id}/status", json={"is_active": True}, headers=admin_headers)
        print("Unlock Status:", unlock_res.status_code)
        assert unlock_res.status_code == 200

        # Check audit log
        logs_res = supabase.table("audit_logs").select("*").eq("entity_id", expert_id).execute()
        print(f"Audit logs recorded for expert {expert_id}: {len(logs_res.data)}")
        assert len(logs_res.data) >= 2, "Expected audit logs for create and lock/unlock"

    print("\n========================================================")
    print(">>> 100% TAT CA CAC TEST CHO 3 ROLES HOAN TOAN THANH CONG! <<<")
    print("========================================================")

if __name__ == "__main__":
    asyncio.run(run_tests())
