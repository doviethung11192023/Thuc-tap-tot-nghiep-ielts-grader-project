# AI engine image (FastAPI, port 8001). Build args:
#   TORCH_VARIANT=cpu (default) | cuda
# cpu: torch comes from the PyTorch CPU index at the version pinned in uv.lock; the CUDA runtime wheels
# (nvidia-*, cuda-*, triton) that uv.lock would pull from PyPI are skipped, which saves several GB.
# Not baked in: data/reference_corpus (mount it read-only at /app/data/reference_corpus).

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

ARG TORCH_VARIANT=cpu

COPY --from=ghcr.io/astral-sh/uv:0.7.14 /uv /usr/local/bin/uv

ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1

WORKDIR /app

COPY pyproject.toml uv.lock ./

RUN set -eu; \
    if [ "$TORCH_VARIANT" = "cpu" ]; then \
        TORCH_VER="$(awk '/^name = "torch"$/{getline; print $3; exit}' uv.lock | tr -d '\"')"; \
        SKIP="$(grep -oE '^name = "(nvidia-[^"]+|cuda-[^"]+|triton)"' uv.lock | cut -d'"' -f2 | sort -u | sed 's/^/--no-install-package /' | tr '\n' ' ')"; \
        uv sync --frozen --no-dev --no-install-package torch $SKIP; \
        uv pip install --python /app/.venv/bin/python --no-deps "torch==${TORCH_VER}" \
            --index-url https://download.pytorch.org/whl/cpu; \
    elif [ "$TORCH_VARIANT" = "cuda" ]; then \
        uv sync --frozen --no-dev; \
    else \
        echo "TORCH_VARIANT must be cpu or cuda" >&2; exit 1; \
    fi

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

# espeak-ng ships inside espeakng-loader and audio decoding uses PyAV (wheels bundle ffmpeg), so no other system packages are needed.
RUN apt-get update && apt-get upgrade -y && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir --upgrade pip setuptools wheel

# Non-root user; HOME holds the Hugging Face cache (mount a volume on /home/app/.cache to persist)
RUN groupadd --gid 10001 app \
    && useradd --uid 10001 --gid 10001 --create-home --home-dir /home/app --shell /usr/sbin/nologin app \
    && mkdir -p /home/app/.cache/huggingface /app/logs \
    && chown -R app:app /home/app /app

ENV HOME=/home/app \
    HF_HOME=/home/app/.cache/huggingface \
    PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8001

WORKDIR /app

COPY --from=builder --chown=app:app /app/.venv /app/.venv
# Source (see .dockerignore: no .env, tests, scripts, data)
COPY --chown=app:app . .

USER app

EXPOSE 8001

# start-period is long because Speaking models may be preloaded and downloaded on first start
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD ["python", "-c", "import os,sys,urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:%s/health' % os.environ.get('PORT','8001'), timeout=4).status == 200 else 1)"]

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001} --log-level info"]
