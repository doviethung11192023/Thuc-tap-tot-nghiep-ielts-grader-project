"""
Ghi đề nhập từ dataset vào DB qua các service CMS (UC-30), dùng chung cho importer L/R, Writing, Speaking.

- Đề tạo ở trạng thái nháp, điền nội dung rồi mới xuất bản (qua bước kiểm tra UC-21 bước 6).
- Đề đã tồn tại: only_pending → bỏ qua; nếu đang nháp → xoá section cũ rồi nạp lại;
  đã xuất bản → không ghi đè (BR-10, phải tạo phiên bản mới).
- Không gán vào bộ đề: bộ đề Mock chỉ có 1 đề/kỹ năng (FR-36), Admin tự gom sau.
"""
from typing import Any, Callable, Optional

from fastapi import HTTPException

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
    stats["tests_created"] = stats.get("tests_created", 0) + 1
    _notify(progress, skill, title, "created", f"Đã nạp bài '{title}' ({skill.capitalize()}).")
    return test_id


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


def publish(test_id: str, admin_id: str, title: str, stats: dict) -> None:
    try:
        cms_tests.set_status(admin_id, test_id, "published")
    except HTTPException as e:
        stats["errors"].append(f"'{title}' giữ ở nháp, chưa xuất bản được: {e.detail}")
