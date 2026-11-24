"""Admin: section của đề (đoạn đọc/audio L/R, task Writing, part Speaking)."""
from fastapi import APIRouter, Depends, status

from app.api.responses import ok, created
from app.core.student_content_cache import StudentContentMutationRoute
from app.core.security import User, require_admin
from app.schemas.exam_content import TestSectionCreate, TestSectionUpdate
from app.services.cms import cms_sections

router = APIRouter(route_class=StudentContentMutationRoute)


@router.post("/tests/{test_id}/sections", status_code=status.HTTP_201_CREATED)
def create_section(test_id: str, sec_data: TestSectionCreate, current_user: User = Depends(require_admin)):
    data = cms_sections.create_section(test_id, sec_data.model_dump())
    return created(data, message="Tạo section thành công")


@router.get("/sections/{section_id}")
def get_section(section_id: str, current_user: User = Depends(require_admin)):
    return ok(cms_sections.get_section(section_id))


@router.put("/sections/{section_id}")
def update_section(section_id: str, sec_data: TestSectionUpdate, current_user: User = Depends(require_admin)):
    data = cms_sections.update_section(section_id, sec_data.model_dump(exclude_unset=True))
    return ok(data, message="Cập nhật section thành công")


@router.delete("/sections/{section_id}")
def delete_section(section_id: str, current_user: User = Depends(require_admin)):
    cms_sections.delete_section(section_id)
    return ok(message="Xóa section thành công")
