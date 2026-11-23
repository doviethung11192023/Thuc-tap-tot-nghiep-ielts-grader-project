"""
Task type schema produced by the Task Type Classifier.
"""
from __future__ import annotations
from dataclasses import dataclass

TaskType = str  # "Opinion" | "Discussion" | "Advantages_Disadvantages" | "Cause_Solution" | "Cause_Effect" | "Two_Part_Question" | "Unknown"

UNKNOWN_TASK_TYPE: TaskType = "Unknown"


@dataclass
class TaskTypeResult:
    task_type: TaskType
    description: str  # Short description injected into the TA prompt
    classifier: str = "qwen"  # "jev" | "qwen" | "none" (no classifier gave a valid type)
