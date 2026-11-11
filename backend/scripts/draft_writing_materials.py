"""
Soạn nháp tài liệu theo đề cho các task Writing đang có (spec 006). Không tự duyệt: Admin duyệt trong CMS.

Thứ tự: đáp án Task 1 trước; dàn ý và bài mẫu Task 1 cần đáp án ĐÃ DUYỆT nên chạy lại script sau khi duyệt.
Bỏ qua trường đã có nội dung (nháp hoặc đã duyệt), trừ khi thêm --overwrite.

    cd backend && .venv/bin/python scripts/draft_writing_materials.py [--kinds answer_key,outline,sample]
        [--limit N] [--overwrite]
"""
import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.domain_errors import DomainError  # noqa: E402
from app.db.supabase import db  # noqa: E402
from app.services.writing.writing_task_materials import KINDS, draft_material, get_material  # noqa: E402


def _needs(material: dict, kind: str, overwrite: bool) -> bool:
    if kind == "answer_key" and material["task_type"] != "task1":
        return False
    if kind != "answer_key" and material["task_type"] == "task1" and not material.get("answer_key_reviewed_at"):
        return False                       # outline/sample Task 1 chờ đáp án được duyệt
    return overwrite or not material.get(KINDS[kind][0])


async def run(kinds: list[str], limit: int, overwrite: bool) -> None:
    tasks = db().table("writing_tasks").select("section_id").neq("task_prompt", "").execute().data or []
    done = failed = skipped = 0
    for row in tasks[:limit] if limit else tasks:
        material = get_material(row["section_id"])
        for kind in kinds:
            if not _needs(material, kind, overwrite):
                skipped += 1
                continue
            try:
                await draft_material(row["section_id"], kind)
                done += 1
                print(f"✓ {row['section_id']} {kind}")
            except (DomainError, RuntimeError) as e:
                failed += 1
                print(f"✗ {row['section_id']} {kind}: {e}")
    print(f"Drafted {done}, failed {failed}, skipped {skipped}. Nothing is approved: review them in the CMS.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--kinds", default="answer_key,outline,sample")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()
    asyncio.run(run([k for k in args.kinds.split(",") if k in KINDS], args.limit, args.overwrite))
