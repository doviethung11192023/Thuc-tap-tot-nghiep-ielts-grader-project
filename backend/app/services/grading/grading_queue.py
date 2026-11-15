"""
Đưa lượt chấm vào hàng đợi ARQ (ADR-02).

grading_runs giữ trạng thái thật; Redis chỉ là tín hiệu kích hoạt. Vì vậy lỗi đẩy job không làm hỏng
lần nộp bài: bài đã lưu trong DB, cron stale_grading_run_recovery sẽ đẩy lại.

Writing và Speaking ở hai hàng đợi riêng. Speaking chạy mỗi lần một bài (GPU), nên bài chờ nằm trong
hàng đợi chứ không giữ một kết nối HTTP mở tới AI engine.
"""
import asyncio
import logging
from typing import Any

from app.core.null_redis_cache import NullRedisCache

logger = logging.getLogger(__name__)

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
    """Job id cố định theo run: đẩy lại khi job còn trong hàng đợi thì ARQ bỏ qua. Không bao giờ raise.
    Nếu Redis không khả dụng (NullRedisCache hoặc offline) HOẶC không có ARQ worker nào đang lắng nghe,
    tự động fallback chạy nền trực tiếp qua asyncio.create_task.
    """
    queue_name = queue_for_skill(skill)
    try:
        # Nếu có Redis thật và kết nối sẵn sàng
        if redis and not isinstance(redis, NullRedisCache):
            if hasattr(redis, "get"):
                health_key = f"{queue_name}:health-check"
                health = await redis.get(health_key)
                if health:
                    await redis.enqueue_job(GRADE_RUN_FUNCTION, run_id, _job_id=f"grading-run:{run_id}",
                                            _queue_name=queue_name)
                    logger.info(f"📬 [ARQ] Đã đẩy run {run_id} vào queue {queue_name} (worker đang hoạt động)")
                    return True
                logger.warning(f"⚠️ [Queue] Redis đang chạy nhưng không phát hiện ARQ worker cho {queue_name}. Tự động fallback chạy trực tiếp...")
            else:
                await redis.enqueue_job(GRADE_RUN_FUNCTION, run_id, _job_id=f"grading-run:{run_id}",
                                        _queue_name=queue_name)
                return True
    except Exception as e:
        logger.warning(f"⚠️ [Queue] Lỗi đẩy job vào Redis ({e}), chuyển sang chạy nền trực tiếp...")

    # Fallback: Chạy nền trực tiếp qua executor khi Redis offline / không có worker
    try:
        from app.services.grading.grading_run_executor import execute_grading_run
        logger.info(f"⚡ [DirectExecutor] Kích hoạt chấm nền trực tiếp cho run {run_id}")
        asyncio.create_task(execute_grading_run(run_id))
        return True
    except Exception as fallback_err:
        logger.error(f"❌ [Queue] Không thể khởi chạy tác vụ chấm cho run {run_id}: {fallback_err}")
        return False
