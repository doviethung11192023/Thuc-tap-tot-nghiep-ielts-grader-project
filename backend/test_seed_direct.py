import os
import uuid
import sys
from dotenv import load_dotenv
from app.db.supabase import supabase

load_dotenv()
sys.stdout.reconfigure(encoding='utf-8')

def test_seed_direct():
    email = f"test_{uuid.uuid4().hex[:6]}@gmail.com"
    password = "Password123!"
    
    print(f"Testing full seed flow for: {email}")
    try:
        print("Signing up...")
        auth_res = supabase.auth.sign_up({"email": email, "password": password})
        user_id = auth_res.user.id
        print(f"✅ Signup successful! User ID: {user_id}")
        
        print("Upserting to public.users...")
        supabase.table("users").upsert({
            "id": user_id,
            "email": email,
            "full_name": "Test User",
            "role": "student",
            "is_active": True
        }).execute()
        print("✅ Upsert successful!")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_seed_direct()
