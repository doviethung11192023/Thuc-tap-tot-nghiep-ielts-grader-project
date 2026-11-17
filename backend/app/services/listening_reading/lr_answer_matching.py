"""
So khớp đáp án Listening/Reading theo BR-14:
- không phân biệt hoa thường, bỏ khoảng trắng thừa, bỏ dấu câu ở hai đầu;
- đúng nếu khớp BẤT KỲ đáp án nào trong danh sách; "a/b" là hai biến thể;
- từ trong ngoặc là tuỳ chọn: "(the) library" nhận "the library" và "library";
- đáp án dạng "C. text" nhận cả chữ cái "C";
- vượt giới hạn số từ (max_words) → 0 điểm; 1 điểm/câu, không trừ điểm.
"""
import itertools
import re
from typing import Any, Iterable, Optional

_OPTIONAL = re.compile(r"\(([^()]*)\)")
_OPTION_PREFIX = re.compile(r"^(xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i|[a-z])\s*\.\s+(.+)$")
_SPACE_KEY_PREFIX = re.compile(r"^([B-HJ-Z])\s+([A-Z].+)$")
_TF_SHORTHAND = {
    "true": "t",
    "t": "true",
    "false": "f",
    "f": "false",
    "not given": "ng",
    "ng": "not given",
    "yes": "y",
    "y": "yes",
    "no": "n",
    "n": "no",
}


def normalize(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (list, tuple, set)):
        value = " ".join(str(v) for v in value)
    raw = str(value).replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"')
    raw = raw.replace("\u2013", "-").replace("\u2014", "-")
    text = re.sub(r"\s+", " ", raw.strip().lower())
    return text.strip(" .,;:!?\"'")


def _optional_variants(answer: str) -> set[str]:
    """Mọi tổ hợp có/không có các phần trong ngoặc."""
    parts = _OPTIONAL.split(answer)          # [text, opt, text, opt, text...]
    fixed, optional = parts[0::2], parts[1::2]
    variants = set()
    for keep in itertools.product((True, False), repeat=len(optional)):
        pieces = [fixed[0]]
        for i, k in enumerate(keep):
            pieces += [optional[i] if k else "", fixed[i + 1]]
        variants.add(normalize("".join(pieces)))
    return variants


_CANONICAL_SHORT = {
    "true": "t",
    "false": "f",
    "not given": "ng",
    "ng": "not given",
    "yes": "y",
    "no": "n",
}


def _add_prefixed_forms(forms: set[str], value: str) -> None:
    forms.add(value)
    m = _OPTION_PREFIX.match(value)
    if m:
        forms.add(m.group(1))
        rest = normalize(m.group(2))
        if rest:
            forms.update(_optional_variants(rest))


def _option_pairs(options: Optional[Iterable[dict[str, Any]]]) -> list[tuple[str, str, str]]:
    pairs: list[tuple[str, str, str]] = []
    for opt in options or []:
        if not isinstance(opt, dict):
            continue
        key = normalize(opt.get("label") or opt.get("key"))
        text = normalize(opt.get("text"))
        m = _OPTION_PREFIX.match(text)
        body = normalize(m.group(2)) if m else ""
        if key or text:
            pairs.append((key, text, body))
    return pairs


def accepted_forms(
    accepted: Iterable[Any],
    options: Optional[Iterable[dict[str, Any]]] = None,
) -> set[str]:
    forms: set[str] = set()
    for raw in accepted or []:
        raw_str = str(raw).strip() if raw is not None else ""
        if raw_str and "/" not in raw_str:
            sm = _SPACE_KEY_PREFIX.match(raw_str)
            if sm:
                forms.update({normalize(sm.group(1)), normalize(sm.group(2))})
        for alt in normalize(raw).split("/") if "/" in raw_str else [normalize(raw)]:
            for v in _optional_variants(alt):
                _add_prefixed_forms(forms, v)
    for key, text, body in _option_pairs(options):
        combined = f"{key} {text}".strip() if key and text else ""
        if (key and key in forms) or (text and text in forms) or (body and body in forms) or (combined and combined in forms):
            if key:
                forms.add(key)
            if text:
                _add_prefixed_forms(forms, text)
            if key and text:
                forms.add(f"{key}. {text}")
            if body:
                forms.add(body)
    for canonical, short in _CANONICAL_SHORT.items():
        if canonical in forms:
            forms.add(short)
    forms.discard("")
    return forms


def word_count(answer: str) -> int:
    return len(answer.split()) if answer else 0


def _resolve_token_key(token: str, text_to_key: dict[str, str]) -> str:
    norm = normalize(token)
    if not norm:
        return ""
    m = _OPTION_PREFIX.match(norm)
    if m:
        return m.group(1)
    if norm in text_to_key:
        return text_to_key[norm]
    return norm


def parse_selected_keys(
    user_answer: Any,
    options: Optional[Iterable[dict[str, Any]]] = None,
) -> set[str]:
    if user_answer is None:
        return set()
    pairs = _option_pairs(options)
    text_to_key = {t: k for k, t, _ in pairs if k and t}
    text_to_key.update({b: k for k, _, b in pairs if k and b})
    raw_items = list(user_answer) if isinstance(user_answer, (list, tuple, set)) else str(user_answer).split(",")
    keys: set[str] = set()
    for item in raw_items:
        norm = normalize(item)
        if not norm:
            continue
        if " " in norm and norm not in text_to_key and not _OPTION_PREFIX.match(norm):
            tokens = norm.split()
            if all(len(tok) <= 3 for tok in tokens):
                keys.update(_resolve_token_key(tok, text_to_key) for tok in tokens)
                continue
        keys.add(_resolve_token_key(norm, text_to_key))
    keys.discard("")
    return keys


def multiselect_match_count(
    user_answer: Any,
    accepted: Iterable[Any],
    select_count: int,
    options: Optional[Iterable[dict[str, Any]]] = None,
) -> tuple[int, int]:
    pairs = _option_pairs(options)
    text_to_key = {t: k for k, t, _ in pairs if k and t}
    text_to_key.update({b: k for k, _, b in pairs if k and b})
    required: set[str] = set()
    for raw in accepted or []:
        k = _resolve_token_key(str(raw), text_to_key)
        if k:
            required.add(k)
    selected = parse_selected_keys(user_answer, options)
    if not selected or (select_count > 0 and len(selected) > select_count):
        return (0, len(required))
    return (len(selected & required), len(required))


def is_correct(
    user_answer: Any,
    accepted: Iterable[Any],
    max_words: Optional[int] = None,
    options: Optional[Iterable[dict[str, Any]]] = None,
    select_count: Optional[int] = None,
) -> bool:
    if select_count and select_count > 1:
        matched, required = multiselect_match_count(user_answer, accepted, select_count, options)
        return required > 0 and matched == required
    answer = normalize(user_answer)
    if not answer:
        return False
    if max_words and word_count(answer) > max_words:
        return False
    return answer in accepted_forms(accepted, options=options)
