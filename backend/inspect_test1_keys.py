import sys
import json
from dotenv import load_dotenv
load_dotenv("backend/.env")
sys.path.insert(0, "backend")
from app.db.supabase import supabase

t_id = "642b203d-ecde-4378-a7b2-f570792a8fcc" # Test 1 Reading
sections = supabase.table("test_sections").select("id, title, order_no").eq("test_id", t_id).execute().data
sec_ids = [s["id"] for s in sections]
groups = supabase.table("question_groups").select("id, section_id, order_no, instructions, content").in_("section_id", sec_ids).execute().data

for g in groups:
    qs = supabase.table("questions").select("id, number, prompt, question_answer_keys(*)").eq("group_id", g["id"]).order("number").execute().data
    q_nums = [q["number"] for q in qs]
    if any(n in [9, 10, 11, 12, 13, 14] for n in q_nums):
        print("=== MATCHED GROUP ===")
        print("Group ID:", g["id"])
        print("Instructions:", g["instructions"])
        print("Template in content:", bool((g.get("content") or {}).get("template")))
        for q in qs:
            ak = q.get("question_answer_keys")
            print(f"Q{q['number']}: id={q['id']}, prompt='{q['prompt']}'")
            print(f"   AK: {json.dumps(ak, ensure_ascii=True)}")
