#!/usr/bin/env bash
# Dựng droplet Ubuntu 24.04 một lần, chạy bằng root. Chạy lại được (idempotent).
# Dùng:  sudo ./bootstrap-vps.sh "ssh-ed25519 AAAA... comment"
#   hoặc DEPLOY_SSH_KEY="ssh-ed25519 ..." sudo -E ./bootstrap-vps.sh
# Làm: user deploy (nhóm docker, khoá SSH), sshd chỉ khoá + cấm root, ufw chỉ 22, fail2ban,
#      unattended-upgrades, Docker Engine (repo chính thức), swap 2 GB, /srv/ielts.
# CẢNH BÁO: sau khi chạy, đăng nhập root/mật khẩu bị tắt. Thử `ssh deploy@host` ở cửa sổ khác
# TRƯỚC KHI đóng phiên hiện tại; nếu hỏng, dùng Recovery Console của DigitalOcean.
set -euo pipefail

log() { printf '%s [bootstrap] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
die() { log "ERROR: $*"; exit 1; }

[[ $EUID -eq 0 ]] || die "cần chạy bằng root"
# shellcheck disable=SC1091
[[ -r /etc/os-release ]] && . /etc/os-release
[[ "${ID:-}" == "ubuntu" ]] || die "chỉ hỗ trợ Ubuntu (đang là ${ID:-?})"

DEPLOY_USER="${DEPLOY_USER:-deploy}"
SWAP_SIZE_GB="${SWAP_SIZE_GB:-2}"
IELTS_DIR="${IELTS_DIR:-/srv/ielts}"
KEY="${1:-${DEPLOY_SSH_KEY:-}}"
export DEBIAN_FRONTEND=noninteractive

# Khoá SSH là bắt buộc: không có thì tắt mật khẩu sẽ tự khoá mình ngoài máy
if [[ -z "$KEY" ]]; then
  # Cho phép chạy lại khi user deploy đã có khoá
  [[ -s "/home/$DEPLOY_USER/.ssh/authorized_keys" ]] || die "thiếu khoá công khai SSH (đối số 1 hoặc DEPLOY_SSH_KEY)"
fi
if [[ -n "$KEY" && ! "$KEY" =~ ^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp[0-9]+)\  ]]; then
  die "khoá công khai SSH không hợp lệ"
fi

# --- 1. Gói cơ bản ---
log "cập nhật apt và cài gói cơ bản"
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg ufw fail2ban unattended-upgrades

# --- 2. User deploy ---
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  log "tạo user $DEPLOY_USER"
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
AUTH="/home/$DEPLOY_USER/.ssh/authorized_keys"
touch "$AUTH"
if [[ -n "$KEY" ]] && ! grep -qxF "$KEY" "$AUTH"; then
  echo "$KEY" >> "$AUTH"
  log "đã thêm khoá SSH cho $DEPLOY_USER"
fi
chmod 600 "$AUTH"
chown "$DEPLOY_USER:$DEPLOY_USER" "$AUTH"

# --- 3. Docker Engine (repo chính thức) ---
if ! command -v docker >/dev/null 2>&1; then
  log "cài Docker Engine"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
if [[ ! -f /etc/docker/daemon.json ]]; then
  cat > /etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
JSON
  systemctl restart docker
fi
systemctl enable --now docker
# Lưu ý: ai trong nhóm docker coi như có quyền root trên máy; chỉ user deploy (khoá SSH riêng cho CD) ở trong đó
usermod -aG docker "$DEPLOY_USER"

# --- 4. sshd: chỉ khoá, cấm root ---
# File 00- được đọc trước 50-cloud-init.conf (nơi cloud-init có thể bật PasswordAuthentication)
log "siết sshd"
cat > /etc/ssh/sshd_config.d/00-hardening.conf <<EOF
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 30
AllowUsers $DEPLOY_USER
X11Forwarding no
EOF
sshd -t || die "cấu hình sshd lỗi, không reload"
systemctl reload ssh

# --- 5. Tường lửa: chặn mọi thứ vào trừ SSH (Cloudflare Tunnel đi ra, không cần 80/443) ---
log "cấu hình ufw"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw --force enable

# --- 6. fail2ban ---
cat > /etc/fail2ban/jail.d/sshd.local <<'EOF'
[sshd]
enabled = true
maxretry = 4
findtime = 10m
bannime = 1h
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

# --- 7. Tự cập nhật bản vá bảo mật ---
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
systemctl enable --now unattended-upgrades

# --- 8. Swap ---
if ! swapon --show=NAME --noheadings | grep -q '^/swapfile$'; then
  log "tạo swap ${SWAP_SIZE_GB} GB"
  [[ -f /swapfile ]] || { fallocate -l "${SWAP_SIZE_GB}G" /swapfile; chmod 600 /swapfile; mkswap /swapfile >/dev/null; }
  swapon /swapfile
fi
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
sysctl -q -p /etc/sysctl.d/99-swappiness.conf

# --- 9. Thư mục triển khai ---
log "tạo $IELTS_DIR"
install -d -m 750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$IELTS_DIR" "$IELTS_DIR/deploy" "$IELTS_DIR/reference_corpus"
for f in backend.env ai-engine.env compose.env; do
  [[ -e "$IELTS_DIR/$f" ]] || install -m 600 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /dev/null "$IELTS_DIR/$f"
  chmod 600 "$IELTS_DIR/$f"
  chown "$DEPLOY_USER:$DEPLOY_USER" "$IELTS_DIR/$f"
done

log "XONG. Bước tiếp: điền 3 file env trong $IELTS_DIR, rsync reference_corpus, rồi chạy CD."
log "Kiểm: ufw status; sshd -T | grep -Ei 'passwordauth|permitroot'; docker --version"
