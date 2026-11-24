"""Admin: tài liệu theo đề Writing (spec 006, ADR-30). AI soạn nháp, Admin sửa và duyệt."""
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.responses import ok
from app.core.security import User, require_admin
from app.core.student_content_cache import StudentContentMutationRoute
from app.services.writing import writing_task_materials as materials

router = APIRouter(route_class=StudentContentMutationRoute)

Kind = Literal["answer_key", "outline", "sample"]


class KindBody(BaseModel):
    kind: Kind


class MaterialUpdate(BaseModel):
    answer_key: Optional[dict[str, Any]] = None
    outline: Optional[str] = None
    sample_essay: Optional[str] = None




@router.get("/writing-tasks/{section_id}/material")
def get_material(section_id: str, current_user: User = Depends(require_admin)):
    return ok(materials.get_material(section_id), message="OK")


@router.post("/writing-tasks/{section_id}/material/draft")
async def draft_material(section_id: str, body: KindBody, current_user: User = Depends(require_admin)):
    return ok(await materials.draft_material(section_id, body.kind), message="Đã soạn bản nháp, cần duyệt trước khi dùng")


@router.put("/writing-tasks/{section_id}/material")
def update_material(section_id: str, body: MaterialUpdate, current_user: User = Depends(require_admin)):
    return ok(materials.update_material(section_id, body.model_dump(exclude_unset=True)), message="Đã lưu bản nháp")


@router.post("/writing-tasks/{section_id}/material/approve")
def approve_material(section_id: str, body: KindBody, current_user: User = Depends(require_admin)):
    return ok(materials.approve_material(section_id, body.kind, current_user.id), message="Đã duyệt")
