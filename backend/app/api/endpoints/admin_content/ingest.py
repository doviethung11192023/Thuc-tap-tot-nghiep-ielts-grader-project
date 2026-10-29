import json
import asyncio
import queue
import threading
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from app.core.security import require_admin, User
from app.schemas.system_settings import (
    CrawledDatasetIngestRequest, CrawledDatasetIngestResponse,
    DatasetScanResponse
)
from app.services.dataset_importer import DatasetImporter
from app.services.dataset_scanner import scan_dataset

router = APIRouter()

@router.get("/ingest/scan", response_model=DatasetScanResponse)
async def scan_dataset_endpoint(
    dataset_path: Optional[str] = Query(None),
    current_user: User = Depends(require_admin)
):
    """
    Quét kho dataset và đối chiếu với CSDL Supabase để phát hiện bài đã nạp và bài chưa nạp.
    """
    return scan_dataset(dataset_path)

@router.post("/ingest/crawled-test", response_model=CrawledDatasetIngestResponse)
async def ingest_crawled_dataset(
    req: CrawledDatasetIngestRequest,
    current_user: User = Depends(require_admin)
):
    """
    Nạp dữ liệu từ thư mục prep_crawled_dataset vào CSDL Supabase:
    - Kiểm tra chống nạp trùng đề thi (Deduplication)
    - 4 kỹ năng: Reading, Listening, Writing, Speaking
    """
    importer = DatasetImporter(
        root_path=req.dataset_path,
        admin_id=str(current_user.id),
        only_pending=req.only_pending,
        default_difficulty=req.default_difficulty or "medium"
    )
    result = importer.run(
        limit=req.test_limit,
        rl=req.include_reading_listening,
        writing=req.include_writing,
        speaking=req.include_speaking,
        selected_tests=req.selected_tests
    )

    skipped = result.get("tests_skipped_existing", 0)
    created = result.get("tests_created", 0)
    success = len(result["errors"]) == 0 or created > 0 or skipped > 0

    msg = f"Đã nạp {created} đề thi mới ({skipped} đề đã tồn tại bỏ qua), {result['sections_created']} sections, {result['questions_created']} câu hỏi."
    if result["errors"]:
        msg += f" (Có {len(result['errors'])} cảnh báo)"

    return CrawledDatasetIngestResponse(
        success=success,
        message=msg,
        test_sets_created=result["test_sets_created"],
        tests_created=created,
        tests_skipped_existing=skipped,
        sections_created=result["sections_created"],
        question_groups_created=result["question_groups_created"],
        questions_created=result["questions_created"],
        topics_created=result["topics_created"],
        errors=result["errors"]
    )

@router.post("/ingest/stream")
async def ingest_crawled_dataset_stream(
    req: CrawledDatasetIngestRequest,
    current_user: User = Depends(require_admin)
):
    """
    Nạp dữ liệu từ kho dataset theo luồng Server-Sent Events (SSE) thời gian thực.
    """
    msg_queue: queue.Queue = queue.Queue()

    def progress_callback(data):
        msg_queue.put({"type": "progress", "data": data})

    def run_import():
        try:
            importer = DatasetImporter(
                root_path=req.dataset_path,
                admin_id=str(current_user.id),
                only_pending=req.only_pending,
                progress_callback=progress_callback,
                default_difficulty=req.default_difficulty or "medium"
            )
            result = importer.run(
                limit=req.test_limit,
                rl=req.include_reading_listening,
                writing=req.include_writing,
                speaking=req.include_speaking,
                selected_tests=req.selected_tests
            )
            msg_queue.put({"type": "done", "result": result})
        except Exception as e:
            msg_queue.put({"type": "error", "error": str(e)})

    thread = threading.Thread(target=run_import)
    thread.start()

    async def event_generator():
        yield f"data: {json.dumps({'type': 'start', 'message': 'Khởi tạo luồng nạp dữ liệu...'}, ensure_ascii=False)}\n\n"
        while True:
            try:
                item = msg_queue.get_nowait()
                yield f"data: {json.dumps(item, ensure_ascii=False)}\n\n"
                if item["type"] in ("done", "error"):
                    break
            except queue.Empty:
                await asyncio.sleep(0.1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
