"""Sức khoẻ các service AI (US11): Core tự kiểm engine (3 s), rồi hỏi engine về các service phụ thuộc (20 s)."""
import time
from datetime import datetime, timezone
from typing import Any

from app.clients.ai_engine import admin_client as engine
from app.services.ai_services.ai_service_errors import UnprocessableError
from app.services.ai_services.secret_redaction import redact_secrets

LABELS = {
    "ai_engine": "AI engine (chấm bài)", "llm": "LLM (DashScope)", "jev": "Phân loại đề (Jev)",
    "langfuse": "Langfuse (prompt, trace)", "whisper": "Nhận dạng giọng nói (Whisper)",
    "phoneme": "Nhận dạng âm vị", "languagetool": "Kiểm tra ngữ pháp (LanguageTool)",
    "config_sync": "Đồng bộ cấu hình từ Core",
}
DEPENDENT = [name for name in LABELS if name != "ai_engine"]


def _row(service: str, status: str, latency_ms=None, detail=None, error=None) -> dict[str, Any]:
    return {"service": service, "label": LABELS.get(service, service), "status": status,
            "latency_ms": latency_ms, "detail": detail, "error": error}


async def _check_engine() -> dict[str, Any]:
    started = time.perf_counter()
    try:
        await engine.check_alive()
    except engine.AiEngineUnavailable as e:
        timed_out = "Hết thời gian" in str(e)
        return _row("ai_engine", "timeout" if timed_out else "error", error=str(e))
    except engine.AiEngineHttpError as e:
        return _row("ai_engine", "error", error=redact_secrets(f"HTTP {e.status_code}"))
    return _row("ai_engine", "ok", latency_ms=int((time.perf_counter() - started) * 1000))


async def collect_health(service: str = "all") -> dict[str, Any]:
    if service != "all" and service not in LABELS:
        raise UnprocessableError(f"Service không hợp lệ: {service}")
    checked_at = datetime.now(timezone.utc).isoformat()
    engine_row = await _check_engine()
    wanted = DEPENDENT if service == "all" else ([] if service == "ai_engine" else [service])
    rows: list[dict[str, Any]] = [engine_row] if service in ("all", "ai_engine") else []
    if wanted:
        rows += await _dependent_rows(engine_row, wanted, service)
    return {"checked_at": checked_at, "services": rows}


async def _dependent_rows(engine_row: dict, wanted: list[str], service: str) -> list[dict[str, Any]]:
    """Engine tắt hoặc không trả lời thì mọi dòng phụ thuộc là unknown, không bịa trạng thái."""
    reason = None
    if engine_row["status"] != "ok":
        reason = "AI engine không kết nối được"
    else:
        try:
            data = await engine.services_health(service)
            by_name = {s.get("service"): s for s in data.get("services", [])}
            return [_row(name, **{k: by_name[name].get(k) for k in ("status", "latency_ms", "detail", "error")})
                    if name in by_name else _row(name, "unknown", error="Engine không trả service này")
                    for name in wanted]
        except (engine.AiEngineUnavailable, engine.AiEngineHttpError) as e:
            reason = str(e)
    return [_row(name, "unknown", error=reason) for name in wanted]
