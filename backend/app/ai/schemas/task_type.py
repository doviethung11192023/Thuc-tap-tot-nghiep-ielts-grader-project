"""
Task type schema produced by the Task Type Classifier.
"""
from __future__ import annotations
from dataclasses import dataclass

TaskType = str  # "Opinion" | "Discussion" | "Advantages_Disadvantages" | "Cause_Solution" | "Cause_Effect" | "Two_Part_Question"


@dataclass
class TaskTypeResult:
    task_type: TaskType
    description: str  # Short description injected into the TA prompt
