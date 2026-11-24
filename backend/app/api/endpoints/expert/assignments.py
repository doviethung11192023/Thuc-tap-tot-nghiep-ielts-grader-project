"""Route bài chấm được phân công cho Expert: danh sách, từ chối, bắt đầu, lưu nháp, nộp (UC-15, UC-16)."""
from typing import List, Optional

from fastapi import APIRouter, Depends

from app.core.security import User, require_expert
from app.schemas.expert import (
    ExpertAssignmentItem,
    ExpertDeclineRequest,
    ExpertSubmitReviewRequest,
)
from app.services.expert import expert_assignment_list_service
from app.services.expert.dispatcher import (
    decline_assignment_by_expert,
    start_expert_grading_draft,
    submit_expert_final_review,
)
from app.services.expert.expert_draft_service import save_expert_grading_draft

router = APIRouter()


@router.get("/assignments", response_model=List[ExpertAssignmentItem])
def list_expert_assignments(
    status_filter: Optional[str] = "active",  # 'active', 'completed', 'all'
    current_user: User = Depends(require_expert),
):
    """
    Danh sách các bài chấm được phân công cho Expert (UC-15).
    Sắp xếp theo hạn chót (due_at ASC), cảnh báo khi còn dưới 6 giờ làm việc.
    """
    return expert_assignment_list_service.list_expert_assignments(current_user.id, status_filter)


@router.post("/assignments/{assignment_id}/decline")
async def decline_assignment(
    assignment_id: str,
    payload: ExpertDeclineRequest,
    current_user: User = Depends(require_expert),
):
    """Từ chối nhận bài trong 2 giờ làm việc đầu tiên kèm lý do (FR-39)."""
    return await decline_assignment_by_expert(assignment_id, current_user.id, payload.note)


@router.post("/assignments/{assignment_id}/start")
async def start_grading(
    assignment_id: str,
    current_user: User = Depends(require_expert),
):
    """Bắt đầu chấm bài: tạo draft evaluation nhân bản từ AI (UC-16)."""
    return await start_expert_grading_draft(assignment_id, current_user.id)


@router.put("/assignments/{assignment_id}/draft")
async def save_draft_review(
    assignment_id: str,
    payload: ExpertSubmitReviewRequest,
    current_user: User = Depends(require_expert),
):
    """Lưu bản nháp chấm bài (điểm, nhận xét 4 tiêu chí, annotations) mà chưa công bố."""
    return await save_expert_grading_draft(assignment_id, current_user.id, payload.dict())


@router.post("/assignments/{assignment_id}/submit")
async def submit_review(
    assignment_id: str,
    payload: ExpertSubmitReviewRequest,
    current_user: User = Depends(require_expert),
):
    """
    Expert nộp kết quả chấm bài chính thức (UC-16, SD-07, FR-42).
    Nếu lệch band >= 1.0 so với AI, kiểm tra bắt buộc có giải trình.
    """
    return await submit_expert_final_review(assignment_id, current_user.id, payload.dict())
