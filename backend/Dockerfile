# Core API image (FastAPI, port 8000). The same image runs the arq workers:
# compose overrides the command (arq app.worker.tasks.WorkerSettings / SpeakingWorkerSettings) and the healthcheck.
FROM python:3.11-slim

# Vá lỗ hổng gói hệ điều hành và công cụ pip đi kèm image gốc (Trivy báo libzstd1, wheel, jaraco.context)
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir --upgrade pip setuptools wheel

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HOME=/home/app

# Non-root user. /app/uploads is the local fallback dir for media when R2 is not configured.
RUN groupadd --gid 10001 app \
    && useradd --uid 10001 --gid 10001 --create-home --home-dir /home/app --shell /usr/sbin/nologin app \
    && mkdir -p /app/uploads \
    && chown -R app:app /app /home/app

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=app:app app/ ./app/

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["python", "-c", "import sys,urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status == 200 else 1)"]

# sh -c so WEB_CONCURRENCY expands; behind Cloudflare Tunnel / compose network, trust forwarded headers
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${WEB_CONCURRENCY:-2} --proxy-headers --forwarded-allow-ips='*'"]
