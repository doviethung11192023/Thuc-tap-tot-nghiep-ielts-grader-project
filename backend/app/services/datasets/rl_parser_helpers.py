import json
import re
from typing import Optional, Dict, Any, List, Tuple

def clean_html(raw_html: Optional[str]) -> str:
    if not raw_html:
        return ""
    # Thay thế các thẻ phân đoạn thành xuống dòng \n\n trước khi strip tag HTML
    text = re.sub(r'<(?:p|div|br\s*/?|h[1-6]|tr|li)[^>]*>', '\n\n', str(raw_html), flags=re.I)
    clean = re.sub(r'<[^>]+>', ' ', text)
    lines = [re.sub(r'[ \t]+', ' ', l).strip() for l in clean.split('\n')]
    return '\n\n'.join(l for l in lines if l)

def _parse_option_item(ans: Dict[str, Any], idx: int) -> Dict[str, str]:
    raw_val = clean_html(ans.get("value") or ans.get("label") or "")
    m = re.match(r'^([A-Z]|i{1,3}|iv|v|vi{0,3}|ix|x)[\.\s]+(.+)$', raw_val)
    if m:
        return {"key": m.group(1), "text": m.group(2).strip()}
    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    key = raw_val if len(raw_val) <= 3 else (letters[idx] if idx < len(letters) else str(idx + 1))
    return {"key": key, "text": raw_val}

def _build_table_template(table_data: Dict[str, Any], start_q_num: int) -> Tuple[str, Dict[int, int]]:
    cells = table_data.get("cells") or []
    cols = max(1, int(table_data.get("number_of_column") or 2))
    rows_html = []
    q_Cursor = start_q_num
    qid_to_num: Dict[int, int] = {}

    for i in range(0, len(cells), cols):
        row_cells = cells[i:i + cols]
        tds = []
        for cell in row_cells:
            is_hdr = cell.get("is_header", False)
            chunks = []
            for ch in cell.get("data") or []:
                if ch.get("is_input"):
                    q_num = q_Cursor
                    if ch.get("question_id"):
                        qid_to_num[int(ch["question_id"])] = q_num
                    chunks.append(f"{{{{{q_num}}}}}")
                    q_Cursor += 1
                else:
                    val = clean_html(ch.get("value"))
                    if val:
                        chunks.append(val)
            tag = "th" if is_hdr else "td"
            style = "border:1px solid #e4e4e7;padding:8px 12px;background:#f4f4f5;font-weight:700;" if is_hdr else "border:1px solid #e4e4e7;padding:8px 12px;"
            tds.append(f"<{tag} style='{style}'>{' '.join(chunks)}</{tag}>")
        rows_html.append(f"<tr>{''.join(tds)}</tr>")

    table_html = f"<table style='width:100%;border-collapse:collapse;margin:8px 0;font-size:14px;'><tbody>{''.join(rows_html)}</tbody></table>"
    return table_html, qid_to_num

def extract_section_payload(sec: Dict[str, Any], skill_val: str, sec_idx: int) -> Dict[str, Any]:
    elem = sec.get("element") or {}
    ev_ext = elem.get("evidence_extract") or {}
    title = clean_html(sec.get("title") or elem.get("name") or f"Section {sec_idx}")

    if skill_val == "listening":
        audio_url = elem.get("media_path")
        if not audio_url:
            urls = re.findall(r'https?://[^\s"\'<>]+\.(?:mp3|wav|ogg)', json.dumps(sec))
            audio_url = urls[0] if urls else None
        utterances = ev_ext.get("utterances") or []
        transcripts = []
        for idx, u in enumerate(utterances):
            txt = clean_html(u.get("text"))
            if not txt:
                continue
            ms = int(u.get("start_timestamp") or 0)
            mins, secs = (ms // 60000), (ms // 1000) % 60
            transcripts.append({
                "id": f"t_{sec_idx}_{idx + 1}",
                "timestamp": f"{mins:02d}:{secs:02d}",
                "speaker": u.get("role") or u.get("name") or "Speaker",
                "text": txt
            })
        passage_text = json.dumps({"transcripts": transcripts}, ensure_ascii=False) if transcripts else clean_html(elem.get("content") or "")
        return {"title": title, "passage_text": passage_text, "audio_key": audio_url, "paragraphs": []}

    paragraphs_raw = ev_ext.get("paragraphs") or []
    paragraphs = []
    for idx, p in enumerate(paragraphs_raw):
        p_txt = clean_html(p.get("content"))
        if p_txt:
            paragraphs.append({"id": str(p.get("label") or chr(65 + idx)), "text": p_txt})

    raw_content = clean_html(elem.get("content") or sec.get("content") or sec.get("body") or "")
    if not raw_content and paragraphs:
        raw_content = "\n\n".join(f"[{p['id']}] {p['text']}" for p in paragraphs)
    return {"title": title, "passage_text": raw_content, "audio_key": None, "paragraphs": paragraphs}

def parse_exercise_group(
    ex: Dict[str, Any],
    start_q_num: int,
    section_paragraphs: List[Dict[str, str]]
) -> Tuple[str, str, Optional[str], Dict[str, Any], List[Dict[str, Any]], int]:
    ex_type = int(ex.get("type") or 1)
    title = clean_html(ex.get("title") or ex.get("content") or "")
    t_low = title.lower()

    if ex_type == 21 or ("true" in t_low and "false" in t_low):
        db_q_type = "true_false_not_given"
        ui_q_type = "true_false_not_given"
    elif ex_type == 22 or ("yes" in t_low and "no" in t_low):
        db_q_type = "true_false_not_given"
        ui_q_type = "yes_no_not_given"
    elif ex_type == 35:
        db_q_type = "matching"
        ui_q_type = "diagram_labelling"
    elif ex_type == 34:
        db_q_type = "completion"
        ui_q_type = "table_completion"
    elif ex_type == 7:
        db_q_type = "matching"
        ui_q_type = "matching_headings" if "heading" in t_low else "matching_features"
    elif ex_type in (2, 4, 8):
        db_q_type = "multiple_choice"
        ui_q_type = "single_choice" if ex_type == 2 else "multiple_choice"
    else:
        db_q_type = "completion"
        ui_q_type = "summary_completion"

    raw_questions = ex.get("questions") or []
    template_str: Optional[str] = None
    options_pool: Optional[List[Dict[str, str]]] = None
    image_key: Optional[str] = None

    if ex.get("body"):
        q_cursor = start_q_num
        def _repl(_m):
            nonlocal q_cursor
            rep = f"{{{{{q_cursor}}}}}"
            q_cursor += 1
            return rep
        template_str = re.sub(r'\{\{[^}]+\}\}', _repl, clean_html(ex.get("body")))
    elif ex_type == 34 and ex.get("table_data"):
        template_str, _ = _build_table_template(ex["table_data"], start_q_num)

    if ex_type == 35 and ex.get("map_data"):
        md = ex["map_data"]
        image_key = md.get("url")
        options_pool = [{"key": o.get("offset_char") or "", "text": clean_html(o.get("value"))} for o in (md.get("options") or [])]
    elif ex_type == 7 and raw_questions and raw_questions[0].get("answers"):
        options_pool = [_parse_option_item(a, i) for i, a in enumerate(raw_questions[0]["answers"])]

    parsed_questions = []
    cur_num = start_q_num
    map_w = float((ex.get("map_data") or {}).get("width") or 960)
    map_h = float((ex.get("map_data") or {}).get("height") or 720)

    for q in raw_questions:
        prompt = clean_html(q.get("title") or q.get("content") or q.get("prompt") or "")
        q_opts = [_parse_option_item(a, i) for i, a in enumerate(q.get("answers") or [])] if ex_type in (2, 4, 8) else None
        coord = q.get("coordinate")
        diag_coord = None
        if coord and isinstance(coord, dict) and coord.get("x") is not None and coord.get("y") is not None:
            diag_coord = {"x": round(float(coord["x"]) / map_w * 100, 1), "y": round(float(coord["y"]) / map_h * 100, 1)}

        parsed_questions.append({
            "raw_id": str(q.get("id") or ""),
            "number": cur_num,
            "prompt": prompt,
            "options": q_opts or ([{"diagram_coordinate": diag_coord}] if diag_coord else None),
            "diagram_coordinate": diag_coord
        })
        cur_num += 1

    content_meta = {
        "raw_type": ex_type,
        "ui_question_type": ui_q_type,
        "template": template_str,
        "options_pool": options_pool,
        "diagram_image_url": image_key,
        "paragraphs": section_paragraphs if section_paragraphs else None
    }
    return db_q_type, title, image_key, content_meta, parsed_questions, cur_num
