from typing import List, Dict, Any, Set

DEFAULT_COVER_IMAGES = [
    "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop",
]

def format_collection_cards(
    test_sets: List[Dict[str, Any]],
    all_tests: List[Dict[str, Any]],
    completed_test_ids: Set[str]
) -> List[Dict[str, Any]]:
    """Group tests by test_set_id in-memory to eliminate N+1 queries."""
    tests_by_set: Dict[str, List[Dict[str, Any]]] = {}
    standalone_tests: List[Dict[str, Any]] = []

    for t in all_tests:
        sid = t.get("test_set_id")
        if sid:
            tests_by_set.setdefault(sid, []).append(t)
        else:
            standalone_tests.append(t)

    collections: List[Dict[str, Any]] = []
    for idx, s in enumerate(test_sets):
        tests = tests_by_set.get(s["id"], [])
        if not tests:
            continue
        skills_included = sorted(list({t["skill"].capitalize() for t in tests if t.get("skill")}))
        completed_count = sum(1 for t in tests if t["id"] in completed_test_ids)
        img_url = DEFAULT_COVER_IMAGES[idx % len(DEFAULT_COVER_IMAGES)]

        collections.append({
            "id": s["id"],
            "title": s["name"],
            "imageUrl": img_url,
            "isHot": idx == 0,
            "skillsIncluded": skills_included,
            "testsCount": len(tests),
            "completedTestsCount": completed_count,
            "tests": [
                {
                    "id": t["id"],
                    "orderNumber": i + 1,
                    "title": t["title"],
                    "skill": t["skill"].capitalize(),
                    "durationMin": t.get("duration_min") or 60,
                    "isCompleted": t["id"] in completed_test_ids,
                }
                for i, t in enumerate(tests)
            ],
        })

    if standalone_tests:
        skills_included = sorted(list({t["skill"].capitalize() for t in standalone_tests if t.get("skill")}))
        collections.append({
            "id": "standalone-tests",
            "title": "Đề Thi Thực Chiến Độc Lập",
            "imageUrl": DEFAULT_COVER_IMAGES[len(collections) % len(DEFAULT_COVER_IMAGES)],
            "isHot": False,
            "skillsIncluded": skills_included,
            "testsCount": len(standalone_tests),
            "completedTestsCount": sum(1 for t in standalone_tests if t["id"] in completed_test_ids),
            "tests": [
                {
                    "id": t["id"],
                    "orderNumber": i + 1,
                    "title": t["title"],
                    "skill": t["skill"].capitalize(),
                    "durationMin": t.get("duration_min") or 60,
                    "isCompleted": t["id"] in completed_test_ids,
                }
                for i, t in enumerate(standalone_tests)
            ],
        })

    return collections
