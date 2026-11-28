// Jenkins DEV pipeline (lab theo stack công ty). GitHub Actions (.github/workflows) vẫn là pipeline chính;
// file này để học cùng mẫu: pollSCM -> build -> smoke -> push Docker Hub -> deploy qua Portainer API -> Discord.
//
// Giống công ty:   pollSCM, docker build --pull, withRegistry('docker-hub-creds'), Portainer API (X-API-Key),
//                  post { Discord embed, cleanWs }.
// Khác (cải tiến, chỗ công ty còn yếu):
//   1. Có TEST (pytest backend + ai-engine, y như ci.yml) trước khi build. Công ty không có test.
//   2. Có TRIVY chặn CRITICAL đã có bản vá trước khi push. Công ty không quét.
//   3. Smoke chạy tới khi Docker HEALTHCHECK = healthy, không chỉ `import`; kiểm không chạy bằng root.
//   4. Tag bất biến <sha> là tag được deploy; ':dev' chỉ là con trỏ tiện xem, không bao giờ là thứ deploy
//      (công ty deploy ':dev' mutable nên không biết đang chạy commit nào, rollback không rõ ràng).
//   5. Portainer: không `curl -k`; http chỉ chấp nhận trong lab nội bộ (xem scripts/portainer-deploy.sh).
//   6. Cập nhật CẢ stack (fastapi, worker, worker-speaking, ai-engine) bằng stack API thay vì 1 container.
//   7. Smoke SAU deploy bằng chính deploy/smoke-test.sh của production.
//   8. cleanWs đặt ở post.cleanup (chạy SAU success/failure) để script Discord/clean không mất workspace.
// pollSCM (không phải webhook): Jenkins trên laptop, GitHub không gọi vào được. Giá: tối đa 5 phút trễ.
// LƯU Ý: pollSCM chỉ bắt đầu chạy sau khi job đã được chạy tay ít nhất một lần.

pipeline {
  agent any

  triggers { pollSCM('H/5 * * * *') }

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '30'))
    timeout(time: 90, unit: 'MINUTES')
  }

  // ---- Cấu hình ở đầu file. Giá trị lấy từ biến môi trường global của Jenkins (jenkins/casc.yaml <- jenkins/.env) ----
  environment {
    REGISTRY_USER         = "${env.DOCKERHUB_USER}"          // user Docker Hub, ảnh = <user>/ielts-backend
    PORTAINER_URL         = "${env.PORTAINER_URL}"           // lab: http://portainer:9000 ; Droplet: https://... (Cloudflare Access)
    PORTAINER_STACK       = "${env.PORTAINER_STACK}"         // tên stack, chữ thường (lab: ielts-lab)
    PORTAINER_ENDPOINT_ID = "${env.PORTAINER_ENDPOINT_ID}"   // id environment trong Portainer (local thường là 1)
    // Env giả đủ để container khởi động tới healthy (cùng bộ với deploy.yml)
    BACKEND_SMOKE_ENV     = '-e SUPABASE_URL=https://ci-dummy.supabase.invalid -e SUPABASE_KEY=ci-dummy -e SUPABASE_JWT_SECRET=ci-dummy-jwt-secret-0123456789abcdef -e AI_ENGINE_SECRET=ci-dummy'
    ENGINE_SMOKE_ENV      = '-e ALLOW_NO_SECRET=true -e SPEECH_PRELOAD_MODELS=false'
    PYTHON_IMAGE          = 'python:3.11-slim'                                      // khớp image production
    UV_IMAGE              = 'ghcr.io/astral-sh/uv:0.7.14-python3.11-bookworm-slim' // khớp uv trong ai-engine/Dockerfile
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          if (!env.REGISTRY_USER || env.REGISTRY_USER == 'null' || env.REGISTRY_USER == 'changeme') {
            error 'Chưa đặt DOCKERHUB_USER trong jenkins/.env (xem jenkins/README.md)'
          }
          env.GIT_SHA = sh(returnStdout: true, script: 'git rev-parse HEAD').trim()
          env.BACKEND_REF = "${env.REGISTRY_USER}/ielts-backend"
          env.ENGINE_REF = "${env.REGISTRY_USER}/ielts-ai-engine"
          currentBuild.description = "sha ${env.GIT_SHA.take(8)}"
          echo "Commit ${env.GIT_SHA}"
        }
      }
    }

    // Chạy pytest trong container như ci.yml. --volumes-from <chính Jenkins> để container test thấy cùng workspace
    // (Jenkins là container, daemon ở bên ngoài, nên -v $WORKSPACE:... sẽ trỏ sai đường dẫn).
    stage('Test') {
      parallel {
        stage('Backend pytest') {
          steps {
            sh '''
              mkdir -p "$JENKINS_HOME/.cache/pip"
              docker run --rm --volumes-from "$(hostname)" -w "$WORKSPACE/backend" \
                --user "$(id -u):$(id -g)" -e HOME=/tmp -e PYTHONDONTWRITEBYTECODE=1 \
                -e PIP_CACHE_DIR="$JENKINS_HOME/.cache/pip" \
                -e SUPABASE_URL=https://ci-dummy.supabase.invalid -e SUPABASE_KEY=ci-dummy-supabase-key \
                -e SUPABASE_JWT_SECRET=ci-dummy-jwt-secret-0123456789abcdef -e AI_ENGINE_SECRET=ci-dummy-engine-secret \
                "$PYTHON_IMAGE" sh -ec '
                  python -m venv /tmp/venv && . /tmp/venv/bin/activate
                  pip install -q -r requirements.txt
                  python -m pytest tests -q -p no:cacheprovider'
            '''
          }
        }
        stage('AI engine pytest') {
          steps {
            // Bỏ torch + triton + toàn bộ gói CUDA/nvidia (test không cần, tiết kiệm hàng GB) -- y hệt ci.yml
            sh '''
              mkdir -p "$JENKINS_HOME/.cache/uv"
              docker run --rm --volumes-from "$(hostname)" -w "$WORKSPACE/ai-engine" \
                --user "$(id -u):$(id -g)" -e HOME=/tmp -e PYTHONDONTWRITEBYTECODE=1 \
                -e UV_CACHE_DIR="$JENKINS_HOME/.cache/uv" -e UV_LINK_MODE=copy -e UV_PROJECT_ENVIRONMENT=/tmp/venv \
                "$UV_IMAGE" sh -ec '
                  uv sync --frozen \
                    --no-install-package torch --no-install-package triton \
                    --no-install-package cuda-bindings --no-install-package cuda-pathfinder \
                    --no-install-package cuda-toolkit \
                    --no-install-package nvidia-cublas --no-install-package nvidia-cuda-cccl \
                    --no-install-package nvidia-cuda-cupti --no-install-package nvidia-cuda-nvrtc \
                    --no-install-package nvidia-cuda-runtime --no-install-package nvidia-cudnn-cu13 \
                    --no-install-package nvidia-cufft --no-install-package nvidia-cufile \
                    --no-install-package nvidia-cusolver --no-install-package nvidia-cusparse \
                    --no-install-package nvidia-cusparselt-cu13 --no-install-package nvidia-nccl-cu13 \
                    --no-install-package nvidia-nvjitlink --no-install-package nvidia-nvshmem-cu13 \
                    --no-install-package nvidia-nvtx
                  uv run --frozen --no-sync pytest tests -q -p no:cacheprovider'
            '''
          }
        }
      }
    }

    // --pull: luôn lấy base image mới (bản vá OS). Build lần lượt (không song song) để khỏi vượt RAM Docker Desktop.
    stage('Build') {
      steps {
        sh '''
          docker build --pull -t "$BACKEND_REF:$GIT_SHA" -t "$BACKEND_REF:dev" backend
          docker build --pull --build-arg TORCH_VARIANT=cpu -t "$ENGINE_REF:$GIT_SHA" -t "$ENGINE_REF:dev" ai-engine
        '''
      }
    }

    stage('Smoke image') {
      steps {
        // Không để $BACKEND_SMOKE_ENV trong dấu nháy: cố ý tách thành nhiều cờ -e
        sh '''
          # shellcheck disable=SC2086
          jenkins/scripts/smoke-image.sh "$BACKEND_REF:$GIT_SHA" $BACKEND_SMOKE_ENV
          # shellcheck disable=SC2086
          jenkins/scripts/smoke-image.sh "$ENGINE_REF:$GIT_SHA" $ENGINE_SMOKE_ENV
        '''
      }
    }

    stage('Trivy') {
      steps {
        sh '''
          jenkins/scripts/trivy-scan.sh "$BACKEND_REF:$GIT_SHA"
          jenkins/scripts/trivy-scan.sh "$ENGINE_REF:$GIT_SHA"
        '''
      }
    }

    // Chỉ tới đây (test, smoke, scan đều xanh) image mới lên registry. Đẩy <sha> trước, ':dev' sau cùng.
    stage('Push Docker Hub') {
      steps {
        script {
          docker.withRegistry('https://index.docker.io/v1/', 'docker-hub-creds') {
            sh '''
              docker push "$BACKEND_REF:$GIT_SHA"
              docker push "$ENGINE_REF:$GIT_SHA"
              docker push "$BACKEND_REF:dev"
              docker push "$ENGINE_REF:dev"
            '''
          }
        }
      }
    }

    // Deploy tag <sha> (bất biến) cho cả stack. Xem jenkins/scripts/portainer-deploy.sh để biết API dùng.
    stage('Deploy Portainer') {
      steps {
        withCredentials([string(credentialsId: 'portainer-api-key', variable: 'PORTAINER_API_KEY')]) {
          withEnv(["IMAGE_TAG=${env.GIT_SHA}"]) {
            sh 'jenkins/scripts/portainer-deploy.sh'
          }
        }
      }
    }

    stage('Post-deploy smoke') {
      steps {
        sh 'jenkins/scripts/post-deploy-smoke.sh "$PORTAINER_STACK" "$GIT_SHA"'
      }
    }
  }

  post {
    success { script { notifyDiscord('success') } }
    failure { script { notifyDiscord('failure') } }
    // cleanup chạy SAU always/success/failure (khác với always); dọn image local để khỏi đầy ổ đĩa.
    cleanup {
      sh 'docker rmi "$BACKEND_REF:$GIT_SHA" "$BACKEND_REF:dev" "$ENGINE_REF:$GIT_SHA" "$ENGINE_REF:dev" || true'
      cleanWs()
    }
  }
}

// Discord embed (giống công ty). Webhook lấy từ credential 'discord-webhook-token' (URL đầy đủ, hoặc phần id/token).
// Lỗi gửi Discord không làm hỏng build. Lặp lại ở jenkins/Jenkinsfile.release (2 file độc lập, không dùng shared library).
def notifyDiscord(String status) {
  def ok = status == 'success'
  withCredentials([string(credentialsId: 'discord-webhook-token', variable: 'DISCORD_HOOK')]) {
    withEnv([
      "D_TITLE=${ok ? 'IELTS Grader DEV: deploy thành công' : 'IELTS Grader DEV: thất bại'}",
      "D_COLOR=${ok ? 3066993 : 15158332}",
      "D_DESC=Commit `${(env.GIT_SHA ?: 'unknown').take(8)}` - build #${env.BUILD_NUMBER} - [Xem log](${env.BUILD_URL})"
    ]) {
      sh '''
        set +x
        case "$DISCORD_HOOK" in
          changeme|"") echo "Chưa cấu hình DISCORD_WEBHOOK, bỏ qua"; exit 0 ;;
          http*) url="$DISCORD_HOOK" ;;
          *) url="https://discord.com/api/webhooks/$DISCORD_HOOK" ;;
        esac
        jq -n --arg t "$D_TITLE" --arg d "$D_DESC" --argjson c "$D_COLOR" \
          '{embeds: [{title: $t, description: $d, color: $c}]}' \
          | curl -sS -H "Content-Type: application/json" -X POST -d @- "$url" >/dev/null || echo "Gửi Discord lỗi (bỏ qua)"
      '''
    }
  }
}
