"""
The configuration that grading really uses per step, with where each value comes from (spec 008 FR-034).

Uses the same resolution function as PromptManager, so the page can never disagree with grading.
Core only displays this; it holds no copy of the rules.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor

from services.langfuse.prompt_param_resolution import PARAM_NAMES, Param, resolve_prompt_params
from services.llm.prompt_builder import get_prompt_manager
from services.runtime_config.ai_step_registry import STEP_LABELS, STEP_PROMPTS
from services.runtime_config.runtime_config_client import get_runtime_config_client
from services.runtime_config.runtime_config_model import RuntimeConfig
from services.runtime_config.secret_redaction import last4
from settings.config import get_settings

_FETCH_WORKERS = 8


def _setting_param(settings, field: str) -> Param:
    explicit = field in settings.model_fields_set
    return Param(getattr(settings, field), "env" if explicit else "default")


def _shown(param: Param) -> dict:
    return {"value": param.value, "source": param.source}


def _langfuse_configs(names: list[str]) -> dict[str, tuple[dict, str | None]]:
    """Production config of each prompt (SDK-cached for 60 s); an unreachable prompt gives ({}, error)."""
    manager = get_prompt_manager()

    def fetch(name: str) -> tuple[dict, str | None]:
        try:
            return dict(manager._fetch(name).config or {}), None
        except Exception as error:
            return {}, str(error)[:300]

    with ThreadPoolExecutor(max_workers=_FETCH_WORKERS) as pool:
        return dict(zip(names, pool.map(fetch, names)))


def _step_entry(step: str, configs: dict, settings, runtime: RuntimeConfig) -> dict:
    per_prompt, errors = [], []
    for name in STEP_PROMPTS[step]:
        config, error = configs[name]
        if error:
            errors.append(f"{name}: {error}")
        per_prompt.append((name, resolve_prompt_params(name, config, settings, runtime)))
    first = per_prompt[0][1]
    entry = {"step": step, "label": STEP_LABELS[step], "prompts": list(STEP_PROMPTS[step]),
             **{field: _shown(first[field]) for field in PARAM_NAMES}}
    notes = []
    if any(params[field] != first[field] for _, params in per_prompt for field in PARAM_NAMES):
        entry["per_prompt"] = [
            {"name": name, **{field: params[field].value for field in PARAM_NAMES},
             "sources": {field: params[field].source for field in PARAM_NAMES}}
            for name, params in per_prompt]
        notes.append("Các prompt trong bước có giá trị khác nhau: bấm \"Xem từng prompt\"")
    if errors:
        notes.append("Không đọc được config Langfuse: " + "; ".join(errors))
    if notes:
        entry["note"] = ". ".join(notes)
    return entry


def build_effective_config() -> dict:
    """Blocking (reads Langfuse and maybe Core): call it from a thread."""
    settings = get_settings()
    client = get_runtime_config_client()
    runtime = client.get()
    names = [name for prompts in STEP_PROMPTS.values() for name in prompts]
    configs = _langfuse_configs(names)

    def app_or_setting(override, field: str) -> dict:
        return _shown(Param(override, "app") if override is not None else _setting_param(settings, field))

    status = client.status()
    return {
        "steps": [_step_entry(step, configs, settings, runtime) for step in STEP_PROMPTS],
        "llm": {"timeout_seconds": app_or_setting(runtime.llm.timeout_seconds or None, "llm_timeout_seconds"),
                "enable_thinking": app_or_setting(runtime.llm.enable_thinking, "llm_enable_thinking")},
        "jev": {"model": app_or_setting(runtime.jev.model, "jev_model"),
                "timeout_seconds": app_or_setting(runtime.jev.timeout_seconds or None, "jev_timeout_seconds")},
        "env_keys": {
            "dashscope": {"configured": bool(settings.resolved_llm_api_key),
                          "last4": last4(settings.resolved_llm_api_key)},
            "typesafe": {"configured": bool(settings.typesafe_api_key), "last4": last4(settings.typesafe_api_key)},
        },
        "config_sync": {"source": status["source"], "last_ok_at": status["last_ok_at"],
                        "last_error": status["last_error"]},
    }
