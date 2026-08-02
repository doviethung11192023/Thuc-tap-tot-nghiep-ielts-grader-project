import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# Get the latest evaluated essay
essay_res = supabase.table("essays").select("id, content").eq("status", "completed").order("submitted_at", desc=True).limit(1).execute()
if not essay_res.data:
    print("No essay found")
    exit()

essay = essay_res.data[0]
print(f"Essay ID: {essay['id']}")
content = essay['content']

anns_res = supabase.table("essay_annotations").select("*").eq("essay_id", essay['id']).execute()
print(f"Found {len(anns_res.data)} annotations")

for ann in anns_res.data:
    start = ann['position_start']
    end = ann['position_end']
    sliced = content[start:end]
    print(f"---")
    print(f"Type: {ann['type']}")
    print(f"Original Text: {repr(ann['original_text'])}")
    print(f"Sliced from content: {repr(sliced)}")

