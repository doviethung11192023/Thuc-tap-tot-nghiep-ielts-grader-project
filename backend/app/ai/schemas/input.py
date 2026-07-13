"""
Input schema for the IELTS Writing Tutor pipeline.

Validation (word count, task-type detection, language check) is handled
by the frontend — this layer only provides typed data models.
Language is always English.
"""

from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class EssayInput:
    """
    Raw input received from the caller.

    Fields
    ------
    title       : The IELTS Task 2 prompt text.
    essay       : Full student essay, plain text.
                  Paragraph breaks are preserved via ``\\n\\n``.
    target_band : Desired band for rewrite suggestions.
                  If omitted, it is resolved post-scoring as current_band + 0.5.
    """
    title: str
    essay: str
    target_band: float | None = field(default=None)
