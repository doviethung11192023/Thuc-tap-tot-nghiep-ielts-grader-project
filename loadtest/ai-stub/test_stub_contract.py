"""
Stub phải khớp hợp đồng thật:
- request: schema pydantic trùng bản của ai-engine/schemas/engine_requests.py;
- response: đi qua đúng code backend đọc kết quả (client, lưu điểm, lưu ghi chú, cột usage);
- secret: cư xử như ai-engine/api/auth.py.

Chạy:  backend/.venv/bin/python -m pytest loadtest/ai-stub -q
"""
import importlib.util
from pathlib import Path
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient

import stub_app

ROOT = Path(__file__).resolve().parents[2]
SECRET = "test-secret"
ESSAY = "Some people believe that technology improves life. This essay discusses both views in detail."


def _load_real_requests():
    spec = importlib.util.spec_from_file_location("engine_requests_real", ROOT / "ai-engine/schemas/engine_requests.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("AI_ENGINE_SECRET", SECRET)
    monkeypatch.delenv("STUB_ALLOW_NO_SECRET", raising=False)
    return TestClient(stub_app.app, headers={"X-AI-Engine-Secret": SECRET})


# ---- request schema ----
@pytest.mark.parametrize("name", ["GradeRequest", "GradeSpeakingRequest", "DraftMaterialRequest"])
def test_request_models_match_real_engine(name):
    real = getattr(_load_real_requests(), name).model_json_schema()
    ours = getattr(stub_app, name).model_json_schema()

    def normalize(schema: dict[str, Any]) -> dict[str, Any]:
        defs = {k: normalize_obj(v) for k, v in (schema.get("$defs") or {}).items()}
        return {"props": normalize_obj(schema.get("properties") or {}), "required": sorted(schema.get("required") or []),
                "defs": defs}

    def normalize_obj(value: Any) -> Any:
        if isinstance(value, dict):
            return {k: normalize_obj(v) for k, v in value.items() if k not in ("title", "description")}
        if isinstance(value, list):
            return [normalize_obj(v) for v in value]
        return value

    assert normalize(ours) == normalize(real)


# ---- secret ----
def test_missing_or_wrong_secret_is_rejected(client):
    body = {"title": "t", "essay": ESSAY}
    assert client.post("/grade", json=body, headers={"X-AI-Engine-Secret": ""}).status_code == 403
    assert client.post("/grade", json=body, headers={"X-AI-Engine-Secret": "nope"}).status_code == 403
    assert client.post("/grade", json=body).status_code == 200


def test_unconfigured_secret_fails_closed_unless_allowed(client, monkeypatch):
    monkeypatch.setenv("AI_ENGINE_SECRET", "")
    assert client.post("/grade", json={"essay": ESSAY}).status_code == 503
    monkeypatch.setenv("STUB_ALLOW_NO_SECRET", "true")
    assert client.post("/grade", json={"essay": ESSAY}).status_code == 200


def test_health_is_public():
    assert TestClient(stub_app.app).get("/health").json()["status"] == "healthy"


def test_blank_essay_is_422(client):
    assert client.post("/grade", json={"essay": "   "}).status_code == 422


# ---- response parsed by real backend code ----
class FakeTable:
    def __init__(self, db: "FakeDb", name: str):
        self.db, self.name, self._op = db, name, None

    def select(self, *_a, **_k):
        self._op = "select"
        return self

    def eq(self, *_a, **_k):
        return self

    def upsert(self, rows, **_k):
        self.db.upserts.append((self.name, rows))
        self._op = "write"
        return self

    def insert(self, rows):
        self.db.inserts.append((self.name, rows))
        self._op = "write"
        return self

    def delete(self):
        self._op = "write"
        return self

    def execute(self):
        data = self.db.criteria.get(self.name, []) if self._op == "select" else []
        return type("R", (), {"data": data})()


class FakeDb:
    def __init__(self):
        self.upserts, self.inserts = [], []
        codes = {"writing": ["TA", "TR", "CC", "LR", "GRA"], "speaking": ["FC", "LR", "GRA", "P"]}
        self.criteria = {"criteria": [{"id": f"id-{code}", "code": code} for code in codes["writing"] + codes["speaking"]]}

    def table(self, name):
        return FakeTable(self, name)


@pytest.fixture
def fake_db(monkeypatch):
    from app.services.writing import writing_grading_service
    from app.services.speaking import speaking_grading_service
    fake = FakeDb()
    monkeypatch.setattr(writing_grading_service, "db", lambda: fake)
    monkeypatch.setattr(speaking_grading_service, "db", lambda: fake)
    return fake


def test_writing_result_is_stored_by_backend_code(client, fake_db):
    from app.services.ai_monitoring.run_usage_recorder import done_columns
    from app.services.writing import writing_grading_service as svc
    ai = client.post("/grade", json={"title": "t", "essay": ESSAY, "task_type": "task2"}).json()

    svc._store_scores("eval-1", 2, ai)
    (_table, rows), = fake_db.upserts
    assert len(rows) == 4 and {r["band"] for r in rows} <= {6.0, 6.5}
    assert all(r["comment"] and "Strengths" in r["comment"] for r in rows)

    essay = {"id": "e1", "attempt_id": "a1", "content": ESSAY}
    assert svc._store_annotations("eval-1", essay, 2, ai) == 1
    assert fake_db.inserts[0][1][0]["category"] == "GRA"
    assert done_columns(ai) == {"trace_id": ai["trace_id"], "input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0}


def test_task1_scores_use_ta_code(client, fake_db):
    from app.services.writing import writing_grading_service as svc
    ai = client.post("/grade", json={"essay": ESSAY, "task_type": "task1"}).json()
    assert ai["task_type"] == "task1"
    svc._store_scores("eval-2", 1, ai)
    assert {r["criterion_id"] for r in fake_db.upserts[0][1]} == {"id-TA", "id-CC", "id-LR", "id-GRA"}


def test_speaking_result_is_stored_by_backend_code(client, fake_db):
    from app.services.speaking import speaking_grading_service as svc
    answers = [{"response_id": "r1", "part": 1, "question": "q", "audio_url": "http://x/a.webm"}]
    ai = client.post("/grade-speaking", json={"title": "t", "answers": answers}).json()
    assert ai["no_speech"] is False
    svc._store_scores("eval-3", ai)
    (_t, rows), = fake_db.upserts
    assert len(rows) == 4 and all(r["band"] in (6.0, 6.5) for r in rows)
    assert [r["response_id"] for r in ai["responses"]] == ["r1"]


def test_fingerprint_endpoint(client):
    assert client.get("/grading-fingerprint", params={"task_type": "task1"}).json() == {"fingerprint": "stub-task1"}


# ---- Core's real HTTP client against the stub ----
@pytest.mark.asyncio
async def test_core_client_call_ai_grade_against_stub(monkeypatch):
    from app.clients.ai_engine import grading_client
    from app.core.config import settings

    monkeypatch.setenv("AI_ENGINE_SECRET", SECRET)
    monkeypatch.setattr(settings, "AI_ENGINE_SECRET", SECRET)
    monkeypatch.setattr(settings, "AI_ENGINE_URL", "http://stub/grade")
    monkeypatch.setattr(settings, "AI_ENGINE_SPEAKING_URL", "http://stub/grade-speaking")
    real_client = httpx.AsyncClient

    def stub_client(*_a, **_k):
        return real_client(transport=httpx.ASGITransport(app=stub_app.app), base_url="http://stub")

    monkeypatch.setattr(grading_client.httpx, "AsyncClient", stub_client)
    result = await grading_client.call_ai_grade("title", ESSAY, 2, None)
    assert result["scores"]["overall_band"] == 6.5 and result["usage"] == []
    speaking = await grading_client.call_ai_grade_speaking(
        "t", [{"response_id": "r1", "part": 1, "question": "q", "audio_url": "u", "duration_ms": 1}])
    assert speaking["criteria"]["pr"]["band"] == 6.0
    assert await grading_client.call_ai_grading_fingerprint(2) == "stub-task2"
