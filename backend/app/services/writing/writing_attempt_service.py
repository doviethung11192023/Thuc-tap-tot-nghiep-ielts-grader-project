"""
Nộp bài Writing (UC-09, SD-02).

Khoá attempt (in_progress → grading), lưu essay từng task, tạo 1 evaluation AI (pending)
+ 1 grading_run/task (tạo sẵn để finalizer biết còn task nào chưa chấm); worker chấm sau.
"""
from typing import Any

from fastapi import HTTPException

from app.db.supabase import db
from app.services.practice.practice_attempt_lifecycle import lock_for_submit
from app.services.writing.writing_test_content import load_writing_task_sections


def _pick_task_texts(sections: dict[int, str], task1: str, task2: str, essay_text: str) -> dict[int, str]:
    texts = {no: t.strip() for no, t in ((1, task1 or ""), (2, task2 or "")) if t and t.strip()}
    if not texts and essay_text and essay_text.strip():
        texts = {2 if 2 in sections else 1: essay_text.strip()}  # API cũ gửi 1 bài chung
    return {no: t for no, t in texts.items() if no in sections}


def submit_writing(attempt: dict[str, Any], task1: str, task2: str, essay_text: str) -> dict[str, Any]:
    sections = load_writing_task_sections(attempt["test_id"])        # {task_no: section_id}
    texts = _pick_task_texts(sections, task1, task2, essay_text)
    if not texts:
        raise HTTPException(status_code=400, detail="Bài viết trống")
    submitted_at = lock_for_submit(attempt, "grading")

    conn = db()
    conn.table("attempt_sections").upsert([
        {"attempt_id": attempt["id"], "section_id": sections[no], "test_id": attempt["test_id"],
         "started_at": attempt["started_at"], "finished_at": submitted_at} for no in texts
    ], on_conflict="attempt_id,section_id").execute()
    essays_res = conn.table("essays").upsert([
        {"attempt_id": attempt["id"], "section_id": sections[no], "content": text, "updated_at": submitted_at}
        for no, text in texts.items()
    ], on_conflict="attempt_id,section_id").execute()
    essay_by_section = {e["section_id"]: e for e in essays_res.data or []}

    evaluation = conn.table("evaluations").insert({
        "attempt_id": attempt["id"], "skill": "writing", "evaluator_type": "ai", "status": "pending",
    }).execute().data[0]
    runs = conn.table("grading_runs").insert([
        {"evaluation_id": evaluation["id"], "task_no": no, "status": "running", "started_at": submitted_at}
        for no in sorted(texts)
    ]).execute().data or []
    run_by_task = {r["task_no"]: r["id"] for r in runs}

    jobs = []
    for no in sorted(texts):
        essay = essay_by_section[sections[no]]
        jobs.append({"task_no": no, "essay_id": essay["id"], "run_id": run_by_task[no],
                     "word_count": essay.get("word_count") or len(texts[no].split())})
    return {"evaluation_id": evaluation["id"], "jobs": jobs, "submitted_at": submitted_at}
