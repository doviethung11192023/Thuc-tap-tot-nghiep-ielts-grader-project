import re
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from app.core.security import get_optional_user, User
from app.db.supabase import supabase

router = APIRouter()

class SubmitAnswersRequest(BaseModel):
    answers: Dict[str, Any]  # question_id or question_number -> student answer
    time_spent_sec: Optional[int] = None
    parts: Optional[List[int]] = None

def _normalize_answer(ans: Any) -> str:
    if ans is None:
        return ""
    if isinstance(ans, list):
        ans = " ".join(str(x) for x in ans)
    clean = str(ans).strip().lower()
    clean = re.sub(r'^[a-d]\.\s*', '', clean)
    clean = re.sub(r'\s+', ' ', clean)
    return clean

def _check_match(user_val: str, accepted_answers: List[Any]) -> bool:
    if not user_val:
        return False
    norm_user = _normalize_answer(user_val)
    for acc in accepted_answers:
        norm_acc = _normalize_answer(acc)
        if norm_user == norm_acc:
            return True
        # Handle variants separated by slash e.g. "center/centre"
        if "/" in norm_acc:
            parts = [_normalize_answer(p) for p in norm_acc.split("/")]
            if norm_user in parts:
                return True
    return False

@router.post("/attempts/{attempt_id}/submit")
async def submit_reading_listening_answers(
    attempt_id: str,
    req: SubmitAnswersRequest,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Nộp bài Reading hoặc Listening và tự động chấm điểm theo thang điểm Cambridge."""
    att_res = supabase.table("test_attempts").select("*").eq("id", attempt_id).execute()
    if not att_res.data:
        raise HTTPException(status_code=404, detail="Phiên làm bài không tồn tại")
    attempt = att_res.data[0]
    if current_user and str(attempt["user_id"]) != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Không có quyền nộp bài cho phiên này")

    test_id = attempt["test_id"]
    skill = attempt["skill"]
    if skill not in ("reading", "listening"):
        raise HTTPException(status_code=400, detail=f"Chức năng này chỉ áp dụng cho Reading và Listening, không áp dụng cho {skill}")

    # Lấy các section của bài test (nếu req.parts được chỉ định thì chỉ chấm các đoạn đó)
    sec_res = supabase.table("test_sections").select("id, order_no").eq("test_id", test_id).order("order_no").execute()
    all_secs = sec_res.data or []
    if req.parts and len(req.parts) > 0:
        sec_ids = [s["id"] for s in all_secs if (s.get("order_no") or 1) in req.parts]
    else:
        sec_ids = [s["id"] for s in all_secs]
    grp_res = supabase.table("question_groups").select("id").in_("section_id", sec_ids).execute()
    grp_ids = [g["id"] for g in (grp_res.data or [])]
    q_res = supabase.table("questions").select("id, number, question_answer_keys(*)").in_("group_id", grp_ids).order("number").execute()
    questions = q_res.data or []

    raw_score = 0
    total_questions = len(questions)
    answers_to_insert = []
    now_utc = datetime.now(timezone.utc).isoformat()

    for q in questions:
        qid = q["id"]
        q_num = str(q["number"])
        user_val = req.answers.get(qid) or req.answers.get(q_num)
        ak = q.get("question_answer_keys")
        accepted = []
        if isinstance(ak, list) and ak:
            accepted = ak[0].get("accepted_answers", [])
        elif isinstance(ak, dict):
            accepted = ak.get("accepted_answers", [])

        is_correct = _check_match(user_val, accepted) if accepted else False
        if is_correct:
            raw_score += 1

        answers_to_insert.append({
            "attempt_id": attempt_id,
            "question_id": qid,
            "answer": user_val,
            "is_correct": is_correct,
            "updated_at": now_utc
        })

    # Lưu chi tiết câu trả lời vào attempt_answers
    if answers_to_insert:
        supabase.table("attempt_answers").upsert(answers_to_insert, on_conflict="attempt_id,question_id").execute()

    # Tra cứu Band score theo band_conversions (nếu làm phần lẻ, quy đổi về thang 40 câu)
    band_score = 1.0
    effective_raw = round((raw_score / max(1, total_questions)) * 40) if total_questions < 40 else raw_score
    bc_res = supabase.table("band_conversions").select("band").eq("skill", skill).lte("raw_min", effective_raw).gte("raw_max", effective_raw).limit(1).execute()
    if bc_res.data:
        band_score = float(bc_res.data[0]["band"])
    else:
        # Fallback tính toán tương đối nếu chưa seed đủ bảng
        band_score = round(min(9.0, max(1.0, (raw_score / max(1, total_questions)) * 9.0 * 2)) / 2, 1)

    # Cập nhật kết quả phiên làm bài
    supabase.table("test_attempts").update({
        "status": "scored",
        "submitted_at": now_utc,
        "scored_at": now_utc,
        "raw_score": raw_score,
        "band": band_score,
        "band_source": "auto"
    }).eq("id", attempt_id).execute()

    # Cập nhật tiến độ người dùng trong user_progress
    target_uid = current_user.id if current_user else attempt.get("user_id")
    prog_field = f"band_{skill}"
    prog_res = supabase.table("user_progress").select("*").eq("user_id", target_uid).execute() if target_uid else None
    if prog_res and prog_res.data:
        curr_prog = prog_res.data[0]
        bands = [
            band_score if s == skill else (float(curr_prog.get(f"band_{s}") or 0))
            for s in ("listening", "reading", "writing", "speaking")
        ]
        non_zero = [b for b in bands if b > 0]
        overall = round(sum(non_zero) / len(non_zero) * 2) / 2 if non_zero else band_score

        supabase.table("user_progress").update({
            prog_field: band_score,
            "band_overall": overall
        }).eq("user_id", target_uid).execute()

    return {
        "meta": {"code": 200, "message": "Nộp bài và chấm điểm thành công"},
        "data": {
            "attempt_id": attempt_id,
            "test_id": test_id,
            "skill": skill,
            "raw_score": raw_score,
            "total_questions": total_questions,
            "band": band_score,
            "time_spent_sec": req.time_spent_sec,
            "submitted_at": now_utc
        }
    }
