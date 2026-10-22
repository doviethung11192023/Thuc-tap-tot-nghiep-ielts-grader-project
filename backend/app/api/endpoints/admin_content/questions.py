from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List
from app.core.security import require_admin, User
from app.db.supabase import supabase
from app.schemas.exam_content import (
    QuestionGroupCreate, QuestionCreate, AnswerKeyCreate
)

router = APIRouter()

# --- Question Groups (Nhóm Dạng Bài) ---
@router.post("/sections/{section_id}/question-groups", status_code=status.HTTP_201_CREATED)
async def create_question_group(
    section_id: str,
    grp_data: QuestionGroupCreate,
    current_user: User = Depends(require_admin)
):
    """Tạo nhóm câu hỏi (ví dụ: True/False/Not Given, Multiple Choice, Map Labelling...)."""
    s_res = supabase.table("test_sections").select("id").eq("id", section_id).execute()
    if not s_res.data:
        raise HTTPException(status_code=404, detail="Section không tồn tại")

    payload = {
        "section_id": section_id,
        "order_no": grp_data.order_no,
        "question_type": grp_data.question_type.value,
        "question_subtype": grp_data.question_subtype,
        "instructions": grp_data.instructions,
        "image_key": grp_data.image_key,
        "content": grp_data.content
    }

    res = supabase.table("question_groups").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Không thể tạo nhóm câu hỏi")
    
    group = res.data[0]

    # Nếu có danh sách câu hỏi kèm theo
    if grp_data.questions:
        for q in grp_data.questions:
            q_payload = {
                "group_id": group["id"],
                "number": q.number,
                "prompt": q.prompt,
                "options": q.options,
                "max_words": q.max_words,
                "prompt_audio_key": q.prompt_audio_key,
                "prep_time_sec": q.prep_time_sec,
                "answer_time_sec": q.answer_time_sec
            }
            q_res = supabase.table("questions").insert(q_payload).execute()
            if q_res.data and q.answer_key:
                ak_payload = {
                    "question_id": q_res.data[0]["id"],
                    "accepted_answers": q.answer_key.accepted_answers,
                    "explanation": q.answer_key.explanation,
                    "evidence": q.answer_key.evidence
                }
                supabase.table("question_answer_keys").insert(ak_payload).execute()

    return {"meta": {"code": 201, "message": "Tạo nhóm câu hỏi thành công"}, "data": group}

@router.delete("/question-groups/{group_id}")
async def delete_question_group(
    group_id: str,
    current_user: User = Depends(require_admin)
):
    """Xóa nhóm câu hỏi."""
    res = supabase.table("question_groups").delete().eq("id", group_id).execute()
    return {"meta": {"code": 200, "message": "Xóa nhóm câu hỏi thành công"}}

# --- Questions & Answer Keys (Câu Hỏi & Đáp Án Chuẩn) ---
@router.post("/question-groups/{group_id}/questions", status_code=status.HTTP_201_CREATED)
async def create_question(
    group_id: str,
    q_data: QuestionCreate,
    current_user: User = Depends(require_admin)
):
    """Tạo câu hỏi mới kèm đáp án chấp nhận và lời giải 4 bước."""
    g_res = supabase.table("question_groups").select("id").eq("id", group_id).execute()
    if not g_res.data:
        raise HTTPException(status_code=404, detail="Nhóm câu hỏi không tồn tại")

    q_payload = {
        "group_id": group_id,
        "number": q_data.number,
        "prompt": q_data.prompt,
        "options": q_data.options,
        "max_words": q_data.max_words,
        "prompt_audio_key": q_data.prompt_audio_key,
        "prep_time_sec": q_data.prep_time_sec,
        "answer_time_sec": q_data.answer_time_sec
    }
    q_res = supabase.table("questions").insert(q_payload).execute()
    if not q_res.data:
        raise HTTPException(status_code=500, detail="Không thể tạo câu hỏi")
    
    question = q_res.data[0]

    if q_data.answer_key:
        ak_payload = {
            "question_id": question["id"],
            "accepted_answers": q_data.answer_key.accepted_answers,
            "explanation": q_data.answer_key.explanation,
            "evidence": q_data.answer_key.evidence
        }
        ak_res = supabase.table("question_answer_keys").insert(ak_payload).execute()
        question["answer_key"] = ak_res.data[0] if ak_res.data else None

    return {"meta": {"code": 201, "message": "Tạo câu hỏi thành công"}, "data": question}

@router.put("/questions/{question_id}")
async def update_question(
    question_id: str,
    q_data: QuestionCreate,
    current_user: User = Depends(require_admin)
):
    """Cập nhật nội dung câu hỏi và đáp án chuẩn / giải thích 4 bước."""
    q_payload = {
        "number": q_data.number,
        "prompt": q_data.prompt,
        "options": q_data.options,
        "max_words": q_data.max_words,
        "prompt_audio_key": q_data.prompt_audio_key,
        "prep_time_sec": q_data.prep_time_sec,
        "answer_time_sec": q_data.answer_time_sec
    }
    q_res = supabase.table("questions").update(q_payload).eq("id", question_id).execute()
    if not q_res.data:
        raise HTTPException(status_code=404, detail="Câu hỏi không tồn tại")

    if q_data.answer_key:
        ak_payload = {
            "accepted_answers": q_data.answer_key.accepted_answers,
            "explanation": q_data.answer_key.explanation,
            "evidence": q_data.answer_key.evidence
        }
        existing_ak = supabase.table("question_answer_keys").select("id").eq("question_id", question_id).execute()
        if existing_ak.data:
            supabase.table("question_answer_keys").update(ak_payload).eq("question_id", question_id).execute()
        else:
            supabase.table("question_answer_keys").insert({
                "question_id": question_id,
                **ak_payload
            }).execute()

    return {"meta": {"code": 200, "message": "Cập nhật câu hỏi thành công"}}

@router.delete("/questions/{question_id}")
async def delete_question(
    question_id: str,
    current_user: User = Depends(require_admin)
):
    """Xóa câu hỏi."""
    res = supabase.table("questions").delete().eq("id", question_id).execute()
    return {"meta": {"code": 200, "message": "Xóa câu hỏi thành công"}}
