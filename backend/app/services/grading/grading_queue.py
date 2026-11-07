"""
Đưa lượt chấm vào hàng đợi ARQ (ADR-02).

grading_runs giữ trạng thái thật; Redis chỉ là tín hiệu kích hoạt. Vì vậy lỗi đẩy job không làm hỏng
lần nộp bài: bài đã lưu trong DB, cron stale_grading_run_recovery sẽ đẩy lại.

Writing và Speaking ở hai hàng đợi riêng. Speaking chạy mỗi lần một bài (GPU), nên bài chờ nằm trong
hàng đợi chứ không giữ một kết nối HTTP mở tới AI engine.
"""
from typing import Any

GRADE_RUN_FUNCTION = "grade_run_task"
WRITING_QUEUE = "arq:grading:writing"
SPEAKING_QUEUE = "arq:grading:speaking"

# Trần thời gian của một job: lâu hơn lượt gọi AI engine dài nhất (Speaking: 2 × 600 s + nghỉ).
GRADING_JOB_TIMEOUT_SECONDS = 1260
# Lease phải dài hơn job timeout: hết lease nghĩa là job cũ chắc chắn đã dừng, chạy lại không bị trùng.
GRADING_LEASE_SECONDS = 1500


def queue_for_skill(skill: str) -> str:
    return SPEAKING_QUEUE if skill == "speaking" else WRITING_QUEUE


async def enqueue_grading_run(redis: Any, run_id: str, skill: str) -> bool:
    """Job id cố định theo run: đẩy lại khi job còn trong hàng đợi thì ARQ bỏ qua. Không bao giờ raise."""
    try:
        await redis.enqueue_job(GRADE_RUN_FUNCTION, run_id, _job_id=f"grading-run:{run_id}",
                                _queue_name=queue_for_skill(skill))
        return True
    except Exception as e:
        print(f"⚠️ [Queue] chưa đẩy được run {run_id}, cron sẽ đẩy lại: {e}")
        return False
