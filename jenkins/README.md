# Lab Jenkins theo stack công ty

> **Dùng khi:** muốn tự tay chạy lại luồng CI/CD của công ty (Jenkins, Docker Hub, Portainer, Discord) trên laptop.
> **Không phải:** pipeline chính. GitHub Actions (`.github/workflows/ci.yml`, `deploy.yml`) vẫn là pipeline production; lab này chạy song song để học, không thay thế.
> Phạm vi: `plans/261128-1500-deploy-cicd-scope-lock/plan.md` mục 8 (J1 laptop, J2 Droplet).

## 1. Mục tiêu và tổng quan

Sau lab bạn tự làm được: dựng Jenkins bằng code, viết/đọc Jenkinsfile declarative, đẩy image lên Docker Hub, cập nhật stack qua Portainer API, nhận thông báo Discord, rollback bằng tag.

```
 git (poll 5 phút)        Jenkins (container, docker.sock)                Docker Hub        Portainer (container)
 ┌──────────┐   ┌───────────────────────────────────────────────────┐    ┌─────────┐       ┌──────────────────┐
 │ repo /   │──>│ Checkout -> Test -> Build -> Smoke -> Trivy ──push├───>│ user/   │<─pull─┤ stack ielts-lab  │
 │ GitHub   │   │ (pytest)   (--pull)  (healthy) (CRITICAL)         │    │ ielts-* │       │ fastapi, workers │
 └──────────┘   │      └──> Deploy: PUT /api/stacks/{id} ───────────┼───────────────────>│ ai-engine, redis │
                │      └──> Post-deploy smoke ──> Discord embed     │                    └──────────────────┘
                └───────────────────────────────────────────────────┘
```

| | GitHub Actions (chính) | Jenkins lab (công ty) |
|---|---|---|
| Trigger | push/PR (webhook, GitHub tự gọi) | `pollSCM` mỗi 5 phút (laptop GitHub không gọi vào được); release bấm tay |
| Nơi chạy | runner GitHub (`ubuntu-24.04`) | container Jenkins trên máy bạn, chạy lệnh Docker qua `docker.sock` |
| Secret | GitHub Secrets / Environment `production` | Jenkins Credentials (`docker-hub-creds`, `portainer-api-key`, `discord-webhook-token`) |
| Registry | GHCR | Docker Hub |
| Deploy | SSH vào VPS, `deploy.sh`, tự rollback | Portainer API cập nhật stack; rollback = chạy release với tag cũ |
| Chi phí | miễn phí (repo public) hoặc theo phút | tự vận hành máy chủ Jenkins (RAM, vá lỗi) |

Công ty đang làm: DEV poll SCM, build, smoke `import`, push `:dev`, Portainer tạo lại container, Discord; PROD (`Jenkinsfile-master`) bấm tay với `DEPLOY` + `IMAGE_TAG`. Lab này giữ nguyên khung đó và vá chỗ yếu (ghi trong comment đầu mỗi Jenkinsfile): thêm test, quét Trivy, smoke tới healthy, deploy tag bất biến `<sha>` thay vì `:dev`, không `curl -k`, cập nhật cả stack, smoke sau deploy.

Thành phần: `Jenkinsfile` (DEV), `jenkins/Jenkinsfile.release`, `jenkins/Dockerfile` + `plugins.txt` + `casc.yaml` (Jenkins dựng bằng code), `jenkins/compose.yml` (Jenkins + Portainer), `jenkins/lab-stack.yml` (stack ứng dụng cho Portainer), `jenkins/scripts/*.sh`.

**Vì sao có `lab-stack.yml` thay vì dùng `compose.prod.yml`:** prod lấy image từ GHCR, đọc `env_file` trong `/srv/ielts` (Portainer chạy compose trong container của nó nên không thấy) và có cloudflared + ai-engine 3,5 GB. `lab-stack.yml` giữ cùng tên service và cách harden, image `docker.io/${REGISTRY_USER}/...:${IMAGE_TAG}`, env giả nhúng sẵn, nên `deploy/smoke-test.sh` chạy y như production. `compose.prod.yml` không bị sửa.

## 2. Dựng lab

1. **RAM:** Docker Desktop cần **>= 6 GB** (Settings -> Resources). Máy đang 3,8 GB và stack khác (`cvat_*`) chiếm ~2,2 GB: tăng RAM, hoặc tạm dừng stack kia (`docker compose stop` ở thư mục của nó, đừng xoá). Lab dùng ~1,5 GB (Jenkins) + ~3 GB (stack ứng dụng, ai-engine 2 GB) + build.
2. Tạo `jenkins/.env` (đã bị `.gitignore`, **không commit**):
   ```bash
   cat > jenkins/.env <<EOF
   JENKINS_ADMIN_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=')
   EOF
   ```
   Mật khẩu admin chính là giá trị này (`cat jenkins/.env`); tài khoản `admin`. Các biến khác (Docker Hub, Portainer, Discord) thêm ở bài 3.
3. Chạy: `docker compose -f jenkins/compose.yml up -d --build` (lần đầu build image + tải plugin, vài phút).
4. **Kết quả mong đợi:**
   - `docker compose -f jenkins/compose.yml ps`: jenkins `healthy`, portainer `Up`.
   - http://127.0.0.1:8080 hiện trang đăng nhập (không có setup wizard); vào được bằng `admin` + mật khẩu ở `.env`.
   - Manage Jenkins -> Credentials: thấy 3 credential placeholder (`changeme`). Manage Jenkins -> Plugins: đủ plugin trong `plugins.txt`.
   - Portainer: https://127.0.0.1:9443 (chứng chỉ tự ký, trình duyệt sẽ cảnh báo) hoặc http://127.0.0.1:9000. Cả hai chỉ nghe trên loopback.

Muốn cấu hình Jenkins khác (executor, biến chung, credential): sửa `casc.yaml` rồi `docker compose -f jenkins/compose.yml up -d --build`. Đó là điểm khác UI-bấm-tay: cấu hình có lịch sử git, dựng lại là có.

## 3. Bài tập

### Bài 1. Docker Hub
1. Tạo tài khoản Docker Hub, tạo **access token** (Account settings -> Personal access tokens, quyền Read & Write). Không dùng mật khẩu tài khoản.
2. Tạo sẵn 2 repository **public**: `ielts-backend`, `ielts-ai-engine` (public để Portainer kéo không cần đăng nhập; private thì phải thêm registry trong Portainer).
3. Thêm vào `jenkins/.env`: `DOCKERHUB_USER=<user>` và `DOCKERHUB_TOKEN=<token>`. Chạy lại `docker compose -f jenkins/compose.yml up -d`.

**Kết quả mong đợi:** Jenkins Credentials có `docker-hub-creds` (loại Username with password, username là user của bạn). Jenkins không in token ra log.

### Bài 2. Portainer và API key
1. Lấy mã khởi tạo: `docker compose -f jenkins/compose.yml logs portainer | grep setup_token` (Portainer 2.39 yêu cầu mã này khi tạo admin, nhập khi UI hỏi hoặc ở header `X-Setup-Token` khi dùng API).
2. Mở https://127.0.0.1:9443, tạo tài khoản admin. **Làm trong 5 phút sau khi Portainer khởi động**, quá hạn Portainer tự khoá: `docker compose -f jenkins/compose.yml restart portainer`.
3. Environments: có môi trường `primary` (id **1**; compose đã dùng cờ `-H` để tạo sẵn). Nếu id khác, đặt `PORTAINER_ENDPOINT_ID` trong `.env`.
4. My account -> Access tokens -> Add access token, copy giá trị `ptr_...` (chỉ hiện một lần). Thêm `PORTAINER_API_KEY=<giá trị>` vào `.env`, chạy lại `up -d`.
5. Thử API bằng tay: `curl -s -H "X-API-Key: <key>" http://127.0.0.1:9000/api/stacks` (trả `[]`).

**Kết quả mong đợi:** credential `portainer-api-key` có giá trị thật; lệnh curl trả JSON (mảng rỗng).

### Bài 3. Discord
1. Server Discord của bạn -> Channel settings -> Integrations -> Webhooks -> New Webhook -> Copy URL.
2. Thêm `DISCORD_WEBHOOK=<url>` vào `.env`, chạy lại `up -d`. (Jenkinsfile nhận URL đầy đủ hoặc chỉ phần `id/token`, như credential `discord-webhook-token` của công ty.)
3. Thử: `curl -H 'Content-Type: application/json' -d '{"content":"ping"}' "<url>"`.

**Kết quả mong đợi:** kênh Discord nhận tin "ping". Để trống/`changeme` thì pipeline bỏ qua bước thông báo, không lỗi.

### Bài 4. Job DEV `ielts-dev`
1. Jenkins -> New Item -> tên `ielts-dev` -> **Pipeline**.
2. Pipeline -> Definition: **Pipeline script from SCM** -> SCM: Git.
   - Repository URL: `file:///repo` (repo trên laptop, mount chỉ đọc; chỉ thấy commit đã có trong repo) hoặc URL GitHub (phải push branch `feat/deploy-cicd` trước; repo private thì thêm credential `github-pat` tay trong UI: Credentials -> Add -> Username with password -> PAT).
   - Branch Specifier: `*/feat/deploy-cicd`. Script Path: `Jenkinsfile`.
3. Save -> **Build Now** (build đầu bắt buộc bấm tay; `pollSCM` chỉ chạy sau đó). Lần đầu mất lâu vì tải torch CPU, base image, DB Trivy; lần sau nhanh hơn nhờ cache.
4. Xem Stage View (hoặc Console Output): Checkout, Test (2 nhánh song song), Build, Smoke image, Trivy, Push Docker Hub, Deploy Portainer, Post-deploy smoke.

**Kết quả mong đợi:**
- Mọi stage xanh; Docker Hub có `<user>/ielts-backend` và `ielts-ai-engine` với tag `<sha đầy đủ>` và `dev`.
- Portainer -> Stacks -> `ielts-lab` (pipeline tự tạo lần đầu, các lần sau cập nhật) với 5 container healthy, tag = sha commit. `curl http://127.0.0.1:18000/health` trả 200.
- Discord nhận embed xanh với `Commit <sha8>`.
- Commit mới trên branch, đợi tối đa 5 phút: Jenkins tự chạy build mới (poll).

### Bài 5. Cố ý làm hỏng test
1. Trong repo, sửa một test backend thành sai (ví dụ `assert 1 == 2` ở một file trong `backend/tests/`), commit lên branch.
2. Đợi poll hoặc Build Now.

**Kết quả mong đợi:** pipeline đỏ ở stage **Test**, các stage Build/Push/Deploy bị bỏ qua (không có image lỗi lên Docker Hub, stack không đổi), Discord báo đỏ. Sửa lại test, commit, build xanh trở lại. So với công ty (không test): lỗi bị chặn trước khi build.

### Bài 6. Job RELEASE `ielts-release` và rollback
1. New Item -> `ielts-release` -> Pipeline, Pipeline script from SCM như bài 4, Script Path: **`jenkins/Jenkinsfile.release`**. Không có trigger: chỉ bấm tay.
2. Save -> Build Now (lần đầu chỉ để Jenkins nạp tham số; có thể đỏ hoặc chạy thật). Từ lần sau là **Build with Parameters**.
3. Phát hành: `IMAGE_TAG` = `prodDDMMYYYY` (mặc định, giờ Việt Nam), `DEPLOY` bật. Pipeline: kiểm tag -> thấy tag chưa có trên Docker Hub (chế độ BUILD) -> build, smoke, Trivy, push chỉ tag đó, ghi `image-ids.txt` -> deploy -> smoke.
4. Rollback: chạy lại với `IMAGE_TAG` = một tag **đã có** (ví dụ `prod...` cũ, hoặc một sha của job dev), `DEPLOY` bật.

**Kết quả mong đợi:**
- Bước 3: Docker Hub có tag mới (không có `latest`/`dev`), Portainer chạy đúng tag đó, artifact `image-ids.txt` chứa image ID.
- Bước 4: chế độ **REDEPLOY**: không build, không push, Portainer kéo lại image cũ, `post-deploy-smoke` xác nhận mọi service đã chạy đúng tag cũ. Tag đã có mà tắt `DEPLOY` thì pipeline dừng với thông báo rõ (không ghi đè tag).
- Thử `IMAGE_TAG=latest`: bị chặn ở stage Validate.

### Bài 7 (tuỳ chọn). Đọc code
Đối chiếu `Jenkinsfile` với `.github/workflows/deploy.yml`: mỗi stage tương ứng step nào; tìm 8 cải tiến ghi ở comment đầu file; đọc `jenkins/scripts/portainer-deploy.sh` để thấy API Portainer thật sự nhận gì (`stackFileContent`, `env`, `prune`, `pullImage`).

## 4. Bẫy thường gặp

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| `permission denied ... /var/run/docker.sock` | User jenkins không đọc được socket. Docker Desktop: compose dùng `group_add: 0` (socket thuộc root). Linux thuần: đặt `DOCKER_GID=$(getent group docker \| cut -d: -f3)` trong `.env`. |
| Build chết bất ngờ, `Killed`, exit 137 | Hết RAM Docker Desktop. Tăng >= 6 GB hoặc dừng stack khác; build ai-engine và stack ứng dụng nặng nhất. |
| Push code mới nhưng Jenkins không chạy | `pollSCM` cần build đầu bấm tay; đợi tới 5 phút (`H/5`); với `file:///repo` chỉ thấy commit đã có trong repo laptop. |
| `Could not find credentials entry with ID 'docker-hub-creds'` | ID phải khớp **chính xác** giữa Jenkinsfile và Jenkins (`docker-hub-creds`, `portainer-api-key`, `discord-webhook-token`). |
| Credential còn `changeme` | Sửa `jenkins/.env` rồi `up -d` (JCasC nạp lại lúc khởi động). Sửa trong UI sẽ bị ghi đè khi khởi động lại vì credential này do `casc.yaml` quản lý; credential bạn tự thêm bằng UI (ví dụ GitHub PAT) thì giữ. |
| Portainer báo khoá/timeout khi tạo admin | Quá 5 phút chưa tạo admin: `docker compose -f jenkins/compose.yml restart portainer`. |
| `PORTAINER_URL phải là https://` | Script chỉ cho http với `portainer`/`localhost`/`127.0.0.1`. Đúng chủ ý: không `curl -k`, không gửi API key qua HTTP thường ra ngoài. |
| `Chưa đặt DOCKERHUB_USER` | Điền `.env`, chạy lại `up -d`. |
| Stage Test: pip/uv tải lại mọi lần | Cache nằm ở `$JENKINS_HOME/.cache`; mất khi `down -v`. |
| `fatal: detected dubious ownership` | Đã xử lý bằng `GIT_CONFIG_*` trong compose; nếu dùng Jenkins khác phải tự đặt `safe.directory`. |
| `down -v` | Xoá cả `jenkins_home` (job, lịch sử, cache) và dữ liệu Portainer. Chỉ dùng khi muốn làm lại từ đầu. Stack `ielts-lab` do Portainer tạo nằm ngoài compose này: xoá trong Portainer UI. |

Bảo mật lab: Jenkins và Portainer đều gắn `docker.sock` (= root trên daemon) và chỉ nghe loopback. Đừng mở cổng ra LAN, đừng dùng token Docker Hub quyền rộng, thu hồi token/API key sau khi học xong.

## 5. J2: chuyển sang Droplet (ngắn gọn)

1. Cài Portainer trên Droplet, **không publish cổng ra Internet**; đưa qua Cloudflare Tunnel với hostname riêng và bật **Cloudflare Access** (chỉ danh tính của bạn/service token được vào). Jenkins gọi bằng `https://portainer.<domain>` (chứng chỉ hợp lệ, không `-k`); nếu Access yêu cầu service token, thêm header `CF-Access-Client-Id/Secret` vào hàm `api()` trong `portainer-deploy.sh`.
2. Đặt `PORTAINER_URL`, `PORTAINER_STACK`, `PORTAINER_ENDPOINT_ID` trong `.env`/`casc.yaml` trỏ sang Droplet. Cùng một Jenkinsfile.
3. Stack trên Droplet dùng `compose.prod.yml` với `ghcr.io/${GHCR_OWNER}` đổi thành `docker.io/${REGISTRY_USER}` (hoặc đặt `GHCR_OWNER` theo tên mới), bỏ `env_file` và nhúng biến vào mục Environment variables của stack (Portainer không đọc `/srv/ielts/*.env`). Khi đó trỏ `STACK_FILE` tới file này và thêm mọi biến cần thiết vào `env` trong `portainer-deploy.sh`.
4. Droplet chỉ chọn MỘT đường deploy cho mỗi môi trường (GitHub Actions + SSH **hoặc** Jenkins + Portainer), tránh hai pipeline cùng ghi đè một stack. Jenkins thật nên chạy trên máy riêng, không cùng Droplet 8 GB đang chạy ứng dụng.
