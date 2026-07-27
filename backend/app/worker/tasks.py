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

async def evaluate_essay_task(ctx, essay_id: str):
    """
    Background task để mô phỏng tiến trình chấm bài IELTS (AI Pipeline)
    """
    print(f"🔧 [Worker] Bắt đầu chấm bài cho Essay ID: {essay_id}")
    
    # 1. Chuyển trạng thái sang EVALUATING
    supabase.table("essays").update({"status": "evaluating"}).eq("id", essay_id).execute()
    print(f"🔧 [Worker] Đã cập nhật trạng thái -> EVALUATING")

    # 2. Giả lập AI xử lý (LangGraph Multi-Agent mất 5-10 giây)
    print(f"🧠 [AI Engine] Đang phân tích Task Response, Coherence, Lexical, Grammar...")
    await asyncio.sleep(5)
    
    # 3. Lưu kết quả chấm điểm giả lập
    eval_id = str(uuid.uuid4())
    eval_data = {
        "id": eval_id,
        "essay_id": essay_id,
        "task_response_score": 7.0,
        "coherence_cohesion_score": 6.5,
        "lexical_resource_score": 7.0,
        "grammar_accuracy_score": 6.5,
        "overall_band": 7.0,
        "tr_feedback": "Task response is good and well addressed.",
        "cc_feedback": "Paragraphs are logically structured.",
        "lr_feedback": "Good use of academic vocabulary.",
        "gra_feedback": "Minor grammatical errors.",
        "overall_feedback": "A solid band 7.0 essay.",
        "improvement_suggestions": "Try to vary your sentence structures more.",
        "raw_ai_response": {"status": "success", "simulated": True}
    }
    
    supabase.table("evaluation_results").insert(eval_data).execute()
    
    # 4. Lưu lỗi ngữ pháp giả lập
    grammar_errors = [
        {
            "evaluation_id": eval_id,
            "error_type": "article",
            "original_text": "a information",
            "corrected_text": "information",
            "explanation": "Information is uncountable.",
            "position_start": 50,
            "position_end": 63,
            "severity": "minor"
        }
    ]
    supabase.table("grammar_errors").insert(grammar_errors).execute()
    
    # 5. Ghi log xử lý
    supabase.table("evaluation_logs").insert({
        "essay_id": essay_id,
        "agent_name": "aggregator",
        "status": "success",
        "phoenix_trace_id": str(uuid.uuid4())[:8]
    }).execute()

    # 6. Chuyển trạng thái sang COMPLETED
    supabase.table("essays").update({
        "status": "completed", 
        "evaluated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", essay_id).execute()
    
    print(f"✅ [Worker] Hoàn tất chấm bài cho Essay ID: {essay_id}. Trạng thái -> COMPLETED")
    return {"status": "success", "essay_id": essay_id}

class WorkerSettings:
    functions = [evaluate_essay_task]
    redis_settings = RedisSettings.from_dsn(os.getenv("REDIS_URL", "redis://localhost:6379"))
