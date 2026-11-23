"""
Rule-based Task 2 essay type from the wording of the final question.

Task 2 questions use a small set of stock phrases, so plain patterns reach 83/96
on the Prep-labelled prompts with no model call. The corpus build uses this as a
second opinion: a reference keeps its type only when these rules and the LLM agree.
"""
from __future__ import annotations

import re

ESSAY_TYPES = (
    "Opinion",
    "Discussion",
    "Advantages_Disadvantages",
    "Cause_Solution",
    "Cause_Effect",
    "Two_Part_Question",
)

_DISCUSSION = re.compile(r"discuss (both|these|the two)|both (views|sides)")
_ADVANTAGES = re.compile(
    r"outweigh|advantages? and disadvantages?|benefits? and drawbacks?|positive or|good or bad"
)
_OPINION = re.compile(r"agree|disagree|your opinion|do you think|to what extent")
_CAUSE = re.compile(r"\b(why|causes?|reasons?|problems?)\b")
_SOLUTION = re.compile(
    r"solutions?|measures?|solve|tackle|what can be done|actions? can|how can (?:this|these|it|we|governments?)"
    r"|steps|address|overcome|deal with"
)
_EFFECT = re.compile(r"effects?|impacts?|results?|consequences?")


def _final_sentences(question: str, count: int = 3) -> str:
    """The instruction sits at the end; earlier sentences only set the topic."""
    sentences = re.split(r"(?<=[.!?])\s+", question.strip().lower())
    return " ".join(sentences[-count:])


def classify_by_rules(question: str) -> str:
    """Return one of ESSAY_TYPES. Anything unmatched counts as a direct two-part question."""
    tail = _final_sentences(question)
    if _DISCUSSION.search(tail):
        return "Discussion"
    if _ADVANTAGES.search(tail):
        # "Why is this happening? Is it positive or negative?" asks two separate things.
        return "Two_Part_Question" if tail.count("?") >= 2 else "Advantages_Disadvantages"
    if _OPINION.search(tail) and tail.count("?") <= 1:
        return "Opinion"
    if "?" in tail and _CAUSE.search(tail):
        if _SOLUTION.search(tail):
            return "Cause_Solution"
        if _EFFECT.search(tail):
            return "Cause_Effect"
    return "Two_Part_Question"
