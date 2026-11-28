#!/usr/bin/env bash
# Quét lỗ hổng image bằng Trivy (chạy trong container, không cài vào Jenkins).
# Chặn CRITICAL đã có bản vá; lỗ hổng chưa có bản vá không chặn (không sửa được) -- giống deploy.yml.
# Công ty chưa có bước quét này. Dùng: trivy-scan.sh <image_ref>
set -euo pipefail

ref="${1:?usage: trivy-scan.sh <image_ref>}"
trivy_image="${TRIVY_IMAGE:-aquasec/trivy:0.76.2}"

# Image nằm trong daemon local nên mount docker.sock; volume trivy-cache giữ DB lỗ hổng giữa các lần chạy.
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v trivy-cache:/root/.cache/trivy \
  "$trivy_image" image \
  --scanners vuln --severity CRITICAL --ignore-unfixed --exit-code 1 --no-progress "$ref"
