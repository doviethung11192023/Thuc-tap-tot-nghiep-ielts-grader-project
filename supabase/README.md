# Migration mở rộng database IELTS Grader

Bộ migration này mở rộng database Supabase của dự án thực tập cho đồ án tốt nghiệp. Nó chỉ **thêm** bảng, cột, enum, hàm và quyền; không xóa hay đổi tên bảng, cột nào đang có, nên Core API, worker và frontend hiện tại vẫn chạy được.

## Nội dung

```
supabase/migrations/
  20261010150000_baseline_existing_schema.sql   7 bảng có sẵn (= init_supabase.sql, chạy lại không đổi gì)
  20261010150100_add_expert_role.sql            thêm 'expert' vào enum user_role
  20261010150200_extend_schema.sql              12 enum, 22 bảng, cột mới, index, cấu hình mặc định
  20261010150300_auth_profile_trigger.sql       trigger tạo hồ sơ users + bù hồ sơ còn thiếu
  20261010150400_transaction_functions.sql      4 hàm gọi bằng supabase.rpc()
  20261010150500_rls_and_grants.sql             bật RLS, 4 policy đọc, thu quyền ghi, Realtime
  20261010150600_seed_band_conversions.sql      bảng quy đổi Reading/Listening sang band
verify.sql                                      truy vấn kiểm tra sau khi chạy
rollback/rollback_20261010_extend.sql           hoàn tác (chạy tay khi cần)
```

Mọi file đều chạy lại được nhiều lần mà không lỗi, và đã được chạy thử trên PostgreSQL 16 trong ba tình huống: database trống, database đã có schema và dữ liệu của dự án thực tập, và hoàn tác rồi chạy lại.

## Trước khi chạy

1. **Sao lưu database.** Dashboard → Database → Backups, hoặc `supabase db dump -f backup.sql`.
2. **Kiểm tra `SUPABASE_KEY` của backend là service role key** (Dashboard → Project Settings → API → `service_role`). File `..._rls_and_grants.sql` bật RLS; nếu backend đang dùng anon key thì mọi truy vấn của backend sẽ trả rỗng.
3. **Chuẩn bị sửa frontend cùng lúc** (xem phần "Thay đổi bắt buộc ở frontend"). Nếu chạy migration trước khi sửa, đăng ký và đăng nhập vẫn hoạt động (trigger đã tạo hồ sơ, lệnh insert cũ chỉ báo lỗi trong console), nhưng chức năng đổi tên ở trang profile sẽ báo lỗi.

## Cách 1: Supabase CLI (khuyên dùng)

Chép thư mục `supabase/` vào gốc repo, rồi:

```bash
supabase login
supabase init                              # chỉ cần nếu repo chưa có supabase/config.toml
supabase link --project-ref <mã project>   # lấy trong URL của Dashboard
supabase db push --dry-run                 # xem trước các file sẽ chạy
supabase db push
```

CLI chạy mỗi file trong một giao dịch riêng, theo thứ tự tên file, và ghi lại lịch sử để lần sau chỉ chạy file mới. Với project đã có 7 bảng, file baseline chạy qua mà không thay đổi gì.

## Cách 2: SQL Editor trên Dashboard

Mở SQL Editor, dán và chạy **lần lượt từng file**, mỗi file một lần bấm Run, đúng thứ tự tên file. Không gộp file `..._add_expert_role.sql` với các file sau vào một lần chạy: giá trị enum mới phải được commit trước khi trigger dùng tới nó.

## Sau khi chạy

Chạy `verify.sql` trong SQL Editor. Kết quả mong đợi ghi ngay trên mỗi truy vấn; tóm tắt:

| Kiểm tra | Mong đợi |
| --- | --- |
| Số bảng trong public | 29 |
| Bảng chưa bật RLS | Không có |
| Policy | 4, đều là SELECT cho authenticated |
| Tài khoản auth chưa có hồ sơ users | Không có |
| Hàm giao dịch | anon và authenticated không gọi được, service_role gọi được |
| Realtime | essays, test_attempts, review_requests |

Sau đó thử trên giao diện: đăng ký tài khoản mới, đăng nhập, nộp một bài Writing và xem trạng thái chấm cập nhật.

## Thay đổi bắt buộc ở frontend và backend

| Chỗ | Hiện tại | Sửa thành |
| --- | --- | --- |
| `frontend/src/app/register/page.tsx` | Insert vào `users` sau `signUp` | Bỏ; gửi `full_name` trong `options.data` của `signUp`, trigger tự tạo hồ sơ |
| `frontend/src/app/login/page.tsx` | Insert "pending user" vào `users` | Bỏ |
| `frontend/src/app/auth/callback/page.tsx` | Insert vào `users` nếu chưa có | Bỏ |
| `frontend/src/app/(student)/profile/page.tsx` | `update` bảng `users` trực tiếp | Gọi `PUT /api/v1/users/me` (đã có ở backend) |
| `backend/app/core/security.py` | Người dùng chưa có hồ sơ được coi là student | Trả 401 |
| `backend/app/api/endpoints/essays.py`, `topics.py` | Tự insert dòng `users` nếu thiếu | Bỏ |

Frontend vẫn được đọc trực tiếp hồ sơ của chính mình (`useAuth`) và danh sách bài của mình (trang profile), vì đã có policy cho hai việc này.

## Tạo tài khoản Expert

Vai trò chỉ được đọc từ `app_metadata`, thứ người dùng không tự sửa được. Backend tạo Expert bằng service role key:

```python
res = supabase.auth.admin.create_user({
    "email": email,
    "email_confirm": True,
    "app_metadata": {"role": "expert"},
    "user_metadata": {"full_name": full_name},
})
supabase.table("expert_profiles").insert({"user_id": res.user.id}).execute()
supabase.auth.reset_password_for_email(email)   # gửi link đặt mật khẩu
```

Trigger tạo dòng `users` với `role = 'expert'`. Tài khoản đăng ký qua trang register luôn là `student`, kể cả khi ai đó cố gửi `role` trong dữ liệu đăng ký.

## Hoàn tác

`rollback/rollback_20261010_extend.sql` xóa mọi thứ đã thêm và trả RLS về trạng thái tắt như cũ (tức là mở lại lỗ hổng). Đọc phần cảnh báo ở đầu file trước khi chạy. Giá trị `expert` của enum không xóa được; tài khoản expert cần đổi về student trước. Nếu đã dùng CLI, sau khi hoàn tác cần chạy `supabase migration repair --status reverted <version>` cho các file 150200 đến 150600.

## Lưu ý về bảng quy đổi band

Các mốc từ 10 câu đúng trở lên theo bảng tham khảo IELTS công bố (mang tính xấp xỉ). Các mốc dưới 10 câu là giả định của nhóm để hệ thống luôn tra được band; cần đối chiếu lại.
