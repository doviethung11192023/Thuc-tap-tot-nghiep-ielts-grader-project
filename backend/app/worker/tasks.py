"""
Tiến trình ARQ: chấm AI và cron (ADR-02).

Hai cấu hình worker, chạy thành hai tiến trình:
    arq app.worker.tasks.WorkerSettings          Writing + cron
    arq app.worker.tasks.SpeakingWorkerSettings  Speaking, mỗi lần một bài
"""
import os

from arq import cron
from arq.connections import RedisSettings
from dotenv import load_dotenv

from app.services.grading.grading_queue import GRADING_JOB_TIMEOUT_SECONDS, SPEAKING_QUEUE, WRITING_QUEUE
from app.services.grading.grading_run_executor import execute_grading_run
from app.services.grading.stale_grading_run_recovery import recover_stale_grading_runs
from app.services.speaking.speaking_audio_retention import purge_expired_speaking_audio

load_dotenv()

WRITING_CONCURRENCY = 4     # LLM trả dần, nên chạy song song được cả hai task của một bài
SPEAKING_CONCURRENCY = 1    # AI engine chỉ xử lý mỗi lần một bài trên GPU
_redis_settings = RedisSettings.from_dsn(os.getenv("REDIS_URL", "redis://localhost:6379"))


async def grade_run_task(ctx, run_id: str) -> str:
    """Payload chỉ có run_id: mọi thứ khác đọc từ DB, nên job đẩy lại luôn thấy trạng thái mới nhất."""
    return await execute_grading_run(run_id)


async def recover_stale_runs_task(ctx):
    counts = await recover_stale_grading_runs(ctx["redis"])
    if any(counts.values()):
        print(f"♻️ [Recovery] {counts}")


async def purge_speaking_audio_task(ctx):
    """Xoá audio Speaking quá hạn lưu (NFR-07)."""
    print(f"🧹 [Retention] removed {purge_expired_speaking_audio()} audio files")


class WorkerSettings:
    functions = [grade_run_task]
    queue_name = WRITING_QUEUE
    max_jobs = WRITING_CONCURRENCY
    job_timeout = GRADING_JOB_TIMEOUT_SECONDS
    keep_result = 0            # giải phóng job id ngay khi xong để cron đẩy lại được
    cron_jobs = [cron(purge_speaking_audio_task, hour=3, minute=0),
                 cron(recover_stale_runs_task, minute=set(range(60)))]
    redis_settings = _redis_settings


class SpeakingWorkerSettings:
    functions = [grade_run_task]
    queue_name = SPEAKING_QUEUE
    max_jobs = SPEAKING_CONCURRENCY
    job_timeout = GRADING_JOB_TIMEOUT_SECONDS
    keep_result = 0
    redis_settings = _redis_settings
