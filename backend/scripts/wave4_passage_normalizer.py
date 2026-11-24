"""Pure normalization helpers for Reading passages, Completion templates, and explanations."""
import re

_KNOWN_PREFIX_SPLITS = (
    ("Television and Sportwhen the medium becomes the stadium", "Television and Sport: when the medium becomes the stadium"),
    ("Inspired by Mimicking Mother NatureUsing", "Inspired by Mimicking Mother Nature\nUsing"),
    ("Homeopathy Overdosing on nothing", "Homeopathy: Overdosing on nothing"),
    ("Environmental medicine– also called conservation medicine, ecological medicine, or medical geology – ",
     "Environmental medicine – also called conservation medicine, ecological medicine, or medical geology\n\n"),
    ("Love stories“Love", "Love stories\n\n“Love"),
    ("The Conquest of Malaria in Italy, 1900-1962 ", "The Conquest of Malaria in Italy, 1900-1962\n\n"),
    ("The dugong: Sea cow ", "The dugong: Sea cow\n\n"),
    ("Ancient Chinese Chariots ", "Ancient Chinese Chariots\n\n"),
    ("Thomas Young The Last True Know-It-All ", "Thomas Young: The Last True Know-It-All\n\n"),
    ("“For the strength of the pack is the wolf, and the strength of the wolf is the pack.”– Rudyard Kipling, The Law for the Wolves ",
     "“For the strength of the pack is the wolf, and the strength of the wolf is the pack.” – Rudyard Kipling, The Law for the Wolves\n\n"),
)
_GLUED_CAPS_TITLE_RE = re.compile(r"^([A-Z][A-Z0-9’'*\s\-\?:]{3,}?)(?=[A-Z“\"][a-z])")
_GLUED_MIXED_TITLE_RE = re.compile(r"^([A-Z][A-Za-z0-9\s\-\':,.*]{4,80}?[a-z\?\”])(?=(?:[A-Z“\"][a-z]|For\s|The\s|Time\s))")
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.?!…\"”’\)])\s+(?=[A-Z0-9“\"'(\[])")
_BULLET_SPLIT_RE = re.compile(r"\s+-\s+")
_NUMBERED_ITEM_RE = re.compile(r"(?<=[\s\.\?\!\}])((?:[1-3]?[0-9]|40)\.\s+(?=[A-Z0-9\{\"']))")


def _chunk_sentences(text: str, target_chars: int = 620) -> str:
    sentences = _SENTENCE_SPLIT_RE.split(text.strip())
    if len(sentences) <= 3:
        return text.strip()
    paras, buf, buf_len = [], [], 0
    for s in sentences:
        buf.append(s)
        buf_len += len(s)
        if len(buf) >= 3 and buf_len >= target_chars:
            paras.append(" ".join(buf))
            buf, buf_len = [], 0
    if buf:
        paras.append(" ".join(buf))
    return "\n\n".join(paras)


def _extract_lettered_paragraphs(raw: str) -> str | None:
    """Detect sequential IELTS A, B, C... markers (glued or inline) and format with \\n\\n."""
    m_a = re.search(r"(?:^|[\s–—\-:]|[a-zA-Z0-9])A\s+(?=[A-Z0-9“\"'\(])", raw[:950])
    if not m_a:
        return None
    split_pos = m_a.start() if m_a.group(0).startswith("A") else m_a.start() + 1
    head = raw[:split_pos].strip()
    rest = raw[split_pos:].strip()
    b_match = re.search(r"(?<=[.?!…\"”’\)])\s+B\s+(?=[A-Z0-9“\"'\(])", rest)
    if not b_match:
        return None

    blocks: list[str] = []
    if head:
        if "\n\n" in head:
            blocks.extend([p.strip() for p in head.split("\n\n") if p.strip()])
        else:
            blocks.append(head)

    cur = rest
    for nxt in "BCDEFGH":
        m_nxt = re.search(rf"(?<=[.?!…\"”’\)])\s+{nxt}\s+(?=[A-Z0-9“\"'\(])", cur)
        if not m_nxt:
            break
        blocks.append(cur[: m_nxt.start()].strip())
        cur = cur[m_nxt.start() :].strip()
    if cur:
        blocks.append(cur)
    return "\n\n".join(blocks)


def _split_unlettered_head(raw: str) -> tuple[str, str]:
    if "\n\n" in raw:
        first, rest = raw.split("\n\n", 1)
        return first.strip(), rest.strip()
    for glue_re in (_GLUED_CAPS_TITLE_RE, _GLUED_MIXED_TITLE_RE):
        m = glue_re.match(raw)
        if m and 6 <= len(m.group(1).strip()) <= 95:
            return m.group(1).strip(), raw[m.end() :].strip()
    return "", raw


def normalize_reading_passage(raw: str) -> str:
    """Format single-line Reading passages into clean \\n\\n paragraphs, preserving labels."""
    text = (raw or "").strip()
    if not text or "\n\n" in text:
        return raw
    for old, new in _KNOWN_PREFIX_SPLITS:
        if old in text:
            text = text.replace(old, new, 1)
    lettered = _extract_lettered_paragraphs(text)
    if lettered:
        return lettered
    title, body = _split_unlettered_head(text)
    chunked = _chunk_sentences(body)
    return f"{title}\n\n{chunked}" if title else chunked


def normalize_completion_template(tpl: str) -> str:
    """Break flat single-line notes/bullet completion templates onto readable lines."""
    if not tpl or "<table" in tpl.lower() or "\n" in tpl:
        return tpl
    if len(_BULLET_SPLIT_RE.findall(tpl)) >= 2:
        parts = _BULLET_SPLIT_RE.split(tpl.strip())
        out = parts[0].strip()
        for item in parts[1:]:
            out += f"\n- {item.strip()}"
        return out
    numbered = _NUMBERED_ITEM_RE.sub(r"\n\1", tpl.strip())
    return re.sub(r"\n+", "\n", numbered).strip()


def fix_broken_italic_blanks(explanation: str) -> str:
    """Convert outer `_..._` italic lines that contain `______` blanks into `*...*` safely."""
    if not explanation or "_" not in explanation:
        return explanation
    fixed_lines: list[str] = []
    for line in explanation.splitlines():
        s = line.strip()
        if re.match(r"^_[^_].*_{3,}.*[^_]_$", s):
            inner = s[1:-1]
            line = line.replace(s, f"*{inner}*", 1)
        fixed_lines.append(line)
    return "\n".join(fixed_lines)
