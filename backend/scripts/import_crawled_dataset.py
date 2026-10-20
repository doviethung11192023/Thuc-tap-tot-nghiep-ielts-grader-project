import sys
import os
import argparse
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

# Force UTF-8 on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from app.services.dataset_importer import DatasetImporter

def main():
    parser = argparse.ArgumentParser(description="Import crawled IELTS dataset into Supabase")
    parser.add_argument("--path", type=str, default=None, help="Dataset directory path")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of test folders to import")
    parser.add_argument("--no-rl", action="store_true", help="Skip Reading and Listening")
    parser.add_argument("--no-writing", action="store_true", help="Skip Writing topics")
    args = parser.parse_args()

    print("🚀 Bắt đầu quá trình nạp dataset vào CSDL Supabase...")
    importer = DatasetImporter(root_path=args.path)
    result = importer.run(
        limit=args.limit,
        rl=not args.no_rl,
        writing=not args.no_writing
    )

    print("\n✅ KẾT QUẢ NẠP DỮ LIỆU:")
    print(f" - Bộ đề (Test Sets) tạo mới: {result['test_sets_created']}")
    print(f" - Bài thi (Tests) tạo mới:    {result['tests_created']}")
    print(f" - Phần thi (Sections):        {result['sections_created']}")
    print(f" - Nhóm câu hỏi (Groups):      {result['question_groups_created']}")
    print(f" - Câu hỏi & Đáp án (Q&A):     {result['questions_created']}")
    print(f" - Đề bài Writing (Topics):    {result['topics_created']}")

    if result["errors"]:
        print(f"\n⚠️ Có {len(result['errors'])} lỗi/cảnh báo:")
        for err in result["errors"][:5]:
            print("  -", err)
    else:
        print("\n🎉 Toàn bộ dữ liệu được nạp thành công không có lỗi!")

if __name__ == "__main__":
    main()
