"""Gắn độ lệch Expert − AI lên trace Langfuse của các lượt chấm AI khi Expert nộp (US12, FR-057).

Chạy nền sau khi Expert nộp xong. Mọi lỗi (Langfuse, AI engine, DB) chỉ ghi log: không làm hỏng việc nộp
và không thử lại. Core không có Langfuse SDK nên gửi qua endpoint /admin/traces/scores của AI engine.
"""
import asyncio
import logging
from typing import Any

import httpx

from app.clients.ai_engine_client import _engine_url, _headers
from app.services.ai_monitoring.ai_expert_gap_pairs import EvalPair, load_pairs, load_runs

logger = logging.getLogger(__name__)
SCORE_BATCH = 50           # engine nhận tối đa 50 score mỗi lần
SCORE_TIMEOUT_SECONDS = 20.0
_background: set[asyncio.Task] = set()      # giữ tham chiếu để task nền không bị thu dọn giữa chừng


def _clamp(value: float) -> float:
    return round(max(-9.0, min(9.0, value)), 2)      # engine chỉ nhận [-9, 9]


def build_score_items(pair: EvalPair, trace_ids: list[str]) -> list[dict[str, Any]]:
    """Một score cho mỗi (trace, overall hoặc tiêu chí): name = expert_minus_ai_<overall|ta|tr|cc|lr|gra|fc|p>."""
    values: dict[str, float] = {}
    if pair.overall_diff() is not None:
        values["overall"] = pair.overall_diff()
    values.update({code.lower(): diff for code, diff in pair.criterion_diffs().items()})
    return [{"trace_id": trace_id, "name": f"expert_minus_ai_{name}", "value": _clamp(value)}
            for trace_id in trace_ids for name, value in values.items()]


async def push_expert_gap_scores(attempt_id: str) -> int:
    """Trả số score đã gửi. Cặp = AI xong mới nhất với Expert chính thức vừa nộp."""
    pairs = await asyncio.to_thread(load_pairs, None, None, attempt_id)
    if not pairs:
        return 0
    pair = pairs[0]
    runs = (await asyncio.to_thread(load_runs, [pair.ai["id"]])).get(pair.ai["id"], [])
    trace_ids = sorted({r["trace_id"] for r in runs if r.get("trace_id")})
    items = build_score_items(pair, trace_ids)
    sent = 0
    async with httpx.AsyncClient(timeout=SCORE_TIMEOUT_SECONDS) as client:
        for i in range(0, len(items), SCORE_BATCH):
            response = await client.post(_engine_url("/admin/traces/scores"), headers=_headers(),
                                         json={"items": items[i:i + SCORE_BATCH]})
            if response.status_code == 200:
                sent += int(response.json().get("sent") or 0)
            else:
                logger.warning("Gửi score trace lỗi HTTP %s (attempt %s)", response.status_code, attempt_id)
    return sent


async def _push_safely(attempt_id: str) -> None:
    try:
        await push_expert_gap_scores(attempt_id)
    except Exception as e:      # FR-057: lỗi gửi không được ảnh hưởng việc Expert nộp
        logger.warning("Không gửi được score Expert − AI của attempt %s: %s", attempt_id, e)


def schedule_expert_gap_scores(attempt_id: str) -> None:
    """Đặt việc gửi score chạy nền. Không bao giờ raise (kể cả khi không có event loop)."""
    try:
        task = asyncio.get_running_loop().create_task(_push_safely(attempt_id))
        _background.add(task)
        task.add_done_callback(_background.discard)
    except Exception as e:
        logger.warning("Không đặt được việc gửi score cho attempt %s: %s", attempt_id, e)
