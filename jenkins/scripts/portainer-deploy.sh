#!/usr/bin/env bash
# Cập nhật (hoặc tạo lần đầu) stack Portainer để cả stack kéo image tag mới.
# Công ty: tạo lại 1 container qua API với {"pullImage": true}. Ở đây dùng API STACK của Portainer CE:
#   GET  /api/stacks                                          -> tìm stack theo tên + endpoint
#   PUT  /api/stacks/{id}?endpointId={e}                      -> stackFileContent + env + prune + pullImage
#   POST /api/stacks/create/standalone/string?endpointId={e}  -> tạo mới (lần đầu)
# nên fastapi, worker, worker-speaking, ai-engine cùng lên tag mới, và rollback = gọi lại với tag cũ.
#
# Biến bắt buộc: PORTAINER_URL PORTAINER_API_KEY PORTAINER_STACK PORTAINER_ENDPOINT_ID REGISTRY_USER IMAGE_TAG
# Tuỳ chọn: STACK_FILE (mặc định jenkins/lab-stack.yml)
# TLS: KHÔNG dùng curl -k. http:// chỉ được chấp nhận với host nội bộ lab (portainer/localhost/127.0.0.1);
# Droplet (J2) phải là https:// có chứng chỉ hợp lệ (Cloudflare Tunnel + Access).
set -euo pipefail

: "${PORTAINER_URL:?}" "${PORTAINER_API_KEY:?}" "${PORTAINER_STACK:?}" "${PORTAINER_ENDPOINT_ID:?}"
: "${REGISTRY_USER:?}" "${IMAGE_TAG:?}"
stack_file="${STACK_FILE:-jenkins/lab-stack.yml}"
base="${PORTAINER_URL%/}"

[[ "$IMAGE_TAG" =~ ^[A-Za-z0-9_.-]{1,128}$ ]] || { echo "IMAGE_TAG không hợp lệ" >&2; exit 1; }
case "$base" in
  https://*) ;;
  http://portainer:* | http://localhost:* | http://127.0.0.1:*) echo "CẢNH BÁO: HTTP không mã hoá, chỉ chấp nhận trong lab" ;;
  *) echo "PORTAINER_URL phải là https:// (http chỉ cho portainer/localhost)" >&2; exit 1 ;;
esac

api() { curl -sS --fail-with-body --max-time 300 -H "X-API-Key: ${PORTAINER_API_KEY}" "$@"; }

stack_id="$(api "$base/api/stacks" \
  | jq -r --arg n "$PORTAINER_STACK" --argjson e "$PORTAINER_ENDPOINT_ID" \
      '[.[] | select(.Name == $n and .EndpointId == $e)][0].Id // empty')"

env_json="$(jq -n --arg tag "$IMAGE_TAG" --arg user "$REGISTRY_USER" \
  '[{name: "IMAGE_TAG", value: $tag}, {name: "REGISTRY_USER", value: $user}]')"

if [ -n "$stack_id" ]; then
  echo "Cập nhật stack '$PORTAINER_STACK' (id=$stack_id) lên tag $IMAGE_TAG"
  # prune: xoá service không còn trong file; pullImage: ép kéo lại image (tag đổi nên bắt buộc có tag mới)
  jq -n --rawfile f "$stack_file" --argjson env "$env_json" \
    '{stackFileContent: $f, env: $env, prune: true, pullImage: true}' \
    | api -X PUT -H "Content-Type: application/json" -d @- \
        "$base/api/stacks/${stack_id}?endpointId=${PORTAINER_ENDPOINT_ID}" >/dev/null
else
  echo "Chưa có stack '$PORTAINER_STACK': tạo mới với tag $IMAGE_TAG"
  jq -n --rawfile f "$stack_file" --argjson env "$env_json" --arg name "$PORTAINER_STACK" \
    '{name: $name, stackFileContent: $f, env: $env}' \
    | api -X POST -H "Content-Type: application/json" -d @- \
        "$base/api/stacks/create/standalone/string?endpointId=${PORTAINER_ENDPOINT_ID}" >/dev/null
fi
echo "Portainer đã nhận lệnh deploy tag $IMAGE_TAG"
