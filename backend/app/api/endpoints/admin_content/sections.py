from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import require_admin, User
from app.db.supabase import supabase
from app.schemas.exam_content import TestSectionCreate, TestSectionUpdate

router = APIRouter()

@router.post("/tests/{test_id}/sections", status_code=status.HTTP_201_CREATED)
async def create_section(
    test_id: str,
    sec_data: TestSectionCreate,
    current_user: User = Depends(require_admin)
):
    """Thêm Section cho bài thi (Đoạn văn Reading, Audio Listening, đề Writing/Speaking)."""
    # Kiểm tra bài thi có tồn tại không
    t_res = supabase.table("tests").select("id").eq("id", test_id).execute()
    if not t_res.data:
        raise HTTPException(status_code=404, detail="Bài thi không tồn tại")

    payload = sec_data.model_dump()
    payload["test_id"] = test_id

    res = supabase.table("test_sections").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Không thể tạo section")
    return {"meta": {"code": 201, "message": "Tạo section thành công"}, "data": res.data[0]}

@router.get("/sections/{section_id}")
async def get_section(
    section_id: str,
    current_user: User = Depends(require_admin)
):
    """Lấy chi tiết một section."""
    res = supabase.table("test_sections").select("*").eq("id", section_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Section không tồn tại")
    return {"meta": {"code": 200}, "data": res.data[0]}

@router.put("/sections/{section_id}")
async def update_section(
    section_id: str,
    sec_data: TestSectionUpdate,
    current_user: User = Depends(require_admin)
):
    """Cập nhật nội dung đoạn văn, audio key trên R2, transcript của section."""
    payload = sec_data.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="Không có dữ liệu cập nhật")

    res = supabase.table("test_sections").update(payload).eq("id", section_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Section không tồn tại")
    return {"meta": {"code": 200, "message": "Cập nhật section thành công"}, "data": res.data[0]}

@router.delete("/sections/{section_id}")
async def delete_section(
    section_id: str,
    current_user: User = Depends(require_admin)
):
    """Xóa section cùng toàn bộ nhóm câu hỏi trực thuộc."""
    res = supabase.table("test_sections").delete().eq("id", section_id).execute()
    return {"meta": {"code": 200, "message": "Xóa section thành công"}}
