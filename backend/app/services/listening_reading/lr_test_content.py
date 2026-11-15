"""
Nội dung đề Listening/Reading, theo hình dạng mà frontend dùng
(utils/exam-content-mapper.ts, exam-mapper-helpers.ts → mapQuestionGroup):
group.content = {ui_question_type, template, options_pool, diagram_image_url}, question.options = [{key, text}].

Đáp án (question_keys) và transcript KHÔNG có trong nội dung làm bài (ràng buộc 8, FR-14);
chỉ build_lr_sections(..., with_keys=True) dùng sau khi nộp mới gắn đáp án.
"""
import re
from typing import Any, Optional

from app.db.supabase import db
from app.services.listening_reading.lr_answer_matching import is_correct

_TEST6_WORDLIST_GROUP_ID = "6d107a55-3309-46b1-a574-be2fa8a53390"
_LISTENING_T3_S1_Q2_ID = "552ea3fb-ecb7-42f2-93d0-a59970274965"
_TEST6_WORDLIST_OPTIONS = [
    {"label": "A", "text": "America"},
    {"label": "B", "text": "Ancient Rome"},
    {"label": "C", "text": "Australia"},
    {"label": "D", "text": "Bahrain"},
    {"label": "E", "text": "China"},
    {"label": "F", "text": "Japan"},
    {"label": "G", "text": "India"},
    {"label": "H", "text": "Korea"},
    {"label": "I", "text": "Mexico"},
    {"label": "J", "text": "Persia"},
    {"label": "K", "text": "Spain"},
]
_ROMAN_ORDER = {
    "i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6,
    "vii": 7, "viii": 8, "ix": 9, "x": 10, "xi": 11, "xii": 12,
}
_WORD_NUMBERS = {"one": 1, "two": 2, "three": 3, "four": 4}
_WORD_LIMIT_RE = re.compile(
    r"\b(?:NO\s+MORE\s+(?:THAN|TWO)\s+(ONE|TWO|THREE|FOUR|1|2|3|4)|(?:(ONE|1)\s+WORD(?:\s+ONLY)?))\b",
    re.IGNORECASE,
)
_AND_NUMBER_RE = re.compile(r"\bAND\s*/\s*OR\s+(?:A\s+)?NUMBERS?\b", re.IGNORECASE)
_SELECT_COUNT_RE = re.compile(
    r"\b(?:CHOOSE\s+(TWO|THREE|FOUR|2|3|4)\s+LETTERS?|WHICH\s+(TWO|THREE|FOUR|2|3|4)\b)",
    re.IGNORECASE,
)
_RANGE_PREFIX_RE = re.compile(r"^\s*Questions?\s+\d+\s*(?:[-–—]|to|and)\s*\d+", re.IGNORECASE)
_NA_EXPLANATION_RE = re.compile(r"Answer:\s*\*?\*?([A-Za-z0-9]+)", re.IGNORECASE)
_TEMPLATE_NUMBERED_BLANK_RE = re.compile(r"(?m)^(\s*)\d+(\.\s+[^\n{]*?\{\{(\d+)\}\})")
_TF_PREFIX_RE = re.compile(r"^(?:[A-Z]\.\s*)?(TRUE|FALSE|NOT\s+GIVEN|YES|NO)$", re.IGNORECASE)
_KEY_PREFIX_RE = re.compile(r"^([A-Z])\.\s+")

LR_TREE_SELECT = (
    "id, title, skill, status, duration_minutes, "
    "sections(id, order_no, title, lr_sections(passage, audio_key, transcript, "
    "question_groups(id, order_no, question_type, subtype, instructions, template, image_key, "
    "select_count, allow_reuse, max_words, group_options(label, text), "
    "questions(id, number, prompt, diagram_coordinate, question_options(label, text)))))"
)


def lr_part(section: dict[str, Any]) -> dict[str, Any]:
    """sections → lr_sections là quan hệ 1-1, nhưng PostgREST trả list (FK ghép (section_id, kind))."""
    lr = section.get("lr_sections")
    if isinstance(lr, list):
        lr = lr[0] if lr else None
    return lr or {}


def _infer_word_limit(instructions: str) -> Optional[int]:
    m = _WORD_LIMIT_RE.search(instructions or "")
    if not m:
        return None
    token = (m.group(1) or m.group(2) or "").lower()
    limit = int(token) if token.isdigit() else _WORD_NUMBERS.get(token)
    if limit and _AND_NUMBER_RE.search(instructions or ""):
        return limit + 1
    return limit


def _recover_key_row(row: dict[str, Any]) -> dict[str, Any]:
    if row.get("question_id") == _LISTENING_T3_S1_Q2_ID:
        row["accepted_answers"] = ["435", "$435", "435 a month"]
        return row
    accepted = row.get("accepted_answers") or []
    if not accepted or accepted == ["N/A"]:
        m = _NA_EXPLANATION_RE.search(row.get("explanation") or "")
        if m:
            row["accepted_answers"] = [m.group(1).strip().upper()]
    return row


def load_lr_question_keys(qids: list[str]) -> dict[str, dict[str, Any]]:
    """Tải question_keys từ DB và khôi phục các đáp án seed bị 'N/A' từ explanation/transcript."""
    if not qids:
        return {}
    rows = (
        db()
        .table("question_keys")
        .select("question_id, accepted_answers, explanation, evidence")
        .in_("question_id", qids)
        .execute()
        .data
        or []
    )
    return {r["question_id"]: _recover_key_row(dict(r)) for r in rows}


def _normalize_seed_group(g: dict[str, Any]) -> None:
    if g.get("id") == _TEST6_WORDLIST_GROUP_ID:
        if not g.get("group_options"):
            g["group_options"] = [dict(o) for o in _TEST6_WORDLIST_OPTIONS]
        if "Questions 31-36" in (g.get("instructions") or ""):
            g["instructions"] = (
                "Questions 30-35. Complete the summary below. Choose a letter from A-K for each answer."
            )

    qs = g.get("questions") or []
    for q in qs:
        if (
            str(q.get("prompt") or "").strip() == "What does the man want to have?"
            and len(q.get("question_options") or []) < 3
        ):
            q["question_options"] = [
                {"label": "A", "text": "A break"},
                {"label": "B", "text": "A talk"},
                {"label": "C", "text": "A class"},
            ]

    if not g.get("group_options") and "Write the correct letter, A-G" in (g.get("instructions") or ""):
        g["group_options"] = [
            {"label": ch, "text": f"Vị trí {ch} trên bản đồ"}
            for ch in ("A", "B", "C", "D", "E", "F", "G")
        ]

    opts = g.get("group_options") or []
    for o in opts:
        text = str(o.get("text") or "")
        if o.get("label") == "K" and re.match(r"^xi\.\s*", text, re.IGNORECASE):
            o["label"] = "xi"
            o["text"] = re.sub(r"^xi\.\s*", "", text, flags=re.IGNORECASE)

    if g.get("select_count") is None and (g.get("subtype") == "multiple_choice" or g.get("question_type") == "multiple_choice"):
        sm = _SELECT_COUNT_RE.search(g.get("instructions") or "")
        if sm:
            tok = next((x for x in sm.groups() if x), "").lower()
            if tok:
                g["select_count"] = int(tok) if tok.isdigit() else _WORD_NUMBERS.get(tok)
        elif len(qs) in (2, 3, 4) and opts and not any(q.get("question_options") for q in qs):
            g["select_count"] = len(qs)

    if g.get("max_words") is None and g.get("question_type") == "completion" and not opts:
        inferred = _infer_word_limit(g.get("instructions") or "")
        if inferred:
            g["max_words"] = inferred
    elif g.get("max_words") and _AND_NUMBER_RE.search(g.get("instructions") or ""):
        inferred = _infer_word_limit(g.get("instructions") or "")
        if inferred and inferred > int(g["max_words"]):
            g["max_words"] = inferred

    if len(qs) > 1 and g.get("instructions"):
        sorted_qs = sorted(qs, key=lambda q: q["number"])
        q_start, q_end = sorted_qs[0]["number"], sorted_qs[-1]["number"]
        g["instructions"] = _RANGE_PREFIX_RE.sub(
            f"Questions {q_start}-{q_end}", g["instructions"], count=1
        )

    tpl = g.get("template")
    if isinstance(tpl, str) and tpl:
        g["template"] = _TEMPLATE_NUMBERED_BLANK_RE.sub(
            lambda m: f"{m.group(1)}{m.group(3)}{m.group(2)}", tpl
        )


def load_lr_test(test_id: str) -> Optional[dict[str, Any]]:
    res = db().table("tests").select(LR_TREE_SELECT).eq("id", test_id).in_("skill", ["reading", "listening"]).execute()
    test = res.data[0] if res.data else None
    if test:
        for s in test.get("sections") or []:
            for g in lr_part(s).get("question_groups") or []:
                _normalize_seed_group(g)
    return test


def _option_sort_key(row: dict[str, Any]) -> tuple[int, int, str]:
    label = str(row.get("label") or "").strip()
    low = label.lower()
    if low in _ROMAN_ORDER:
        return (0, _ROMAN_ORDER[low], "")
    if label.isdigit():
        return (0, int(label), "")
    return (1, 0, label.upper())


def _options(rows: list[dict]) -> Optional[list[dict]]:
    return [{"key": o["label"], "text": o["text"]} for o in sorted(rows, key=_option_sort_key)] or None


def _format_correct_answer(
    g: dict[str, Any],
    accepted: list[Any],
    options: Optional[list[dict[str, Any]]] = None,
) -> str:
    if not accepted:
        return ""
    subtype = g.get("subtype") or ""
    if subtype in ("true_false_not_given", "yes_no_not_given"):
        for raw in accepted:
            m = _TF_PREFIX_RE.match(str(raw or "").strip())
            if m:
                return re.sub(r"\s+", " ", m.group(1)).upper()
    if g.get("select_count") and int(g["select_count"]) > 1:
        keys: list[str] = []
        for raw in accepted:
            s = str(raw or "").strip()
            km = _KEY_PREFIX_RE.match(s)
            key = km.group(1).upper() if km else (s.upper() if len(s) == 1 and s.isalpha() else "")
            if key and key not in keys:
                keys.append(key)
        if keys:
            return ", ".join(keys)
    if options and len(accepted) == 1:
        target = str(accepted[0] or "").strip()
        target_low = target.lower()
        for o in options:
            lbl = str(o.get("label") or o.get("key") or "").strip()
            txt = str(o.get("text") or "").strip()
            if (
                lbl
                and txt
                and txt.lower() != lbl.lower()
                and target_low == txt.lower()
                and not target_low.startswith(f"{lbl.lower()}.")
            ):
                return f"{lbl}. {txt}"
    return str(accepted[0])


def _group(g: dict[str, Any], keys: Optional[dict[str, dict]], answers: Optional[dict[str, dict]]) -> dict[str, Any]:
    questions = []
    sorted_qs = sorted(g.get("questions") or [], key=lambda q: q["number"])
    sel_count = g.get("select_count") or 0
    combined_accepted: Optional[list[Any]] = None
    if keys is not None and sel_count > 1 and len(sorted_qs) == sel_count:
        seen_acc: set[str] = set()
        merged_acc: list[Any] = []
        for q_item in sorted_qs:
            for ans_item in (keys.get(q_item["id"]) or {}).get("accepted_answers") or []:
                norm_item = str(ans_item).strip().lower()
                if norm_item and norm_item not in seen_acc:
                    seen_acc.add(norm_item)
                    merged_acc.append(ans_item)
        combined_accepted = merged_acc

    for q in sorted_qs:
        options = _options(q.get("question_options") or [])
        if not options and q.get("diagram_coordinate"):        # Diagram labelling: vị trí ô trống
            options = [{"diagram_coordinate": q["diagram_coordinate"]}]
        item = {"id": q["id"], "number": q["number"], "prompt": q.get("prompt"),
                "options": options, "max_words": g.get("max_words")}
        if keys is not None:                              # chỉ sau khi nộp (detail)
            k = keys.get(q["id"]) or {}
            a = (answers or {}).get(q["id"]) or {}
            raw_accepted = k.get("accepted_answers") or []
            accepted = combined_accepted if (combined_accepted and len(raw_accepted) < sel_count) else raw_accepted
            merged_opts = (g.get("group_options") or []) + (q.get("question_options") or [])
            user_ans = a.get("answer") or ""
            is_ok = bool(a.get("is_correct")) or (
                bool(user_ans)
                and is_correct(
                    user_ans,
                    accepted,
                    g.get("max_words"),
                    options=merged_opts,
                    select_count=sel_count,
                )
            )
            item.update({
                "question_answer_keys": [{"accepted_answers": accepted, "explanation": k.get("explanation"),
                                          "evidence": k.get("evidence")}],
                "user_answer": user_ans, "is_correct": is_ok,
                "correct_answer": _format_correct_answer(g, accepted, merged_opts),
                "explanation_4_steps": k.get("explanation") or "", "evidence_text": k.get("evidence") or "",
            })
        questions.append(item)
    return {
        "id": g["id"], "order_no": g["order_no"], "question_type": g["question_type"],
        "instructions": g.get("instructions"), "image_key": g.get("image_key"),
        "content": {"ui_question_type": g.get("subtype"), "template": g.get("template"),
                    "options_pool": _options(g.get("group_options") or []),
                    "diagram_image_url": g.get("image_key"), "select_count": g.get("select_count"),
                    "allow_reuse": g.get("allow_reuse"), "max_words": g.get("max_words")},
        "questions": questions,
    }


def build_lr_sections(test: dict[str, Any], with_keys: bool = False, answers: Optional[dict[str, dict]] = None,
                      only_sections: Optional[set[str]] = None) -> list[dict[str, Any]]:
    keys = None
    if with_keys:
        qids = [q["id"] for s in test.get("sections") or [] for g in (lr_part(s).get("question_groups") or [])
                for q in g.get("questions") or []]
        keys = load_lr_question_keys(qids)
    sections = []
    is_listening = test.get("skill") == "listening"
    for s in sorted(test.get("sections") or [], key=lambda s: s["order_no"]):
        if only_sections is not None and s["id"] not in only_sections:
            continue
        lr = lr_part(s)
        groups = sorted(lr.get("question_groups") or [], key=lambda g: g["order_no"])
        sec = {"id": s["id"], "order_no": s["order_no"], "title": s.get("title"),
               "passage_text": None if (is_listening and not with_keys) else lr.get("passage"),
               "audio_key": lr.get("audio_key"),
               "question_groups": [_group(g, keys, answers) for g in groups]}
        if with_keys:
            sec["transcript"] = lr.get("transcript") or (lr.get("passage") if is_listening else None)
        sections.append(sec)
    return sections


def to_lr_content(test: dict[str, Any]) -> dict[str, Any]:
    default_duration = 30 if test.get("skill") == "listening" else 60
    return {"test_id": test["id"], "title": test["title"], "skill": test["skill"],
            "duration_min": test.get("duration_minutes") or default_duration, "sections": build_lr_sections(test)}
