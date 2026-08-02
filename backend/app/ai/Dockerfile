# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy dependency files first (layer cache)
COPY pyproject.toml uv.lock ./

# Install dependencies into /app/.venv (no dev deps)
RUN uv sync --frozen --no-dev

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

# System deps for language-tool-python (requires Java) and spacy
RUN apt-get update && apt-get install -y --no-install-recommends \
    default-jre-headless \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy venv from builder
COPY --from=builder /app/.venv /app/.venv

# Copy source code (excluding files in .dockerignore)
COPY . .

# Add venv to PATH
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Download spacy model at build time (so it's baked into image)
RUN python -m spacy download en_core_web_sm

# Railway injects PORT automatically; default 8000 for local testing
ENV PORT=8000

EXPOSE $PORT

# Start FastAPI server (no ngrok on Railway — Railway provides the public URL)
CMD ["sh", "-c", "uvicorn serve:app --host 0.0.0.0 --port $PORT --log-level info"]
