"""
Chạy lại chấm AI cho một bài Speaking, dùng tới khi có màn hình Admin (UC-24).

Tạo evaluation mới, không ghi đè kết quả cũ. Chỉ dùng cho attempt grading_failed; attempt kẹt ở grading
do worker chết thì cron recover_stale_runs_task tự chạy lại.

    cd backend && .venv/bin/python scripts/regrade_speaking_attempt.py <attempt_id>
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.supabase import db  # noqa: E402
from app.services.speaking.speaking_grading_service import grade_speaking_attempt  # noqa: E402
from app.services.speaking.speaking_submission_service import create_grading_job  # noqa: E402

REGRADABLE = ("grading_failed",)


def main(attempt_id: str) -> None:
    rows = db().table("attempts").select("status, skill").eq("id", attempt_id).execute().data
    if not rows or rows[0]["skill"] != "speaking":
        raise SystemExit("Không tìm thấy attempt Speaking")
    if rows[0]["status"] not in REGRADABLE:
        raise SystemExit(f"Không chạy lại được attempt ở trạng thái {rows[0]['status']}")
    db().table("attempts").update({"status": "grading"}).eq("id", attempt_id).execute()
    job = create_grading_job(attempt_id)
    asyncio.run(grade_speaking_attempt(attempt_id, job["evaluation_id"], job["runs"][0]["run_id"]))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
