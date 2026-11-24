"""Xây dựng ngữ cảnh đề Listening/Reading phía Server (tuân thủ Ràng buộc 8 / FR-14, cấm lộ xuống FE)."""
from typing import Any, Dict, List, Optional, Tuple

from app.core.domain_errors import ForbiddenError, NotFoundError
from app.services.learning_profile.common import get_from_cache, set_to_cache
from app.services.learning_profile.overview_aggregator import compute_learning_profile_overview
from app.services.listening_reading.lr_test_content import load_lr_question_keys, load_lr_test, lr_part
from app.services.practice.practice_attempt_lifecycle import get_owned_attempt


def _load_test_bundle_cached(test_id: str) -> Optional[Dict[str, Any]]:
    """Tải và cache RAM 5 phút toàn bộ đề L/R + question_keys trên server."""
    key = f"tutor_lr_bundle_{test_id}"
    cached = get_from_cache(key)
    if cached is not None:
        return cached
    test = load_lr_test(test_id)
    if not test:
        return None
    qids = [
        q["id"]
        for s in (test.get("sections") or [])
        for g in (lr_part(s).get("question_groups") or [])
        for q in (g.get("questions") or [])
    ]
    key_map = load_lr_question_keys(qids)
    bundle = {"test": test, "keys": key_map}
    set_to_cache(key, bundle, ttl_seconds=300)
    return bundle


def verify_practice_attempt(attempt_id: str, user_id: str, cfg: Dict[str, Any]) -> Dict[str, Any]:
    """Xác thực quyền sở hữu và chặn cứng chế độ Thi thử (Mock/Exam) + cấu hình Admin."""
    attempt = get_owned_attempt(attempt_id, user_id)
    if not attempt:
        raise NotFoundError("Phiên làm bài không tồn tại")
    if attempt.get("status") == "abandoned":
        raise ForbiddenError("Phiên làm bài này đã bị hủy")
    if attempt.get("skill") not in ("listening", "reading"):
        raise ForbiddenError("Trợ lý AI chỉ hỗ trợ kỹ năng Listening và Reading")
    if attempt.get("mode") != "practice":
        raise ForbiddenError("Trợ lý AI bị khóa hoàn toàn trong chế độ Phòng thi (Mock) để đảm bảo chuẩn đánh giá BR-12")
    if not cfg.get("enabled"):
        raise ForbiddenError("Trợ lý AI đang tạm tắt bởi Quản trị viên")
    if attempt["skill"] not in (cfg.get("enabled_skills") or []):
        raise ForbiddenError(f"Trợ lý AI đang tạm tắt cho kỹ năng {attempt['skill'].capitalize()}")
    return attempt


def list_public_question_groups(test_id: str) -> Tuple[str, List[Dict[str, Any]]]:
    """Trả danh sách nhóm câu hỏi an toàn cho UI chọn phạm vi (tuyệt đối KHÔNG kèm transcript/đáp án)."""
    bundle = _load_test_bundle_cached(test_id)
    if not bundle:
        return "", []
    test = bundle["test"]
    out: List[Dict[str, Any]] = []
    for sec in sorted(test.get("sections") or [], key=lambda s: s.get("order_no") or 0):
        sno = int(sec.get("order_no") or 1)
        for grp in sorted(lr_part(sec).get("question_groups") or [], key=lambda g: g.get("order_no") or 0):
            nums = sorted(int(q["number"]) for q in (grp.get("questions") or []) if q.get("number") is not None)
            if not nums:
                continue
            label = f"Questions {nums[0]}-{nums[-1]}" if len(nums) > 1 else f"Question {nums[0]}"
            out.append({
                "id": grp["id"],
                "section_no": sno,
                "label": label,
                "question_numbers": nums,
                "question_type": grp.get("question_type") or "other",
            })
    return str(test.get("title") or ""), out


def build_server_context_payload(
    attempt: Dict[str, Any],
    user_id: str,
    section_no: int,
    question_group_id: Optional[str],
    enable_band_adaptive: bool,
) -> Dict[str, Any]:
    """Lắp ráp ngữ cảnh giới hạn đúng 1 section + 1 question_group (server-side only)."""
    bundle = _load_test_bundle_cached(attempt["test_id"])
    if not bundle:
        raise NotFoundError("Không tìm thấy nội dung bài thi")
    test, key_map = bundle["test"], bundle["keys"]
    sections = sorted(test.get("sections") or [], key=lambda s: s.get("order_no") or 0)
    chosen_sec = next((s for s in sections if int(s.get("order_no") or 0) == int(section_no)), sections[0] if sections else None)
    if not chosen_sec:
        raise NotFoundError("Không tìm thấy phần thi")

    lr = lr_part(chosen_sec)
    groups = sorted(lr.get("question_groups") or [], key=lambda g: g.get("order_no") or 0)
    chosen_grp = next((g for g in groups if str(g.get("id")) == str(question_group_id)), groups[0] if groups else None)
    if not chosen_grp:
        raise NotFoundError("Không tìm thấy nhóm câu hỏi")

    qs_payload: List[Dict[str, Any]] = []
    nums: List[int] = []
    group_opts = [f"{o.get('label')}. {o.get('text')}" for o in (chosen_grp.get("group_options") or [])]
    for q in sorted(chosen_grp.get("questions") or [], key=lambda x: x.get("number") or 0):
        num = int(q.get("number") or 0)
        nums.append(num)
        q_opts = [f"{o.get('label')}. {o.get('text')}" for o in (q.get("question_options") or [])]
        krow = key_map.get(q["id"]) or {}
        qs_payload.append({
            "id": q["id"],
            "number": num,
            "prompt": q.get("prompt") or "",
            "options": q_opts or group_opts,
            "accepted_answers": krow.get("accepted_answers") or [],
            "explanation": krow.get("explanation") or "",
            "evidence": krow.get("evidence") or "",
        })

    context_text = (lr.get("passage") or "") if attempt["skill"] == "reading" else (lr.get("transcript") or "")
    if not context_text.strip():
        context_text = "[Nội dung văn bản/transcript của phần này chưa có trong hệ thống; hãy hướng dẫn dựa trên câu hỏi và chiến thuật IELTS.]"

    learner_band = None
    if enable_band_adaptive:
        try:
            ov = compute_learning_profile_overview(user_id)
            learner_band = (ov.get("skill_diagnostics") or {}).get(attempt["skill"], {}).get("current_band")
        except Exception:
            learner_band = None

    group_label = f"Questions {nums[0]}-{nums[-1]}" if len(nums) > 1 else (f"Question {nums[0]}" if nums else "")
    return {
        "skill": attempt["skill"],
        "test_title": test.get("title") or "",
        "section_no": int(chosen_sec.get("order_no") or 1),
        "group_id": str(chosen_grp["id"]),
        "group_label": group_label,
        "question_type": chosen_grp.get("question_type") or "",
        "instructions": chosen_grp.get("instructions") or "",
        "max_words": chosen_grp.get("max_words"),
        "context_text": context_text,
        "questions": qs_payload,
        "learner_band": learner_band,
    }
