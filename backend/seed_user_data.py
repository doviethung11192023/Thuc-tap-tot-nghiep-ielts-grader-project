import os
import uuid
import json
from dotenv import load_dotenv
from app.db.supabase import supabase

load_dotenv()

def seed_user_data():
    print("==================================================")
    print("🌱 SEED DỮ LIỆU TỔNG QUÁT CHO USER (TEST PHASE 0)")
    print("==================================================")
    
    email = input("Nhập Email của bạn (đã tạo trên Supabase hoặc để tạo mới): ").strip()
    password = input("Nhập Mật khẩu: ").strip()

    print("\n[1/6] Đang xác thực tài khoản qua Supabase Auth...")
    try:
        # Cố gắng đăng nhập
        auth_res = supabase.auth.sign_in_with_password({"email": email, "password": password})
        user_id = auth_res.user.id
        print(f"✅ Đăng nhập thành công! User ID: {user_id}")
    except Exception as signin_err:
        # Kiểm tra xem email đã tồn tại trong public.users chưa
        existing_user = supabase.table("users").select("id").eq("email", email).execute()
        if len(existing_user.data) > 0:
            print(f"❌ LỖI: Tài khoản '{email}' đã tồn tại trong hệ thống nhưng bạn nhập SAI MẬT KHẨU.")
            print("👉 Vui lòng chạy lại script và nhập ĐÚNG mật khẩu cũ của bạn (VD: 12345678a).")
            return
            
        print(f"⚠️ Đăng nhập thất bại. Lỗi chi tiết: {str(signin_err)}")
        # Nếu chưa tồn tại trong cả auth và public, thử đăng ký
        try:
            print("⏳ Đang thử đăng ký tài khoản mới...")
            auth_res = supabase.auth.sign_up({"email": email, "password": password})
            user_id = auth_res.user.id
            print(f"✅ Đăng ký thành công! User ID: {user_id}")
        except Exception as signup_err:
            print(f"❌ Lỗi xác thực: {str(signup_err)}")
            return

    try:
        print(f"\n[2/6] Đồng bộ User ID ({user_id}) vào bảng public.users...")
        # Sử dụng upsert để ghi đè nếu đã tồn tại, tránh lỗi duplicate
        supabase.table("users").upsert({
            "id": user_id,
            "email": email,
            "full_name": email.split('@')[0],
            "role": "student",
            "is_active": True
        }).execute()
        print("✅ Đã đồng bộ bảng public.users")

        print("\n[3/6] Tạo bộ đề thi mẫu (Topics)...")
        topic1_id = str(uuid.uuid4())
        topic2_id = str(uuid.uuid4())
        topics_data = [
            {
                "id": topic1_id,
                "title": "Technology & Social Isolation",
                "description": "Discuss the impact of technology on social relationships.",
                "prompt_content": "Some people think that the increasing use of computers and mobile phones for communication has had a negative effect on young people's reading and writing skills. To what extent do you agree or disagree?",
                "task_type": "task2",
                "difficulty": "medium",
                "category": "Technology"
            },
            {
                "id": topic2_id,
                "title": "Global Warming Solutions",
                "description": "Describe the main causes of global warming.",
                "prompt_content": "Global warming is one of the biggest threats to our environment. What causes global warming and what solutions are there to reduce this problem?",
                "task_type": "task2",
                "difficulty": "hard",
                "category": "Environment"
            }
        ]
        supabase.table("topics").insert(topics_data).execute()
        print("✅ Đã tạo 2 Topics")

        print("\n[4/6] Tạo 2 Bài Viết (Essays) cho bạn...")
        essay1_id = str(uuid.uuid4())
        essay2_id = str(uuid.uuid4())
        
        essays_data = [
            {
                "id": essay1_id,
                "user_id": user_id,
                "topic_id": topic1_id,
                "content": "Technology has brought many benefits to our lives. However, it also makes people more isolated because they spend too much time on their phones instead of talking face-to-face. I agree that it affects social skills negatively...",
                "word_count": 250,
                "status": "completed",
                "task_id": f"mock_task_{uuid.uuid4().hex[:8]}"
            },
            {
                "id": essay2_id,
                "user_id": user_id,
                "topic_id": topic2_id,
                "content": "Global warming is caused by human activities such as deforestation and burning fossil fuels. The temperatures are rising globally, which melts ice caps and causes sea levels to rise. We should plant more trees to fix this.",
                "word_count": 280,
                "status": "evaluating",
                "task_id": f"mock_task_{uuid.uuid4().hex[:8]}"
            }
        ]
        supabase.table("essays").insert(essays_data).execute()
        print("✅ Đã tạo 2 Bài viết (1 bài hoàn thành, 1 bài đang chấm)")

        print("\n[5/6] Tạo Kết quả chấm điểm (Evaluation Results) & Annotations...")
        eval1_id = str(uuid.uuid4())
        eval_data = {
            "id": eval1_id,
            "essay_id": essay1_id,
            "task_response_score": 6.5,
            "coherence_cohesion_score": 6.0,
            "lexical_resource_score": 6.5,
            "grammar_accuracy_score": 5.5,
            "overall_band": 6.0,
            "overall_upgraded_essay": "Technology has brought many benefits to our lives. However, it also leads to social isolation as individuals spend excessive time on their devices rather than engaging in face-to-face interactions...",
            "criteria_analysis": {
                "task_response": {
                    "strengths": ["You answered the prompt"],
                    "areas_to_improve": ["Could elaborate more on the negative effects"]
                },
                "coherence_cohesion": {
                    "strengths": ["The paragraphs are logically organized"],
                    "areas_to_improve": ["Transition words are missing"]
                },
                "lexical_resource": {
                    "strengths": ["Good vocabulary"],
                    "areas_to_improve": ["Some words are used repetitively"]
                },
                "grammar_accuracy": {
                    "strengths": [],
                    "areas_to_improve": ["Several grammatical errors found in complex sentence structures"]
                }
            },
            "raw_ai_response": {"raw_score": 6.0, "agent_version": "v2.0"}
        }
        supabase.table("evaluation_results").insert(eval_data).execute()

        essay_annotations = [
            {
                "essay_id": essay1_id,
                "type": "error",
                "category": "GRA",
                "title": "Subject-Verb Agreement",
                "original_text": "Technology have brought",
                "corrected_text": "Technology has brought",
                "explanation": "'Technology' is an uncountable noun and requires a singular verb.",
                "recommendation": "Review rules for uncountable nouns.",
                "position_start": 0,
                "position_end": 21
            },
            {
                "essay_id": essay1_id,
                "type": "upgrade",
                "category": "LR",
                "title": "Better Lexical Choice",
                "original_text": "on their phones",
                "corrected_text": "on mobile devices",
                "explanation": "Better lexical choice for academic writing.",
                "recommendation": "Use formal synonyms.",
                "position_start": 102,
                "position_end": 117
            }
        ]
        supabase.table("essay_annotations").insert(essay_annotations).execute()
        print("✅ Đã tạo kết quả chấm điểm và Highlights lỗi cho bài 1")

        print("\n[6/6] Tạo User Progress...")
        supabase.table("user_progress").upsert({
            "user_id": user_id,
            "total_essays": 1,
            "avg_overall_band": 6.0,
            "avg_tr_score": 6.5,
            "avg_cc_score": 6.0,
            "avg_lr_score": 6.5,
            "avg_gra_score": 5.5,
            "best_overall_band": 6.0
        }).execute()
        print("✅ Đã tạo bảng Tiến độ (Progress)")

        print("\n🎉 XONG! TÀI KHOẢN CỦA BẠN ĐÃ CÓ ĐẦY ĐỦ DATA.")
        print(f"👉 Bây giờ bạn có thể dùng Email ({email}) để lấy Token và test lấy List Essays nhé!")
        
    except Exception as e:
        print("\n❌ LỖI TRONG QUÁ TRÌNH SEED DỮ LIỆU:")
        print(e)

if __name__ == "__main__":
    seed_user_data()
