"""Quyền và kiểm tra khi upload câu trả lời Speaking (UC-10, FR-38, BR-13)."""
from datetime import datetime, timedelta, timezone

import pytest
from app.core.domain_errors import DomainError

from app.services.speaking import speaking_test_content, speaking_upload_service as uploads
from fake_supabase import FakeSupabase

ATTEMPT = {"id": "a1", "learner_id": "u1", "test_id": "t1", "mode": "practice", "status": "in_progress",
           "started_at": "2026-11-06T00:00:00+00:00", "deadline_at": None}


class FakeR2:
    private_bucket_configured = True

    def __init__(self):
        self.objects = {}
        self.deleted = []

    def presign_private_put(self, key, content_type):
        return f"https://r2.test/{key}?type={content_type}"

    def head_private_object(self, key):
        return self.objects.get(key)

    def delete_private_object(self, key):
        self.deleted.append(key)


@pytest.fixture
def world(monkeypatch):
    fake = FakeSupabase(
        learner_profiles=[{"user_id": "u1", "voice_consent_at": "2026-11-06T00:00:00+00:00"}],
        speaking_questions=[{"id": "q1", "speaking_part_id": "s1"}, {"id": "qx", "speaking_part_id": "sx"}],
        sections=[{"id": "s1", "test_id": "t1"}, {"id": "sx", "test_id": "other"}],
    )
    r2 = FakeR2()
    monkeypatch.setattr(uploads, "db", lambda: fake)
    monkeypatch.setattr(uploads, "r2_storage", r2)
    return fake, r2


def _status_of(call) -> int:
    with pytest.raises(DomainError) as err:
        call()
    return err.value.status_code


def test_create_upload_makes_response_row_and_signed_url(world):
    fake, _ = world
    data = uploads.create_upload(ATTEMPT, "q1", "audio/webm;codecs=opus")
    assert data["content_type"] == "audio/webm"
    assert "speaking/a1/q1.webm" in data["upload_url"]
    assert fake.tables["attempt_sections"][0]["section_id"] == "s1"
    assert fake.tables["speaking_responses"][0]["audio_key"] == "speaking/a1/q1.webm"
    assert "confirmed_at" not in fake.tables["speaking_responses"][0]


def test_upload_refused_without_consent(world):
    fake, _ = world
    fake.tables["learner_profiles"][0]["voice_consent_at"] = None
    assert _status_of(lambda: uploads.create_upload(ATTEMPT, "q1", "audio/webm")) == 403


def test_question_of_another_test_is_404(world):
    assert _status_of(lambda: uploads.create_upload(ATTEMPT, "qx", "audio/webm")) == 404


def test_unsupported_format_is_400(world):
    assert _status_of(lambda: uploads.create_upload(ATTEMPT, "q1", "video/mp4")) == 400


def test_submitted_attempt_is_409(world):
    assert _status_of(lambda: uploads.create_upload({**ATTEMPT, "status": "grading"}, "q1", "audio/webm")) == 409


def test_past_deadline_grace_is_409(world):
    late = (datetime.now(timezone.utc) - timedelta(seconds=31)).isoformat()
    assert _status_of(lambda: uploads.create_upload({**ATTEMPT, "deadline_at": late}, "q1", "audio/webm")) == 409


def test_within_deadline_grace_is_allowed(world):
    recent = (datetime.now(timezone.utc) - timedelta(seconds=10)).isoformat()
    assert uploads.create_upload({**ATTEMPT, "deadline_at": recent}, "q1", "audio/webm")["response_id"]


def test_private_bucket_missing_is_503(world, monkeypatch):
    _, r2 = world
    r2.private_bucket_configured = False
    assert _status_of(lambda: uploads.create_upload(ATTEMPT, "q1", "audio/webm")) == 503


def test_mock_cannot_rerecord_confirmed_answer(world):
    fake, _ = world
    fake.tables["speaking_responses"] = [{"id": "r1", "attempt_id": "a1", "speaking_question_id": "q1",
                                          "confirmed_at": "2026-11-06T00:01:00+00:00"}]
    assert _status_of(lambda: uploads.create_upload({**ATTEMPT, "mode": "mock"}, "q1", "audio/webm")) == 409


def test_practice_rerecord_keeps_previous_confirmation_until_new_confirm(world):
    fake, _ = world
    fake.tables["speaking_responses"] = [{"id": "r1", "attempt_id": "a1", "speaking_question_id": "q1",
                                          "confirmed_at": "2026-11-06T00:01:00+00:00"}]
    uploads.create_upload(ATTEMPT, "q1", "audio/webm")
    assert fake.tables["speaking_responses"][0]["confirmed_at"] == "2026-11-06T00:01:00+00:00"


def _uploaded(world, head):
    fake, r2 = world
    response_id = uploads.create_upload(ATTEMPT, "q1", "audio/webm")["response_id"]
    if head:
        r2.objects["speaking/a1/q1.webm"] = head
    return fake, r2, response_id


def test_confirm_checks_real_object_then_marks_confirmed(world):
    fake, _, rid = _uploaded(world, {"size": 1000, "content_type": "audio/webm"})
    assert uploads.confirm_upload(ATTEMPT, rid, 4200)["question_id"] == "q1"
    row = fake.tables["speaking_responses"][0]
    assert row["confirmed_at"] and row["duration_ms"] == 4200


def test_confirm_without_object_is_400(world):
    _, _, rid = _uploaded(world, None)
    assert _status_of(lambda: uploads.confirm_upload(ATTEMPT, rid, 1000)) == 400


def test_confirm_wrong_format_deletes_object(world):
    _, r2, rid = _uploaded(world, {"size": 1000, "content_type": "text/html"})
    assert _status_of(lambda: uploads.confirm_upload(ATTEMPT, rid, 1000)) == 400
    assert r2.deleted == ["speaking/a1/q1.webm"]


def test_confirm_oversized_deletes_object(world):
    _, r2, rid = _uploaded(world, {"size": uploads.MAX_AUDIO_BYTES + 1, "content_type": "audio/webm"})
    assert _status_of(lambda: uploads.confirm_upload(ATTEMPT, rid, 1000)) == 400
    assert r2.deleted


def test_confirm_response_of_another_attempt_is_404(world):
    _, _, rid = _uploaded(world, {"size": 1000, "content_type": "audio/webm"})
    assert _status_of(lambda: uploads.confirm_upload({**ATTEMPT, "id": "a2"}, rid, 1000)) == 404


@pytest.mark.parametrize("title,order_no,expected", [("Part 2", 1, 2), ("part 3", 2, 3), ("Topic", 1, 1)])
def test_part_number_comes_from_title(title, order_no, expected):
    assert speaking_test_content.speaking_part_number({"title": title, "order_no": order_no}) == expected


def test_time_limits_cap_outlier_think_time_and_br13_answer():
    limits = speaking_test_content.DEFAULT_TIME_LIMITS
    assert speaking_test_content._capped_seconds(1, {"prep_seconds": 180, "answer_seconds": 30}, limits) == (5, 30)
    assert speaking_test_content._capped_seconds(2, {"prep_seconds": 60, "answer_seconds": 200}, limits) == (60, 120)
    assert speaking_test_content._capped_seconds(3, {"prep_seconds": None, "answer_seconds": None}, limits) == (0, 90)
