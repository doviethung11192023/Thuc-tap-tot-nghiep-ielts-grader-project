#!/usr/bin/env bash
# Smoke test image TRƯỚC khi push (giống bước "Smoke test image" trong .github/workflows/deploy.yml):
# 1) không chạy bằng root, 2) chạy container tới khi Docker HEALTHCHECK báo healthy.
# Công ty chỉ chạy `python -c "import ..."`; chạy tới healthy bắt được thêm lỗi cấu hình/khởi động.
# Dùng: smoke-image.sh <image_ref> [cờ -e cho docker run ...]
set -euo pipefail

ref="${1:?usage: smoke-image.sh <image_ref> [docker run flags...]}"
shift

user="$(docker run --rm --entrypoint whoami "$ref")"
if [ "$user" = root ]; then
  echo "FAIL: image chạy bằng root" >&2
  exit 1
fi
echo "OK: chạy bằng user '$user'"

cid="$(docker run -d "$@" "$ref")"
# Luôn dọn container, kể cả khi lỗi
trap 'docker rm -f "$cid" >/dev/null 2>&1 || true' EXIT

health=starting
for _ in $(seq 1 40); do
  health="$(docker inspect -f '{{.State.Health.Status}}' "$cid")"
  if [ "$health" = healthy ] || [ "$health" = unhealthy ]; then break; fi
  sleep 5
done
echo "health=$health"
if [ "$health" != healthy ]; then
  docker logs --tail 80 "$cid" >&2 || true
  exit 1
fi
