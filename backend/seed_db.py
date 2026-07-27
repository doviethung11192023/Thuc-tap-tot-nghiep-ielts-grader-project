import os
import uuid
import json
from dotenv import load_dotenv
from app.db.supabase import supabase
from datetime import datetime, timezone

load_dotenv()

def seed_database():
    print("🌱 BẮT ĐẦU SEED DỮ LIỆU MẪU VÀO SUPABASE...")
    
    try:
        # 1. Tạo Users
        admin_id = str(uuid.uuid4())
        student_id = str(uuid.uuid4())
        
        users_data = [
            {
                "id": admin_id,
                "email": "admin@ielts-grader.com",
                "full_name": "Admin Teacher",
                "role": "admin"
            },
            {
                "id": student_id,
                "email": "student@ielts-grader.com",
                "full_name": "Nguyen Van A",
                "role": "student"
            }
        ]
        supabase.table("users").insert(users_data).execute()
        print(f"✅ Tạo thành công 2 Users (Admin ID: {admin_id}, Student ID: {student_id})")

        # 2. Tạo Topics
        topic1_id = str(uuid.uuid4())
        topic2_id = str(uuid.uuid4())
        
        topics_data = [
            {
                "id": topic1_id,
                "created_by": admin_id,
                "title": "Technology and Social Isolation",
                "description": "Discuss the impact of technology on social relationships.",
                "prompt_content": "Some people think that the increasing use of computers and mobile phones for communication has had a negative effect on young people's reading and writing skills. To what extent do you agree or disagree?",
                "task_type": "task2",
                "difficulty": "medium",
                "category": "Technology"
            },
            {
                "id": topic2_id,
                "created_by": admin_id,
                "title": "Global Warming Causes",
                "description": "Describe the main causes of global warming.",
                "prompt_content": "Global warming is one of the biggest threats to our environment. What causes global warming and what solutions are there to reduce this problem?",
                "task_type": "task2",
                "difficulty": "hard",
                "category": "Environment"
            }
        ]
        supabase.table("topics").insert(topics_data).execute()
        print("✅ Tạo thành công 2 Topics (Ngân hàng đề thi)")

        # 3. Tạo Essays
        essay1_id = str(uuid.uuid4())
        essay2_id = str(uuid.uuid4())
        
        essays_data = [
            {
                "id": essay1_id,
                "user_id": student_id,
                "topic_id": topic1_id,
                "content": "Technology has brought many benefits to our lives. However, it also makes people more isolated because they spend too much time on their phones instead of talking face-to-face. I agree that it affects social skills negatively...",
                "word_count": 250,
                "status": "completed",
                "task_id": "mock_task_001"
            },
            {
                "id": essay2_id,
                "user_id": student_id,
                "topic_id": topic2_id,
                "content": "Global warming is caused by human activities such as deforestation and burning fossil fuels. The temperatures are rising globally, which melts ice caps and causes sea levels to rise. We should plant more trees to fix this.",
                "word_count": 280,
                "status": "evaluating",
                "task_id": "mock_task_002"
            }
        ]
        supabase.table("essays").insert(essays_data).execute()
        print("✅ Tạo thành công 2 Bài viết (Essays) cho Student")

        # 4. Tạo Evaluation Result (chỉ cho bài essay1 đã completed)
        eval1_id = str(uuid.uuid4())
        eval_data = {
            "id": eval1_id,
            "essay_id": essay1_id,
            "task_response_score": 6.5,
            "coherence_cohesion_score": 6.0,
            "lexical_resource_score": 6.5,
            "grammar_accuracy_score": 5.5,
            "overall_band": 6.0,
            "tr_feedback": "You answered the prompt but could elaborate more on the negative effects.",
            "cc_feedback": "The paragraphs are logically organized, but transition words are missing.",
            "lr_feedback": "Good vocabulary, but some words are used repetitively.",
            "gra_feedback": "Several grammatical errors found in complex sentence structures.",
            "overall_feedback": "A decent attempt, but needs more vocabulary variety and grammatical accuracy.",
            "improvement_suggestions": "Try to use more advanced conjunctions and practice verb tenses.",
            "raw_ai_response": {"raw_score": 6.0, "agent_version": "v1.0"}
        }
        supabase.table("evaluation_results").insert(eval_data).execute()
        print("✅ Tạo thành công Kết quả chấm điểm (Evaluation Results) cho Essay 1")

        # 5. Tạo Grammar Errors cho Essay 1
        grammar_errors = [
            {
                "evaluation_id": eval1_id,
                "error_type": "subject_verb_agreement",
                "original_text": "Technology have brought",
                "corrected_text": "Technology has brought",
                "explanation": "'Technology' is an uncountable noun and requires a singular verb.",
                "position_start": 0,
                "position_end": 21,
                "severity": "major"
            },
            {
                "evaluation_id": eval1_id,
                "error_type": "article",
                "original_text": "on their phones",
                "corrected_text": "on mobile phones",
                "explanation": "Better lexical choice for academic writing.",
                "position_start": 102,
                "position_end": 117,
                "severity": "minor"
            }
        ]
        supabase.table("grammar_errors").insert(grammar_errors).execute()
        print("✅ Tạo thành công 2 Lỗi ngữ pháp mẫu (Grammar Errors)")

        # 6. Tạo User Progress
        progress_data = {
            "user_id": student_id,
            "total_essays": 1,
            "avg_overall_band": 6.0,
            "avg_tr_score": 6.5,
            "avg_cc_score": 6.0,
            "avg_lr_score": 6.5,
            "avg_gra_score": 5.5,
            "best_overall_band": 6.0
        }
        supabase.table("user_progress").insert(progress_data).execute()
        print("✅ Tạo thành công Tiến trình học tập (User Progress)")

        print("\n🎉 SEED DỮ LIỆU HOÀN TẤT XUẤT SẮC! CSDL ĐÃ SẴN SÀNG CHO API TEST.")
        print(f"👉 Dùng Student ID này để test API: {student_id}")
        
    except Exception as e:
        print("\n❌ LỖI TRONG QUÁ TRÌNH SEED DỮ LIỆU:")
        print(e)

if __name__ == "__main__":
    seed_database()
