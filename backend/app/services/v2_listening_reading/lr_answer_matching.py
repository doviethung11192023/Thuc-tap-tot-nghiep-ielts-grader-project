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
_LETTER_PREFIX = re.compile(r"^([a-z])\.\s+")


def normalize(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (list, tuple)):
        value = " ".join(str(v) for v in value)
    text = re.sub(r"\s+", " ", str(value).strip().lower())
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


def accepted_forms(accepted: Iterable[Any]) -> set[str]:
    forms: set[str] = set()
    for raw in accepted or []:
        for alt in normalize(raw).split("/") if "/" in str(raw) else [normalize(raw)]:
            for v in _optional_variants(alt):
                forms.add(v)
                m = _LETTER_PREFIX.match(v)
                if m:
                    forms.update({m.group(1), v[m.end():]})
    forms.discard("")
    return forms


def word_count(answer: str) -> int:
    return len(answer.split()) if answer else 0


def is_correct(user_answer: Any, accepted: Iterable[Any], max_words: Optional[int] = None) -> bool:
    answer = normalize(user_answer)
    if not answer:
        return False
    if max_words and word_count(answer) > max_words:
        return False
    return answer in accepted_forms(accepted)
