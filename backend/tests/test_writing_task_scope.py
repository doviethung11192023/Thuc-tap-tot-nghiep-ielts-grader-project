"""Phạm vi task Writing (BR-04). Chạy: cd backend && .venv/bin/python -m pytest tests"""
from app.services.writing.writing_task_scope import task_scope


def test_mock_always_both_tasks():
    assert task_scope("mock", {1, 2}, "1") == {1, 2}


def test_practice_without_parts_is_whole_test():
    assert task_scope("practice", {1, 2}, None) == {1, 2}
    assert task_scope("practice", {1, 2}, "") == {1, 2}
    assert task_scope("practice", {1, 2}, "1,2") == {1, 2}


def test_practice_chosen_task_only():
    assert task_scope("practice", {1, 2}, "1") == {1}
    assert task_scope("practice", {1, 2}, "2") == {2}


def test_unknown_parts_fall_back_to_whole_test():
    assert task_scope("practice", {1, 2}, "3") == {1, 2}
    assert task_scope("practice", {2}, "1") == {2}       # đề chỉ có Task 2
