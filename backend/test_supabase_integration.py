import os
from dotenv import load_dotenv
import uuid

load_dotenv()

from app.db.supabase import supabase

def run_integration_test():
    print("--- STARTING SUPABASE CONNECTION TEST ---")
    print(f"🔗 Supabase URL: {os.getenv('SUPABASE_URL')}")
    
    try:
        # Test 1: Create virtual Admin
        admin_id = str(uuid.uuid4())
        print(f"\n[Test 1] Creating Admin (ID: {admin_id})...")
        res_user = supabase.table("users").insert({
            "id": admin_id,
            "email": f"admin_{admin_id}@test.com",
            "full_name": "Admin Test",
            "role": "admin"
        }).execute()
        print("OK Success:", res_user.data)
        
        # Test 2: Create Topic
        print("\n[Test 2] Creating test topic...")
        res_topic = supabase.table("topics").insert({
            "title": "Integration Test Topic",
            "prompt_content": "Describe a test.",
            "task_type": "task2",
            "created_by": admin_id
        }).execute()
        topic_id = res_topic.data[0]['id']
        print(f"OK Success created Topic (ID: {topic_id})")
        
        # Test 3: Get Topics list
        print("\n[Test 3] Reading Topics...")
        res_read = supabase.table("topics").select("*").eq("id", topic_id).execute()
        print("OK Success:", res_read.data)
        
        print("\nALL CONNECTION TESTS PASSED!")
    except Exception as e:
        print("\nERROR DURING TEST:")
        print(e)
        print("\n=> If error is 'relation does not exist', you have not run init_supabase.sql yet.")

if __name__ == "__main__":
    run_integration_test()
