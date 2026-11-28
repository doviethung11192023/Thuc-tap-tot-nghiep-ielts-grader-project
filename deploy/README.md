# Runbook deploy production

> **Dùng khi:** dựng VPS lần đầu, deploy, rollback, xoay secret. Phạm vi và lý do chọn kiến trúc: `plans/261128-1500-deploy-cicd-scope-lock/plan.md`. Bảng biến môi trường và lý do bảo mật: [`docs/deployment-guide.md`](../docs/deployment-guide.md) (không lặp lại ở đây).

## Sơ đồ

```
Internet --HTTPS--> Cloudflare (WAF, rate limit) --Tunnel (kết nối RA từ VPS)--> cloudflared --> fastapi:8000
                                                                                                   |-> redis (mật khẩu, không publish)
VPS chỉ mở cổng 22 (SSH, chỉ khoá)                                          worker, worker-speaking, ai-engine (mạng nội bộ)
```

`compose.prod.yml` không có `ports:` ở service nào. Muốn xem log hay gọi thử, dùng `docker compose exec` / `docker compose logs`.

## A. Lần đầu (làm một lần)

1. **Droplet:** Ubuntu 24.04 x86, 4 vCPU / 8 GB, Singapore, thêm SSH key của bạn lúc tạo. Bật backup nếu còn credit.
2. **Sinh khoá SSH riêng cho CD** (máy cá nhân): `ssh-keygen -t ed25519 -f deploy_key -N ""`. Khoá công khai (`deploy_key.pub`) đưa cho bước 3; khoá bí mật (`deploy_key`) sẽ vào GitHub secret `VPS_SSH_KEY`, sau đó xoá khỏi máy.
3. **Bootstrap** (root, một lần): chép `deploy/bootstrap-vps.sh` lên droplet rồi chạy
   `sudo ./bootstrap-vps.sh "$(cat deploy_key.pub)"`.
   Mở cửa sổ SSH thứ hai kiểm `ssh -i deploy_key deploy@<ip>` chạy được **trước khi** đóng phiên root (script tắt mật khẩu và root login). Hỏng thì dùng Recovery Console của DigitalOcean.
4. **Điền 3 file env** trong `/srv/ielts/` (đã tạo sẵn, quyền 600, chủ `deploy`), mẫu ở `deploy/env/*.example`:
   - `compose.env`: `GHCR_OWNER` (viết thường), `REDIS_PASSWORD`, `TUNNEL_TOKEN`, số worker.
   - `backend.env`, `ai-engine.env`: secret **mới** cho production (không dùng lại của máy dev). `AI_ENGINE_SECRET` phải giống nhau ở hai file. `CORS_ORIGINS` và `FRONTEND_URL` chỉ là domain frontend; `ENABLE_API_DOCS=false`. Sao lưu `AI_SECRETS_ENCRYPTION_KEY` ra ngoài máy (mất khoá = mất mọi API key đã lưu).
5. **reference_corpus** (Writing, không nằm trong image) từ máy dev:
   `rsync -av ai-engine/data/reference_corpus/ deploy@<ip>:/srv/ielts/reference_corpus/`
6. **Cloudflare:**
   - Zero Trust → Networks → Tunnels → tạo tunnel loại cloudflared, copy token vào `TUNNEL_TOKEN`.
   - Public hostname: `api.<domain>` → Service `HTTP` · `fastapi:8000`.
   - Security → WAF → Custom rule: `(http.request.uri.path contains "/api/v1/internal")` → Block.
   - Security → WAF → Rate limiting rule (gói Free cho 1 rule): ví dụ 100 request / 10 s / IP trên `api.<domain>` → Block hoặc Managed Challenge.
   - SSL/TLS: Full; bật Always Use HTTPS và HSTS.
7. **GitHub** (cần quyền Admin trên repo):
   - Settings → Environments → tạo `production`; bật **Required reviewers**; giới hạn Deployment branches = `main`.
   - Secrets của Environment `production`: `VPS_HOST` (IP hoặc hostname), `VPS_SSH_KEY` (nội dung `deploy_key`), `VPS_KNOWN_HOSTS` (kết quả `ssh-keyscan -t ed25519 <ip>`, đối chiếu fingerprint với console DigitalOcean).
   - Settings → Branches → rule cho `main`: bắt PR, bắt các check CI xanh, cấm force push.
   - Packages `ielts-backend`, `ielts-ai-engine` (sau lần build đầu): nếu để private thì trên VPS chạy một lần `docker login ghcr.io` bằng PAT quyền `read:packages` (user `deploy`); repo public thì đặt package public cho gọn.
8. **Chạy lần đầu:** Actions → Deploy → Run workflow (để trống `image_tag`) hoặc merge vào `main`; duyệt ở Environment. Job build chạy trước, deploy chạy `deploy.sh <sha>`.
9. **Kiểm:** `docs/deployment-guide.md` §7; quét cổng từ máy ngoài (`nmap -Pn <ip>`: chỉ 22); `ssh root@<ip>` và đăng nhập bằng mật khẩu bị từ chối; `curl -I https://api.<domain>/api/v1/internal/ai-engine/runtime-config` bị chặn ở Cloudflare.

## B. Deploy thường ngày

Merge vào `main` → CI build + Trivy → duyệt ở GitHub → `deploy.sh` trên VPS: pull, `up -d`, chờ mọi container healthy (tối đa 300 s), smoke test. Lỗi → tự dựng lại tag cũ, job đỏ.

Tag đang chạy: `cat /srv/ielts/CURRENT_TAG` (tag trước đó: `PREVIOUS_TAG`).

Lệnh tay trên VPS (cần `IMAGE_TAG` đúng):
```bash
cd /srv/ielts
export IMAGE_TAG=$(cat CURRENT_TAG)
docker compose -p ielts -f compose.prod.yml --env-file compose.env ps
docker compose -p ielts -f compose.prod.yml --env-file compose.env logs -f --tail=100 fastapi
```

## C. Rollback

- **Qua GitHub:** Actions → Deploy → Run workflow → `image_tag` = SHA cũ (lấy ở `PREVIOUS_TAG` hoặc danh sách package trên GHCR) → duyệt. Bỏ qua build/scan, chạy cùng `deploy.sh` (có smoke + rollback).
- **Tay trên VPS** (GitHub hỏng): `/srv/ielts/deploy/deploy.sh "$(cat /srv/ielts/PREVIOUS_TAG)"`.
- Migration DB **không** tự rollback: migration chạy tay, viết sao cho bản code cũ vẫn chạy được với schema mới.

## D. Xoay secret

| Secret | Việc |
|---|---|
| `AI_ENGINE_SECRET` | Sửa cả `backend.env` và `ai-engine.env`, rồi `docker compose ... up -d --force-recreate fastapi worker worker-speaking ai-engine`. Các bước còn lại: `docs/deployment-guide.md` §8 |
| `REDIS_PASSWORD` | Sửa `compose.env`, `up -d --force-recreate` (Redis và mọi service dùng nó); hàng đợi giữ nguyên nhờ AOF |
| `TUNNEL_TOKEN` | Cloudflare: roll token của tunnel → sửa `compose.env` → `up -d cloudflared` |
| Khoá SSH deploy | Tạo cặp mới, thêm khoá công khai vào `~deploy/.ssh/authorized_keys`, cập nhật `VPS_SSH_KEY`, xoá dòng cũ |
| Khoá host SSH (VPS dựng lại) | Cập nhật `VPS_KNOWN_HOSTS` |

Sau mỗi lần sửa env: `chmod 600 /srv/ielts/*.env` và không dán secret vào chat, issue hay log CI.

## E. Thử cục bộ không cần VPS

`deploy/compose.localtest.yml` (đọc đầu file) dựng cùng stack với ai-engine và cloudflared giả. `deploy.sh` đọc `IELTS_DIR`, `COMPOSE_FILES`, `COMPOSE_ENV_FILE`, `COMPOSE_PROJECT_NAME`, `SMOKE_MODE` để chạy được ở máy dev.

## Cần biết

- `smoke-test.sh` chạy trong container curl nối mạng compose (vì `fastapi` không publish cổng). Truyền `EXPECT_HEADERS="strict-transport-security"` khi chạy tay qua domain công khai để kiểm header Cloudflare.
- Core không tự thêm header bảo mật (header nằm ở Next và Cloudflare), nên smoke mặc định chỉ kiểm `X-Powered-By` vắng mặt.
- Docker bỏ qua ufw với cổng publish; vì không có cổng nào được publish nên ufw đủ. Đừng thêm `ports:` vào `compose.prod.yml`.
- Volume `hf_cache` giữ model Whisper giữa các lần deploy; image phải tạo sẵn `/home/app/.cache/huggingface` thuộc uid 10001, nếu không container ghi cache bị lỗi quyền.
