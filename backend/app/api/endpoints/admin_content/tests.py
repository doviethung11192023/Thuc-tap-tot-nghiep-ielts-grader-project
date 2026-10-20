from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from app.core.security import require_admin, User
from app.db.supabase import supabase
from app.schemas.exam_content import (
    TestSetCreate, TestSetResponse,
    TestCreate, TestUpdate, TestStatusUpdate, TestResponse,
    SkillType, ContentStatus, AllowedMode
)

router = APIRouter()

# --- Test Sets (Bộ Đề Thi) ---
@router.get("/test-sets")
async def list_test_sets(current_user: User = Depends(require_admin)):
    """Danh sách các bộ đề thi (Cambridge, Actual Tests...)."""
    res = supabase.table("test_sets").select("*").order("created_at", desc=True).execute()
    return {"meta": {"code": 200}, "data": res.data or []}

@router.post("/test-sets", status_code=status.HTTP_201_CREATED)
async def create_test_set(
    data: TestSetCreate,
    current_user: User = Depends(require_admin)
):
    """Tạo bộ đề thi mới."""
    payload = {"name": data.name.strip(), "created_by": str(current_user.id)}
    res = supabase.table("test_sets").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Không thể tạo bộ đề thi")
    return {"meta": {"code": 201, "message": "Tạo bộ đề thành công"}, "data": res.data[0]}

# --- Tests (Bài Thi) ---
@router.get("/tests")
async def list_tests(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    skill: Optional[SkillType] = None,
    status_filter: Optional[ContentStatus] = Query(None, alias="status"),
    allowed_mode: Optional[AllowedMode] = None,
    test_set_id: Optional[str] = None,
    sort_by: Optional[str] = Query("newest"),
    search: Optional[str] = None,
    current_user: User = Depends(require_admin)
):
    """Danh sách bài thi phân trang, lọc theo kỹ năng, trạng thái, bộ đề và sắp xếp."""
    offset = (page - 1) * limit
    query = supabase.table("tests").select("*, test_sets(id, name)", count="exact")

    if skill: query = query.eq("skill", skill.value)
    if status_filter: query = query.eq("status", status_filter.value)
    if allowed_mode: query = query.eq("allowed_mode", allowed_mode.value)
    if test_set_id: query = query.eq("test_set_id", test_set_id)
    if search and search.strip(): query = query.ilike("title", f"%{search.strip()}%")

    if sort_by == "oldest": query = query.order("created_at", desc=False)
    elif sort_by == "title_asc": query = query.order("title", desc=False)
    elif sort_by == "title_desc": query = query.order("title", desc=True)
    elif sort_by == "duration_desc": query = query.order("duration_min", desc=True)
    else: query = query.order("created_at", desc=True)

    res = query.range(offset, offset + limit - 1).execute()
    return {
        "meta": {"code": 200},
        "data": {
            "items": res.data or [],
            "total": res.count if hasattr(res, 'count') and res.count is not None else len(res.data or [])
        }
    }

@router.post("/tests", status_code=status.HTTP_201_CREATED)
async def create_test(
    test_data: TestCreate,
    current_user: User = Depends(require_admin)
):
    """Tạo bài thi mới (Reading, Listening, Writing, Speaking)."""
    payload = {
        "title": test_data.title.strip(),
        "skill": test_data.skill.value,
        "test_set_id": test_data.test_set_id,
        "allowed_mode": test_data.allowed_mode.value,
        "status": test_data.status.value,
        "duration_min": test_data.duration_min,
        "origin": test_data.origin.value,
        "source_name": test_data.source_name,
        "source_url": test_data.source_url,
        "license": test_data.license,
        "created_by": str(current_user.id)
    }
    if test_data.status == ContentStatus.PUBLISHED:
        payload["reviewed_by"] = str(current_user.id)
        payload["reviewed_at"] = datetime.utcnow().isoformat()

    res = supabase.table("tests").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Không thể tạo bài thi")
    return {"meta": {"code": 201, "message": "Tạo bài thi thành công"}, "data": res.data[0]}

@router.get("/tests/{test_id}")
async def get_test_detail(
    test_id: str,
    current_user: User = Depends(require_admin)
):
    """Xem chi tiết bài thi bao gồm sections, question groups, questions và answer keys."""
    test_res = supabase.table("tests").select("*, test_sets(id, name)").eq("id", test_id).execute()
    if not test_res.data:
        raise HTTPException(status_code=404, detail="Bài thi không tồn tại")
    
    test_info = test_res.data[0]
    
    # Lấy sections của test
    sec_res = supabase.table("test_sections").select("*").eq("test_id", test_id).order("order_no").execute()
    sections = sec_res.data or []

    # Với mỗi section, lấy các nhóm câu hỏi và câu hỏi
    for sec in sections:
        grp_res = supabase.table("question_groups").select("*").eq("section_id", sec["id"]).order("order_no").execute()
        groups = grp_res.data or []
        for grp in groups:
            q_res = supabase.table("questions").select("*, question_answer_keys(*)").eq("group_id", grp["id"]).order("number").execute()
            q_list = q_res.data or []
            for q in q_list:
                ak = q.get("question_answer_keys")
                if isinstance(ak, dict):
                    q["question_answer_keys"] = [ak]
                elif ak is None:
                    q["question_answer_keys"] = []
            grp["questions"] = q_list
        sec["question_groups"] = groups

    test_info["sections"] = sections
    return {"meta": {"code": 200}, "data": test_info}

@router.put("/tests/{test_id}")
async def update_test(
    test_id: str,
    update_data: TestUpdate,
    current_user: User = Depends(require_admin)
):
    """Cập nhật thông tin bài thi."""
    payload = {k: v.value if hasattr(v, 'value') else v for k, v in update_data.model_dump(exclude_unset=True).items()}
    if not payload:
        raise HTTPException(status_code=400, detail="Không có dữ liệu cập nhật")

    if payload.get("status") == ContentStatus.PUBLISHED.value:
        payload["reviewed_by"] = str(current_user.id)
        payload["reviewed_at"] = datetime.utcnow().isoformat()

    res = supabase.table("tests").update(payload).eq("id", test_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Bài thi không tồn tại")
    return {"meta": {"code": 200, "message": "Cập nhật bài thi thành công"}, "data": res.data[0]}

@router.patch("/tests/{test_id}/status")
async def update_test_status(
    test_id: str,
    status_data: TestStatusUpdate,
    current_user: User = Depends(require_admin)
):
    """Chuyển đổi trạng thái bài thi: draft -> published / archived."""
    payload = {"status": status_data.status.value}
    if status_data.status == ContentStatus.PUBLISHED:
        payload["reviewed_by"] = str(current_user.id)
        payload["reviewed_at"] = datetime.utcnow().isoformat()

    res = supabase.table("tests").update(payload).eq("id", test_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Bài thi không tồn tại")
    return {"meta": {"code": 200, "message": f"Đã cập nhật trạng thái sang {status_data.status.value}"}, "data": res.data[0]}

@router.delete("/tests/{test_id}")
async def delete_test(
    test_id: str,
    current_user: User = Depends(require_admin)
):
    """Xóa bài thi và các phần nội dung phụ thuộc."""
    res = supabase.table("tests").delete().eq("id", test_id).execute()
    return {"meta": {"code": 200, "message": "Xóa bài thi thành công"}}

class BulkStatusRequest(BaseModel):
    test_ids: List[str]
    status: ContentStatus

@router.post("/tests/bulk-status")
async def bulk_update_status(data: BulkStatusRequest, current_user: User = Depends(require_admin)):
    """Cập nhật trạng thái cho nhiều bài thi cùng lúc."""
    if not data.test_ids: raise HTTPException(status_code=400, detail="Danh sách bài thi trống")
    payload = {"status": data.status.value}
    if data.status == ContentStatus.PUBLISHED:
        payload["reviewed_by"] = str(current_user.id)
        payload["reviewed_at"] = datetime.utcnow().isoformat()
    res = supabase.table("tests").update(payload).in_("id", data.test_ids).execute()
    return {"meta": {"code": 200, "message": f"Đã cập nhật {len(data.test_ids)} bài thi"}, "data": res.data}

