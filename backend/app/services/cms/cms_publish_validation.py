"""
Kiểm tra nội dung đề trước khi publish (FR-27, UC-21; source-of-truth §UC-21, ràng buộc 7).

Trả về danh sách lỗi tiếng Việt; rỗng = được publish. Đề đầy đủ (full test) và bài tập theo dạng
(source_name = 'micro_exercise') khác nhau ở số lượng: bài tập chỉ cần có nội dung, không cần đủ 40 câu
hay đủ 2 task / 3 part.
- Listening/Reading: đề đầy đủ có đúng các câu 1..40; mọi câu có đáp án; câu có lựa chọn thì đáp án là
  nhãn lựa chọn có thật; nhóm "Choose N" có đúng N câu và ít nhất N lựa chọn; Listening mỗi phần có audio,
  Reading mỗi phần có bài đọc.
- Writing: mỗi task có đề; Task 1 có ảnh biểu đồ; đề đầy đủ có cả Task 1 và Task 2.
- Speaking: có ít nhất một part, mỗi part có câu hỏi (đề kiểu Prep có thể chỉ gồm Part 2 + 3).
- Nguồn không phải original thì phải có giấy phép (BR-18; DB cũng chặn, ở đây báo lỗi dễ hiểu hơn).
"""
import re
from typing import Any, Optional

from app.db.supabase import db
from app.services.listening_reading.lr_test_content import LR_TREE_SELECT, lr_part

MICRO_EXERCISE_SOURCE = "micro_exercise"
FULL_LR_QUESTION_COUNT = 40
MAX_LISTED_NUMBERS = 10


def _one(rel: Any) -> dict[str, Any]:
    """Quan hệ 1-1 qua FK ghép PostgREST có thể trả list."""
    if isinstance(rel, list):
        return rel[0] if rel else {}
    return rel or {}


def _label_of(answer: Any) -> str:
    """Nhãn đứng đầu đáp án: "B", "B. False", "ix. The purpose…", "B   Reading Room" → B / IX."""
    return re.split(r"[.\s]", str(answer).strip(), maxsplit=1)[0].upper()


def _numbers(nums: list[int]) -> str:
    shown = ", ".join(str(n) for n in sorted(nums)[:MAX_LISTED_NUMBERS])
    return shown + (" …" if len(nums) > MAX_LISTED_NUMBERS else "")


def _lr_errors(test: dict[str, Any], is_full: bool) -> list[str]:
    errors: list[str] = []
    sections = sorted(test.get("sections") or [], key=lambda s: s.get("order_no") or 0)
    groups = [(s, g) for s in sections for g in (lr_part(s).get("question_groups") or [])]
    questions = [q for _, g in groups for q in (g.get("questions") or [])]
    qids = [q["id"] for q in questions]
    keys = {r["question_id"]: r["accepted_answers"] or [] for r in (db().table("question_keys")
            .select("question_id, accepted_answers").in_("question_id", qids).execute().data or [])} if qids else {}

    for s in sections:
        part, name = lr_part(s), f"Phần {s.get('order_no')}"
        if test["skill"] == "listening" and not part.get("audio_key"):
            errors.append(f"{name} chưa có audio")
        if test["skill"] == "reading" and not (part.get("passage") or "").strip():
            errors.append(f"{name} chưa có bài đọc")

    numbers = [q["number"] for q in questions]
    if not questions:
        errors.append("Đề chưa có câu hỏi nào")
    elif is_full:
        missing = sorted(set(range(1, FULL_LR_QUESTION_COUNT + 1)) - set(numbers))
        duplicated = sorted({n for n in numbers if numbers.count(n) > 1})
        if missing:
            errors.append(f"Thiếu câu {_numbers(missing)} (đề đầy đủ cần đủ câu 1–{FULL_LR_QUESTION_COUNT})")
        if duplicated:
            errors.append(f"Trùng số câu {_numbers(duplicated)}")

    no_key, bad_label = [], []
    for _, g in groups:
        group_labels = {o["label"].strip().upper() for o in g.get("group_options") or []}
        group_qs = g.get("questions") or []
        for q in group_qs:
            accepted = keys.get(q["id"])
            if not accepted:
                no_key.append(q["number"])
                continue
            labels = {o["label"].strip().upper() for o in q.get("question_options") or []} or group_labels
            # accepted_answers gồm nhãn và các biến thể "nhãn. nội dung": cần ít nhất một nhãn có thật
            if labels and not any(_label_of(a) in labels for a in accepted):
                bad_label.append(q["number"])
        n = g.get("select_count")
        if n and group_qs:
            first = min(q["number"] for q in group_qs)
            if len(group_qs) != n:
                errors.append(f"Nhóm \"Choose {n}\" từ câu {first} có {len(group_qs)} câu, cần đúng {n}")
            if len(group_labels) < n:
                errors.append(f"Nhóm \"Choose {n}\" từ câu {first} chỉ có {len(group_labels)} lựa chọn")
    if no_key:
        errors.append(f"Câu chưa có đáp án: {_numbers(no_key)}")
    if bad_label:
        errors.append(f"Đáp án không phải nhãn lựa chọn có thật ở câu: {_numbers(bad_label)}")
    return errors


def _writing_errors(test_id: str, is_full: bool) -> list[str]:
    rows = db().table("sections").select(
        "order_no, writing_tasks(task_type, task_prompt, chart_image_key)").eq("test_id", test_id).execute().data or []
    tasks = [_one(r.get("writing_tasks")) for r in rows]
    tasks = [t for t in tasks if t]
    if not tasks:
        return ["Đề chưa có task Writing nào"]
    errors = []
    types = {t.get("task_type") for t in tasks}
    if is_full and not {"task1", "task2"} <= types:
        errors.append("Đề Writing đầy đủ cần cả Task 1 và Task 2")
    for t in tasks:
        label = "Task 1" if t.get("task_type") == "task1" else "Task 2"
        if not (t.get("task_prompt") or "").strip():
            errors.append(f"{label} chưa có đề bài")
        if t.get("task_type") == "task1" and not t.get("chart_image_key"):
            errors.append("Task 1 chưa có ảnh biểu đồ")
    return errors


def _speaking_errors(test_id: str) -> list[str]:
    rows = db().table("sections").select(
        "order_no, speaking_parts(section_id, speaking_questions(id))").eq("test_id", test_id).execute().data or []
    parts = [(r.get("order_no"), _one(r.get("speaking_parts"))) for r in rows]
    parts = [(no, p) for no, p in parts if p]
    if not parts:
        return ["Đề chưa có part Speaking nào"]
    errors = []
    for no, p in sorted(parts, key=lambda x: x[0] or 0):
        if not p.get("speaking_questions"):
            errors.append(f"Part {no} chưa có câu hỏi")
    return errors


def publish_errors(test_id: str, test: Optional[dict[str, Any]] = None) -> list[str]:
    """Lỗi chặn publish của đề; [] nếu đề hợp lệ. Đề không tồn tại trả [] để bước update báo 404.

    `test`: dòng tests người gọi đã đọc (cần skill, source_type, source_name, license), khỏi query lại."""
    if test is None:
        rows = db().table("tests").select("id, skill, source_type, source_name, license").eq("id", test_id) \
            .execute().data
        if not rows:
            return []
        test = rows[0]
    is_full = test.get("source_name") != MICRO_EXERCISE_SOURCE
    errors: list[str] = []
    if test.get("source_type") != "original" and not (test.get("license") or "").strip():
        errors.append("Đề lấy từ nguồn ngoài phải ghi giấy phép (BR-18)")
    if test["skill"] in ("listening", "reading"):
        tree = db().table("tests").select(LR_TREE_SELECT).eq("id", test_id).execute().data
        errors += _lr_errors({**test, **(tree[0] if tree else {})}, is_full)
    elif test["skill"] == "writing":
        errors += _writing_errors(test_id, is_full)
    else:
        errors += _speaking_errors(test_id)
    return errors
