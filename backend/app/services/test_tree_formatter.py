from typing import Dict, Any, List

def format_nested_test_tree(test_data: Dict[str, Any]) -> Dict[str, Any]:
    """Sort sections, question groups, questions, and normalize answer keys."""
    sections = test_data.get("test_sections", [])
    sections.sort(key=lambda s: s.get("order_no") or 0)
    for sec in sections:
        groups = sec.get("question_groups", [])
        groups.sort(key=lambda g: g.get("order_no") or 0)
        for grp in groups:
            questions = grp.get("questions", [])
            questions.sort(key=lambda q: q.get("number") or 0)
            for q in questions:
                ak = q.get("question_answer_keys")
                if isinstance(ak, dict):
                    q["question_answer_keys"] = [ak]
                elif ak is None:
                    q["question_answer_keys"] = []
    test_data["sections"] = sections
    test_data.pop("test_sections", None)
    return test_data

def format_anti_cheat_sections(sections_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Sort anti-cheat sections tree without answer keys."""
    sections_data.sort(key=lambda s: s.get("order_no") or 0)
    for sec in sections_data:
        groups = sec.get("question_groups", [])
        groups.sort(key=lambda g: g.get("order_no") or 0)
        for grp in groups:
            questions = grp.get("questions", [])
            questions.sort(key=lambda q: q.get("number") or 0)
    return sections_data

def format_student_test_content(test_data: Dict[str, Any]) -> Dict[str, Any]:
    """Format single-query student test data tree."""
    raw_sections = test_data.get("test_sections", [])
    sections = format_anti_cheat_sections(raw_sections)
    return {
        "test_id": test_data["id"],
        "title": test_data["title"],
        "skill": test_data["skill"],
        "duration_min": test_data.get("duration_min") or 60,
        "sections": sections,
    }

