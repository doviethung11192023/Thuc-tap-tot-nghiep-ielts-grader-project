import pytest
import io
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import require_admin, User

client = TestClient(app)

mock_admin = User(
    id="00000000-0000-0000-0000-000000000001",
    email="admin@test.com",
    role="admin",
    full_name="Admin Tester"
)

mock_student = User(
    id="00000000-0000-0000-0000-000000000002",
    email="student@test.com",
    role="student",
    full_name="Student Tester"
)

def test_admin_rbac_protection():
    # Without override, should return 401 or 403
    response = client.get("/api/v1/admin/tests")
    assert response.status_code in [401, 403]

def test_admin_content_flow():
    # Override auth dependency with admin user
    app.dependency_overrides[require_admin] = lambda: mock_admin

    try:
        # 1. Test listing tests
        res = client.get("/api/v1/admin/tests?page=1&limit=10")
        assert res.status_code == 200
        assert "items" in res.json()["data"]

        # 2. Test listing test sets
        res = client.get("/api/v1/admin/test-sets")
        assert res.status_code == 200

        # 3. Test core band conversions
        res = client.get("/api/v1/admin/core/band-conversions")
        assert res.status_code == 200

        # 4. Test core settings
        res = client.get("/api/v1/admin/core/settings")
        assert res.status_code == 200

        # 5. Test Media Upload (Cloudflare R2 service with fallback)
        dummy_audio = io.BytesIO(b"ID3\x03\x00\x00\x00\x00\x00#TSSE\x00\x00\x00\x0f\x00\x00\x03Lavf58.29.100")
        res = client.post(
            "/api/v1/admin/media/upload",
            files={"file": ("test_sample.mp3", dummy_audio, "audio/mpeg")},
            data={"folder": "audio/listening"}
        )
        assert res.status_code == 201
        data = res.json()["data"]
        assert "key" in data
        assert "url" in data

    finally:
        app.dependency_overrides.clear()

if __name__ == "__main__":
    test_admin_rbac_protection()
    test_admin_content_flow()
    print("All E2E Admin Content tests passed successfully!")
