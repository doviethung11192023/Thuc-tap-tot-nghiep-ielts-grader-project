"""
Xoá audio Speaking quá hạn (NFR-07, Nghị định 13/2023/NĐ-CP).

Giữ dòng speaking_responses vì transcript và điểm vẫn là kết quả của bài thi; chỉ audio bị xoá.
Xoá thất bại thì không ghi audio_deleted_at, nên lượt chạy sau thử lại.
"""
from datetime import datetime, timedelta, timezone

from app.db.supabase import db
from app.services.r2_storage import r2_storage

DEFAULT_RETENTION_DAYS = 180
BATCH_SIZE = 500


def retention_days() -> int:
    rows = db().table("system_settings").select("value").eq("key", "audio_retention_days").execute().data
    try:
        return int(rows[0]["value"])
    except (IndexError, KeyError, TypeError, ValueError):
        return DEFAULT_RETENTION_DAYS


def purge_expired_speaking_audio() -> int:
    """Trả số file đã xoá trong lượt này."""
    if not r2_storage.private_bucket_configured:
        return 0
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=retention_days())).isoformat()
    rows = db().table("speaking_responses").select("id, audio_key").is_("audio_deleted_at", "null") \
        .lt("confirmed_at", cutoff).limit(BATCH_SIZE).execute().data or []
    deleted = 0
    for row in rows:
        try:
            if row.get("audio_key"):
                r2_storage.delete_private_object(row["audio_key"])
            db().table("speaking_responses").update({"audio_deleted_at": now.isoformat()}).eq("id", row["id"]).execute()
            deleted += 1
        except Exception as e:
            print(f"⚠️ [Retention] {row['id']}: {e}")
    return deleted


def delete_attempt_audio(attempt_id: str) -> None:
    """Luyện tập dở bị xoá: dữ liệu giọng nói đi cùng bài làm, lỗi không được chặn việc xoá bài."""
    rows = db().table("speaking_responses").select("audio_key").eq("attempt_id", attempt_id).execute().data or []
    for row in rows:
        try:
            if row.get("audio_key") and r2_storage.private_bucket_configured:
                r2_storage.delete_private_object(row["audio_key"])
        except Exception as e:
            print(f"⚠️ [Retention] attempt {attempt_id}: {e}")
