"""Trace admin: bulk delete and Expert-minus-AI scores (mock Langfuse)."""
from types import SimpleNamespace

from services.langfuse import trace_admin as ta

T1, T2 = "a" * 32, "b" * 32


class FakeTraces:
    def __init__(self, fail_on=None, not_found=False):
        self.calls, self.fail_on, self.not_found = [], fail_on, not_found

    def delete_multiple(self, trace_ids):
        self.calls.append(list(trace_ids))
        if self.fail_on and self.fail_on in trace_ids:
            raise ConnectionError("down")
        if self.not_found:
            error = Exception("gone")
            error.status_code = 404
            raise error


def client_with(traces, **extra):
    return SimpleNamespace(api=SimpleNamespace(trace=traces), **extra)


def test_delete_in_chunks_and_dedup():
    traces = FakeTraces()
    ids = [f"{i:032x}" for i in range(250)]
    result = ta.delete_traces(ids + ids[:10], client_with(traces))
    assert result == {"deleted": 250, "failed": []}
    assert [len(c) for c in traces.calls] == [100, 100, 50]


def test_delete_reports_failures_and_bad_ids():
    ids = [f"{i:032x}" for i in range(150)]
    traces = FakeTraces(fail_on=ids[0])
    result = ta.delete_traces([*ids, "not-a-trace"], client_with(traces))
    assert result["deleted"] == 50 and len(result["failed"]) == 101 and "not-a-trace" in result["failed"]


def test_delete_is_safe_to_repeat():
    result = ta.delete_traces([T1, T2], client_with(FakeTraces(not_found=True)))
    assert result == {"deleted": 2, "failed": []}


class FakeScoreClient:
    def __init__(self, fail_trace=None):
        self.scores, self.flushed, self.fail_trace = [], 0, fail_trace

    def create_score(self, **kwargs):
        if kwargs["trace_id"] == self.fail_trace:
            raise RuntimeError("rejected")
        self.scores.append(kwargs)

    def flush(self):
        self.flushed += 1


def test_scores_are_numeric_idempotent_and_flushed():
    client = FakeScoreClient()
    result = ta.send_scores([{"trace_id": T1, "name": "expert_minus_ai_overall", "value": -1.5, "comment": "c"},
                             {"trace_id": T2, "name": "expert_minus_ai_gra", "value": 0}], client)
    assert result == {"sent": 2, "failed": []} and client.flushed == 1
    assert client.scores[0] == {"trace_id": T1, "name": "expert_minus_ai_overall", "value": -1.5, "data_type": "NUMERIC",
                                "comment": "c", "score_id": f"{T1}-expert_minus_ai_overall"}


def test_invalid_scores_are_reported_not_sent():
    client = FakeScoreClient()
    items = [{"trace_id": T1, "name": "other_name", "value": 1}, {"trace_id": T1, "name": "expert_minus_ai_p", "value": 10},
             {"trace_id": "short", "name": "expert_minus_ai_p", "value": 1},
             {"trace_id": T2, "name": "expert_minus_ai_p", "value": 9}]
    result = ta.send_scores(items, client)
    assert result["sent"] == 1 and len(result["failed"]) == 3 and len(client.scores) == 1


def test_langfuse_failure_never_raises():
    client = FakeScoreClient(fail_trace=T1)
    result = ta.send_scores([{"trace_id": T1, "name": "expert_minus_ai_p", "value": 1}], client)
    assert result["sent"] == 0 and result["failed"][0]["error"] == "rejected"
