"""
Ghi đề nhập từ dataset vào DB qua các service CMS (UC-30), dùng chung cho importer L/R, Writing, Speaking.

- Đề tạo ở trạng thái nháp (UC-30) và giữ nguyên nháp; Admin rà soát rồi tự xuất bản ở trình soạn đề (BR-10, UC-21).
- Đề đã tồn tại: only_pending → bỏ qua; nếu đang nháp → xoá section cũ rồi nạp lại;
  đã xuất bản → không ghi đè (BR-10, phải tạo phiên bản mới).
- Không gán vào bộ đề: bộ đề Mock chỉ có 1 đề/kỹ năng (FR-36), Admin tự gom sau.
"""
from typing import Any, Callable, Optional


from app.db.supabase import db
from app.services.cms import cms_questions, cms_sections, cms_tests


def _notify(progress: Optional[Callable], skill: str, title: str, status: str, message: str) -> None:
    if progress:
        progress({"skill": skill, "title": title, "status": status, "message": message})


def begin_test(title: str, skill: str, duration_min: int, difficulty: str, source_name: str, admin_id: str,
               only_pending: bool, stats: dict, progress: Optional[Callable] = None) -> Optional[str]:
    title = title.strip()[:280]
    existing = db().table("tests").select("id, status").eq("title", title).eq("skill", skill).limit(1).execute().data
    if existing:
        if only_pending:
            stats["tests_skipped_existing"] = stats.get("tests_skipped_existing", 0) + 1
            if f"{title.lower()[:280]}|{skill}" in stats.get("duplicate_titles", ()):
                stats.setdefault("warnings", []).append(
                    f"'{title}' trùng tiêu đề với đề khác trong dataset; chống trùng theo tiêu đề nên chỉ giữ một đề")
            _notify(progress, skill, title, "skipped", f"Bài '{title}' đã tồn tại.")
            return None
        if existing[0]["status"] != "draft":
            stats["errors"].append(f"'{title}' đã xuất bản — không ghi đè (BR-10), hãy tạo phiên bản mới")
            return None
        test_id = existing[0]["id"]
        db().table("sections").delete().eq("test_id", test_id).execute()
        db().table("tests").update({"duration_minutes": duration_min, "difficulty": difficulty}).eq("id", test_id).execute()
    else:
        test_id = cms_tests.create_test(admin_id, {
            "title": title, "skill": skill, "allowed_mode": "both", "duration_min": duration_min,
            "difficulty": difficulty, "origin": "manual", "source_name": source_name})["id"]
        stats.setdefault("_new_tests", []).append(test_id)
    stats["tests_created"] = stats.get("tests_created", 0) + 1
    _notify(progress, skill, title, "created", f"Đã nạp bài '{title}' ({skill.capitalize()}).")
    return test_id


def abort(test_id: Optional[str], stats: dict) -> None:
    """Lỗi giữa chừng: bỏ đề nháp vừa tạo trong lần chạy này để không để lại đề dở dang (rồi chạy lại được)."""
    if not test_id:
        return
    stats["tests_created"] = max(0, stats.get("tests_created", 0) - 1)
    if test_id in stats.get("_new_tests", []):
        try:
            db().table("tests").delete().eq("id", test_id).eq("status", "draft").execute()
        except Exception as e:
            stats["errors"].append(f"Không dọn được đề nháp dở dang {test_id}: {e}")


def add_section(test_id: str, order_no: int, title: str, stats: dict, passage_text: Optional[str] = None,
                audio_key: Optional[str] = None) -> str:
    sec = cms_sections.create_section(test_id, {"order_no": order_no, "title": title,
                                                "passage_text": passage_text, "audio_key": audio_key})
    stats["sections_created"] = stats.get("sections_created", 0) + 1
    return sec["id"]


def add_group(section_id: str, group: dict[str, Any], stats: dict) -> None:
    """group theo hình dạng QuestionGroupCreate: order_no, question_type, instructions, image_key, content,
    questions=[{number, prompt, options, max_words, prompt_audio_key, prep_time_sec, answer_time_sec, answer_key}]."""
    cms_questions.create_group(section_id, group)
    stats["question_groups_created"] = stats.get("question_groups_created", 0) + 1
    stats["questions_created"] = stats.get("questions_created", 0) + len(group.get("questions") or [])
