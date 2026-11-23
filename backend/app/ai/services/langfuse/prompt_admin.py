"""
Admin operations on Langfuse prompts (spec 008 US5, R7): list, read, create a version, move the production label.

Prompts live only on Langfuse (constitution VII): nothing here stores a prompt locally. A new version is created
without a label, so it cannot reach grading until an Admin moves `production` to it. Only names in
ALL_PROMPT_NAMES can be touched. Functions take an optional `client` so tests can pass a fake.
"""
from __future__ import annotations

import re
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from services.langfuse.client import get_langfuse_client
from services.langfuse.prompt_registry import ALL_PROMPT_NAMES
from services.runtime_config.ai_step_registry import step_for_prompt

PRODUCTION = "production"
RECENT_VERSIONS = 5            # versions listed per prompt on the overview (production is always included)
_VARIABLE = re.compile(r"\{\{\s*([A-Za-z0-9_]+)\s*\}\}")
_ROLES = {"system", "user", "assistant"}
_WORKERS = 8


class PromptAdminError(Exception):
    """Base class: `status_code` is what the route answers with."""
    status_code = 500


class PromptNotRegistered(PromptAdminError):
    status_code = 404


class PromptVersionNotFound(PromptAdminError):
    status_code = 404


class PromptValidationError(PromptAdminError):
    status_code = 422


class LangfuseUnavailable(PromptAdminError):
    status_code = 502


def _check_registered(name: str) -> None:
    if name not in ALL_PROMPT_NAMES:
        raise PromptNotRegistered(f"Prompt '{name}' is not a registered prompt")


def _is_not_found(error: Exception) -> bool:
    return getattr(error, "status_code", None) == 404


def _get_version(client: Any, name: str, version: int | None = None, label: str | None = None) -> Any | None:
    """One prompt version from the Langfuse API; None when it does not exist."""
    try:
        # API cấp thấp không mã hoá "/" trong tên (writing/common/cc → 404); update_prompt cấp cao thì có
        return client.api.prompts.get(quote(name, safe=""), version=version, label=label)
    except Exception as error:
        if _is_not_found(error):
            return None
        raise LangfuseUnavailable(f"Langfuse request failed: {str(error)[:200]}") from error


def _messages(prompt: Any) -> list[dict]:
    if isinstance(prompt.prompt, str):
        return [{"role": "user", "content": prompt.prompt}]
    return [item.model_dump(exclude_none=True) if hasattr(item, "model_dump") else dict(item)
            for item in prompt.prompt]


def _created_at(prompt: Any) -> str | None:
    value = getattr(prompt, "created_at", None) or (getattr(prompt, "model_extra", None) or {}).get("createdAt")
    return value.isoformat() if hasattr(value, "isoformat") else (str(value) if value else None)


def _version_summary(prompt: Any) -> dict:
    return {"version": prompt.version, "labels": list(prompt.labels), "created_at": _created_at(prompt),
            "config": prompt.config or {}, "is_production": PRODUCTION in prompt.labels}


def variables_of(messages: list[dict]) -> set[str]:
    """Names of the {{variables}} used by a list of chat messages."""
    found: set[str] = set()
    for message in messages:
        found.update(_VARIABLE.findall(str(message.get("content") or "")))
    return found


def _overview_of(client: Any, name: str, versions: list[int]) -> dict:
    production = _get_version(client, name, label=PRODUCTION)
    wanted = sorted(set(versions), reverse=True)[:RECENT_VERSIONS]
    summaries = {}
    for number in wanted:
        prompt = production if production is not None and production.version == number \
            else _get_version(client, name, version=number)
        if prompt is not None:
            summaries[number] = _version_summary(prompt)
    if production is not None and production.version not in summaries:
        summaries[production.version] = _version_summary(production)
    return {
        "name": name, "step": step_for_prompt(name),
        "production_version": production.version if production is not None else None,
        "versions": [summaries[number] for number in sorted(summaries, reverse=True)],
        "required_variables": sorted(variables_of(_messages(production))) if production is not None else [],
    }


def _all_versions(client: Any) -> dict[str, list[int]]:
    """prompt name -> version numbers, for every prompt on the Langfuse project."""
    found: dict[str, list[int]] = {}
    page = 1
    try:
        while True:
            response = client.api.prompts.list(page=page, limit=100)
            for meta in response.data:
                found[meta.name] = list(meta.versions)
            if page >= (response.meta.total_pages or 1):
                return found
            page += 1
    except Exception as error:
        raise LangfuseUnavailable(f"Langfuse request failed: {str(error)[:200]}") from error


def list_prompts(client: Any = None) -> list[dict]:
    client = client or get_langfuse_client()
    existing = _all_versions(client)
    with ThreadPoolExecutor(max_workers=_WORKERS) as pool:
        return list(pool.map(lambda name: _overview_of(client, name, existing.get(name, [])), ALL_PROMPT_NAMES))


def get_prompt_detail(name: str, version: int | None = None, client: Any = None) -> dict:
    _check_registered(name)
    client = client or get_langfuse_client()
    prompt = _get_version(client, name, version=version, label=None if version else PRODUCTION)
    if prompt is None:
        raise PromptVersionNotFound(f"Prompt '{name}' has no version {version or PRODUCTION}")
    return {"name": name, "version": prompt.version, "labels": list(prompt.labels),
            "type": getattr(prompt, "type", "chat"), "prompt": _messages(prompt), "config": prompt.config or {}}


def _validate_config(config: Any) -> None:
    if not isinstance(config, dict):
        raise PromptValidationError("config must be a JSON object")
    temperature, max_tokens = config.get("temperature"), config.get("max_tokens")
    if temperature is not None and (isinstance(temperature, bool) or not isinstance(temperature, (int, float))):
        raise PromptValidationError("config.temperature must be a number")
    if max_tokens is not None and (isinstance(max_tokens, bool) or not isinstance(max_tokens, int)):
        raise PromptValidationError("config.max_tokens must be an integer")


def create_version(name: str, messages: list[dict], config: dict, client: Any = None) -> dict:
    """New version without any label. Must keep every {{variable}} of the production version."""
    _check_registered(name)
    _validate_config(config)
    if not messages or any(m.get("role") not in _ROLES or not str(m.get("content") or "").strip()
                           for m in messages):
        raise PromptValidationError("prompt must be a non-empty list of {role, content} messages "
                                    "with role system, user or assistant")
    client = client or get_langfuse_client()
    production = _get_version(client, name, label=PRODUCTION)
    if production is None:
        raise PromptValidationError(f"'{name}' has no production version to compare variables with")
    missing = variables_of(_messages(production)) - variables_of(messages)
    if missing:
        raise PromptValidationError("Missing variables: " + ", ".join(sorted("{{%s}}" % v for v in missing)))
    try:
        created = client.create_prompt(name=name, prompt=[{"role": m["role"], "content": m["content"]}
                                                          for m in messages],
                                       labels=[], type="chat", config=config)
    except Exception as error:
        raise LangfuseUnavailable(f"Langfuse request failed: {str(error)[:200]}") from error
    return {"name": name, "version": created.version}


def set_production(name: str, version: int, client: Any = None) -> dict:
    _check_registered(name)
    client = client or get_langfuse_client()
    if _get_version(client, name, version=version) is None:
        raise PromptVersionNotFound(f"Prompt '{name}' has no version {version}")
    previous = _get_version(client, name, label=PRODUCTION)
    try:
        client.update_prompt(name=name, version=version, new_labels=[PRODUCTION])
        client.clear_prompt_cache()
    except Exception as error:
        raise LangfuseUnavailable(f"Langfuse request failed: {str(error)[:200]}") from error
    return {"name": name, "previous_version": previous.version if previous is not None else None,
            "version": version}
