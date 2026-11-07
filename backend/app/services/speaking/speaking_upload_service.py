"""
Upload câu trả lời Speaking lên R2 bằng presigned URL (UC-10, SD-03, ADR-05).

- create_upload: kiểm chủ bài (ở endpoint), trạng thái, deadline, đồng ý ghi âm, câu hỏi thuộc đề;
  tạo dòng speaking_responses và trả URL PUT ngắn hạn.
- confirm_upload: server tự kiểm object thật trên R2 (kích thước, định dạng) rồi mới ghi confirmed_at.
  Chỉ câu đã confirm mới được chấm (spec FR-004).

Key cố định theo (attempt, câu hỏi): Practice ghi lại thì PUT đè lên chính object đó, nên nếu lần
ghi lại lỗi thì bản đã confirm trước đó vẫn còn nguyên.
"""
from datetime import datetime, timezone
from typing import Any, Optional

from app.core.domain_errors import ConflictError, ForbiddenError, InvalidRequestError, NotFoundError, ServiceUnavailableError

from app.db.supabase import db
from app.services.practice.practice_attempt_lifecycle import past_deadline
from app.services.r2_storage import r2_storage

MAX_AUDIO_BYTES = 15 * 1024 * 1024     # 120 s Opus chỉ khoảng 3 MB; 15 MB chặn file bất thường
MAX_DURATION_MS = 5 * 60 * 1000
ALLOWED_AUDIO = {"audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a"}


def base_mime(content_type: Optional[str]) -> str:
    """'audio/webm;codecs=opus' → 'audio/webm'."""
    return (content_type or "").split(";")[0].strip().lower()


def _require_open(attempt: dict[str, Any]) -> None:
    if attempt["status"] != "in_progress":
        raise ConflictError("Bài thi đã được nộp")
    if past_deadline(attempt):
        raise ConflictError("Đã quá thời gian làm bài")


def _require_consent(learner_id: str) -> None:
    rows = db().table("learner_profiles").select("voice_consent_at").eq("user_id", learner_id).execute().data
    if not rows or not rows[0].get("voice_consent_at"):
        raise ForbiddenError("Cần đồng ý ghi âm trước khi trả lời (FR-38)")


def _section_of_question(attempt: dict[str, Any], question_id: str) -> str:
    """section_id của câu hỏi nếu câu đó thuộc đề của attempt; không thì 404."""
    rows = db().table("speaking_questions").select("speaking_part_id").eq("id", question_id).execute().data
    if rows:
        section_id = rows[0]["speaking_part_id"]
        owned = db().table("sections").select("id").eq("id", section_id).eq("test_id", attempt["test_id"]).execute().data
        if owned:
            return section_id
    raise NotFoundError("Câu hỏi không thuộc đề này")


def _existing_response(attempt_id: str, question_id: str) -> Optional[dict[str, Any]]:
    rows = db().table("speaking_responses").select("id, confirmed_at") \
        .eq("attempt_id", attempt_id).eq("speaking_question_id", question_id).execute().data
    return rows[0] if rows else None


def create_upload(attempt: dict[str, Any], question_id: str, content_type: str) -> dict[str, Any]:
    _require_open(attempt)
    if not r2_storage.private_bucket_configured:
        raise ServiceUnavailableError("Chưa cấu hình kho lưu audio bài làm")
    _require_consent(attempt["learner_id"])
    mime = base_mime(content_type)
    extension = ALLOWED_AUDIO.get(mime)
    if not extension:
        raise InvalidRequestError("Định dạng audio không được hỗ trợ")
    section_id = _section_of_question(attempt, question_id)
    existing = _existing_response(attempt["id"], question_id)
    if attempt["mode"] == "mock" and existing and existing.get("confirmed_at"):
        raise ConflictError("Thi thử không được ghi lại câu trả lời (BR-13)")

    db().table("attempt_sections").upsert({
        "attempt_id": attempt["id"], "section_id": section_id, "test_id": attempt["test_id"],
        "started_at": attempt["started_at"],
    }, on_conflict="attempt_id,section_id", ignore_duplicates=True).execute()
    key = f"speaking/{attempt['id']}/{question_id}.{extension}"
    # Không đụng confirmed_at: bản đã confirm vẫn hợp lệ cho tới khi lần ghi lại được confirm.
    row = db().table("speaking_responses").upsert({
        "attempt_id": attempt["id"], "speaking_question_id": question_id,
        "section_id": section_id, "audio_key": key,
    }, on_conflict="attempt_id,speaking_question_id").execute().data[0]
    return {"response_id": row["id"], "upload_url": r2_storage.presign_private_put(key, mime),
            "content_type": mime, "max_bytes": MAX_AUDIO_BYTES}


def confirm_upload(attempt: dict[str, Any], response_id: str, duration_ms: int) -> dict[str, Any]:
    _require_open(attempt)
    rows = db().table("speaking_responses").select("id, audio_key, speaking_question_id") \
        .eq("id", response_id).eq("attempt_id", attempt["id"]).execute().data
    if not rows or not rows[0].get("audio_key"):
        raise NotFoundError("Không tìm thấy câu trả lời")
    response = rows[0]
    head = r2_storage.head_private_object(response["audio_key"])
    if not head or head["size"] <= 0:
        raise InvalidRequestError("Chưa nhận được file audio")
    if head["size"] > MAX_AUDIO_BYTES:
        r2_storage.delete_private_object(response["audio_key"])
        raise InvalidRequestError("File audio quá lớn")
    if base_mime(head["content_type"]) not in ALLOWED_AUDIO:
        r2_storage.delete_private_object(response["audio_key"])
        raise InvalidRequestError("Sai định dạng audio")
    confirmed_at = datetime.now(timezone.utc).isoformat()
    db().table("speaking_responses").update({
        "confirmed_at": confirmed_at, "duration_ms": max(0, min(int(duration_ms), MAX_DURATION_MS)),
    }).eq("id", response_id).execute()
    return {"response_id": response_id, "question_id": response["speaking_question_id"], "confirmed_at": confirmed_at}


def confirmed_answers(attempt_id: str) -> list[dict[str, Any]]:
    """Câu đã lưu an toàn, để phòng thi làm tiếp sau khi tải lại trang (FR-11)."""
    rows = db().table("speaking_responses").select("id, speaking_question_id, duration_ms") \
        .eq("attempt_id", attempt_id).not_.is_("confirmed_at", "null").execute().data or []
    return [{"response_id": r["id"], "question_id": r["speaking_question_id"],
             "duration_ms": r.get("duration_ms")} for r in rows]
