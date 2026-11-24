"""Route phòng chấm Split-View của Expert: một payload gồm đề, bài làm, điểm AI và bản nháp."""
from fastapi import APIRouter, Depends

from app.core.security import User, require_expert
from app.services.expert.expert_workspace_service import build_assignment_workspace

router = APIRouter()


@router.get("/assignments/{assignment_id}/workspace")
async def get_assignment_workspace(
    assignment_id: str,
    current_user: User = Depends(require_expert),
):
    """
    Nạp toàn bộ dữ liệu phòng chấm Split-View trong 1 payload duy nhất:
    - Thông tin đề thi & bài làm học viên (Writing text hoặc Speaking audio).
    - Mục tiêu của học viên (Target bands).
    - Kết quả chấm của AI (Overall band, 4 tiêu chí, chú thích lỗi).
    - Bản nháp hiện tại của Expert (nếu đã lưu).
    """
    return await build_assignment_workspace(assignment_id, current_user.id)
