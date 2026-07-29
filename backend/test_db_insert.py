import os
import uuid
from dotenv import load_dotenv
from app.db.supabase import supabase

load_dotenv()

def test_insert():
    test_id = str(uuid.uuid4())
    print(f"Testing insert with ID: {test_id}")
    try:
        res = supabase.table("users").insert({
            "id": test_id,
            "email": f"test_debug_{test_id}@example.com",
            "full_name": "Debug User",
            "role": "student",
            "is_active": True
        }).execute()
        print("✅ INSERT SUCCEEDED!")
        
        # Clean up
        supabase.table("users").delete().eq("id", test_id).execute()
    except Exception as e:
        print(f"❌ INSERT FAILED: {str(e)}")

if __name__ == "__main__":
    test_insert()
