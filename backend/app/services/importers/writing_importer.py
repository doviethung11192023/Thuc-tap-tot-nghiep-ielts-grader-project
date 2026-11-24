import json
from functools import lru_cache
from pathlib import Path
from typing import Optional, Dict, Any, List
from app.services.importers import import_writer
from app.schemas.exam_content import SkillType
from app.services.dataset_path_resolver import resolve_dataset_paths

@lru_cache(maxsize=4)
def _r2_chart_keys(root: str) -> Dict[str, str]:
    """{id đề dataset: key ảnh Task 1 trên R2} từ r2_writing_manifest.json (scripts/upload_writing_dataset_to_r2.py)."""
    manifest = Path(root) / "r2_writing_manifest.json"
    if not manifest.exists():
        return {}
    tests = json.loads(manifest.read_text(encoding="utf-8")).get("tests") or []
    return {str(t["test_id"]): t["task1"]["image_key"] for t in tests if (t.get("task1") or {}).get("image_key")}


def import_single_writing_test(
    t_dir: Path,
    root_path: Path,
    admin_id: str,
    test_set_id: str,
    stats: Dict[str, Any],
    only_pending: bool = True,
    progress_callback = None,
    difficulty: Optional[str] = "medium"
):
    _, de_bai_dir, dap_an_dir = resolve_dataset_paths(str(root_path))
    w_de_bai_dir = de_bai_dir / "writing"
    test_id = None
    try:
        de_bai_file = t_dir / "de_bai.json"
        if not de_bai_file.exists():
            stats["errors"].append(f"Không tìm thấy file đề: {de_bai_file}")
            return

        with open(de_bai_file, "r", encoding="utf-8") as f:
            de_bai = json.load(f)

        title = (de_bai.get("title") or t_dir.name.replace("_", " ")).strip()
        # Ảnh biểu đồ Task 1: dùng bản trên R2 của mình, không dẫn link web bên thứ ba (có thể mất bất cứ lúc nào)
        r2_chart_key = _r2_chart_keys(str(resolve_dataset_paths(str(root_path))[0])).get(str(de_bai.get("id")))
        diff_val = difficulty if difficulty in ("easy", "medium", "hard") else "medium"

        test_id = import_writer.begin_test(title, SkillType.WRITING.value, 60, diff_val, "IELTS Actual Writing Tests",
                                           admin_id, only_pending, stats, progress_callback)
        if not test_id:
            return
        # Bài mẫu (sample_answers.json) nằm trên R2 (dataset/writing/tests/<id>/), schema không lưu.
        for part_idx, part in enumerate(de_bai.get("parts", []), 1):
            p_title = part.get("title") or f"Writing Task {part_idx}"
            direction = part.get("direction") or ""
            is_task1 = "task 1" in p_title.lower() or part_idx == 1
            first_q = part.get("questions", [{}])[0] if part.get("questions") else {}
            section_id = import_writer.add_section(test_id, part_idx, p_title, stats, direction)
            import_writer.add_group(section_id, {
                "order_no": 1, "question_type": "writing_task1" if is_task1 else "writing_task2",
                "instructions": direction,
                "image_key": (r2_chart_key or first_q.get("image_url")) if is_task1 else first_q.get("image_url"),
                "content": {"task_type": "task1" if is_task1 else "task2", "min_words": 150 if is_task1 else 250},
                "questions": [{"number": 1, "prompt": first_q.get("prompt") or first_q.get("question") or direction}],
            }, stats)
    except Exception as e:
        import_writer.abort(test_id, stats)
        stats["errors"].append(f"Error importing writing test {t_dir.name}: {str(e)}")

def import_writing_tests(root_path: Path, admin_id: str, test_set_id: str, limit: Optional[int], stats: Dict[str, Any], only_pending: bool = True, progress_callback = None, difficulty: Optional[str] = "medium"):
    _, de_bai_dir, _ = resolve_dataset_paths(str(root_path))
    w_de_bai_dir = de_bai_dir / "writing"
    if not w_de_bai_dir.exists():
        return
    test_dirs: List[Path] = []
    for sub in sorted(w_de_bai_dir.iterdir()):
        if sub.is_dir():
            test_dirs.extend(sorted([f for f in sub.iterdir() if f.is_dir()]))
    if limit:
        test_dirs = test_dirs[:limit]
    for t_dir in test_dirs:
        import_single_writing_test(t_dir, root_path, admin_id, test_set_id, stats, only_pending, progress_callback, difficulty)
