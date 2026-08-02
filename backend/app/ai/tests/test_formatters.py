"""
Tests for format_indexed_essay and format_annotated_essay.

Run: python -m pytest tests/test_formatters.py -v
  or: python tests/test_formatters.py
"""
from __future__ import annotations

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from schemas.input import EssayInput
from utils.preprocessor import preprocess
from utils.essay_formatter import format_indexed_essay, format_annotated_essay


# ── Fixture ───────────────────────────────────────────────────────────────────

ESSAY_3_PARAS = (
    "To agree or disagree with the statement that interviews are the basic "
    "filteration criteria is an important issue. "
    "Putting the discussion in a wider context, interviews has always been debatable. "
    "Even though some people think that there are better methods for employing a "
    "resource rather than interviews, I wholeheartedly believe that interview is a "
    "good method for recruiting candidates.\n\n"

    "First, interviews allow employers to assess communication skills directly. "
    "This cannot be replicated by written tests alone. "
    "Moreover, face-to-face interaction reveals personality traits that are crucial "
    "for team dynamics.\n\n"

    "In conclusion, while interviews have limitations, they remain an indispensable "
    "part of the hiring process."
)

ESSAY_1_PARA = (
    "Technology has transformed the modern workplace significantly. "
    "Remote work, once considered a privilege, is now a standard arrangement. "
    "However, not all employees benefit equally from this shift."
)


@pytest.fixture
def processed_3():
    return preprocess(EssayInput(title="Interviews as a hiring tool", essay=ESSAY_3_PARAS))


@pytest.fixture
def processed_1():
    return preprocess(EssayInput(title="Technology and work", essay=ESSAY_1_PARA))


# ── format_indexed_essay ──────────────────────────────────────────────────────

class TestFormatIndexedEssay:

    def test_all_sentences_indexed(self, processed_3):
        result = format_indexed_essay(processed_3)
        n = len(processed_3.sentences)
        for i in range(n):
            assert f"[{i}]" in result, f"Missing sentence index [{i}]"

    def test_paragraphs_separated_by_blank_line(self, processed_3):
        result = format_indexed_essay(processed_3)
        assert "\n\n" in result, "Paragraphs should be separated by blank line"

    def test_paragraph_count_matches(self, processed_3):
        result = format_indexed_essay(processed_3)
        blocks = result.split("\n\n")
        assert len(blocks) == len(processed_3.paragraphs)

    def test_no_paragraph_headers(self, processed_3):
        result = format_indexed_essay(processed_3)
        assert "Đoạn" not in result, "Indexed format should NOT contain paragraph headers"

    def test_original_text_preserved(self, processed_3):
        result = format_indexed_essay(processed_3)
        for sent in processed_3.sentences:
            assert sent.text in result, f"Sentence text missing: {sent.text[:40]!r}"

    def test_single_paragraph_essay(self, processed_1):
        result = format_indexed_essay(processed_1)
        n = len(processed_1.sentences)
        for i in range(n):
            assert f"[{i}]" in result
        # Single para: no blank line split needed (may or may not have \n\n)
        assert result.strip() != ""

    def test_indices_in_order(self, processed_3):
        result = format_indexed_essay(processed_3)
        import re
        indices = [int(m) for m in re.findall(r"\[(\d+)\] ", result)]
        assert indices == sorted(indices), f"Indices out of order: {indices}"


# ── format_annotated_essay ────────────────────────────────────────────────────

class TestFormatAnnotatedEssay:

    def test_paragraph_headers_present(self, processed_3):
        result = format_annotated_essay(processed_3)
        for i, _ in enumerate(processed_3.paragraphs, 1):
            assert f"[Đoạn {i} —" in result, f"Missing header for paragraph {i}"

    def test_header_count_matches_paragraphs(self, processed_3):
        import re
        result = format_annotated_essay(processed_3)
        headers = re.findall(r"\[Đoạn \d+ — \d+ từ\]", result)
        assert len(headers) == len(processed_3.paragraphs)

    def test_word_count_in_header_is_positive(self, processed_3):
        import re
        result = format_annotated_essay(processed_3)
        counts = [int(m) for m in re.findall(r"\[Đoạn \d+ — (\d+) từ\]", result)]
        assert all(c > 0 for c in counts), f"All word counts must be positive, got {counts}"

    def test_header_word_count_roughly_correct(self, processed_3):
        """Word count in header should be a positive number within 50% of naive split count."""
        import re
        result = format_annotated_essay(processed_3)
        for para, match in zip(
            processed_3.paragraphs,
            re.finditer(r"\[Đoạn \d+ — (\d+) từ\]", result),
        ):
            header_wc = int(match.group(1))
            naive_wc = len(para.text.split())
            assert abs(header_wc - naive_wc) <= naive_wc * 0.5, (
                f"Para word count in header ({header_wc}) too far from naive count ({naive_wc})"
            )

    def test_all_sentences_indexed(self, processed_3):
        result = format_annotated_essay(processed_3)
        n = len(processed_3.sentences)
        for i in range(n):
            assert f"[{i}]" in result, f"Missing sentence index [{i}]"

    def test_paragraphs_separated_by_blank_line(self, processed_3):
        result = format_annotated_essay(processed_3)
        assert "\n\n" in result

    def test_original_text_preserved(self, processed_3):
        result = format_annotated_essay(processed_3)
        for sent in processed_3.sentences:
            assert sent.text in result, f"Sentence text missing: {sent.text[:40]!r}"

    def test_single_paragraph_essay(self, processed_1):
        result = format_annotated_essay(processed_1)
        assert "[Đoạn 1 —" in result
        for i in range(len(processed_1.sentences)):
            assert f"[{i}]" in result

    def test_header_comes_before_sentences(self, processed_3):
        """Each [Đoạn N] header must appear before its first sentence's [index]."""
        import re
        result = format_annotated_essay(processed_3)
        for i, para in enumerate(processed_3.paragraphs, 1):
            header_pos = result.find(f"[Đoạn {i} —")
            if not para.sentence_indices:
                continue
            first_sent_idx = para.sentence_indices[0]
            sent_marker_pos = result.find(f"[{first_sent_idx}] ")
            assert header_pos < sent_marker_pos, (
                f"Para {i} header appears after its first sentence marker"
            )


# ── Manual runner ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    from schemas.input import EssayInput
    from utils.preprocessor import preprocess

    p3 = preprocess(EssayInput(title="Interviews as a hiring tool", essay=ESSAY_3_PARAS))
    p1 = preprocess(EssayInput(title="Technology and work", essay=ESSAY_1_PARA))

    print("=" * 60)
    print("format_indexed_essay — 3 paragraphs")
    print("=" * 60)
    print(format_indexed_essay(p3))

    print("\n" + "=" * 60)
    print("format_annotated_essay — 3 paragraphs")
    print("=" * 60)
    print(format_annotated_essay(p3))

    print("\n" + "=" * 60)
    print("format_indexed_essay — 1 paragraph")
    print("=" * 60)
    print(format_indexed_essay(p1))

    print("\n" + "=" * 60)
    print("format_annotated_essay — 1 paragraph")
    print("=" * 60)
    print(format_annotated_essay(p1))
