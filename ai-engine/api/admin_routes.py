"""
/admin/* routes of the engine (spec 008, contracts/ai-engine-admin-api.md). Only the Core API calls them,
with X-AI-Engine-Secret. No route returns a full key. The logic lives in services/service_admin and
services/langfuse; this file only maps HTTP to those functions.
"""
import asyncio
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from api.auth import require_engine_secret_strict
from services.langfuse import prompt_admin, trace_admin
from services.runtime_config.runtime_config_client import get_runtime_config_client
from services.service_admin.effective_config import build_effective_config
from services.service_admin.service_health import SERVICES, check_health
from services.service_admin.service_test_call import ServiceTestRequest, run_service_test

router = APIRouter(prefix="/admin", dependencies=[Depends(require_engine_secret_strict)])


# ── runtime config and services ──────────────────────────────────────────────
@router.post("/runtime-config/refresh")
async def refresh_runtime_config():
    """Drop the cache and pull from Core now; a failed pull still answers 200 with `error`."""
    state = await asyncio.to_thread(get_runtime_config_client().refresh)
    body = {"source": state["source"], "version": state["version"], "fetched_at": state["fetched_at"]}
    if state["last_error"]:
        body["error"] = state["last_error"]
    return body


@router.get("/services/effective-config")
async def effective_config():
    return await asyncio.to_thread(build_effective_config)


@router.post("/services/test")
async def test_service(req: ServiceTestRequest):
    return await run_service_test(req)


@router.get("/services/health")
async def services_health(service: Literal[SERVICES + ("all",)] = Query(default="all")):  # type: ignore[valid-type]
    return await check_health(service)


# ── prompts ──────────────────────────────────────────────────────────────────
class PromptMessage(BaseModel):
    role: str
    content: str


class NewPromptVersion(BaseModel):
    name: str
    prompt: list[PromptMessage] = Field(..., min_length=1)
    config: dict = Field(default_factory=dict)


class ProductionChange(BaseModel):
    name: str
    version: int = Field(..., ge=1)


def _as_http(error: prompt_admin.PromptAdminError) -> HTTPException:
    return HTTPException(status_code=error.status_code, detail=str(error))


async def _prompt_call(function, *args):
    try:
        return await asyncio.to_thread(function, *args)
    except prompt_admin.PromptAdminError as error:
        raise _as_http(error) from error


@router.get("/prompts")
async def list_prompts():
    return await _prompt_call(prompt_admin.list_prompts)


@router.get("/prompts/detail")
async def prompt_detail(name: str, version: int | None = Query(default=None, ge=1)):
    return await _prompt_call(prompt_admin.get_prompt_detail, name, version)


@router.post("/prompts/versions", status_code=201)
async def create_prompt_version(body: NewPromptVersion):
    messages = [message.model_dump() for message in body.prompt]
    return await _prompt_call(prompt_admin.create_version, body.name, messages, body.config)


@router.put("/prompts/production")
async def set_prompt_production(body: ProductionChange):
    return await _prompt_call(prompt_admin.set_production, body.name, body.version)


# ── traces ───────────────────────────────────────────────────────────────────
class TraceDelete(BaseModel):
    trace_ids: list[str] = Field(..., max_length=500)


class ScoreItem(BaseModel):
    trace_id: str
    name: str
    value: float
    comment: str | None = Field(default=None, max_length=500)


class TraceScores(BaseModel):
    items: list[ScoreItem] = Field(..., max_length=50)


@router.post("/traces/delete")
async def delete_traces(body: TraceDelete):
    return await asyncio.to_thread(trace_admin.delete_traces, body.trace_ids)


@router.post("/traces/scores")
async def send_trace_scores(body: TraceScores):
    return await asyncio.to_thread(trace_admin.send_scores, [item.model_dump() for item in body.items])
