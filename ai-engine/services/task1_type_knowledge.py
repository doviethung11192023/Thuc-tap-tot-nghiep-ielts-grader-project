"""
IELTS Academic Writing Task 1 — visual type knowledge.

Local descriptions injected into the Task 1 Task Achievement prompt as
`task_type_knowledge` (mirrors the Task 2 descriptions kept in
services/task_type_classifier.py). The visual type itself comes from the
vision pass (services/chart_describer.py).
"""
from __future__ import annotations

from schemas.task_type import TaskTypeResult

_PROCESS_REQUIREMENTS = """- Overview must state the number of stages and the start/end points
- Describe every stage in sequence with sequencing language
- Common mistakes: skipping stages; adding opinions; no overview"""

_COMMON_REQUIREMENTS = """Common requirements for every Task 1 visual:
- Introduction paraphrasing what the visual shows (no copying of the prompt)
- A clear OVERVIEW of the main trends / differences / stages (essential for Band 6+)
- Key features selected and reported, supported with accurate data
- Relevant comparisons made where appropriate
- No personal opinion, causes or speculation beyond the data
- At least 150 words; a conclusion is not required (the overview replaces it)"""

TASK1_TYPES: dict[str, str] = {
    "line_graph": """Line graph — change over time.
- Overview must state the overall trend(s) and the highest/lowest or most notable series
- Describe rises, falls, fluctuations, peaks and plateaus with time references
- Compare series at key points (start, end, crossings)
- Common mistakes: listing every data point year by year; no overview; wrong tense for past periods""",
    "bar_chart": """Bar chart — comparison between categories (possibly over time).
- Overview must identify the largest/smallest categories or the main pattern
- Group similar categories instead of describing each bar separately
- Use comparative and superlative structures with figures
- Common mistakes: describing bars one by one without comparison; misreading units""",
    "pie_chart": """Pie chart(s) — proportions of a whole.
- Overview must identify the dominant and minor shares (and main changes if several pies)
- Use percentages/fractions accurately (a quarter, nearly half, the majority)
- Compare proportions across pies when more than one is given
- Common mistakes: treating percentages as absolute numbers; no comparison between pies""",
    "table": """Table — figures across categories and/or time.
- Overview must summarise the most significant patterns, not individual cells
- Select the most important figures (highest, lowest, biggest changes)
- Organise by row or column groups logically
- Common mistakes: copying the whole table; no selection of key features""",
    "map": """Map(s) — changes to a place or comparison of locations.
- Overview must state the overall transformation (e.g. more residential, less green space)
- Describe additions, removals, relocations and expansions with location language
- Use passive voice and appropriate tenses (past / future plans)
- Common mistakes: random order of description; missing overall change""",
    "process": f"""Process diagram — stages of a natural cycle or man-made process.
{_PROCESS_REQUIREMENTS}
- Use passive voice for man-made processes""",
    "process_natural": f"""Natural process — a life cycle or natural cycle.
{_PROCESS_REQUIREMENTS}
- Use active verbs in the present simple; a cycle has no fixed end, so state how it repeats""",
    "process_manufacturing": f"""Man-made process — how something is produced, or how a device or structure works.
{_PROCESS_REQUIREMENTS}
- Use passive voice for the stages""",
    "mixed": """Mixed visuals — two or more different charts.
- Overview must summarise the main point of EACH visual and, if possible, link them
- Report key features of every visual in a balanced way
- Common mistakes: ignoring one of the visuals; no link between visuals""",
}

_ALIASES = {
    "line": "line_graph", "line_chart": "line_graph", "line graph": "line_graph",
    "bar": "bar_chart", "bar graph": "bar_chart", "column_chart": "bar_chart",
    "pie": "pie_chart", "pie chart": "pie_chart",
    "diagram": "process", "flow_chart": "process", "cycle": "process",
    "multiple": "mixed", "combination": "mixed",
}


def normalize_task1_type(raw_type: str | None) -> str:
    key = (raw_type or "").strip().lower().replace("-", "_")
    if key in TASK1_TYPES:
        return key
    key = _ALIASES.get(key, _ALIASES.get(key.replace("_", " "), key))
    return key if key in TASK1_TYPES else "mixed"


def get_task1_type(raw_type: str | None) -> TaskTypeResult:
    task_type = normalize_task1_type(raw_type)
    return TaskTypeResult(
        task_type=task_type,
        description=f"{TASK1_TYPES[task_type]}\n\n{_COMMON_REQUIREMENTS}",
    )
