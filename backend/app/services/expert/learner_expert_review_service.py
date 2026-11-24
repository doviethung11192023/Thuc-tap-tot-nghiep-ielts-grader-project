"""Học viên tương tác với phân hệ Chuyên gia: xin chấm lại bài Practice (BR-16) và đánh giá mức hữu ích (FR-52).

Phần hạn mức tuần (quota) nằm ở quota_manager và là async (cần Redis); module này chỉ giữ các bước đọc/ghi DB
đồng bộ và luật điều kiện, để route gọi từng bước qua threadpool xen kẽ với phần async.
"""
from app.core.domain_errors import (
    ConflictError,
    DomainError,
    InternalFailureError,
    InvalidRequestError,
    NotFoundError,
)
from app.db.supabase import db
from app.services.practice.practice_attempt_lifecycle import get_owned_attempt


def validate_practice_review_request(attempt_id: str, learner_id: str) -> dict:
    """Bài phải của học viên, ở chế độ Practice, kỹ năng Writing/Speaking, đã có điểm AI và chưa có yêu cầu đang mở
    (mỗi attempt tối đa 1 yêu cầu mở — ràng buộc 11). Trả về attempt để bước sau dùng."""
    attempt = get_owned_attempt(attempt_id, learner_id)
    if not attempt:
        raise NotFoundError("Phiên làm bài không tồn tại hoặc không thuộc quyền sở hữu của bạn")
    if attempt.get("mode") != "practice":
        raise InvalidRequestError("Chỉ bài thi ở chế độ Luyện tập (Practice) mới dùng chức năng xin chấm lại")
    if attempt.get("skill") not in ("writing", "speaking"):
        raise InvalidRequestError("Chỉ kỹ năng Writing và Speaking mới có thể xin Chuyên gia chấm lại")

    # Kiểm tra điểm AI đã hoàn thành chưa
    ai_eval = db().table("evaluations") \
        .select("id, status") \
        .eq("attempt_id", attempt_id) \
        .eq("evaluator_type", "ai") \
        .eq("status", "done") \
        .execute()
    if not ai_eval.data:
        raise InvalidRequestError(
            "Bài làm chưa hoàn tất chấm AI, vui lòng chờ AI chấm xong trước khi xin Chuyên gia thẩm định"
        )

    # Kiểm tra đã có request mở chưa
    open_req = db().table("review_requests") \
        .select("id, status") \
        .eq("attempt_id", attempt_id) \
        .in_("status", ["waiting", "assigned"]) \
        .execute()
    if open_req.data:
        raise ConflictError("Bài thi này đã có một yêu cầu chấm Chuyên gia đang được xử lý")
    return attempt


def ensure_practice_quota_available(quota_status: dict) -> None:
    """Hết lượt cá nhân (BR-16) trả 429; hết suất chung toàn trường (BR-20) trả 503."""
    if quota_status["can_request_practice"]:
        return
    if quota_status["practice_remaining"] <= 0:
        raise DomainError("Bạn đã dùng hết 3 lượt xin Chuyên gia chấm bài Practice trong tuần này", status_code=429)
    raise DomainError(
        "Hệ thống đã hết suất chấm Chuyên gia của tuần này (BR-20). Vui lòng thử lại vào tuần sau.",
        status_code=503,
    )


def create_waiting_review_request(attempt_id: str, skill: str, learner_id: str) -> str:
    """Tạo review_requests ở trạng thái waiting, trả id yêu cầu."""
    insert_res = db().table("review_requests").insert({
        "attempt_id": attempt_id,
        "learner_id": learner_id,
        "skill": skill,
        "status": "waiting",
    }).execute()
    if not insert_res.data:
        raise InternalFailureError("Không thể tạo yêu cầu thẩm định Chuyên gia")
    return insert_res.data[0]["id"]


def get_helpfulness_rating(attempt_id: str, learner_id: str) -> dict:
    """Học viên đã đánh giá nhận xét Chuyên gia cho attempt này chưa."""
    attempt = get_owned_attempt(attempt_id, learner_id)
    if not attempt:
        raise NotFoundError("Phiên làm bài không tồn tại")
    rows = db().table("expert_helpfulness_ratings").select("*").eq("attempt_id", attempt_id).limit(1).execute().data or []
    return {"rated": bool(rows), "rating": rows[0] if rows else None}


def submit_helpfulness_rating(attempt_id: str, learner_id: str, is_helpful: bool, tags: list) -> dict:
    """Đánh giá ẩn danh, 1 lần/attempt, chỉ khi bài đã có kết quả chấm hoàn tất từ Chuyên gia (UC-44)."""
    attempt = get_owned_attempt(attempt_id, learner_id)
    if not attempt:
        raise NotFoundError("Phiên làm bài không tồn tại hoặc không thuộc quyền sở hữu của bạn")
    asgns = (
        db().table("review_assignments")
        .select("id, expert_id, ended_at, end_reason")
        .eq("attempt_id", attempt_id)
        .eq("end_reason", "completed")
        .order("ended_at", desc=True)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not asgns or not asgns[0].get("expert_id"):
        raise InvalidRequestError("Bài thi chưa có kết quả chấm hoàn tất từ Chuyên gia")
    existing = db().table("expert_helpfulness_ratings").select("id").eq("attempt_id", attempt_id).limit(1).execute().data or []
    if existing:
        raise ConflictError("Bạn đã gửi đánh giá nhận xét cho bài chấm này trước đó")
    ins = (
        db().table("expert_helpfulness_ratings")
        .insert({
            "attempt_id": attempt_id,
            "assignment_id": asgns[0]["id"],
            "learner_id": learner_id,
            "expert_id": asgns[0]["expert_id"],
            "is_helpful": is_helpful,
            "tags": tags,
        })
        .execute()
        .data
        or [{}]
    )
    return {"status": "saved", "rating_id": ins[0].get("id")}
