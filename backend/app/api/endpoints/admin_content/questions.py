"""Admin: nhóm câu hỏi, câu hỏi và đáp án chuẩn (đáp án chỉ Admin đọc được — ràng buộc 8)."""
from fastapi import APIRouter, Depends, status

from app.core.student_content_cache import StudentContentMutationRoute
from app.core.security import User, require_admin
from app.schemas.exam_content import QuestionCreate, QuestionGroupCreate
from app.services.cms import cms_questions

router = APIRouter(route_class=StudentContentMutationRoute)


def _plain(data: dict) -> dict:
    return {k: v.value if hasattr(v, "value") else v for k, v in data.items()}


@router.post("/sections/{section_id}/question-groups", status_code=status.HTTP_201_CREATED)
async def create_question_group(section_id: str, grp_data: QuestionGroupCreate, current_user: User = Depends(require_admin)):
    data = cms_questions.create_group(section_id, _plain(grp_data.model_dump()))
    return {"meta": {"code": 201, "message": "Tạo nhóm câu hỏi thành công"}, "data": data}


@router.delete("/question-groups/{group_id}")
async def delete_question_group(group_id: str, current_user: User = Depends(require_admin)):
    cms_questions.delete_group(group_id)
    return {"meta": {"code": 200, "message": "Xóa nhóm câu hỏi thành công"}}


@router.post("/question-groups/{group_id}/questions", status_code=status.HTTP_201_CREATED)
async def create_question(group_id: str, q_data: QuestionCreate, current_user: User = Depends(require_admin)):
    data = cms_questions.save_question(group_id, q_data.model_dump())
    return {"meta": {"code": 201, "message": "Tạo câu hỏi thành công"}, "data": data}


@router.put("/questions/{question_id}")
async def update_question(question_id: str, q_data: QuestionCreate, current_user: User = Depends(require_admin)):
    cms_questions.save_question(None, q_data.model_dump(), question_id=question_id)
    return {"meta": {"code": 200, "message": "Cập nhật câu hỏi thành công"}}


@router.delete("/questions/{question_id}")
async def delete_question(question_id: str, current_user: User = Depends(require_admin)):
    cms_questions.delete_question(question_id)
    return {"meta": {"code": 200, "message": "Xóa câu hỏi thành công"}}
