import asyncio
import uuid
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
from arq.connections import RedisSettings

load_dotenv()

# Setup supabase inside worker
from supabase import create_client, Client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

import re

def align_annotation_coordinates(content: str, original_text: str, hint_start: int):
    """
    Fuzzy anchoring: Tìm tọa độ chính xác của original_text trong content dựa vào hint_start.
    """
    if not original_text or not content:
        return hint_start, hint_start + len(original_text) if original_text else hint_start
    original_text = original_text.strip()
    
    # 1. Try exact/regex match first
    escaped_text = re.escape(original_text)
    escaped_text = re.sub(r'\\\s+', r'\\s+', escaped_text)
    try:
        matches = list(re.finditer(escaped_text, content, re.IGNORECASE))
        if matches:
            best_match = min(matches, key=lambda m: abs(m.start() - hint_start))
            return best_match.start(), best_match.end()
    except Exception:
        pass
        
    # 2. Fallback: Search for the prefix and suffix of original_text around hint_start
    prefix = original_text[:20].strip()
    suffix = original_text[-20:].strip()
    
    window_start = max(0, hint_start - 50)
    window_end = min(len(content), hint_start + 100)
    
    real_start = hint_start
    prefix_idx = content.lower().find(prefix.lower(), window_start, window_end)
    if prefix_idx != -1:
        real_start = prefix_idx
    
    real_end = hint_start + len(original_text)
    expected_end = real_start + len(original_text)
    window_end_start = max(real_start, expected_end - 50)
    window_end_end = min(len(content), expected_end + 50)
    
    suffix_idx = content.lower().find(suffix.lower(), window_end_start, window_end_end)
    if suffix_idx != -1:
        real_end = suffix_idx + len(suffix)
        
    return real_start, real_end

async def evaluate_essay_task(ctx, essay_id: str):
    """
    Background task để mô phỏng tiến trình chấm bài IELTS (AI Pipeline)
    """
    print(f"🔧 [Worker] Bắt đầu chấm bài cho Essay ID: {essay_id}")
    
    # 1. Chuyển trạng thái sang EVALUATING
    supabase.table("essays").update({"status": "evaluating"}).eq("id", essay_id).execute()
    print(f"🔧 [Worker] Đã cập nhật trạng thái -> EVALUATING")

    # 2. Lấy nội dung gốc của học viên và thông tin đề bài
    essay_res = supabase.table("essays").select("content, topic_id").eq("id", essay_id).execute()
    if not essay_res.data:
        print(f"❌ [Worker] Không tìm thấy bài viết {essay_id}")
        supabase.table("essays").update({"status": "failed"}).eq("id", essay_id).execute()
        return {"status": "failed", "error": "Essay not found"}
        
    student_content = essay_res.data[0].get("content", "")
    topic_id = essay_res.data[0].get("topic_id")
    
    topic_title = ""
    if topic_id:
        topic_res = supabase.table("topics").select("title").eq("id", topic_id).execute()
        if topic_res.data:
            topic_title = topic_res.data[0].get("title", "")

    # 3. Gọi API đến AI Engine thật với cơ chế Retry
    print(f"🧠 [AI Engine] Đang gọi API chấm điểm...")
    import httpx
    import asyncio
    from app.core.config import settings
    
    url = settings.AI_ENGINE_URL
    payload = {
        "title": topic_title,
        "essay": student_content
    }
    headers = {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
    }
    
    max_retries = 3
    ai_response = None
    
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(url, json=payload, headers=headers)
            
            if response.status_code == 200:
                ai_response = response.json()
                break  # Thành công, thoát vòng lặp retry
            else:
                error_msg = f"HTTP {response.status_code}: {response.text}"
                if attempt < max_retries - 1:
                    print(f"⚠️ [Worker] AI API lỗi ({error_msg}), thử lại lần {attempt + 1}...")
                    await asyncio.sleep(2 ** attempt)
                else:
                    raise Exception(error_msg)
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"⚠️ [Worker] Lỗi kết nối AI API ({str(e)}), thử lại lần {attempt + 1}...")
                await asyncio.sleep(2 ** attempt)
            else:
                print(f"❌ [Worker] Lỗi gọi AI API sau {max_retries} lần thử: {e}")
                supabase.table("essays").update({"status": "failed"}).eq("id", essay_id).execute()
                return {"status": "failed", "error": str(e)}

    # 4. Lưu kết quả chấm điểm vào Database
    eval_id = str(uuid.uuid4())
    
    # Map criteria_analysis to match frontend expectation (grammar_accuracy instead of grammatical_range_and_accuracy)
    raw_criteria = ai_response.get("criteria_analysis", {})
    criteria_analysis = {
        "task_response": raw_criteria.get("task_response", {}),
        "coherence_cohesion": raw_criteria.get("coherence_cohesion", {}),
        "lexical_resource": raw_criteria.get("lexical_resource", {}),
        "grammar_accuracy": raw_criteria.get("grammatical_range_and_accuracy", {})
    }

    eval_data = {
        "id": eval_id,
        "essay_id": essay_id,
        "task_response_score": ai_response.get("scores", {}).get("task_response", 0),
        "coherence_cohesion_score": ai_response.get("scores", {}).get("coherence_cohesion", 0),
        "lexical_resource_score": ai_response.get("scores", {}).get("lexical_resource", 0),
        "grammar_accuracy_score": ai_response.get("scores", {}).get("grammatical_range_and_accuracy", 0),
        "overall_band": ai_response.get("scores", {}).get("overall_band", 0),
        "overall_upgraded_essay": ai_response.get("overall_upgraded_essay", ""),
        "criteria_analysis": criteria_analysis,
        "raw_ai_response": ai_response
    }
    
    supabase.table("evaluation_results").insert(eval_data).execute()
    
    # 5. Lưu chú thích bài viết (Inline Annotations)
    essay_annotations = []
    for ann in ai_response.get("inline_annotations", []):
        raw_start = ann.get("position_start", 0)
        original_text = ann.get("original_text", "")
        
        # Sửa lỗi lệch tọa độ bằng Fuzzy Anchoring
        real_start, real_end = align_annotation_coordinates(student_content, original_text, raw_start)
        
        ann_data = {
            "essay_id": essay_id,
            "type": ann.get("type", "error"),
            "category": ann.get("category", "OVERALL"),
            "title": ann.get("title", ""),
            "original_text": original_text,
            "corrected_text": ann.get("corrected_text", ""),
            "explanation": ann.get("explanation", ""),
            "recommendation": ann.get("recommendation", ""),
            "position_start": real_start,
            "position_end": real_end
        }
        essay_annotations.append(ann_data)
        
    if essay_annotations:
        supabase.table("essay_annotations").insert(essay_annotations).execute()
    
    # 6. Ghi log xử lý
    supabase.table("evaluation_logs").insert({
        "essay_id": essay_id,
        "agent_name": "aggregator",
        "status": "success",
        "phoenix_trace_id": str(uuid.uuid4())[:8]
    }).execute()

    # 7. Chuyển trạng thái sang COMPLETED
    supabase.table("essays").update({
        "status": "completed", 
        "evaluated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", essay_id).execute()
    
    print(f"✅ [Worker] Hoàn tất chấm bài cho Essay ID: {essay_id}. Trạng thái -> COMPLETED")
    return {"status": "success", "essay_id": essay_id}

class WorkerSettings:
    functions = [evaluate_essay_task]
    redis_settings = RedisSettings.from_dsn(os.getenv("REDIS_URL", "redis://localhost:6379"))
