#!/bin/sh
# Smoke test sau deploy. Dùng: smoke-test.sh <api_base_url>
# Chỉ cần sh + curl nên chạy được trong container curlimages/curl (deploy.sh làm vậy vì fastapi không publish cổng).
# Biến tuỳ chọn:
#   EXPECT_CF_BLOCK=1    kiểm lớp chặn thứ 2 của Core: /internal kèm CF-Connecting-IP phải 404 (đặt 0 nếu image chưa có middleware)
#   EXPECT_HEADERS="a b" tên header phản hồi bắt buộc có trên /health (vd. "strict-transport-security" khi gọi qua domain công khai).
#                        Mặc định rỗng vì Core không tự thêm header bảo mật (header nằm ở Next và Cloudflare).
set -u

BASE="${1:-}"
if [ -z "$BASE" ]; then
  echo "usage: $0 <api_base_url>" >&2
  exit 2
fi
BASE="${BASE%/}"
EXPECT_CF_BLOCK="${EXPECT_CF_BLOCK:-1}"
EXPECT_HEADERS="${EXPECT_HEADERS:-}"
INTERNAL_PATH="/api/v1/internal/ai-engine/runtime-config"

FAILS=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; FAILS=$((FAILS + 1)); }

code() { curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$@" || true; }

# 1. /health 200 (thử lại vài lần: tiến trình vừa lên)
c=000
for _ in 1 2 3 4 5; do
  c=$(code "$BASE/health")
  [ "$c" = "200" ] && break
  sleep 2
done
if [ "$c" = "200" ]; then pass "/health = 200"; else fail "/health = $c (cần 200)"; fi

# 2. API docs tắt
for p in /docs /redoc /openapi.json; do
  c=$(code "$BASE$p")
  if [ "$c" = "404" ]; then pass "$p = 404"; else fail "$p = $c (cần 404, kiểm ENABLE_API_DOCS=false)"; fi
done

# 3. Route nội bộ không lộ ra ngoài
c=$(code "$BASE$INTERNAL_PATH")
if [ "$c" != "200" ]; then pass "$INTERNAL_PATH không trả 200 ($c)"; else fail "$INTERNAL_PATH = 200: LỘ API key AI"; fi
if [ "$EXPECT_CF_BLOCK" = "1" ]; then
  c=$(code -H "CF-Connecting-IP: 203.0.113.9" "$BASE$INTERNAL_PATH")
  if [ "$c" = "404" ]; then pass "$INTERNAL_PATH kèm CF-Connecting-IP = 404"; else fail "$INTERNAL_PATH kèm CF-Connecting-IP = $c (cần 404)"; fi
fi

# 4. Header
hdrs=$(curl -s -D - -o /dev/null --max-time 10 "$BASE/health" | tr '[:upper:]' '[:lower:]' | tr -d '\r' || true)
if echo "$hdrs" | grep -q '^x-powered-by:'; then fail "header x-powered-by lộ công nghệ"; else pass "không có x-powered-by"; fi
for h in $EXPECT_HEADERS; do
  hl=$(echo "$h" | tr '[:upper:]' '[:lower:]')
  if echo "$hdrs" | grep -q "^$hl:"; then pass "header $hl có mặt"; else fail "thiếu header $hl"; fi
done

if [ "$FAILS" -gt 0 ]; then
  echo "SMOKE FAILED: $FAILS lỗi"
  exit 1
fi
echo "SMOKE OK"
