"""Xem và sửa ghi đè cấu hình chạy (US9): kiểm → gọi thử → lưu → audit → báo engine nạp lại (FR-033..039)."""
from typing import Any, Optional

from app.clients.ai_engine import admin_client as engine
from app.core.domain_errors import NotFoundError
from app.services.admin.staff_accounts import write_audit
from app.services.ai_services import ai_runtime_config_store as store
from app.services.ai_services.ai_allowed_models import get_allowed_models
from app.services.ai_services.ai_config_change_flow import refresh_engine_quietly, run_test_call
from app.services.ai_services.ai_runtime_config_export import clean_override
from app.services.ai_services.ai_runtime_config_rules import GROUP_FIELDS, validate_changes
from app.services.ai_services.ai_service_errors import UnprocessableError
from app.services.ai_services.ai_step_catalog import STEPS

ENGINE_DOWN_WARNING = "Không kết nối được AI engine: chưa xem được cấu hình đang có hiệu lực"


async def load_effective_config() -> Optional[dict[str, Any]]:
    """None khi engine không trả lời."""
    try:
        return await engine.effective_config()
    except (engine.AiEngineUnavailable, engine.AiEngineHttpError):
        return None


def _effective_step(effective: Optional[dict], step: str) -> Optional[dict]:
    if not effective:
        return None
    return next((s for s in effective.get("steps", []) if s.get("step") == step), None)


async def get_runtime_config_view() -> dict[str, Any]:
    config = store.read_runtime_config()
    value = config["value"]
    effective = await load_effective_config()
    steps = [{"step": key, "label": label, "prompts": prompts,
              "effective": _effective_step(effective, key), "override": clean_override(value["steps"].get(key, {}))}
             for key, (label, prompts) in STEPS.items()]
    view = {
        "steps": steps,
        "llm": {"effective": effective.get("llm") if effective else None, "override": clean_override(value["llm"])},
        "jev": {"effective": effective.get("jev") if effective else None, "override": clean_override(value["jev"])},
        "allowed_models": get_allowed_models(),
        "updated_at": config["updated_at"], "updated_by_email": store.email_of(config["updated_by"]),
    }
    if effective is None:
        view["warning"] = ENGINE_DOWN_WARNING
    return view


def _field_value(effective_entry: Optional[dict], field: str, kept_override: Optional[dict] = None) -> Any:
    """Giá trị dùng khi gọi thử: ghi đè mới nếu có, không thì giá trị đang hiệu lực. Trường vừa bỏ ghi đè
    mà giá trị hiệu lực đang đến từ app thì để None (engine tự lấy mặc định, không thử lại giá trị cũ)."""
    if kept_override and kept_override.get(field) is not None:
        return kept_override[field]
    entry = (effective_entry or {}).get(field)
    if isinstance(entry, dict) and entry.get("source") != "app":
        return entry.get("value")
    return None


def _save(admin_id: str, group: str, key: str, current: dict, after: dict) -> None:
    """Đọc–sửa–ghi chỉ phần của bước/nhóm này; key là tên bước (group='steps') hoặc tên nhóm."""
    value = store.read_runtime_config()["value"]
    if group == "steps":
        steps = {k: v for k, v in value["steps"].items() if k != key}
        if after:
            steps[key] = after
        value["steps"] = steps
    else:
        value[group] = after
    store.write_runtime_config(value, admin_id)
    entity_id = f"steps.{key}" if group == "steps" else group
    write_audit(admin_id, "update_ai_runtime_config", "system_settings", entity_id,
                before=clean_override(current), after=after)


def _merge(current: dict, changes: dict) -> dict:
    """null trong changes xoá trường; trường không gửi giữ nguyên."""
    return clean_override({**current, **changes})


async def update_step_override(admin_id: str, step: str, changes: dict[str, Any]) -> dict[str, Any]:
    if step not in STEPS:
        raise NotFoundError(f"Không có bước '{step}'")
    validate_changes("steps", _only(changes, "steps"), get_allowed_models())
    current = store.read_runtime_config()["value"]["steps"].get(step, {})
    merged = _merge(current, changes)
    effective_step = _effective_step(await load_effective_config(), step)
    payload = {"kind": "llm", "model": _field_value(effective_step, "model", merged),
               "temperature": _field_value(effective_step, "temperature", merged),
               "max_tokens": _field_value(effective_step, "max_tokens", merged),
               "api_key": None, "use_env_key": False}
    test = await run_test_call(payload)
    _save(admin_id, "steps", step, current, merged)
    await refresh_engine_quietly()
    return {"step": step, "override": merged, "test": test}


def _only(changes: dict, group: str) -> dict:
    unknown = set(changes) - set(GROUP_FIELDS[group])
    if unknown:
        raise UnprocessableError(f"Trường không hợp lệ: {', '.join(sorted(unknown))}")
    return changes


async def update_group_override(admin_id: str, group: str, changes: dict[str, Any]) -> dict[str, Any]:
    """group: 'llm' (timeout, thinking) hoặc 'jev' (model, timeout)."""
    validate_changes(group, _only(changes, group), [])
    current = store.read_runtime_config()["value"][group]
    merged = _merge(current, changes)
    effective = await load_effective_config()
    section = (effective or {}).get(group)
    payload = {"kind": group, "timeout_seconds": _field_value(section, "timeout_seconds", merged),
               "api_key": None, "use_env_key": False}
    if group == "llm":
        payload["enable_thinking"] = _field_value(section, "enable_thinking", merged)
        payload["model"] = None   # model mặc định của engine
    else:
        payload["model"] = _field_value(section, "model", merged)
    test = await run_test_call(payload)
    _save(admin_id, group, group, current, merged)
    await refresh_engine_quietly()
    return {"group": group, "override": merged, "test": test}
