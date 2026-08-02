import os
import time
import requests
from dotenv import load_dotenv
from app.db.supabase import supabase

load_dotenv()

API_URL = "http://localhost:8000/api/v1"

def run_queue_test():
    print("🚀 BẮT ĐẦU TEST LUỒNG HÀNG ĐỢI BẤT ĐỒNG BỘ (MESSAGE QUEUE)")
    
    # Lấy 1 student id từ database
    res_users = supabase.table("users").select("id").eq("role", "student").limit(1).execute()
    if not res_users.data:
        print("❌ LỖI: Không tìm thấy Student nào trong CSDL để test.")
        return
        
    student_id = res_users.data[0]["id"]
    
    # Nộp bài
    print(f"\n1️⃣ Gửi Request Nộp bài (POST /api/v1/essays/evaluate)...")
    payload = {
        "content": "This is a test essay to check the decoupled architecture. It must have more than fifty words to pass the basic validation. " * 5,
        "task_type": "task2"
    }
    
    # Giả lập token authentication bằng cách truyền thẳng student_id vào header cho logic security mock (nếu có)
    # Tuy nhiên security của mình chỉ check chữ 'admin', còn lại cho qua thành student ID.
    # Trong code security.py hiện tại, nó parse token "student_token" -> id = student_token (không chuẩn UUID).
    # Sẽ gây lỗi Foreign Key, vì vậy mình bỏ qua JWT trong test này và sẽ chèn trực tiếp bằng DB, 
    # NHƯNG chúng ta đang test Queue API, nên token giả phải là student_id hợp lệ.
    
    headers = {"Authorization": f"Bearer {student_id}"}
    
    response = requests.post(f"{API_URL}/essays/evaluate", json=payload, headers=headers)
    
    if response.status_code != 202:
        print(f"❌ API Nộp bài thất bại: {response.status_code} - {response.text}")
        print("=> Bạn đã bật uvicorn app.main:app chưa?")
        return
        
    res_json = response.json()
    essay_id = res_json["data"]["essay_id"]
    print(f"✅ Đã nộp thành công! HTTP Status: 202 (Accepted). Essay ID: {essay_id}")
    print("=> API đã trả về ngay lập tức (Non-blocking).")
    
    # Theo dõi DB (Polling)
    print(f"\n2️⃣ Bắt đầu giám sát Database (Supabase) cho bài viết này...")
    max_retries = 15
    for i in range(max_retries):
        essay_data = supabase.table("essays").select("status").eq("id", essay_id).execute()
        status = essay_data.data[0]["status"]
        
        print(f"   ⏳ Giây thứ {i}: Trạng thái trong DB -> [{status.upper()}]")
        
        if status == "completed":
            print(f"\n🎉 QUÁ TRÌNH HOÀN TẤT! Worker ngầm đã xử lý xong và cập nhật DB.")
            
            # Fetch thử evaluation results
            eval_data = supabase.table("evaluation_results").select("overall_band").eq("essay_id", essay_id).execute()
            if eval_data.data:
                print(f"📝 Điểm AI chấm: {eval_data.data[0]['overall_band']} Overall Band.")
            return
            
        time.sleep(1)
        
    print("\n⚠️ Hết thời gian chờ nhưng bài vẫn chưa chấm xong. Bạn đã bật Terminal chạy `arq app.worker.tasks.WorkerSettings` chưa?")

if __name__ == "__main__":
    run_queue_test()
