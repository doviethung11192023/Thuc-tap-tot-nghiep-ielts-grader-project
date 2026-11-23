import pytest
import uuid
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

def test_admin_test_sets_crud_and_bulk():
    app.dependency_overrides[require_admin] = lambda: mock_admin

    try:
        # 1. List test sets
        res = client.get("/api/v1/admin/test-sets")
        assert res.status_code == 200
        data = res.json()["data"]
        assert "items" in data
        assert "total" in data

        # 2. Create a test set
        test_set_name = f"Pytest Suite Set {uuid.uuid4().hex[:6]}"
        create_res = client.post(
            "/api/v1/admin/test-sets",
            json={"name": test_set_name, "description": "Automated test set"}
        )
        assert create_res.status_code in [200, 201]
        new_set = create_res.json()["data"]
        new_set_id = new_set["id"]
        assert new_set["name"] == test_set_name

        # 3. Rename the test set
        updated_name = f"{test_set_name} Renamed"
        rename_res = client.put(
            f"/api/v1/admin/test-sets/{new_set_id}",
            json={"name": updated_name}
        )
        assert rename_res.status_code == 200
        assert rename_res.json()["data"]["name"] == updated_name

        # 4. Bulk assign test endpoint with empty list (should be 400)
        empty_bulk = client.post(
            "/api/v1/admin/tests/bulk-assign-set",
            json={"test_ids": [], "test_set_id": new_set_id}
        )
        assert empty_bulk.status_code == 400

        # 5. Bulk assign with valid UUID list
        bulk_res = client.post(
            "/api/v1/admin/tests/bulk-assign-set",
            json={"test_ids": [str(uuid.uuid4())], "test_set_id": new_set_id}
        )
        assert bulk_res.status_code == 200

        # 5. Delete the test set
        del_res = client.delete(f"/api/v1/admin/test-sets/{new_set_id}")
        assert del_res.status_code == 200

    finally:
        app.dependency_overrides.clear()
