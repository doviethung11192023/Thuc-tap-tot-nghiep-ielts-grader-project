"""Admin: section của đề (đoạn đọc/audio L/R, task Writing, part Speaking)."""
from fastapi import APIRouter, Depends, status

from app.core.student_content_cache import StudentContentMutationRoute
from app.core.security import User, require_admin
from app.schemas.exam_content import TestSectionCreate, TestSectionUpdate
from app.services.cms import cms_sections

router = APIRouter(route_class=StudentContentMutationRoute)


@router.post("/tests/{test_id}/sections", status_code=status.HTTP_201_CREATED)
async def create_section(test_id: str, sec_data: TestSectionCreate, current_user: User = Depends(require_admin)):
    data = cms_sections.create_section(test_id, sec_data.model_dump())
    return {"meta": {"code": 201, "message": "Tạo section thành công"}, "data": data}


@router.get("/sections/{section_id}")
async def get_section(section_id: str, current_user: User = Depends(require_admin)):
    return {"meta": {"code": 200}, "data": cms_sections.get_section(section_id)}


@router.put("/sections/{section_id}")
async def update_section(section_id: str, sec_data: TestSectionUpdate, current_user: User = Depends(require_admin)):
    data = cms_sections.update_section(section_id, sec_data.model_dump(exclude_unset=True))
    return {"meta": {"code": 200, "message": "Cập nhật section thành công"}, "data": data}


@router.delete("/sections/{section_id}")
async def delete_section(section_id: str, current_user: User = Depends(require_admin)):
    cms_sections.delete_section(section_id)
    return {"meta": {"code": 200, "message": "Xóa section thành công"}}
