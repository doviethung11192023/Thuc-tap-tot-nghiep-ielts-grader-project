# Test tích hợp (chạm dịch vụ thật)

🔴 Các test ở đây gọi **Supabase và Cloudflare R2 thật** (tạo rồi xoá bộ đề, tải một file mp3 giả 34 byte lên R2). Vì vậy chúng **không** nằm trong `backend/tests/` và không chạy cùng bộ test thường.

Chạy tay khi cần, từ thư mục `backend/`:

```bash
.venv/bin/python -m pytest integration_tests -q
```

⚠️ `test_e2e_admin_content_flow.py` để lại file `audio/listening/<id>.mp3` (34 byte) trên R2 sau mỗi lần chạy; xoá tay sau khi chạy.
