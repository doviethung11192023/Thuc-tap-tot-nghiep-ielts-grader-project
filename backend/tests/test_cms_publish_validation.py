"""FR-27: kiểm tra nội dung đề trước khi publish; set_status chặn publish khi còn lỗi."""
import pytest

from app.core.domain_errors import InvalidRequestError
from app.services.cms import cms_publish_validation as validation
from app.services.cms import cms_tests
from fake_supabase import FakeSupabase


def _lr_test(numbers, skill="reading", audio=None, passage="Text", key_for=None, options=("A", "B", "C"),
             select_count=None, source_name=None):
    """Đề L/R một phần, một nhóm có lựa chọn, câu theo `numbers`; key_for: số câu → accepted_answers."""
    questions = [{"id": f"q{n}", "number": n, "question_options": []} for n in numbers]
    group = {"id": "g1", "question_type": "matching", "select_count": select_count,
             "group_options": [{"label": lb, "text": lb} for lb in options], "questions": questions}
    section = {"id": "s1", "order_no": 1,
               "lr_sections": [{"passage": passage, "audio_key": audio, "question_groups": [group]}]}
    test = {"id": "t1", "title": "T", "skill": skill, "status": "draft", "source_type": "original",
            "source_name": source_name, "license": None, "sections": [section]}
    keys = [{"question_id": f"q{n}", "accepted_answers": ans} for n, ans in (key_for or {}).items()]
    return test, keys


def _use(monkeypatch, tests, question_keys=(), sections=()):
    client = FakeSupabase(tests=list(tests), question_keys=list(question_keys), sections=list(sections),
                          audit_logs=[])
    for module in (validation, cms_tests):
        monkeypatch.setattr(module, "db", lambda: client)
    monkeypatch.setattr(cms_tests, "write_audit", lambda *a, **k: None)
    return client


def test_full_reading_test_with_all_keys_passes(monkeypatch):
    test, keys = _lr_test(range(1, 41), key_for={n: ["B", "B. text"] for n in range(1, 41)})
    _use(monkeypatch, [test], keys)
    assert validation.publish_errors("t1") == []


def test_missing_questions_keys_and_fake_labels_are_reported(monkeypatch):
    test, keys = _lr_test(range(1, 39), key_for={1: ["N/A"], 2: ["Paragraph C"], **{n: ["A"] for n in range(3, 38)}})
    _use(monkeypatch, [test], keys)
    errors = validation.publish_errors("t1")
    assert any("Thiếu câu 39, 40" in e for e in errors)
    assert any("Câu chưa có đáp án: 38" in e for e in errors)
    assert any("nhãn lựa chọn có thật ở câu: 1, 2" in e for e in errors)


def test_listening_part_needs_audio(monkeypatch):
    test, keys = _lr_test(range(1, 41), skill="listening", key_for={n: ["A"] for n in range(1, 41)})
    _use(monkeypatch, [test], keys)
    assert validation.publish_errors("t1") == ["Phần 1 chưa có audio"]


def test_micro_exercise_does_not_need_40_questions(monkeypatch):
    test, keys = _lr_test([1, 2], key_for={1: ["A"], 2: ["B"]}, source_name=validation.MICRO_EXERCISE_SOURCE)
    _use(monkeypatch, [test], keys)
    assert validation.publish_errors("t1") == []


def test_choose_n_group_needs_n_questions(monkeypatch):
    test, keys = _lr_test([1, 2, 3], key_for={1: ["A"], 2: ["B"], 3: ["C"]}, select_count=2,
                          source_name=validation.MICRO_EXERCISE_SOURCE)
    _use(monkeypatch, [test], keys)
    assert validation.publish_errors("t1") == ['Nhóm "Choose 2" từ câu 1 có 3 câu, cần đúng 2']


def test_writing_task1_needs_chart_and_full_test_needs_both_tasks(monkeypatch):
    test = {"id": "t1", "skill": "writing", "status": "draft", "source_type": "original", "source_name": None}
    sections = [{"test_id": "t1", "order_no": 1,
                 "writing_tasks": [{"task_type": "task1", "task_prompt": "Describe", "chart_image_key": None}]}]
    _use(monkeypatch, [test], sections=sections)
    assert validation.publish_errors("t1") == ["Đề Writing đầy đủ cần cả Task 1 và Task 2", "Task 1 chưa có ảnh biểu đồ"]


def test_external_source_needs_licence(monkeypatch):
    test = {"id": "t1", "skill": "speaking", "status": "draft", "source_type": "open_licence", "license": None}
    sections = [{"test_id": "t1", "order_no": 2, "speaking_parts": [{"section_id": "s2", "speaking_questions": [{"id": "x"}]}]}]
    _use(monkeypatch, [test], sections=sections)
    assert validation.publish_errors("t1") == ["Đề lấy từ nguồn ngoài phải ghi giấy phép (BR-18)"]


def test_set_status_blocks_invalid_publish_and_keeps_draft(monkeypatch):
    test, _ = _lr_test(range(1, 41))
    client = _use(monkeypatch, [test])
    with pytest.raises(InvalidRequestError, match="Chưa publish được"):
        cms_tests.set_status("admin-1", "t1", "published")
    assert client._rows("tests")[0]["status"] == "draft"


def test_set_status_publishes_valid_test_and_records_reviewer(monkeypatch):
    test, keys = _lr_test(range(1, 41), key_for={n: ["A"] for n in range(1, 41)})
    client = _use(monkeypatch, [test], keys)
    cms_tests.set_status("admin-1", "t1", "published")
    row = client._rows("tests")[0]
    assert row["status"] == "published" and row["reviewer_id"] == "admin-1"


def test_update_with_invalid_publish_saves_nothing(monkeypatch):
    test, _ = _lr_test(range(1, 41))
    client = _use(monkeypatch, [test])
    with pytest.raises(InvalidRequestError, match="Chưa publish được"):
        cms_tests.update_test("admin-1", "t1", {"title": "New title", "status": "published"})
    row = client._rows("tests")[0]
    assert row["title"] == "T" and row["status"] == "draft"


def test_update_adding_licence_in_same_request_can_publish(monkeypatch):
    test, keys = _lr_test(range(1, 41), key_for={n: ["A"] for n in range(1, 41)})
    test.update(source_type="open_licence", license=None)
    client = _use(monkeypatch, [test], keys)
    cms_tests.update_test("admin-1", "t1", {"origin": "open_license", "license": "CC BY 4.0", "status": "published"})
    row = client._rows("tests")[0]
    assert row["status"] == "published" and row["license"] == "CC BY 4.0"
