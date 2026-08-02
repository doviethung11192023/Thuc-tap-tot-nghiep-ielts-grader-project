"""
Retrieval schemas for title-based lookups.
"""
from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class TitleRecord:
    title: str
    task_type: str
    argument_list: list[str] = field(default_factory=list)
