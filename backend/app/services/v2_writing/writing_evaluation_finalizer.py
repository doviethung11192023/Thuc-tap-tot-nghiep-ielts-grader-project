"""
Tổng hợp evaluation AI khi mọi grading_run đã xong (SD-02 bước 19, ST_evaluation).

- Còn run đang chạy → chờ.
- Có run lỗi → evaluation failed, attempt grading_failed (Admin chạy lại: UC-24).
- Xong hết → band task (BR-04) → band attempt (T1 + 2·T2)/3 → evaluation done.
  Chính thức nếu attempt chưa có điểm Expert chính thức (BR-08). Mock chưa có luồng
  Expert (BR-15) nên tạm xử lý như hết quota: điểm AI chính thức, attempt scored.
"""
from collections import defaultdict

from app.services.v2_practice import v2db
from app.services.v2_writing.writing_bands import attempt_band, task_band


def finalize_writing_evaluation(evaluation_id: str) -> None:
    db = v2db()
    evaluation = db.table("evaluations").select("id, attempt_id, status").eq("id", evaluation_id).execute().data[0]
    if evaluation["status"] in ("done", "failed"):
        return
    runs = db.table("grading_runs").select("task_no, status").eq("evaluation_id", evaluation_id).execute().data or []
    if not runs or any(r["status"] == "running" for r in runs):
        return
    attempt_id = evaluation["attempt_id"]

    if any(r["status"] == "failed" for r in runs):
        db.table("evaluations").update({"status": "failed"}).eq("id", evaluation_id).execute()
        db.table("attempts").update({"status": "grading_failed"}).eq("id", attempt_id).eq("status", "grading").execute()
        print(f"❌ [Worker v2] attempt {attempt_id} -> grading_failed")
        return

    scores = db.table("criterion_scores").select("task_no, band").eq("evaluation_id", evaluation_id).execute().data or []
    by_task: dict[int, list[float]] = defaultdict(list)
    for s in scores:
        by_task[s["task_no"]].append(float(s["band"]))
    graded_tasks = {r["task_no"] for r in runs}
    if any(len(by_task.get(t, [])) != 4 for t in graded_tasks):
        db.table("evaluations").update({"status": "failed"}).eq("id", evaluation_id).execute()
        db.table("attempts").update({"status": "grading_failed"}).eq("id", attempt_id).eq("status", "grading").execute()
        print(f"❌ [Worker v2] attempt {attempt_id}: missing criterion scores")
        return

    band = attempt_band({t: task_band(by_task[t]) for t in graded_tasks})
    has_expert = db.table("evaluations").select("id").eq("attempt_id", attempt_id) \
        .eq("evaluator_type", "expert").eq("is_official", True).execute().data
    if not has_expert:  # chạy lại AI: bản AI mới thay bản AI chính thức cũ (rb 5: 1 bản chính thức)
        db.table("evaluations").update({"is_official": False}).eq("attempt_id", attempt_id) \
            .eq("evaluator_type", "ai").eq("is_official", True).neq("id", evaluation_id).execute()
    db.table("evaluations").update({
        "status": "done", "overall_band": band, "is_official": not has_expert,
    }).eq("id", evaluation_id).execute()
    db.table("attempts").update({"status": "scored"}).eq("id", attempt_id).eq("status", "grading").execute()
    print(f"✅ [Worker v2] attempt {attempt_id} -> scored (band {band}, tasks {sorted(graded_tasks)})")
