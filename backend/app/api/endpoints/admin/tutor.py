"""Endpoints quản trị Trợ lý AI Luyện tập: Overview/KPI, Encrypted Secrets, Live Ping, Flush Cache."""
from typing import Any, Dict, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.security import User, require_admin
from app.services.admin.staff_accounts import write_audit
from app.services.tutor.tutor_config_store import (
    DEFAULT_AI_TUTOR_CONFIG,
    PROVIDER_BASE_URLS,
    get_tutor_config_cached,
    validate_base_url,
)
from app.services.tutor.tutor_quota_and_stats import flush_quick_chip_cache, get_admin_tutor_stats
from app.services.tutor.tutor_secrets_store import (
    VALID_PROVIDERS,
    get_tutor_secret_overrides,
    mask_secret,
    save_tutor_secret_overrides,
)

router = APIRouter()


def _ai_base_url() -> str:
    base = (settings.AI_ENGINE_URL or "http://localhost:8001/grade").rstrip("/")
    return base[:-6] if base.endswith("/grade") else base


def _ai_headers() -> Dict[str, str]:
    sec = (settings.AI_ENGINE_SECRET or "").strip()
    return {"X-AI-Engine-Secret": sec} if sec else {}


class TutorSecretsUpdateBody(BaseModel):
    secrets: Dict[str, Optional[str]] = Field(default_factory=dict)


class TutorPingBody(BaseModel):
    provider: str = "qwen"
    model: str = "qwen-flash"
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    enable_thinking: bool = False
    timeout_seconds: int = Field(default=15, ge=5, le=45)


async def _fetch_env_providers() -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{_ai_base_url()}/tutor/providers", headers=_ai_headers())
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass
    return {}


@router.get("/tutor/overview")
async def get_admin_tutor_overview(request: Request, current_user: User = Depends(require_admin)):
    cfg = get_tutor_config_cached()
    redis = getattr(request.app.state, "redis", None)
    stats = await get_admin_tutor_stats(redis)
    overrides = get_tutor_secret_overrides()
    env_status = await _fetch_env_providers()

    providers: Dict[str, Dict[str, Any]] = {}
    for prov in ("qwen", "groq", "gemini", "openai_compatible"):
        has_override = bool(overrides.get(prov))
        env_info = env_status.get(prov) or {}
        has_env = bool(env_info.get("configured"))
        source = "admin_override" if has_override else ("env" if has_env else "missing")
        providers[prov] = {
            "provider": prov,
            "key_source": source,
            "has_override": has_override,
            "env_configured": has_env,
            "masked_key": mask_secret(overrides[prov]) if has_override else ("•••• (.env)" if has_env else ""),
            "default_base_url": env_info.get("base_url") or PROVIDER_BASE_URLS[prov],
            "default_model": env_info.get("default_model") or "",
        }

    return {
        "meta": {"code": 200, "message": "OK"},
        "data": {
            "config": cfg,
            "defaults": DEFAULT_AI_TUTOR_CONFIG,
            "stats": stats,
            "providers": providers,
            "ai_engine_reachable": bool(env_status),
        },
    }


@router.put("/tutor/secrets")
def update_admin_tutor_secrets(body: TutorSecretsUpdateBody, current_user: User = Depends(require_admin)):
    masked = save_tutor_secret_overrides(str(current_user.id), body.secrets)
    return {"meta": {"code": 200, "message": "Đã cập nhật khóa API mã hóa thành công"}, "data": {"masked_overrides": masked}}


@router.post("/tutor/ping")
async def ping_admin_tutor_model(body: TutorPingBody, current_user: User = Depends(require_admin)):
    prov = body.provider.lower().strip()
    if prov not in VALID_PROVIDERS:
        raise HTTPException(status_code=400, detail="Provider không hợp lệ")
    target_url = validate_base_url(body.base_url or PROVIDER_BASE_URLS[prov], "base_url")
    overrides = get_tutor_secret_overrides()
    effective_key = (body.api_key or "").strip() or overrides.get(prov) or None
    req_payload = {
        "provider": prov,
        "model": body.model.strip(),
        "base_url": target_url,
        "api_key": effective_key,
        "enable_thinking": body.enable_thinking,
        "timeout_seconds": body.timeout_seconds,
    }
    try:
        async with httpx.AsyncClient(timeout=float(body.timeout_seconds) + 5.0) as client:
            resp = await client.post(f"{_ai_base_url()}/tutor/ping", json=req_payload, headers=_ai_headers())
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=f"AI Engine trả lỗi HTTP {resp.status_code}")
            result = resp.json()
    except HTTPException:
        raise
    except Exception as exc:
        return {"meta": {"code": 200, "message": "Không kết nối được AI Engine"}, "data": {"ok": False, "error": str(exc)[:200]}}
    return {"meta": {"code": 200, "message": "OK"}, "data": result}


@router.post("/tutor/flush-cache")
async def flush_admin_tutor_cache(request: Request, current_user: User = Depends(require_admin)):
    removed = await flush_quick_chip_cache(getattr(request.app.state, "redis", None))
    write_audit(str(current_user.id), "flush_ai_tutor_cache", "redis", "tutor:cache:*", after={"removed": removed})
    return {"meta": {"code": 200, "message": f"Đã xóa {removed} mục cache gợi ý nhanh"}, "data": {"removed": removed}}
