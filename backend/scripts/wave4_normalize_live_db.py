"""Atomic Postgres normalization script for Wave 4 (DATA-01..DATA-07)."""
import json
import os
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
import redis

from wave4_db_question_ops import ensure_group_options_from_q, fix_reading_test6, split_choose_two_group
from wave4_media_and_maps import MANIFEST_PATH
from wave4_passage_normalizer import fix_broken_italic_blanks, normalize_completion_template, normalize_reading_passage

LOCKED_TABLES = (
    "tests", "sections", "lr_sections", "writing_tasks", "speaking_parts",
    "question_groups", "group_options", "questions", "question_options",
    "question_keys", "speaking_questions",
)

CHOOSE_TWO_SPLIT_GROUPS = [
    "96e73ecd-23be-4773-bbf9-1d5a6d378b4b",  # L7 S2 Q11-12
    "0d021c96-0b3c-4d30-a505-bd69eb8b6c8c",  # L7 S2 Q13-14
    "8f61b08f-6f58-4a34-b9de-97791e1a9d63",  # L8 S2 Q17-18
    "acb11acc-9c4c-401f-bc36-9f633f28e7df",  # L8 S2 Q19-20
    "6b130cdc-c8ee-4347-98bb-9b1f1e0c4d5b",  # L10 S3 Q25-26
    "403c1d07-9950-4f7c-8e8f-1c475f9c600b",  # L10 S3 Q27-28
    "3b493ddc-6a71-409b-9067-7ec2a58c2a94",  # L10 S3 Q29-30
    "dc514ca6-988a-4e43-87bd-5bb145a3d7f3",  # R8 S1 Q12-13
]

MULTISELECT_EXISTING = [
    ("53c38e2e-d026-427f-8231-012939a598ae", 2),  # L1 S3 Q21-22
    ("7543d916-fb2a-4900-8865-1a67435f1af1", 2),  # L1 S3 Q23-24
    ("eb266f8b-d5d1-4a75-9a22-7c9df0f67921", 3),  # L1 S4 Q38-40
    ("3e699238-8d10-4b4e-84ef-2222387b7cd9", 3),  # L2 S2 Q18-20
    ("fadad55b-399e-4a9b-8336-cf23fa724bc7", 2),  # L5 S3 Q27-28
    ("9eb5c8b9-8267-4929-8884-0fd392c8dd51", 2),  # L5 S3 Q29-30
    ("2f3ff5fd-a8c6-4557-85c7-8d6a853be0de", 2),  # R9 S2 Q26-27
]

NA_KEY_REPAIRS = {
    "6993b2db-3fc9-4a2c-92da-dbf4adebeff5": ["B"],  # L1 Q11 Student Centre
    "eabff386-87a8-44a4-977d-65ba212925d2": ["C"],  # L1 Q13 Internet Unit
    "848af1f4-f5f7-4ebf-b3b1-13297a4c9bfd": ["D"],  # L1 Q14 Complaint Office
    "6f6cfddd-f2df-42b7-8a1a-184172a36f54": ["E"],  # L1 Q15 Cafe
    "47b055b0-e948-4d87-9bde-8dd2550e6eac": ["E"],  # L5 Q16 Box Office
    "210b1396-e732-487b-a646-504c77ef0f11": ["C"],  # L5 Q17 Children's Room
    "f7367b57-c998-465e-8c30-8007e9bcf61b": ["F"],  # L5 Q18 Cafe
    "3bb9a9e0-1819-4357-ab8c-83fe98ab45dc": ["B"],  # L5 Q19 Multimedia Room
    "1239c272-4786-43ea-a402-99a3fd4d8ba6": ["A"],  # L5 Q20 Showroom
    "552ea3fb-ecb7-42f2-93d0-a59970274965": ["435", "$435", "435 a month"],  # L3 Q2
}


def _resolve_prefix_uuids(cur) -> list[str]:
    out = []
    for gid in CHOOSE_TWO_SPLIT_GROUPS:
        cur.execute("SELECT id FROM public.question_groups WHERE id::text LIKE %s", (gid[:8] + "%",))
        out.append(str(cur.fetchone()[0]))
    return out


def _resolve_pair_uuids(cur) -> list[tuple[str, int]]:
    out = []
    for gid, cnt in MULTISELECT_EXISTING:
        cur.execute("SELECT id FROM public.question_groups WHERE id::text LIKE %s", (gid[:8] + "%",))
        out.append((str(cur.fetchone()[0]), cnt))
    return out


def main() -> None:
    backend_dir = Path(__file__).resolve().parents[1]
    load_dotenv(backend_dir / ".env")
    if not MANIFEST_PATH.exists():
        raise SystemExit(f"Missing media manifest at {MANIFEST_PATH}; run wave4_media_and_maps.py first.")
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

    conn = psycopg2.connect(os.environ["SUPABASE_DB_URL"])
    conn.autocommit = False
    cur = conn.cursor()
    cur.execute("SET search_path TO public")
    try:
        for tbl in LOCKED_TABLES:
            cur.execute(f"ALTER TABLE public.{tbl} DISABLE TRIGGER block_published_edit")

        cur.execute("UPDATE public.test_sets SET status = 'archived' WHERE id IN (%s, %s)",
                    ("a06aff43-f60e-4bc9-b8c2-9a41004535fd", "ddf2997b-97ba-4718-a549-58a4e0193187"))
        cur.execute("UPDATE public.tests SET test_set_id = NULL WHERE id = %s", ("41b2d714-396a-4908-ad3c-a5e7331d3c4c",))
        cur.execute("UPDATE public.tests SET test_set_id = %s WHERE id = %s AND skill = 'reading'",
                    ("a8767d8f-0ec0-43a0-967f-ec7a8dd2806d", "d45aa604-bf64-4941-8e5e-ba99463dc1d8"))

        for full_gid in _resolve_prefix_uuids(cur):
            split_choose_two_group(cur, full_gid)
        for full_gid, cnt in _resolve_pair_uuids(cur):
            cur.execute("UPDATE public.question_groups SET select_count = %s, subtype = 'multiple_choice_multi' WHERE id = %s", (cnt, full_gid))
            cur.execute("SELECT id FROM public.questions WHERE group_id = %s ORDER BY number LIMIT 1", (full_gid,))
            row = cur.fetchone()
            if row:
                ensure_group_options_from_q(cur, full_gid, str(row[0]))
        fix_reading_test6(cur, "d45aa604-bf64-4941-8e5e-ba99463dc1d8")

        for qid, answers in NA_KEY_REPAIRS.items():
            cur.execute("UPDATE public.question_keys SET accepted_answers = %s WHERE question_id = %s AND ('N/A' = ANY(accepted_answers) OR accepted_answers <> %s)", (answers, qid, answers))

        cur.execute("UPDATE public.question_groups SET instructions = replace(instructions, 'NO MORE TWO THREE WORDS', 'NO MORE THAN TWO WORDS'), max_words = 2 WHERE id = '550ebe32-bb39-4128-9196-991b5c0137b6'")
        cur.execute("UPDATE public.question_groups SET template = replace(template, 'No. of power sockets Daily exercise: 40', 'No. of power sockets: 40') WHERE id = '48eba350-9b51-46d2-98ab-7b40ee453017'")

        cur.execute("SELECT lr.section_id, lr.passage FROM public.lr_sections lr JOIN public.sections s ON s.id = lr.section_id JOIN public.tests t ON t.id = s.test_id WHERE t.skill = 'reading' AND t.status = 'published' AND lr.passage NOT LIKE '%%' || E'\\n\\n' || '%%'")
        for sid, txt in cur.fetchall():
            norm = normalize_reading_passage(txt or "")
            if norm != txt:
                cur.execute("UPDATE public.lr_sections SET passage = %s WHERE section_id = %s", (norm, sid))

        cur.execute("SELECT qg.id, qg.template FROM public.question_groups qg JOIN public.sections s ON s.id = qg.lr_section_id JOIN public.tests t ON t.id = s.test_id WHERE t.status = 'published' AND qg.template IS NOT NULL AND qg.template <> '' AND qg.template NOT ILIKE '%%<table%%' AND qg.template NOT LIKE '%%' || E'\\n' || '%%'")
        for gid, tpl in cur.fetchall():
            norm_tpl = normalize_completion_template(tpl)
            if norm_tpl != tpl:
                cur.execute("UPDATE public.question_groups SET template = %s WHERE id = %s", (norm_tpl, gid))

        for tbl_col, items in (("lr_sections SET audio_key", manifest.get("lr_sections", {})), ("speaking_questions SET audio_key", manifest.get("speaking_questions", {})), ("writing_tasks SET chart_image_key", manifest.get("writing_tasks", {})), ("question_groups SET image_key", manifest.get("question_groups", {}))):
            tbl_name, col_expr = tbl_col.split(" SET ")
            pk = "section_id" if tbl_name in ("lr_sections", "writing_tasks") else "id"
            for rid, val in items.items():
                cur.execute(f"UPDATE public.{tbl_name} SET {col_expr} = %s WHERE {pk} = %s", (val, rid))

        cur.execute("UPDATE public.tests SET duration_minutes = 9 WHERE skill = 'speaking' AND status = 'published' AND id IN (SELECT test_id FROM public.sections GROUP BY test_id HAVING count(*) = 2)")

        cur.execute("SELECT question_id, explanation FROM public.question_keys WHERE explanation LIKE '%%______%%'")
        for qid, exp in cur.fetchall():
            fixed = fix_broken_italic_blanks(exp or "")
            if fixed != exp:
                cur.execute("UPDATE public.question_keys SET explanation = %s WHERE question_id = %s", (fixed, qid))

        for tbl in LOCKED_TABLES:
            cur.execute(f"ALTER TABLE public.{tbl} ENABLE TRIGGER block_published_edit")
        conn.commit()
        print("COMMITTED Wave 4 normalization transaction successfully!")
    except Exception:
        conn.rollback()
        try:
            for tbl in LOCKED_TABLES:
                cur.execute(f"ALTER TABLE public.{tbl} ENABLE TRIGGER block_published_edit")
            conn.commit()
        except Exception:
            pass
        raise
    finally:
        cur.close()
        conn.close()

    try:
        r = redis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379/0"))
        r.incr("student-content:version")
        for pat in ("admin:statistics:*", "profile_*"):
            keys = list(r.scan_iter(pat))
            if keys:
                r.delete(*keys)
        print("Invalidated Redis student-content and admin stats caches.")
    except Exception as exc:
        print("Redis invalidation skipped:", exc)


if __name__ == "__main__":
    main()
