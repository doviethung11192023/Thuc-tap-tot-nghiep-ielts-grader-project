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
        "overall_upgraded_essay": "This is a simulated band 8.0 version of the essay...",
        "criteria_analysis": {
            "task_response": {
                "strengths": ["Good understanding of the prompt"],
                "areas_to_improve": ["More examples needed"]
            },
            "coherence_cohesion": {
                "strengths": ["Logical flow"],
                "areas_to_improve": ["Transition words"]
            },
            "lexical_resource": {
                "strengths": ["Good vocabulary"],
                "areas_to_improve": ["Spelling errors"]
            },
            "grammar_accuracy": {
                "strengths": ["Good sentence structures"],
                "areas_to_improve": ["Article usage"]
            }
        },
        "raw_ai_response": {"status": "success", "simulated": True}
    }
    
    supabase.table("evaluation_results").insert(eval_data).execute()
    
    # 4. Lưu chú thích bài viết giả lập
    essay_annotations = [
        {
            "essay_id": essay_id,
            "type": "error",
            "category": "GRA",
            "title": "Uncountable Noun",
            "original_text": "a information",
            "corrected_text": "information",
            "explanation": "Information is uncountable.",
            "recommendation": "Review uncountable nouns like advice, information, news.",
            "position_start": 50,
            "position_end": 63
        },
        {
            "essay_id": essay_id,
            "type": "upgrade",
            "category": "LR",
            "title": "Better Vocabulary",
            "original_text": "bad",
            "corrected_text": "detrimental",
            "explanation": "Use 'detrimental' for a more academic tone.",
            "recommendation": "Learn more formal synonyms for common adjectives.",
            "position_start": 80,
            "position_end": 83
        }
    ]
    supabase.table("essay_annotations").insert(essay_annotations).execute()
    
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
