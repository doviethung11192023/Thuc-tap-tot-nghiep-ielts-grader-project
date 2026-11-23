"""Dọn dữ liệu truy vết cũ hằng ngày (US8, FR-030, FR-031): trace Langfuse ≥ 90 ngày, output/lỗi lượt lỗi > 180 ngày.

Chạy lặp an toàn: xoá trace là idempotent ở engine, cửa sổ 90–97 ngày để ngày cron nghỉ vẫn được bù, còn
số liệu sử dụng (model, token, chi phí, thời gian, trạng thái) không bao giờ bị xoá.
"""
import logging
from datetime import timedelta
from typing import Any

import httpx

from app.clients.ai_engine.grading_client import _engine_url, _headers
from app.db.supabase import db
from app.services.admin.staff_accounts import write_audit
from app.services.ai_monitoring.ai_monitoring_time import now_vn
from app.services.ai_monitoring.paged_rows import chunks, fetch_all

logger = logging.getLogger(__name__)
TRACE_MIN_AGE_DAYS = 90
TRACE_WINDOW_DAYS = 7          # bù các ngày cron không chạy
FAILED_OUTPUT_AGE_DAYS = 180
TRACE_DELETE_BATCH = 500       # engine nhận tối đa 500 trace mỗi lần
DELETE_TIMEOUT_SECONDS = 60.0


def _old_trace_ids() -> list[str]:
    newest = (now_vn() - timedelta(days=TRACE_MIN_AGE_DAYS)).isoformat()
    oldest = (now_vn() - timedelta(days=TRACE_MIN_AGE_DAYS + TRACE_WINDOW_DAYS)).isoformat()
    rows = fetch_all(lambda: db().table("grading_runs").select("trace_id")
                     .not_.is_("trace_id", "null").lte("started_at", newest).gte("started_at", oldest)
                     .order("started_at"))
    return sorted({r["trace_id"] for r in rows})


async def delete_old_traces() -> int:
    """Gửi AI engine xoá các trace quá hạn; trả số trace engine báo đã xoá. Engine lỗi → ném lỗi cho cron ghi log."""
    trace_ids = _old_trace_ids()
    deleted = 0
    async with httpx.AsyncClient(timeout=DELETE_TIMEOUT_SECONDS) as client:
        for part in chunks(trace_ids, TRACE_DELETE_BATCH):
            response = await client.post(_engine_url("/admin/traces/delete"), headers=_headers(),
                                         json={"trace_ids": part})
            response.raise_for_status()
            deleted += int(response.json().get("deleted") or 0)
            # Trace đã xoá: bỏ trace_id để ngày sau không gửi xoá và ghi audit lại cùng trace (link cũng ẩn)
            failed = set(response.json().get("failed") or [])
            done = [trace_id for trace_id in part if trace_id not in failed]
            if done:
                db().table("grading_runs").update({"trace_id": None}).in_("trace_id", done).execute()
    return deleted


def clear_old_failed_outputs() -> int:
    """Xoá output và lỗi của lượt thất bại cũ hơn 180 ngày; trả số lượt đã xoá nội dung."""
    cutoff = (now_vn() - timedelta(days=FAILED_OUTPUT_AGE_DAYS)).isoformat()
    rows = db().table("grading_runs").update({"output": None, "error": None}).eq("status", "failed") \
        .lt("started_at", cutoff).or_("output.not.is.null,error.not.is.null").execute().data or []
    return len(rows)


async def purge_old_ai_traces() -> dict[str, Any]:
    """Một lần chạy của cron 03:30. Từng bước độc lập: lỗi xoá trace không chặn dọn output."""
    result = {"traces": 0, "outputs_cleared": 0}
    try:
        result["traces"] = await delete_old_traces()
    except Exception as e:
        logger.warning("Không xoá được trace cũ: %s", e)
    try:
        result["outputs_cleared"] = clear_old_failed_outputs()
    except Exception as e:
        logger.warning("Không xoá được output lượt lỗi cũ: %s", e)
    if result["traces"] or result["outputs_cleared"]:
        write_audit(None, "purge_ai_traces", "grading_runs", after=result)
    return result
