from __future__ import annotations

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.preprocessor import test_preprocess
from utils.essay_formatter import format_indexed_essay, format_annotated_essay
from utils.char_index_resolver import resolve_span


def test_formatter_and_resolver():
    title = "Sample IELTS Essay Title"
    essay = (
        "To agree or disagree with the statement that interviews are the basic filtration criteria is an important issue. "
        "Putting the discussion in a wider context, interviews has always been debatable.\n\n"
        "Even though some people think that there are better methods, I believe interview is a good method."
    )
    processed = test_preprocess(title=title, essay=essay, target_band=7.0)

    # Test Format 1: Indexed
    indexed_text = format_indexed_essay(processed)
    print("--- INDEXED FORMAT ---")
    print(indexed_text)
    assert "[0]" in indexed_text
    assert "[1]" in indexed_text
    assert "[2]" in indexed_text
    assert "\n\n" in indexed_text

    # Test Format 2: Annotated
    annotated_text = format_annotated_essay(processed)
    print("\n--- ANNOTATED FORMAT ---")
    print(annotated_text)
    assert "[Đoạn 1 — " in annotated_text
    assert "[Đoạn 2 — " in annotated_text

    # Test Resolver: Exact match
    span_exact = resolve_span(0, "filtration criteria", processed)
    assert span_exact is not None
    start, end = span_exact
    assert processed.essay_raw[start:end] == "filtration criteria"
    print(f"\nExact span matched: {span_exact} -> {processed.essay_raw[start:end]!r}")

    # Test Resolver: Fuzzy match (minor typo)
    span_fuzzy = resolve_span(1, "interviews has allways been debatable", processed)
    assert span_fuzzy is not None
    start, end = span_fuzzy
    print(f"Fuzzy span matched: {span_fuzzy} -> {processed.essay_raw[start:end]!r}")

    # Test Resolver: Invalid sentence index / text
    assert resolve_span(99, "some text", processed) is None
    assert resolve_span(0, "completely non-matching phrase that is not in the text at all", processed) is None

    print("\nALL UTILITY TESTS PASSED!")


if __name__ == "__main__":
    test_formatter_and_resolver()
