"""
Bản giả tối thiểu của supabase-py cho test service: lọc eq/not null, insert, update, upsert trên list dict.

rpc() mô phỏng các function trong migration 20261107100000 để test tầng service; bản thân function SQL
được test thật ở supabase/tests/grading_job_functions_test.sql.
"""
import uuid
from types import SimpleNamespace
from typing import Any


class FakeQuery:
    def __init__(self, rows: list[dict[str, Any]]):
        self.rows = rows
        self.filters: list[Any] = []
        self.action = "select"
        self.payload: Any = None
        self.conflict: list[str] = []
        self.ignore_duplicates = False
        self._negate = False

    @property
    def not_(self):
        self._negate = True
        return self

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, column, value):
        self.filters.append(lambda r: r.get(column) == value)
        return self

    def neq(self, column, value):
        self.filters.append(lambda r: r.get(column) != value)
        return self

    def in_(self, column, values):
        self.filters.append(lambda r: r.get(column) in values)
        return self

    def is_(self, column, _value):
        negate, self._negate = self._negate, False
        self.filters.append((lambda r: r.get(column) is not None) if negate else (lambda r: r.get(column) is None))
        return self

    def lt(self, column, value):
        self.filters.append(lambda r: r.get(column) is not None and r.get(column) < value)
        return self

    def limit(self, _n):
        return self

    def order(self, *_args, **_kwargs):
        return self

    def update(self, payload):
        self.action, self.payload = "update", payload
        return self

    def delete(self):
        self.action = "delete"
        return self

    def insert(self, payload):
        self.action, self.payload = "insert", payload
        return self

    def upsert(self, payload, on_conflict="", ignore_duplicates=False):
        self.action, self.payload = "upsert", payload
        self.conflict, self.ignore_duplicates = on_conflict.split(","), ignore_duplicates
        return self

    def _matched(self):
        return [r for r in self.rows if all(f(r) for f in self.filters)]

    def _upsert_one(self, item):
        for row in self.rows:
            if all(row.get(c) == item.get(c) for c in self.conflict):
                if not self.ignore_duplicates:
                    row.update(item)
                return row
        row = {"id": str(uuid.uuid4()), **item}
        self.rows.append(row)
        return row

    def execute(self):
        items = self.payload if isinstance(self.payload, list) else [self.payload]
        if self.action == "insert":
            created = [{"id": str(uuid.uuid4()), **item} for item in items]
            self.rows.extend(created)
            return SimpleNamespace(data=created)
        if self.action == "upsert":
            return SimpleNamespace(data=[self._upsert_one(item) for item in items])
        matched = self._matched()
        if self.action == "update":
            for row in matched:
                row.update(self.payload)
        if self.action == "delete":
            for row in matched:
                self.rows.remove(row)
        return SimpleNamespace(data=[dict(r) for r in matched] if self.action == "select" else matched)


class FakeRpc:
    def __init__(self, client: "FakeSupabase", name: str, params: dict[str, Any]):
        self.client, self.name, self.params = client, name, params

    def execute(self):
        return SimpleNamespace(data=getattr(self.client, f"_rpc_{self.name}")(**self.params))


class FakeSupabase:
    def __init__(self, **tables: list[dict[str, Any]]):
        self.tables = tables

    def table(self, name: str) -> FakeQuery:
        return FakeQuery(self.tables.setdefault(name, []))

    def rpc(self, name: str, params: dict[str, Any]) -> FakeRpc:
        return FakeRpc(self, name, params)

    def _rows(self, name: str) -> list[dict[str, Any]]:
        return self.tables.setdefault(name, [])

    def _attempt(self, attempt_id: str) -> dict[str, Any]:
        return next(a for a in self._rows("attempts") if a["id"] == attempt_id)

    def _rpc_create_ai_grading_job(self, p_attempt_id, p_skill, p_task_nos):
        evaluation_id = str(uuid.uuid4())
        self._rows("evaluations").append({"id": evaluation_id, "attempt_id": p_attempt_id, "skill": p_skill,
                                          "evaluator_type": "ai", "status": "pending", "is_official": False})
        runs = []
        for task_no in p_task_nos or [None]:
            run = {"id": str(uuid.uuid4()), "evaluation_id": evaluation_id, "task_no": task_no, "status": "running",
                   "started_at": "2026-11-07T00:00:00+00:00", "claimed_at": None, "recovery_count": 0}
            self._rows("grading_runs").append(run)
            runs.append({"run_id": run["id"], "task_no": task_no})
        return {"evaluation_id": evaluation_id, "runs": runs}

    def _rpc_submit_speaking_attempt(self, p_attempt_id, p_auto=False):
        attempt = self._attempt(p_attempt_id)
        if attempt["status"] != "in_progress":
            return None
        confirmed = [r for r in self._rows("speaking_responses")
                     if r["attempt_id"] == p_attempt_id and r.get("confirmed_at")]
        attempt.update(status="grading" if confirmed else "no_speech", submitted_at="2026-11-07T00:00:00+00:00",
                       auto_submitted=p_auto)
        job = self._rpc_create_ai_grading_job(p_attempt_id, "speaking", None) if confirmed else None
        return {"status": attempt["status"], "submitted_at": attempt["submitted_at"], "job": job}

    def _rpc_submit_writing_attempt(self, p_attempt_id, p_tasks, p_auto=False):
        """p_tasks None: chấm essay đã lưu. Không có chữ nào: Mock → abandoned."""
        attempt = self._attempt(p_attempt_id)
        if attempt["status"] != "in_progress":
            return None
        essays = self._rows("essays")
        for t in p_tasks or []:
            essays[:] = [e for e in essays if not (e["attempt_id"] == p_attempt_id and e["task_no"] == t["task_no"])]
            essays.append({"id": str(uuid.uuid4()), "attempt_id": p_attempt_id, "task_no": t["task_no"],
                           "content": t["content"]})
        graded = sorted((e for e in essays if e["attempt_id"] == p_attempt_id and e["content"].strip()),
                        key=lambda e: e["task_no"])
        if not graded:
            attempt.update(status="abandoned", auto_submitted=p_auto)
            return {"status": "abandoned", "essays": [], "runs": []}
        attempt.update(status="grading", submitted_at="2026-11-07T00:00:00+00:00", auto_submitted=p_auto)
        job = self._rpc_create_ai_grading_job(p_attempt_id, "writing", [e["task_no"] for e in graded])
        return {**job, "status": "grading", "submitted_at": attempt["submitted_at"],
                "essays": [{"task_no": e["task_no"], "essay_id": e["id"], "word_count": len(e["content"].split())}
                           for e in graded]}

    def _rpc_claim_grading_run(self, p_run_id, p_lease_seconds):
        run = next((r for r in self._rows("grading_runs") if r["id"] == p_run_id), None)
        if not run or run["status"] != "running" or run.get("claimed_at"):
            return False
        run["claimed_at"] = "2026-11-07T00:00:00+00:00"
        return True

    def _rpc_publish_ai_evaluation(self, p_evaluation_id, p_attempt_id, p_band):
        evaluations = [e for e in self._rows("evaluations") if e["attempt_id"] == p_attempt_id]
        has_expert = any(e.get("evaluator_type") == "expert" and e.get("is_official") for e in evaluations)
        for evaluation in evaluations:
            if evaluation["id"] == p_evaluation_id:
                evaluation.update(status="done", overall_band=p_band, is_official=not has_expert)
            elif not has_expert and evaluation.get("evaluator_type") == "ai":
                evaluation["is_official"] = False
        attempt = self._attempt(p_attempt_id)
        if attempt["status"] == "grading":
            attempt["status"] = "scored"

    def _rpc_fail_ai_evaluation(self, p_evaluation_id, p_attempt_id, p_attempt_status="grading_failed"):
        next(e for e in self._rows("evaluations") if e["id"] == p_evaluation_id)["status"] = "failed"
        attempt = self._attempt(p_attempt_id)
        if attempt["status"] == "grading":
            attempt["status"] = p_attempt_status
