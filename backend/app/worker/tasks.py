import asyncio

async def evaluate_essay_task(ctx, essay_id: str):
    """
    Background task nhận essay_id từ Redis, truy vấn DB và gọi AI Engine.
    """
    print(f"Worker picked up task for essay: {essay_id}")
    # from app.ai.graph import run_evaluation_pipeline
    # await run_evaluation_pipeline(essay_id)
    # Cập nhật kết quả vào database
    return {"status": "success", "essay_id": essay_id}

class WorkerSettings:
    """
    Cấu hình cho ARQ worker.
    Chạy bằng lệnh: arq app.worker.tasks.WorkerSettings
    """
    functions = [evaluate_essay_task]
    # redis_settings = ...
