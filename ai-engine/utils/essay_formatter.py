from __future__ import annotations

import re
from schemas.tool_output import ProcessedEssay

_WORD_RE = re.compile(r"[a-zA-Z]+(?:'[a-zA-Z]+)*")


def format_indexed_essay(processed: ProcessedEssay) -> str:
    """Append [N] after each sentence. Paragraphs separated by blank line."""
    sentence_map = {s.index: s for s in processed.sentences}
    if not processed.paragraphs:
        if sentence_map:
            return " ".join(f"[{s.index}] {s.text}" for s in processed.sentences)
        return processed.essay_raw

    lines = []
    for p in processed.paragraphs:
        p_sents = [sentence_map[idx] for idx in p.sentence_indices if idx in sentence_map]
        if p_sents:
            lines.append(" ".join(f"[{s.index}] {s.text}" for s in p_sents))
        elif p.text:
            lines.append(p.text)
    return "\n\n".join(lines)


def format_annotated_essay(processed: ProcessedEssay) -> str:
    """Add [Đoạn N — X từ] header before each paragraph, then indexed sentences."""
    sentence_map = {s.index: s for s in processed.sentences}
    if not processed.paragraphs:
        word_count = len(_WORD_RE.findall(processed.essay_raw))
        header = f"[Paragraph 1 — {word_count} words]"
        if sentence_map:
            body = " ".join(f"[{s.index}] {s.text}" for s in processed.sentences)
        else:
            body = processed.essay_raw
        return f"{header}\n{body}" if body else header

    blocks = []
    for i, p in enumerate(processed.paragraphs, 1):
        word_count = len(_WORD_RE.findall(p.text))
        header = f"[Paragraph {i} — {word_count} words]"
        p_sents = [sentence_map[idx] for idx in p.sentence_indices if idx in sentence_map]
        if p_sents:
            body = " ".join(f"[{s.index}] {s.text}" for s in p_sents)
        else:
            body = p.text
        blocks.append(f"{header}\n{body}" if body else header)

    return "\n\n".join(blocks)
