import json
from pathlib import Path
from typing import Optional, Dict, Any, List
from app.services.importers import import_writer
from app.schemas.exam_content import SkillType
from app.services.dataset_path_resolver import resolve_dataset_paths

def import_single_speaking_test(
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
    sp_de_bai_dir = de_bai_dir / "speaking"
    test_id = None
    try:
        de_bai_file = t_dir / "de_bai.json"
        if not de_bai_file.exists():
            stats["errors"].append(f"Không tìm thấy file đề: {de_bai_file}")
            return

        with open(de_bai_file, "r", encoding="utf-8") as f:
            de_bai = json.load(f)

        title = (de_bai.get("title") or t_dir.name.replace("_", " ")).strip()
        diff_val = difficulty if difficulty in ("easy", "medium", "hard") else "medium"

        test_id = import_writer.begin_test(title, SkillType.SPEAKING.value, 14, diff_val, "IELTS Actual Speaking Tests",
                                           admin_id, only_pending, stats, progress_callback)
        if not test_id:
            return
        # Bài nói mẫu / idea steps của dataset không có chỗ trong schema (speaking_questions chỉ có prompt + audio).
        for part_idx, part in enumerate(de_bai.get("parts", []), 1):
            p_title = part.get("title") or f"Speaking Part {part_idx}"
            q_low = p_title.lower()
            q_type = "speaking_part1" if "part 1" in q_low else ("speaking_part2" if "part 2" in q_low else "speaking_part3")
            section_id = import_writer.add_section(test_id, part_idx, p_title, stats)
            import_writer.add_group(section_id, {
                "order_no": 1, "question_type": q_type, "instructions": part.get("direction") or "",
                "questions": [{"number": i, "prompt": q.get("question") or q.get("prompt") or "",
                               "prompt_audio_key": q.get("examiner_audio_url"), "prep_time_sec": q.get("time_to_think"),
                               "answer_time_sec": q.get("limit_time")}
                              for i, q in enumerate(part.get("questions", []), 1)],
            }, stats)
    except Exception as e:
        import_writer.abort(test_id, stats)
        stats["errors"].append(f"Error importing speaking test {t_dir.name}: {str(e)}")

def import_speaking_tests(root_path: Path, admin_id: str, test_set_id: str, limit: Optional[int], stats: Dict[str, Any], only_pending: bool = True, progress_callback = None, difficulty: Optional[str] = "medium"):
    _, de_bai_dir, _ = resolve_dataset_paths(str(root_path))
    sp_de_bai_dir = de_bai_dir / "speaking"
    if not sp_de_bai_dir.exists():
        return
    test_dirs: List[Path] = []
    for sub in sorted(sp_de_bai_dir.iterdir()):
        if sub.is_dir():
            test_dirs.extend(sorted([f for f in sub.iterdir() if f.is_dir()]))
    if limit:
        test_dirs = test_dirs[:limit]
    for t_dir in test_dirs:
        import_single_speaking_test(t_dir, root_path, admin_id, test_set_id, stats, only_pending, progress_callback, difficulty)
