import os
import sys
from dotenv import load_dotenv
from app.db.supabase import supabase

load_dotenv()
sys.stdout.reconfigure(encoding='utf-8')

def test_signup_dup():
    test_email = "test_7db8da@gmail.com" # The one we just created successfully
    print(f"Testing duplicate signup with: {test_email}")
    try:
        res = supabase.auth.sign_up({"email": test_email, "password": "Password123!"})
        print(f"✅ Signup successful! User ID: {res.user.id}")
    except Exception as e:
        print(f"❌ Signup failed: {str(e)}")

if __name__ == "__main__":
    test_signup_dup()
