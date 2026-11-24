"""
Tạo yêu cầu Expert chấm cho bài Mock vừa nộp (BR-15, UC-32, FR-33).

Dùng chung cho Learner tự nộp (endpoint submit-writing / submit-speaking) và cron tự nộp khi hết giờ
(mock_auto_submit), để hai đường đi theo cùng một quy tắc:
- bài không có nội dung (Writing không lưu chữ nào, Speaking không có câu trả lời) không gửi Expert;
- còn giữ chỗ / còn quota tuần thì tạo review_requests rồi thử giao ngay cho Expert đang rảnh.
Lỗi ở bước này không làm hỏng việc nộp bài: bài vẫn được AI chấm, chỉ không có yêu cầu Expert.
"""
from typing import Any

from app.services.expert.dispatcher import auto_dispatch_pending_requests
from app.services.expert.quota_manager import confirm_mock_submission_slot

_NO_WORK_STATUSES = ("no_speech", "abandoned")


def submission_has_work(skill: str, submission: dict[str, Any]) -> bool:
    """Bài có gì để Expert chấm không. Writing: còn bài viết; Speaking: có ít nhất một câu trả lời."""
    if skill == "writing":
        return bool(submission.get("essays"))
    return submission.get("status") not in _NO_WORK_STATUSES


async def request_mock_expert_review(attempt: dict[str, Any], submission: dict[str, Any], redis: Any) -> bool:
    """Trả True khi đã tạo yêu cầu Expert cho bài Mock này."""
    skill = attempt["skill"]
    if attempt.get("mode") != "mock" or skill not in ("writing", "speaking") or not attempt.get("learner_id"):
        return False
    if not submission_has_work(skill, submission):
        return False
    try:
        created = await confirm_mock_submission_slot(attempt["learner_id"], attempt["id"], skill, redis)
        if created:
            await auto_dispatch_pending_requests()
        return created
    except Exception as e:
        print(f"⚠️ [MockExpertReview] attempt {attempt['id']}: {e}")
        return False
