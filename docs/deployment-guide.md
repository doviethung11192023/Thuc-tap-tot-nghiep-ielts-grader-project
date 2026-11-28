# Deploy: việc phải làm và lý do

> **Dùng khi:** chuẩn bị đưa hệ thống lên môi trường công khai (VPS + domain thật). Đọc hết trước khi deploy; mỗi mục ghi *vì sao* để không bỏ sót khi cấu hình khác đi.
> **Cập nhật lần cuối:** 2026-11-28 (có `compose.prod.yml`, CI/CD, runbook `deploy/README.md`). Đổi gì liên quan deploy thì sửa file này cùng commit.
> **Làm theo thứ tự:** `deploy/README.md` (dựng VPS, Tunnel, GitHub Environment, deploy lần đầu, rollback) → file này (giá trị biến, cấu hình Supabase, lý do).
> Thiết kế gốc: `docs/source-of-truth.md` §8 (kiến trúc), §9 (bảo mật). Đánh giá bảo mật chi tiết: `docs/quality-security-evaluation.md` (không commit).

Ký hiệu: ⛔ bỏ qua là có lỗ hổng hoặc hỏng chức năng · ⚠️ nên làm · ✅ đã làm sẵn trong code, chỉ cần kiểm.

## 1. Biến môi trường

### Core API, worker (`backend/.env`, mẫu ở `backend/.env.example`)

| Biến | Giá trị khi deploy | Vì sao |
|---|---|---|
| ⛔ `FRONTEND_URL` | `https://<domain-frontend>` | Link trong email mời / đặt lại mật khẩu của Expert, Admin. Mặc định `http://localhost:3000`: quên đặt thì người nhận bấm link sẽ về máy của chính họ |
| ⛔ `CORS_ORIGINS` | Chỉ `https://<domain-frontend>` | Mặc định chứa localhost. Không dùng `*` (kèm `allow_credentials` thì Starlette phản chiếu mọi origin) |
| ⛔ `ENABLE_API_DOCS` | `false` | Tắt `/docs`, `/redoc`, `/openapi.json`; Swagger cũng không có header chống nhúng iframe |
| ⛔ `AI_ENGINE_SECRET` | Tạo mới: `python3 -c "import secrets; print(secrets.token_urlsafe(32))"` | Phải **giống hệt** trong `ai-engine/.env`. Thiếu thì engine trả 503 mọi lượt chấm. Không dùng lại secret của máy dev |
| ⛔ `AI_SECRETS_ENCRYPTION_KEY` | Khoá Fernet riêng cho production | Mã hoá API key AI trong DB. Mất khoá = mất mọi key đã lưu (phải nhập lại trong trang Service AI) |
| ⚠️ `SUPABASE_DB_URL` | Session pooler | Chỉ dùng chạy migration bằng `psql`; Core không cần |

### AI engine (`ai-engine/.env`)

| Biến | Giá trị | Vì sao |
|---|---|---|
| ⛔ `AI_ENGINE_SECRET` | Giống Core | Như trên |
| ⛔ `ALLOW_NO_SECRET` | Không đặt / `false` | `true` mở `/grade` cho mọi người gọi được tới engine |
| ⚠️ `CORE_API_URL` | Địa chỉ Core **trong mạng nội bộ** (vd. `http://fastapi:8000`) | Engine kéo cấu hình runtime (có API key đã giải mã) từ `/internal/ai-engine/runtime-config` |

### Frontend (build-time, `frontend/.env.local` hoặc biến lúc `next build`)

| Biến | Giá trị | Vì sao |
|---|---|---|
| ⛔ `NEXT_PUBLIC_API_BASE_URL` | `https://<domain-api>` | Ngoài việc gọi API, `frontend/src/proxy.ts` dựng CSP `connect-src` từ biến này. Sai thì trình duyệt **chặn mọi lời gọi API**. Biến `NEXT_PUBLIC_*` được nhúng lúc build: đổi là phải build lại |
| ⛔ `NEXT_PUBLIC_SUPABASE_URL` | URL project | CSP `connect-src` cho REST, Auth và Realtime (`wss://`) lấy từ đây |

## 2. Supabase Dashboard (Authentication)

> ⛔ **Ai sửa được:** chỉ **Owner** (hoặc Administrator) của org Supabase. Tài khoản vai trò *Developer* xem được nhưng mọi ô và nút Save bị khoá; Supabase MCP cũng không có tool đổi cấu hình Auth. Đợt 2026-11-24 dừng ở đây vì người làm là Developer: nhờ Owner đổi, hoặc nâng vai trò.
>
> **Hiện trạng đọc ngày 2026-11-24:** Site URL `http://localhost:3000`; Redirect URLs chỉ có `http://localhost:3000/auth/callback` (đúng cho dev, không có mục thừa); Access token expiry **3600** (chưa đổi sang 900); refresh token reuse interval 10 s.

| Mục | Đặt | Vì sao |
|---|---|---|
| ⛔ URL Configuration → Site URL | `https://<domain-frontend>` | Link mặc định trong email xác minh |
| ⛔ URL Configuration → Redirect URLs | Thêm `https://<domain-frontend>/auth/callback` (đủ cả `?next=/reset-password`, dùng mẫu `https://<domain-frontend>/**`). **Bỏ localhost** khi không còn dev trên project này | Supabase chỉ chuyển về URL trong danh sách: chặn open redirect ở bước OAuth / email. `FRONTEND_URL` phía Core phải khớp một mục ở đây |
| ⚠️ JWT Keys / Sessions → Access token expiry | `900` (15 phút) | Thu hẹp thời gian dùng được của token bị lộ. Code đã tương thích (supabase-js tự refresh; interceptor `api-client.ts` coi token còn < 30 s là cũ) |
| ✅ Refresh token rotation + reuse detection | Bật (mặc định) | Refresh token bị đánh cắp mà dùng lại thì cả phiên bị thu hồi |
| ✅ Confirm email | Bật | Yêu cầu "bắt buộc xác minh email" (§9 source-of-truth) |

### Khoá ký JWT và API key (phải xử lý trước đầu 2027)

| Việc | Vì sao |
|---|---|
| ⛔ Chuyển sang **publishable key** (frontend) và **secret key** (Core, worker) | Project đang dùng legacy `anon`/`service_role` key; Supabase báo khai tử legacy key **đầu 2027**. Project chưa tạo khoá kiểu mới nào |
| ⛔ Bỏ cách Core tự ký JWT `service_role` hạn 10 năm bằng `SUPABASE_JWT_SECRET` (HS256) trong `backend/app/db/supabase.py` | Secret HS256 cũ thành "chìa khoá tổng": ai có nó tự ký được token `service_role` vượt mọi RLS. Dùng secret key mới thay thế |
| ⛔ Sau khi đã chuyển: **revoke** khoá HS256 "Previous" ở Settings → JWT Keys, bỏ `SUPABASE_JWT_SECRET` khỏi `.env` và `config.py` | Còn trong danh sách "previously used" thì Supabase vẫn chấp nhận token ký HS256. Khoá ký hiện tại đã là ECC P-256 (Core kiểm bằng JWKS) |
| ⚠️ Bật MFA cho mọi thành viên org (2026-11-24: 3/3 chưa bật) | Tài khoản Dashboard bị chiếm = mất toàn bộ DB và cấu hình Auth |

## 3. Mạng và cổng (production: `compose.prod.yml`; `docker-compose.yml` chỉ dùng dev)

| Việc | Vì sao |
|---|---|
| ✅ **Chặn `/api/v1/internal/*` từ Internet** — lớp 1: rule WAF Cloudflare (tạo tay, xem `deploy/README.md`); lớp 2 có sẵn: `backend/app/core/internal_path_guard.py` trả 404 khi request có `CF-Connecting-IP` | Route này trả **API key AI đã giải mã**, chỉ bảo vệ bằng `AI_ENGINE_SECRET`. Core phải mở ra Internet, nên lộ secret = lộ mọi key. Chặn ở mạng thì lộ secret không còn đủ |
| ✅ **Không publish Redis**: `compose.prod.yml` không có `ports` nào, Redis có `requirepass` (`REDIS_PASSWORD` trong `compose.env`) | Ai vào được Redis là đọc/ghi hàng đợi chấm |
| ✅ **Không chạy Phoenix** ở production | Trace chứa nội dung bài làm |
| ⛔ AI engine không có `ports` | Giữ nguyên như compose hiện tại; chỉ Core và worker gọi tới |
| ✅ Core API chỉ vào được qua Cloudflare Tunnel; VPS chỉ mở cổng 22 (khoá SSH, `deploy/bootstrap-vps.sh`) | TLS, WAF, rate limit ở Cloudflare; không lộ IP gốc |
| ⚠️ Bật HSTS ở Cloudflare (SSL/TLS → Edge Certificates) cho `api.<domain>` | Core không tự đặt header bảo mật nào; JSON API chỉ cần HSTS + `nosniff`, đặt ở Cloudflare (Transform Rules) |

## 4. Header bảo mật và CSP (đã có trong code, kiểm sau deploy)

- ✅ `frontend/src/proxy.ts`: CSP có nonce mỗi request (`script-src 'nonce' 'strict-dynamic'`, `connect-src` chỉ Core/Supabase/R2, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`).
  - Thêm script bên thứ ba (analytics, SDK) hoặc gọi thêm domain mới → **phải sửa CSP** trong file này, nếu không trình duyệt chặn.
  - Nonce buộc mọi trang render động (`await connection()` trong `app/layout.tsx`): CDN không cache được HTML. Muốn cache thì xem SRI (thử nghiệm) trong `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`.
  - `img-src`/`media-src` đang mở `https:` vì ảnh, audio đề đến từ nhiều host. Biết hết host thì thu hẹp.
- ✅ `frontend/next.config.ts`: `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (chỉ micro), tắt `X-Powered-By`.
- ✅ Bộ lọc HTML đề: DOMPurify (`frontend/src/lib/sanitize-html.ts`). Điều hướng từ tham số / DB: `safeInternalPath` (`frontend/src/lib/safe-redirect.ts`).

## 5. Database

- Migration chạy bằng `psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f <file>` (xem `supabase/README.md`). Project hiện tại đã áp tới `20261124120000_read_only_rls_for_later_tables.sql`.
- Project mới: chạy lần lượt mọi file trong `supabase/migrations/` theo tên, rồi các test trong `supabase/tests/` (đều ROLLBACK, an toàn).
- Sau migration, kiểm: `supabase/tests/read_only_rls_test.sql` (anon/authenticated không ghi được bảng nào).

## 6. Phụ thuộc

- ✅ Next.js 16.4.6 (2026-11-28). Thư viện AI engine có lỗ hổng đã nâng trong `uv.lock`. CI job `security` chặn lỗ hổng mới (pip-audit, `npm audit` critical, gitleaks; dương tính giả trong `.gitleaksignore`); `deploy.yml` quét image bằng Trivy.

## 7. Kiểm sau deploy (smoke test)

Phần API chạy tự động: `deploy/smoke-test.sh` (gọi trong `deploy.sh`, smoke fail thì tự rollback về tag trước). Kiểm tay thêm:

```bash
D=https://<domain-frontend>
curl -sI $D/login | grep -iE "content-security-policy|x-frame-options"   # có nonce, frame-ancestors 'none', DENY
curl -sI https://<domain-api>/docs | head -1                              # 404 (ENABLE_API_DOCS=false)
curl -s -o /dev/null -w "%{http_code}\n" https://<domain-api>/api/v1/internal/ai-engine/runtime-config   # 403/404 từ proxy, không phải 403 của Core
```
- Mở app, F12 → Console: không có lỗi "Content Security Policy" ở các trang làm bài, upload Speaking, nhận kết quả Realtime.
- Chạy một lượt chấm Writing mẫu: đi qua API → Redis → worker → AI engine → Realtime.
- Admin mời một Expert thử: link trong email phải trỏ về domain thật.

## 8. Xoay `AI_ENGINE_SECRET` (khi nghi lộ)

1. Tạo secret mới, sửa cả `backend/.env` và `ai-engine/.env`.
2. Khởi động lại AI engine, Core API, `worker`, `worker-speaking` (vài lượt chấm có thể 403 trong lúc lệch, hệ thống tự thử lại).
3. Giả định key AI đã lộ qua `/internal/...`: tạo key mới ở nhà cung cấp, nhập trong trang Service AI, **thu hồi key cũ ở nhà cung cấp**.
4. Kiểm log Core: request `/internal/ai-engine/runtime-config` từ IP lạ; Langfuse: phiên bản prompt production lạ.
