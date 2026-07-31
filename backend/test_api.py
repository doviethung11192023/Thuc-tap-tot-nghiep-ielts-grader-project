from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    print("--- STARTING API PENTEST ---")
    
    # Test 1: Access without token
    print("\n[Test 1] GET /api/v1/essays without token")
    response = client.get("/api/v1/essays")
    print(f"Status: {response.status_code}")
    assert response.status_code == 403 or response.status_code == 401 # HTTPBearer might return 403 or 401
    print("✓ PASSED (Access denied as expected)")

    # Test 2: Access with student token
    print("\n[Test 2] GET /api/v1/essays with STUDENT token")
    response = client.get("/api/v1/essays", headers={"Authorization": "Bearer student_token"})
    print(f"Status: {response.status_code}")
    assert response.status_code == 200
    print("✓ PASSED (Access granted to student)")

    # Test 3: Student tries to create topic (Admin only)
    print("\n[Test 3] POST /api/v1/topics with STUDENT token (Privilege Escalation attempt)")
    response = client.post("/api/v1/topics", headers={"Authorization": "Bearer student_token"}, json={
        "title": "Hacked", "description": "", "prompt_content": "A", "task_type": "task2", "difficulty": "easy", "category": "A"
    })
    print(f"Status: {response.status_code}")
    assert response.status_code == 403
    print("✓ PASSED (Student blocked from admin route)")

    # Test 4: Admin creates topic
    print("\n[Test 4] POST /api/v1/topics with ADMIN token")
    response = client.post("/api/v1/topics", headers={"Authorization": "Bearer admin_token"}, json={
        "title": "Legit Topic", "description": "Desc", "prompt_content": "Prompt", "task_type": "task2", "difficulty": "easy", "category": "A"
    })
    print(f"Status: {response.status_code}")
    assert response.status_code == 201
    print("✓ PASSED (Admin allowed)")

    # Test 5: Submit essay with < 50 words (Validation Check)
    print("\n[Test 5] POST /api/v1/essays/evaluate with invalid content (< 50 words)")
    short_content = "This is way too short."
    response = client.post("/api/v1/essays/evaluate", headers={"Authorization": "Bearer student_token"}, json={
        "content": short_content,
        "task_type": "task2"
    })
    print(f"Status: {response.status_code}")
    assert response.status_code == 422
    print("✓ PASSED (Validation blocked short essay)")

    # Test 6: Submit valid essay
    print("\n[Test 6] POST /api/v1/essays/evaluate with VALID content (>= 50 words)")
    valid_content = "Word " * 55
    response = client.post("/api/v1/essays/evaluate", headers={"Authorization": "Bearer student_token"}, json={
        "content": valid_content,
        "task_type": "task2"
    })
    print(f"Status: {response.status_code}")
    assert response.status_code == 202
    print("✓ PASSED (Essay accepted)")
    
    print("\n--- ALL TESTS PASSED SUCCESSFULLY ---")

if __name__ == "__main__":
    run_tests()
