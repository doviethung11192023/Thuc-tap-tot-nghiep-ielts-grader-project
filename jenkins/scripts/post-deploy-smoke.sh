#!/usr/bin/env bash
# Sau deploy: (1) chờ mọi service của stack chạy đúng tag và healthy, (2) chạy deploy/smoke-test.sh
# (cùng script production) trong container curl nối mạng của stack.
# Portainer trả lời ngay khi lệnh `compose up` xong, không chờ healthy, nên phải chờ ở đây.
# Dùng: post-deploy-smoke.sh <stack_name> <image_tag>
# Biến tuỳ chọn: WAIT_TIMEOUT (300) EXPECT_CF_BLOCK (1) CURL_IMAGE
set -euo pipefail

stack="${1:?usage: post-deploy-smoke.sh <stack> <tag>}"
tag="${2:?usage: post-deploy-smoke.sh <stack> <tag>}"
wait_timeout="${WAIT_TIMEOUT:-300}"
curl_image="${CURL_IMAGE:-curlimages/curl:8.11.1}"
smoke_script="${SMOKE_SCRIPT:-deploy/smoke-test.sh}"
app_services=(fastapi worker worker-speaking ai-engine)

check_services() {
  local svc id image state
  for svc in "${app_services[@]}"; do
    id="$(docker ps -q --filter "label=com.docker.compose.project=${stack}" \
            --filter "label=com.docker.compose.service=${svc}" | head -n1)"
    [ -n "$id" ] || { echo "chờ: $svc chưa chạy"; return 1; }
    image="$(docker inspect -f '{{.Config.Image}}' "$id")"
    [[ "$image" == *":${tag}" ]] || { echo "chờ: $svc đang chạy $image (cần tag $tag)"; return 1; }
    state="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id")"
    case "$state" in
      healthy | running) ;;
      unhealthy) echo "FAIL: $svc unhealthy" >&2; exit 1 ;;
      *) echo "chờ: $svc $state"; return 1 ;;
    esac
  done
}

deadline=$((SECONDS + wait_timeout))
until check_services; do
  if (( SECONDS >= deadline )); then echo "FAIL: quá ${wait_timeout}s chưa healthy với tag $tag" >&2; exit 1; fi
  sleep 10
done
echo "Mọi service chạy tag $tag và healthy"

# fastapi không publish cổng ra mạng ngoài prod, nên chạy smoke từ container nối mạng stack.
# Đưa script qua stdin (Jenkins là container: mount đường dẫn workspace sẽ trỏ sai vào daemon).
docker run --rm -i --network "${stack}_default" \
  -e EXPECT_CF_BLOCK="${EXPECT_CF_BLOCK:-1}" -e EXPECT_HEADERS="${EXPECT_HEADERS:-}" \
  --entrypoint sh "$curl_image" -c 'cat > /tmp/smoke.sh && sh /tmp/smoke.sh "$1"' _ "http://fastapi:8000" \
  < "$smoke_script"
