#!/usr/bin/env bash
# Deploy một image tag lên VPS (chạy bằng user deploy). Dùng: deploy.sh <image_tag>
# Luồng: ghi tag hiện tại -> PREVIOUS_TAG, pull, up -d, chờ healthy, smoke test.
# Lỗi ở bất kỳ bước nào: dựng lại tag trước đó và thoát mã khác 0.
#
# Biến môi trường (mặc định dùng trên VPS; ghi đè để thử cục bộ):
#   IELTS_DIR=/srv/ielts   COMPOSE_FILES="<file> [<file>...]" (cách nhau bằng khoảng trắng)
#   COMPOSE_ENV_FILE=$IELTS_DIR/compose.env   COMPOSE_PROJECT_NAME=ielts   WAIT_TIMEOUT=300
#   SMOKE_MODE=docker (chạy smoke trong container curl nối mạng compose) | host (chạy thẳng, cần SMOKE_URL)
#   SMOKE_URL=...   EXPECT_CF_BLOCK / EXPECT_HEADERS (chuyển cho smoke-test.sh)
set -euo pipefail

log() { printf '%s [deploy] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
die() { log "ERROR: $*"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IELTS_DIR="${IELTS_DIR:-/srv/ielts}"
COMPOSE_FILES="${COMPOSE_FILES:-$IELTS_DIR/compose.prod.yml}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-$IELTS_DIR/compose.env}"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-ielts}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-300}"
SMOKE_MODE="${SMOKE_MODE:-docker}"
CURL_IMAGE="${CURL_IMAGE:-curlimages/curl:8.11.1}"
CURRENT_FILE="$IELTS_DIR/CURRENT_TAG"
PREVIOUS_FILE="$IELTS_DIR/PREVIOUS_TAG"

NEW_TAG="${1:-}"
[[ -n "$NEW_TAG" ]] || die "usage: $0 <image_tag>"
# Tag đi qua SSH từ CI: chỉ nhận ký tự an toàn
[[ "$NEW_TAG" =~ ^[A-Za-z0-9_.-]{1,128}$ ]] || die "image tag không hợp lệ: $NEW_TAG"

compose() {
  local args=() f
  for f in $COMPOSE_FILES; do args+=(-f "$f"); done
  docker compose "${args[@]}" --env-file "$COMPOSE_ENV_FILE" "$@"
}

# Chờ mọi service healthy. Trả 1 nếu quá hạn hoặc có container unhealthy/exited.
wait_healthy() {
  local deadline=$((SECONDS + WAIT_TIMEOUT)) svc id st all
  while (( SECONDS < deadline )); do
    all=1
    for svc in $(compose config --services); do
      id="$(compose ps -q "$svc" | head -n1)"
      if [[ -z "$id" ]]; then all=0; continue; fi
      st="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id")"
      case "$st" in
        healthy|running) ;;
        unhealthy|exited|dead) log "service $svc: $st"; return 1 ;;
        *) all=0 ;;
      esac
    done
    if (( all == 1 )); then log "mọi service healthy"; return 0; fi
    sleep 5
  done
  log "quá ${WAIT_TIMEOUT}s mà chưa healthy:"
  compose ps || true
  return 1
}

run_smoke() {
  if [[ "$SMOKE_MODE" == "host" ]]; then
    [[ -n "${SMOKE_URL:-}" ]] || { log "SMOKE_URL trống"; return 1; }
    sh "$SCRIPT_DIR/smoke-test.sh" "$SMOKE_URL"
  else
    docker run --rm --network "${COMPOSE_PROJECT_NAME}_default" \
      -e EXPECT_CF_BLOCK="${EXPECT_CF_BLOCK:-1}" -e EXPECT_HEADERS="${EXPECT_HEADERS:-}" \
      -v "$SCRIPT_DIR/smoke-test.sh:/smoke-test.sh:ro" \
      --entrypoint sh "$CURL_IMAGE" /smoke-test.sh "http://fastapi:8000"
  fi
}

# Dựng một tag lên và kiểm tra. Trả 0 khi xong cả smoke test.
roll_out() {
  local tag="$1"
  export IMAGE_TAG="$tag"
  log "pull tag $tag"
  compose pull --quiet || return 1
  log "up -d tag $tag"
  compose up -d --remove-orphans || return 1
  wait_healthy || return 1
  log "smoke test"
  run_smoke || return 1
}

mkdir -p "$IELTS_DIR"
PREV_TAG=""
[[ -f "$CURRENT_FILE" ]] && PREV_TAG="$(tr -d '[:space:]' < "$CURRENT_FILE")"
log "deploy $NEW_TAG (tag hiện tại: ${PREV_TAG:-<chưa có>})"

if roll_out "$NEW_TAG"; then
  # Chỉ ghi PREVIOUS_TAG khi deploy thành công, để lượt thất bại không làm mất tag cũ hơn
  if [[ -n "$PREV_TAG" && "$PREV_TAG" != "$NEW_TAG" ]]; then
    echo "$PREV_TAG" > "$PREVIOUS_FILE"
  fi
  echo "$NEW_TAG" > "$CURRENT_FILE"
  log "THÀNH CÔNG: đang chạy $NEW_TAG"
  docker image prune -f >/dev/null 2>&1 || true
  exit 0
fi

log "THẤT BẠI với $NEW_TAG"
compose logs --tail=40 2>&1 | sed 's/^/    /' || true
if [[ -z "$PREV_TAG" ]]; then
  die "chưa có tag trước đó để rollback"
fi
log "ROLLBACK về $PREV_TAG"
if roll_out "$PREV_TAG"; then
  log "rollback xong, đang chạy $PREV_TAG (CURRENT_TAG giữ nguyên)"
else
  log "rollback CŨNG THẤT BẠI: can thiệp tay (docker compose ps / logs)"
fi
exit 1
