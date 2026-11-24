"""Bộ trích xuất đáp án nhạy cảm (Anti-Spoiler Extraction) & bộ lọc SSE cửa sổ trượt theo thời gian thực."""
import re
from typing import Any, Dict, List, Optional, Tuple

ROMAN_NUMERALS = {"i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"}
STOPWORDS_3 = {
    "the", "and", "for", "not", "are", "you", "can", "all", "one", "two", "has", "was", "who",
    "của", "cho", "với", "các", "một", "này", "khi", "đâu", "sao", "nào",
}


def extract_spoiler_guard_data(questions: List[Dict[str, Any]]) -> Tuple[List[str], List[str]]:
    """Trả (terms_cần_che, option_letters_cần_che) gồm cả từ phân biệt gốc trong cụm đáp án nhiều lựa chọn."""
    terms, letters, seen_t, seen_l = [], [], set(), set()
    skip = {"true", "false", "not given", "paragraph", "yes", "no"} | STOPWORDS_3

    def _add_term(val: str, shared_words: Optional[set[str]] = None) -> None:
        s = re.sub(r"^(?:[A-H]|[ivx]{1,4})\.\s*", "", (val or "").strip(), flags=re.I)
        for cand in (s, re.sub(r"^(?:the|an|a)\s+", "", s, flags=re.I).strip()):
            low = cand.lower()
            is_num = bool(re.fullmatch(r"\d+(?:[.,]\d+)?", cand))
            if (is_num or len(cand) >= 3) and low not in skip and low not in seen_t:
                seen_t.add(low)
                terms.append(cand)
            if shared_words is not None and " " in cand:
                for w in re.findall(r"[A-Za-zÀ-ỹ0-9'-]+", cand):
                    wl = w.lower()
                    if len(w) >= 4 and wl not in skip and wl not in shared_words and wl not in seen_t:
                        seen_t.add(wl)
                        terms.append(w)

    for q in questions or []:
        opt_map, word_freq = {}, {}
        raw_opts = q.get("options") or []
        for o in raw_opts:
            m = re.match(r"^\s*([A-H]|[ivx]{1,4})[\.\)\:]\s*(.+)$", str(o or "").strip(), re.I)
            opt_body = m.group(2).strip() if m else str(o or "").strip()
            if m:
                opt_map[m.group(1).lower()] = opt_body
            for w in set(re.findall(r"[A-Za-zÀ-ỹ0-9'-]+", opt_body.lower())):
                word_freq[w] = word_freq.get(w, 0) + 1
        shared = {w for w, c in word_freq.items() if c >= 2} if len(raw_opts) >= 2 else None
        for raw in q.get("accepted_answers") or []:
            text = str(raw or "").strip()
            low = text.lower()
            if re.fullmatch(r"[A-H]", text, re.I) or low in ROMAN_NUMERALS:
                key = text.upper() if re.fullmatch(r"[A-H]", text, re.I) else low
                if key not in seen_l:
                    seen_l.add(key)
                    letters.append(key)
                if low in opt_map:
                    _add_term(opt_map[low], shared)
            else:
                _add_term(text, shared)
    terms.sort(key=len, reverse=True)
    return terms, letters


def extract_spoiler_terms(questions: List[Dict[str, Any]]) -> List[str]:
    return extract_spoiler_guard_data(questions)[0]


class _AntiSpoilerStreamFilter:
    """Bộ lọc cửa sổ trượt chặn rò rỉ đáp án nguyên văn & chữ cái phương án khi anti_spoiler_mode='strict'."""

    def __init__(self, terms: List[str], enabled: bool, lang: str, option_letters: Optional[List[str]] = None) -> None:
        self.enabled = enabled and bool(terms or option_letters)
        self.mask = "[target answer]" if lang == "en" else "[từ cần tìm]"
        self.patterns = [re.compile(rf"(?i)\b{re.escape(t)}\b") for t in terms]
        for ltr in (option_letters or []):
            self.patterns.append(
                re.compile(rf"(?i)\b(?:đáp án(?:\s+đúng)?(?:\s+là)?|chọn|phương án|answer\s+is|option|matches|is\s+option)\s+{re.escape(ltr)}\b")
            )
        self.hold_len = max([len(t) for t in terms] + ([20] if option_letters else [0])) + 4 if self.enabled else 0
        self.buf = ""
        self.redacted = False
        self.redaction_count = 0

    def _scrub(self, text: str) -> str:
        out = text
        for pat in self.patterns:
            out, n = pat.subn(self.mask, out)
            if n > 0:
                self.redacted = True
                self.redaction_count += n
        return out

    def feed(self, chunk: str) -> str:
        if not self.enabled:
            return chunk
        self.buf = self._scrub(self.buf + chunk)
        if len(self.buf) <= self.hold_len:
            return ""
        emit, self.buf = self.buf[:-self.hold_len], self.buf[-self.hold_len:]
        return emit

    def flush(self) -> str:
        if not self.buf:
            return ""
        out = self._scrub(self.buf)
        self.buf = ""
        return out
