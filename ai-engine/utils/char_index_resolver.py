from __future__ import annotations

from difflib import SequenceMatcher
from schemas.tool_output import ProcessedEssay

_FUZZY_THRESHOLD = 0.85


def resolve_span(
    sentence_index: int,
    original_text: str,
    processed: ProcessedEssay,
) -> tuple[int, int] | None:
    """
    1. Get sentence by index from processed.sentences.
    2. Exact: essay_raw.find(original_text, char_start, char_end).
    3. Fuzzy fallback: slide a window of len(original_text) chars through the
       sentence and pick the position with highest SequenceMatcher ratio >= 0.85.
    4. Return None if both fail.
    """
    if not original_text:
        return None

    sent = next((s for s in processed.sentences if s.index == sentence_index), None)
    if sent is None:
        return None

    # Step 2: Exact search inside sentence boundaries
    pos = processed.essay_raw.find(original_text, sent.char_start, sent.char_end)
    if pos != -1:
        return (pos, pos + len(original_text))

    # Strip check for exact search if LLM output added outer whitespace
    stripped = original_text.strip()
    if stripped and stripped != original_text:
        pos = processed.essay_raw.find(stripped, sent.char_start, sent.char_end)
        if pos != -1:
            return (pos, pos + len(stripped))

    # Step 3: Fuzzy search fallback sliding window of len(original_text)
    target = stripped if stripped else original_text
    sent_text = processed.essay_raw[sent.char_start : sent.char_end]
    win_len = len(target)

    best_ratio = 0.0
    best_span: tuple[int, int] | None = None

    if win_len <= len(sent_text):
        for i in range(len(sent_text) - win_len + 1):
            candidate = sent_text[i : i + win_len]
            ratio = SequenceMatcher(None, target, candidate).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                start = sent.char_start + i
                best_span = (start, start + win_len)
    elif sent_text:
        ratio = SequenceMatcher(None, target, sent_text).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_span = (sent.char_start, sent.char_end)

    if best_ratio >= _FUZZY_THRESHOLD and best_span is not None:
        return best_span

    return None

def resolve_span_global(
    original_text: str,
    essay_raw: str,
) -> tuple[int, int] | None:
    """
    Search for original_text in the entire essay.
    1. Exact search
    2. Fuzzy search (sliding window) if exact fails.
    """
    if not original_text:
        return None

    # Step 1: Exact search
    pos = essay_raw.find(original_text)
    if pos != -1:
        return (pos, pos + len(original_text))

    stripped = original_text.strip()
    if stripped and stripped != original_text:
        pos = essay_raw.find(stripped)
        if pos != -1:
            return (pos, pos + len(stripped))

    # Step 2: Global fuzzy search (sliding window)
    target = stripped if stripped else original_text
    win_len = len(target)

    best_ratio = 0.0
    best_span: tuple[int, int] | None = None

    if win_len <= len(essay_raw):
        # To optimize, we could jump by words, but char by char is fine for small essays (1-2k chars)
        for i in range(len(essay_raw) - win_len + 1):
            candidate = essay_raw[i : i + win_len]
            ratio = SequenceMatcher(None, target, candidate).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_span = (i, i + win_len)
    elif essay_raw:
        ratio = SequenceMatcher(None, target, essay_raw).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_span = (0, len(essay_raw))

    if best_ratio >= _FUZZY_THRESHOLD and best_span is not None:
        return best_span

    return None

