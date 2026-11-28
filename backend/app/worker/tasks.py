"""
Tiến trình ARQ: chấm AI và cron SLA / điều phối / đánh giá hạng Expert.

Hai cấu hình worker, chạy thành hai tiến trình:
    arq app.worker.tasks.WorkerSettings          Writing + cron
    arq app.worker.tasks.SpeakingWorkerSettings  Speaking, mỗi lần một bài
"""
import asyncio
from datetime import datetime
import os

from arq import cron
from arq.connections import RedisSettings
from dotenv import load_dotenv

from app.services.expert.dispatcher import auto_dispatch_pending_requests
from app.services.expert.expert_tier_evaluation_service import evaluate_all_expert_tiers
from app.services.expert.sla_cron_service import (
    auto_close_overdue_mock_attempts,
    expire_overdue_assignments,
    send_sla_deadline_warnings,
)
from app.services.expert.sla_service import TZ_VN
from app.services.grading.grading_queue import GRADING_JOB_TIMEOUT_SECONDS, SPEAKING_QUEUE, WRITING_QUEUE
from app.services.grading.grading_run_executor import execute_grading_run
from app.services.grading.stale_grading_run_recovery import recover_stale_grading_runs
from app.services.ai_monitoring.model_price_sync import sync_model_prices
from app.services.ai_monitoring.tracing_retention import purge_old_ai_traces
from app.services.learning_profile.streak_nudge_cron import run_daily_streak_nudge
from app.services.practice.mock_auto_submit import auto_submit_overdue_mocks
from app.services.speaking.speaking_audio_retention import purge_expired_speaking_audio
import logging

from app.core.logging_config import configure_logging

configure_logging()   # arq import module này khi khởi động nên cấu hình ở đây là đủ cho cả hai worker
logger = logging.getLogger(__name__)

load_dotenv()


def read_concurrency(env_name: str, default: int) -> int:
    """Số job chạy song song của worker, đọc từ biến môi trường; không phải số nguyên >= 1 thì dùng mặc định."""
    raw = os.getenv(env_name)
    if raw is None or raw.strip() == "":
        return default
    try:
        value = int(raw)
    except ValueError:
        value = 0
    if value < 1:
        logger.warning("%s=%r không hợp lệ (cần số nguyên >= 1), dùng mặc định %d", env_name, raw, default)
        return default
    return value


WRITING_CONCURRENCY = read_concurrency("WRITING_CONCURRENCY", 4)
SPEAKING_CONCURRENCY = read_concurrency("SPEAKING_CONCURRENCY", 1)
_redis_settings = RedisSettings.from_dsn(os.getenv("REDIS_URL", "redis://localhost:6379"))


async def grade_run_task(ctx, run_id: str) -> str:
    return await execute_grading_run(run_id)


async def recover_stale_runs_task(ctx):
    counts = await recover_stale_grading_runs(ctx["redis"])
    if any(counts.values()):
        logger.info(f"♻️ [Recovery] {counts}")


async def auto_submit_mocks_task(ctx):
    """Tự nộp bài Mock quá deadline + 30 s bằng phần đã lưu (FR-12, BR-21)."""
    counts = await auto_submit_overdue_mocks(ctx["redis"])
    if counts:
        logger.info(f"⏰ [AutoSubmit] {counts}")


async def purge_speaking_audio_task(ctx):
    logger.info(f"🧹 [Retention] removed {purge_expired_speaking_audio()} audio files")


async def purge_ai_traces_task(ctx):
    """Xoá trace Langfuse từ 90 ngày, output/lỗi lượt chấm lỗi từ 180 ngày; giữ số liệu sử dụng (spec 008, FR-030)."""
    logger.info(f"🧹 [Retention] AI traces {await purge_old_ai_traces()}")


async def sync_model_prices_task(ctx):
    """Kiểm giá model với trang giá của nhà cung cấp mỗi ngày; giá đổi thì cập nhật và ghi audit (spec 008)."""
    status = await asyncio.to_thread(sync_model_prices)
    changed = [m for m, r in status["models"].items() if r["status"] == "updated"]
    logger.info(f"💲 [PriceSync] đổi giá: {changed or 'không'}; lỗi nguồn: {status['errors'] or 'không'}")


async def expert_sla_and_dispatch_task(ctx):
    """Thu hồi assignment quá hạn SLA 48h và tự động điều phối bài đang chờ mỗi 10 phút."""
    expired = expire_overdue_assignments()
    dispatched = await auto_dispatch_pending_requests()
    if expired or dispatched:
        logger.info(f"⏱️ [Expert SLA Cron] expired={expired}, dispatched={dispatched}")


async def expert_sla_reminder_task(ctx):
    """Gửi nhắc nhở mốc 12h và khẩn cấp 6h trước hạn SLA cho Chuyên gia."""
    sent = send_sla_deadline_warnings()
    if sent:
        logger.warning(f"🔔 [Expert SLA Warning Cron] sent={sent}")


async def evaluate_expert_tiers_task(ctx):
    """Mở cooldown hết hạn mỗi giờ & quét phân hạng 4-Tier lúc 01:00 GMT+7 (chốt snapshot ngày 01)."""
    now_vn = datetime.now(TZ_VN)
    processed = evaluate_all_expert_tiers(close_previous_month=(now_vn.hour == 1 and now_vn.day == 1))
    if processed and now_vn.hour == 1:
        logger.info(f"🏅 [Expert Tier Cron] evaluated={processed}, snapshot_closed={now_vn.day == 1}")


async def close_overdue_mock_attempts_task(ctx):
    closed = auto_close_overdue_mock_attempts()
    if closed:
        logger.info(f"⌛ [Mock Timeout Cron] closed={closed}")


async def learner_streak_nudge_task(ctx):
    res = run_daily_streak_nudge(force_hour_check=True)
    if res.get("reminders_sent") or res.get("freeze_notices_sent"):
        logger.info(f"🔥 [Streak Nudge Cron] {res}")


class WorkerSettings:
    functions = [grade_run_task]
    queue_name = WRITING_QUEUE
    max_jobs = WRITING_CONCURRENCY
    job_timeout = GRADING_JOB_TIMEOUT_SECONDS
    keep_result = 0            # giải phóng job id ngay khi xong để cron đẩy lại được
    cron_jobs = [
        cron(purge_speaking_audio_task, hour=3, minute=0),
        cron(purge_ai_traces_task, hour=3, minute=30),
        cron(sync_model_prices_task, hour={4, 16}, minute=0),
        cron(recover_stale_runs_task, minute=set(range(60))),
        cron(auto_submit_mocks_task, minute=set(range(60)), second=15),
        cron(expert_sla_and_dispatch_task, minute={0, 10, 20, 30, 40, 50}),
        cron(expert_sla_reminder_task, minute={0, 30}),
        cron(evaluate_expert_tiers_task, minute=5),
        cron(learner_streak_nudge_task, minute=0),
    ]
    redis_settings = _redis_settings


class SpeakingWorkerSettings:
    functions = [grade_run_task]
    queue_name = SPEAKING_QUEUE
    max_jobs = SPEAKING_CONCURRENCY
    job_timeout = GRADING_JOB_TIMEOUT_SECONDS
    keep_result = 0
    redis_settings = _redis_settings
