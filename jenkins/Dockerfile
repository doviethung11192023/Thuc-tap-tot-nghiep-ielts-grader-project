# Jenkins cho lab: LTS ghim phiên bản + docker CLI (nói chuyện với daemon qua socket) + plugin khai báo bằng code.
# Build: docker build -t ielts-jenkins:lab jenkins
FROM jenkins/jenkins:2.580.3-lts-jdk21

USER root

# Chỉ lấy CLIENT (docker, buildx, compose) từ image docker:cli, không cài daemon.
COPY --from=docker:27.4.1-cli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker:27.4.1-cli /usr/local/libexec/docker/cli-plugins/docker-buildx /usr/local/libexec/docker/cli-plugins/docker-buildx
COPY --from=docker:27.4.1-cli /usr/local/libexec/docker/cli-plugins/docker-compose /usr/local/libexec/docker/cli-plugins/docker-compose

# jq: dựng JSON cho Portainer/Discord; curl có sẵn trong base nhưng khai báo rõ để không phụ thuộc ngầm.
RUN apt-get update \
    && apt-get install -y --no-install-recommends jq curl \
    && rm -rf /var/lib/apt/lists/*

USER jenkins

# Plugin: danh sách trong plugins.txt (ghim phiên bản) -> build lại image là có đúng bộ plugin đó.
COPY --chown=jenkins:jenkins plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

# Jenkins Configuration as Code: cấu hình nằm trong file, không bấm trong UI.
COPY --chown=jenkins:jenkins casc.yaml /usr/share/jenkins/casc/casc.yaml
ENV CASC_JENKINS_CONFIG=/usr/share/jenkins/casc/casc.yaml \
    JAVA_OPTS="-Djenkins.install.runSetupWizard=false"
