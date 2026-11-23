"""
Input schema for the IELTS Writing Tutor pipeline.

Only two fields: the prompt title and the student essay.
All other metadata (word_count, task_type, scores, ...) are derived
by downstream tools and agents — not passed in by the caller.
"""

from __future__ import annotations
from dataclasses import dataclass


@dataclass
class EssayInput:
    """
    Raw input received from the caller.

    Fields
    ------
    title : The IELTS Task 2 prompt text.
    essay : Full student essay, plain text.
            Paragraph breaks are preserved via ``\\n\\n``.
    """
    title: str
    essay: str
