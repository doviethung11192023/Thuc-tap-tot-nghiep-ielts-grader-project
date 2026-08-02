import os
from dotenv import load_dotenv
from app.db.supabase import supabase

load_dotenv()

def check_email():
    try:
        res = supabase.table("users").select("*").eq("email", "test2@gmail.com").execute()
        print(f"Users found: {res.data}")
    except Exception as e:
        print(f"FAILED: {str(e)}")

if __name__ == "__main__":
    check_email()
