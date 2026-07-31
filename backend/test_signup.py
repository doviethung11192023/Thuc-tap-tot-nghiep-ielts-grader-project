import os
import uuid
import sys
from dotenv import load_dotenv
from app.db.supabase import supabase

load_dotenv()

# Force utf-8 encoding for standard output to fix emoji printing on Windows
sys.stdout.reconfigure(encoding='utf-8')

def test_signup():
    test_email = f"test_{uuid.uuid4().hex[:6]}@gmail.com"
    print(f"Testing signup with: {test_email}")
    try:
        res = supabase.auth.sign_up({"email": test_email, "password": "Password123!"})
        print(f"✅ Signup successful! User ID: {res.user.id}")
    except Exception as e:
        print(f"❌ Signup failed: {str(e)}")

if __name__ == "__main__":
    test_signup()
