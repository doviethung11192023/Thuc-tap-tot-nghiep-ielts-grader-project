"""Unit tests xác minh toàn bộ Wave 3 (SYS-09, SYS-12)."""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from tests.fake_supabase import FakeQuery, FakeSupabase

from app.api.endpoints.student_practice import exercises
from app.services.admin import expert_kpi_service, system_statistics, user_admin
from app.services.cms import cms_clone


class _RichQuery(FakeQuery):
    def __init__(self, rows):
        super().__init__(rows)
        self._slice = None

    def range(self, start: int, end: int):
        self._slice = (start, end + 1)
        return self

    def gte(self, column: str, value):
        self.filters.append(lambda r: r.get(column) is not None and str(r.get(column)) >= str(value))
        return self

    def ilike(self, column: str, pattern: str):
        needle = pattern.strip("%").lower()
        self.filters.append(lambda r: needle in str(r.get(column) or "").lower())
        return self

    def or_(self, expr: str):
        parts = [p.split(".ilike.") for p in expr.split(",") if ".ilike." in p]
        self.filters.append(
            lambda r: any(p[1].strip("%").lower() in str(r.get(p[0]) or "").lower() for p in parts)
        )
        return self

    def execute(self):
        if self.action == "select":
            matched = self._matched()
            data = matched[self._slice[0] : self._slice[1]] if self._slice else matched
            return SimpleNamespace(data=data, count=len(matched))
        return super().execute()


class _RichSupabase(FakeSupabase):
    def table(self, name: str):
        return _RichQuery(self.tables.setdefault(name, []))


def test_sys09_exercise_duration_estimates(monkeypatch):
    assert exercises._estimate_minutes("writing", "writing_task1", 1, {}) == 20
    assert exercises._estimate_minutes("writing", "writing_task2", 1, {}) == 40
    assert exercises._estimate_minutes("speaking", "speaking_part1", 4, {"prep_seconds": 0, "answer_seconds": 45}) == 3
    assert exercises._estimate_minutes("speaking", "speaking_part2", 1, {"prep_seconds": 60, "answer_seconds": 120}) == 3

    sample_rows = [
        {"id": "w1", "question_type": "writing_task1", "question_count": 1, "section": {"id": "s1", "order_no": 1, "title": "Task 1"}, "test": {"id": "t1", "title": "Writing T1", "difficulty": "medium"}},
        {"id": "w2", "question_type": "writing_task2", "question_count": 1, "section": {"id": "s2", "order_no": 2, "title": "Task 2"}, "test": {"id": "t1", "title": "Writing T1", "difficulty": "hard"}},
    ]
    monkeypatch.setattr(exercises.practice_catalog, "task_part_exercises", lambda skill, diff: sample_rows)
    res = exercises._build_exercises("writing", None, None, page=1, limit=12)
    assert [it["estimated_minutes"] for it in res["items"]] == [20, 40]


def test_sys12_user_global_active_banned_totals(monkeypatch):
    fake = _RichSupabase(
        profiles=[
            {"id": "u1", "email": "a@test.vn", "full_name": "A", "role": "learner", "is_active": True, "created_at": "2026-11-10"},
            {"id": "u2", "email": "b@test.vn", "full_name": "B", "role": "learner", "is_active": False, "created_at": "2026-11-11"},
            {"id": "u3", "email": "c@test.vn", "full_name": "C", "role": "learner", "is_active": True, "created_at": "2026-11-12"},
        ]
    )
    monkeypatch.setattr(user_admin, "db", lambda: fake)
    monkeypatch.setattr(user_admin, "_activated_ids", lambda: {"u1"})

    page1 = user_admin.list_users(page=1, limit=1, role="learner", search=None)
    assert len(page1["items"]) == 1
    assert page1["total"] == 3
    assert page1["active_total"] == 2
    assert page1["banned_total"] == 1


def test_sys12_expert_kpis_and_system_statistics(monkeypatch):
    now = datetime.now(timezone.utc)
    fake = _RichSupabase(
        profiles=[
            {"id": "e1", "full_name": "Expert One", "email": "e1@moonlab.vn", "role": "expert", "is_active": True},
        ],
        expert_profiles=[
            {"user_id": "e1", "is_available": True, "max_active_reviews": 5},
        ],
        review_assignments=[
            {"expert_id": "e1", "assigned_at": (now - timedelta(hours=10)).isoformat(), "due_at": (now + timedelta(hours=38)).isoformat(), "ended_at": (now - timedelta(hours=4)).isoformat(), "end_reason": "completed"},
            {"expert_id": "e1", "assigned_at": (now - timedelta(hours=60)).isoformat(), "due_at": (now - timedelta(hours=12)).isoformat(), "ended_at": now.isoformat(), "end_reason": "expired"},
            {"expert_id": "e1", "assigned_at": (now - timedelta(hours=2)).isoformat(), "due_at": (now + timedelta(hours=46)).isoformat(), "ended_at": None, "end_reason": None},
        ],
        grading_runs=[],
        attempts=[],
        essays=[],
        attempt_results=[],
        evaluations=[],
        criterion_scores=[],
        annotations=[],
        system_settings=[],
    )
    monkeypatch.setattr(expert_kpi_service, "db", lambda: fake)
    monkeypatch.setattr(system_statistics, "db", lambda: fake)
    monkeypatch.setattr("app.services.expert.expert_rps_service.db", lambda: fake)
    monkeypatch.setattr("app.services.expert.expert_policy_config.db", lambda: fake)

    stats = system_statistics.system_statistics()
    assert len(stats["expert_kpis"]) == 1
    kpi = stats["expert_kpis"][0]
    assert kpi["active_reviews"] == 1
    assert kpi["completed_total"] == 1
    assert kpi["on_time_rate"] == 50.0  # 1 completed / (1 completed + 1 unwaived expired) per B6
    assert kpi["expired_count"] == 1
    assert kpi["avg_turnaround_hours"] == 6.0


def test_sys12_clone_test_to_draft(monkeypatch):
    fake = _RichSupabase(
        tests=[{
            "id": "t_pub", "title": "Cambridge 19 Test 1", "skill": "reading", "allowed_mode": "both",
            "status": "published", "version": 1, "duration_minutes": 60, "test_set_id": "set1",
            "difficulty": "medium", "source_type": "original",
        }],
        sections=[{"id": "sec1", "test_id": "t_pub", "skill": "reading", "kind": "lr", "order_no": 1, "title": "Passage 1"}],
        lr_sections=[{"section_id": "sec1", "passage": "Paragraph A", "audio_key": None, "transcript": None}],
        question_groups=[{"id": "g1", "lr_section_id": "sec1", "order_no": 1, "question_type": "matching", "subtype": "matching_headings", "instructions": "Match", "template": None, "image_key": None, "select_count": None, "allow_reuse": False, "max_words": None}],
        group_options=[{"group_id": "g1", "label": "i", "text": "Heading one"}],
        questions=[{"id": "q1", "group_id": "g1", "lr_section_id": "sec1", "number": 1, "prompt": "Paragraph A", "diagram_coordinate": None}],
        question_options=[],
        question_keys=[{"question_id": "q1", "accepted_answers": ["i"], "explanation": "Step 1", "evidence": "Paragraph A"}],
    )
    monkeypatch.setattr(cms_clone, "db", lambda: fake)
    monkeypatch.setattr(cms_clone, "write_audit", lambda *a, **k: None)

    cloned = cms_clone.clone_test_to_draft("admin1", "t_pub")
    assert cloned["status"] == "draft"
    assert cloned["version"] == 2
    assert cloned["test_set_id"] is None
    assert cloned["previous_version_id"] == "t_pub"
    assert "(Bản nháp)" in cloned["title"]
    assert len(fake.tables["tests"]) == 2
    assert len(fake.tables["sections"]) == 2
    assert len(fake.tables["question_groups"]) == 2
    assert len(fake.tables["questions"]) == 2
    assert len(fake.tables["question_keys"]) == 2
