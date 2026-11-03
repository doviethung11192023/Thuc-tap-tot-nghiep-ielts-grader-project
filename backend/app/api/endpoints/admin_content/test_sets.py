import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.core.security import require_admin, User
from app.db.supabase import db
from app.services.cms.cms_tests import db_error

router = APIRouter()

class TestSetCreatePayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)

class TestSetUpdatePayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)

class BulkAssignSetPayload(BaseModel):
    test_ids: List[str]
    test_set_id: Optional[str] = None

@router.get("/test-sets")
async def list_admin_test_sets(current_user: User = Depends(require_admin)):
    """Danh sách tất cả bộ đề thi trong hệ thống kèm thống kê bài thi và kỹ năng."""
    sets_res = db().table("test_sets").select("*").order("created_at", desc=True).execute()
    test_sets = sets_res.data or []

    tests_res = db().table("tests").select("id, skill, status, test_set_id").execute()
    all_tests = tests_res.data or []

    tests_by_set: Dict[str, List[Dict[str, Any]]] = {}
    standalone_count = 0
    for t in all_tests:
        sid = t.get("test_set_id")
        if sid:
            tests_by_set.setdefault(sid, []).append(t)
        else:
            standalone_count += 1

    result = []
    for s in test_sets:
        sid = s["id"]
        assigned = tests_by_set.get(sid, [])
        skills = sorted(list({str(t.get("skill", "")).capitalize() for t in assigned if t.get("skill")}))
        published_count = sum(1 for t in assigned if t.get("status") == "published")
        result.append({
            "id": sid,
            "name": s["name"],
            "created_at": s.get("created_at"),
            "total_tests": len(assigned),
            "published_tests": published_count,
            "skills": skills,
        })

    return {
        "meta": {"code": 200},
        "data": {
            "items": result,
            "total": len(result),
            "standalone_tests_count": standalone_count
        }
    }

@router.post("/test-sets", status_code=status.HTTP_201_CREATED)
async def create_admin_test_set(
    payload: TestSetCreatePayload,
    current_user: User = Depends(require_admin)
):
    """Tạo mới một bộ đề thi."""
    name_clean = payload.name.strip()
    existing = db().table("test_sets").select("id").ilike("name", name_clean).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail=f"Bộ đề thi '{name_clean}' đã tồn tại")

    insert_data = {"name": name_clean, "status": "published"}   # bộ đề Mock: tối đa 1 đề / kỹ năng (FR-36)
    res = db().table("test_sets").insert(insert_data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Không thể tạo bộ đề thi trong database")

    return {
        "meta": {"code": 201, "message": "Tạo bộ đề thi thành công"},
        "data": res.data[0]
    }

@router.put("/test-sets/{set_id}")
async def update_admin_test_set(
    set_id: str,
    payload: TestSetUpdatePayload,
    current_user: User = Depends(require_admin)
):
    """Cập nhật tên bộ đề thi."""
    try:
        uuid.UUID(set_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Mã bộ đề thi không hợp lệ (UUID)")

    name_clean = payload.name.strip()
    res = db().table("test_sets").update({"name": name_clean}).eq("id", set_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy bộ đề thi để cập nhật")

    return {
        "meta": {"code": 200, "message": "Cập nhật bộ đề thi thành công"},
        "data": res.data[0]
    }

@router.delete("/test-sets/{set_id}")
async def delete_admin_test_set(
    set_id: str,
    current_user: User = Depends(require_admin)
):
    """Xóa bộ đề thi và tự động gỡ liên kết các bài thi an toàn."""
    try:
        uuid.UUID(set_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Mã bộ đề thi không hợp lệ (UUID)")

    # 1. Unlink tests (đề archived bị trigger BR-10 khoá, không gỡ được khỏi bộ)
    try:
        db().table("tests").update({"test_set_id": None}).eq("test_set_id", set_id).execute()
    except Exception as e:
        err = db_error(e)
        if err.status_code == 409:
            err.detail = "Bộ đề còn chứa đề đã lưu trữ nên không gỡ được khỏi bộ để xoá (BR-10)"
        raise err

    # 2. Delete set
    res = db().table("test_sets").delete().eq("id", set_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy bộ đề thi để xóa")

    return {
        "meta": {"code": 200, "message": "Xóa bộ đề thành công. Các bài thi đã được chuyển về dạng độc lập."}
    }

@router.post("/tests/bulk-assign-set")
async def bulk_assign_tests_to_set(
    payload: BulkAssignSetPayload,
    current_user: User = Depends(require_admin)
):
    """Gán hoặc gỡ hàng loạt bài thi vào/khỏi một bộ đề."""
    if not payload.test_ids:
        raise HTTPException(status_code=400, detail="Danh sách bài thi không được để trống")

    target_set_id = payload.test_set_id
    if target_set_id:
        try:
            uuid.UUID(target_set_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Mã bộ đề đích không hợp lệ")

    updated_count = 0
    for tid in payload.test_ids:
        try:
            u_res = db().table("tests").update({"test_set_id": target_set_id}).eq("id", tid).execute()
        except Exception as e:
            raise db_error(e)
        if u_res.data:
            updated_count += len(u_res.data)

    action_label = "Gán bài thi vào bộ đề" if target_set_id else "Gỡ bài thi khỏi bộ đề"
    return {
        "meta": {"code": 200, "message": f"{action_label} thành công ({updated_count} bài thi)"},
        "data": {"updated_count": updated_count, "test_set_id": target_set_id}
    }
