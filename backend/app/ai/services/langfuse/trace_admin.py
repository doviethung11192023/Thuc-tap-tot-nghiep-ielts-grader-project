"""Admin operations on Langfuse traces: delete in bulk and attach AI-vs-Expert gap scores (spec 008 US8, US12)."""
from __future__ import annotations

import logging
import re
from typing import Any

from services.langfuse.client import get_langfuse_client
from settings.config import get_settings

logger = logging.getLogger(__name__)

DELETE_CHUNK = 100
SCORE_NAME = re.compile(r"^expert_minus_ai_(overall|ta|tr|cc|lr|gra|fc|p)$")
SCORE_RANGE = 9.0
_TRACE_ID = re.compile(r"^[0-9a-f]{32}$")


def _configured() -> bool:
    settings = get_settings()
    return bool(settings.langfuse_public_key and settings.langfuse_secret_key)


def delete_traces(trace_ids: list[str], client: Any = None) -> dict:
    """{deleted, failed}. Safe to repeat: a trace that is already gone counts as deleted."""
    unique = list(dict.fromkeys(trace_ids))
    bad = [t for t in unique if not _TRACE_ID.match(t)]
    good = [t for t in unique if t not in bad]
    if not good:
        return {"deleted": 0, "failed": bad}
    if client is None and not _configured():
        return {"deleted": 0, "failed": unique}
    client = client or get_langfuse_client()
    deleted, failed = 0, list(bad)
    for start in range(0, len(good), DELETE_CHUNK):
        chunk = good[start:start + DELETE_CHUNK]
        try:
            client.api.trace.delete_multiple(trace_ids=chunk)
            deleted += len(chunk)
        except Exception as error:
            if getattr(error, "status_code", None) == 404:
                deleted += len(chunk)
                continue
            logger.warning("Langfuse trace delete failed for %d traces: %s", len(chunk), str(error)[:200])
            failed.extend(chunk)
    return {"deleted": deleted, "failed": failed}


def _invalid_reason(item: dict) -> str | None:
    if not _TRACE_ID.match(str(item.get("trace_id", ""))):
        return "invalid trace_id"
    if not SCORE_NAME.match(str(item.get("name", ""))):
        return "invalid score name"
    value = item.get("value")
    if isinstance(value, bool) or not isinstance(value, (int, float)) or abs(value) > SCORE_RANGE:
        return "value must be a number in [-9, 9]"
    return None


def send_scores(items: list[dict], client: Any = None) -> dict:
    """{sent, failed}. Never raises: Langfuse trouble is reported in `failed`. Same trace+name overwrites."""
    failed, sendable = [], []
    for item in items:
        reason = _invalid_reason(item)
        if reason:
            failed.append({"trace_id": item.get("trace_id"), "name": item.get("name"), "error": reason})
        else:
            sendable.append(item)
    if sendable and client is None and not _configured():
        failed += [{"trace_id": i["trace_id"], "name": i["name"], "error": "langfuse_not_configured"}
                   for i in sendable]
        return {"sent": 0, "failed": failed}
    sent = 0
    try:
        client = client or get_langfuse_client()
        for item in sendable:
            try:
                client.create_score(
                    trace_id=item["trace_id"], name=item["name"], value=float(item["value"]),
                    data_type="NUMERIC", comment=item.get("comment") or None,
                    score_id=f"{item['trace_id']}-{item['name']}")      # idempotency key: a resend replaces
                sent += 1
            except Exception as error:
                failed.append({"trace_id": item["trace_id"], "name": item["name"], "error": str(error)[:200]})
        client.flush()
    except Exception as error:
        logger.warning("Langfuse score flush failed: %s", str(error)[:200])
        failed += [{"trace_id": i["trace_id"], "name": i["name"], "error": "langfuse_unavailable"}
                   for i in sendable[sent:]]
    return {"sent": sent, "failed": failed}
