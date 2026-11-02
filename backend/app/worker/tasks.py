import asyncio
import uuid
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
from arq.connections import RedisSettings

load_dotenv()

# Setup supabase inside worker
from app.db.supabase import supabase

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

def _resolve_image_url(image_key):
    """image_key là URL tuyệt đối (dataset) hoặc key trên Cloudflare R2 → URL công khai, hoặc None."""
    if not image_key:
        return None
    if image_key.startswith(("http://", "https://", "data:image/")):
        return image_key
    from app.services.r2_storage import r2_storage
    url = r2_storage.get_file_url(image_key)
    return url if url.startswith(("http://", "https://")) else None


def _load_writing_task_prompt(attempt_id: str, task_no: int):
    """Đề bài + ảnh của Writing Task {task_no} trong bài test của attempt → (prompt, image_url)."""
    att = supabase.table("test_attempts").select("test_id").eq("id", attempt_id).execute()
    if not att.data:
        return "", None
    sec = supabase.table("test_sections").select("id, passage_text") \
        .eq("test_id", att.data[0]["test_id"]).eq("order_no", task_no).limit(1).execute()
    if not sec.data:
        return "", None
    grp = supabase.table("question_groups").select("id, image_key") \
        .eq("section_id", sec.data[0]["id"]).order("order_no").limit(1).execute()
    prompt, image_key = "", None
    if grp.data:
        image_key = grp.data[0].get("image_key")
        q = supabase.table("questions").select("prompt") \
            .eq("group_id", grp.data[0]["id"]).order("number").limit(1).execute()
        if q.data:
            prompt = q.data[0].get("prompt") or ""
    return (prompt or sec.data[0].get("passage_text") or ""), _resolve_image_url(image_key)


def _finalize_writing_attempt(attempt_id: str):
    """Khi mọi essay của attempt đã chấm xong → band tổng (T1 + 2·T2)/3 làm tròn 0.5 → test_attempts."""
    import math
    essays = supabase.table("essays").select("id, status").eq("attempt_id", attempt_id).execute().data or []
    if not essays or any(e["status"] in ("pending", "evaluating") for e in essays):
        return
    done_ids = [e["id"] for e in essays if e["status"] == "completed"]
    now_utc = datetime.now(timezone.utc).isoformat()
    if not done_ids:
        supabase.table("test_attempts").update({"status": "scoring_failed"}).eq("id", attempt_id).execute()
        return
    results = supabase.table("evaluation_results").select("overall_band, raw_ai_response") \
        .in_("essay_id", done_ids).execute().data or []
    bands = {}
    for r in results:
        task = (r.get("raw_ai_response") or {}).get("task_type", "task2")
        bands[task] = float(r.get("overall_band") or 0)
    if "task1" in bands and "task2" in bands:
        raw = (bands["task1"] + 2 * bands["task2"]) / 3
    else:
        raw = sum(bands.values()) / max(len(bands), 1)
    band = math.floor(raw * 2 + 0.5) / 2
    supabase.table("test_attempts").update({
        "status": "scored", "band": band, "band_source": "ai", "scored_at": now_utc,
    }).eq("id", attempt_id).execute()
    print(f"✅ [Worker] Attempt {attempt_id} -> SCORED (band {band}, tasks {sorted(bands)})")


async def evaluate_essay_task(ctx, essay_id: str, task_no: int | None = None):
    """
    Background task chấm bài IELTS Writing qua AI Engine.
    task_no (1 | 2): bài thi theo attempt → lấy đề Task tương ứng từ bài test; None → luồng cũ (topic).
    """
    print(f"🔧 [Worker] Bắt đầu chấm bài cho Essay ID: {essay_id} (task_no={task_no})")

    # 1. Chuyển trạng thái sang EVALUATING
    supabase.table("essays").update({"status": "evaluating"}).eq("id", essay_id).execute()
    print(f"🔧 [Worker] Đã cập nhật trạng thái -> EVALUATING")

    # 2. Lấy nội dung gốc của học viên và thông tin đề bài
    essay_res = supabase.table("essays").select("content, topic_id, attempt_id").eq("id", essay_id).execute()
    if not essay_res.data:
        print(f"❌ [Worker] Không tìm thấy bài viết {essay_id}")
        supabase.table("essays").update({"status": "failed"}).eq("id", essay_id).execute()
        return {"status": "failed", "error": "Essay not found"}

    student_content = essay_res.data[0].get("content", "")
    topic_id = essay_res.data[0].get("topic_id")
    attempt_id = essay_res.data[0].get("attempt_id")

    topic_title = ""
    image_url = None
    if attempt_id and task_no:
        try:
            topic_title, image_url = _load_writing_task_prompt(attempt_id, task_no)
        except Exception as e:
            print(f"⚠️ [Worker] Không lấy được đề Task {task_no}: {e}")
    elif topic_id:
        topic_res = supabase.table("topics").select("title").eq("id", topic_id).execute()
        if topic_res.data:
            topic_title = topic_res.data[0].get("title", "")

    try:
        return await _grade_and_store(essay_id, student_content, topic_title, task_no, image_url)
    except Exception as e:
        print(f"❌ [Worker] Lỗi xử lý kết quả chấm {essay_id}: {e}")
        supabase.table("essays").update({"status": "failed"}).eq("id", essay_id).execute()
        return {"status": "failed", "error": str(e)}
    finally:
        if attempt_id:
            try:
                _finalize_writing_attempt(attempt_id)
            except Exception as e:
                print(f"⚠️ [Worker] Không cập nhật được attempt {attempt_id}: {e}")


async def _grade_and_store(essay_id: str, student_content: str, topic_title: str, task_no, image_url):
    """Gọi AI Engine (retry) → lưu evaluation_results, essay_annotations, log → COMPLETED."""

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
    if task_no:
        payload["task_type"] = f"task{task_no}"
        payload["image_url"] = image_url
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
    
    # Use upsert to prevent unique constraint violation on re-evaluations
    supabase.table("evaluation_results").upsert(eval_data, on_conflict="essay_id").execute()
    
    # 5. Lưu chú thích bài viết (Inline Annotations)
    # Xóa annotations cũ nếu có (trường hợp chấm lại)
    try:
        supabase.table("essay_annotations").delete().eq("essay_id", essay_id).execute()
    except Exception:
        pass

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
