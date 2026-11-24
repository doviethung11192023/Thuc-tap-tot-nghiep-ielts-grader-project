"""Transactional DB operations for splitting Choose TWO groups and fixing Reading Test 6."""
import re
import uuid

_READING_T6_Q11_EXPLANATION = (
    "### Step 1 — Highlight keywords\n"
    "*Scan for why dugongs travelled long distances in herds.*\n"
    "- **major reason** / **travelled long distances in herds**\n\n"
    "### Step 2 — Locate evidence in the passage\n"
    "> \"Dugongs are often travelling long distances in search of food.\"\n\n"
    "### Step 3 — Confirm answer\n"
    "**Answer: food** (1 word, matches NO MORE THAN TWO WORDS AND/OR A NUMBER)."
)

_TEST6_WORDLIST_OPTS = [
    ("A", "America"), ("B", "Ancient Rome"), ("C", "Australia"), ("D", "Bahrain"),
    ("E", "China"), ("F", "Japan"), ("G", "India"), ("H", "Korea"),
    ("I", "Mexico"), ("J", "Persia"), ("K", "Spain"),
]


def shift_questions_and_templates(cur, test_id: str, min_num: int, delta: int) -> None:
    """Shift questions >= min_num upward in descending order to avoid UNIQUE/CHECK collisions."""
    cur.execute(
        """
        SELECT q.id, q.number FROM public.questions q
        JOIN public.sections s ON s.id = q.lr_section_id
        WHERE s.test_id = %s AND q.number >= %s
        ORDER BY q.number DESC
        """,
        (test_id, min_num),
    )
    for qid, num in cur.fetchall():
        cur.execute("UPDATE public.questions SET number = %s WHERE id = %s", (num + delta, qid))

    cur.execute(
        """
        SELECT qg.id, qg.template FROM public.question_groups qg
        JOIN public.sections s ON s.id = qg.lr_section_id
        WHERE s.test_id = %s AND qg.template IS NOT NULL AND qg.template <> ''
        """,
        (test_id,),
    )
    for gid, tpl in cur.fetchall():
        new_tpl = re.sub(
            r"\{\{(\d+)\}\}",
            lambda m: f"{{{{{int(m.group(1)) + delta}}}}}" if int(m.group(1)) >= min_num else m.group(0),
            tpl,
        )
        if new_tpl != tpl:
            cur.execute("UPDATE public.question_groups SET template = %s WHERE id = %s", (new_tpl, gid))


def ensure_group_options_from_q(cur, group_id: str, question_id: str) -> None:
    """Populate group_options from a member question's question_options when missing."""
    cur.execute("SELECT count(*) FROM public.group_options WHERE group_id = %s", (group_id,))
    if cur.fetchone()[0] > 0:
        return
    cur.execute("SELECT label, text FROM public.question_options WHERE question_id = %s", (question_id,))
    for label, text in cur.fetchall():
        cur.execute(
            "INSERT INTO public.group_options (group_id, label, text) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
            (group_id, label, text),
        )


def split_choose_two_group(cur, group_id: str) -> bool:
    """Convert a single-question Choose TWO group into 2 DB question rows with select_count=2."""
    cur.execute(
        """
        SELECT q.id, q.lr_section_id, q.number, q.prompt, q.diagram_coordinate, s.test_id
        FROM public.questions q
        JOIN public.sections s ON s.id = q.lr_section_id
        WHERE q.group_id = %s
        ORDER BY q.number
        """,
        (group_id,),
    )
    rows = cur.fetchall()
    cur.execute(
        "UPDATE public.question_groups SET select_count = 2, subtype = 'multiple_choice_multi' WHERE id = %s",
        (group_id,),
    )
    if not rows:
        return False
    ensure_group_options_from_q(cur, group_id, rows[0][0])
    if len(rows) != 1:
        return False

    q0_id, sec_id, num0, prompt, diag_coord, test_id = rows[0]
    shift_questions_and_templates(cur, str(test_id), num0 + 1, 1)

    q2_id = str(uuid.uuid4())
    cur.execute(
        """
        INSERT INTO public.questions (id, group_id, lr_section_id, number, prompt, diagram_coordinate)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (q2_id, group_id, sec_id, num0 + 1, prompt, diag_coord),
    )
    cur.execute("SELECT label, text FROM public.question_options WHERE question_id = %s", (q0_id,))
    for lbl, txt in cur.fetchall():
        cur.execute(
            "INSERT INTO public.question_options (question_id, label, text) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
            (q2_id, lbl, txt),
        )
    cur.execute(
        "SELECT accepted_answers, explanation, evidence FROM public.question_keys WHERE question_id = %s",
        (q0_id,),
    )
    krow = cur.fetchone()
    if krow:
        cur.execute(
            """
            INSERT INTO public.question_keys (question_id, accepted_answers, explanation, evidence)
            VALUES (%s, %s, %s, %s)
            """,
            (q2_id, krow[0], krow[1], krow[2]),
        )
    return True


def fix_reading_test6(cur, test_id: str) -> bool:
    """Restore missing Q11 in Reading Test 6 (d45aa604) and shift Q11..39 -> Q12..40."""
    cur.execute(
        """
        SELECT count(*) FROM public.questions q
        JOIN public.sections s ON s.id = q.lr_section_id WHERE s.test_id = %s
        """,
        (test_id,),
    )
    if cur.fetchone()[0] >= 40:
        return False

    g3_id = "1a445543-6105-4abf-9744-5b6c282f532a"
    shift_questions_and_templates(cur, test_id, 11, 1)

    cur.execute("SELECT lr_section_id, template FROM public.question_groups WHERE id = %s", (g3_id,))
    sec_id, tpl = cur.fetchone()
    q11_id = str(uuid.uuid4())
    cur.execute(
        "INSERT INTO public.questions (id, group_id, lr_section_id, number, prompt) VALUES (%s, %s, %s, 11, '')",
        (q11_id, g3_id, sec_id),
    )
    cur.execute(
        """
        INSERT INTO public.question_keys (question_id, accepted_answers, explanation, evidence)
        VALUES (%s, %s, %s, %s)
        """,
        (
            q11_id,
            ["food", "seagrass", "search of food", "seagrass availability"],
            _READING_T6_Q11_EXPLANATION,
            "Dugongs are often travelling long distances in search of food.",
        ),
    )
    if tpl and "{{11}}" not in tpl:
        new_tpl = tpl.replace("one place to another?", "one place to another? {{11}}", 1)
        cur.execute("UPDATE public.question_groups SET template = %s WHERE id = %s", (new_tpl, g3_id))

    wl_gid = "6d107a55-3309-46b1-a574-be2fa8a53390"
    cur.execute("SELECT count(*) FROM public.group_options WHERE group_id = %s", (wl_gid,))
    if cur.fetchone()[0] == 0:
        for lbl, txt in _TEST6_WORDLIST_OPTS:
            cur.execute(
                "INSERT INTO public.group_options (group_id, label, text) VALUES (%s, %s, %s)",
                (wl_gid, lbl, txt),
            )
    return True
