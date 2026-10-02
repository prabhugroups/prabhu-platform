# syntax=docker/dockerfile:1

# ---- builder: resolve and install dependencies into an isolated venv ----
FROM python:3.12-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install -r requirements.txt

# ---- runtime: slim image with only the venv + app code ----
FROM python:3.12-slim AS runtime

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UVICORN_WORKERS=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg62-turbo libwebp7 libheif1 \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home appuser

WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY --chown=appuser:appuser . .
RUN mkdir -p /app/uploads && chown appuser:appuser /app/uploads

USER appuser
EXPOSE 8000

# Migrations + seeding run once per deploy in the compose `migrate` service
# (infra/docker-compose.yml), not on every API start — so restarting or
# scaling the API never races schema changes.
#
# --proxy-headers + FORWARDED_ALLOW_IPS (set in compose) make
# request.client.host the real visitor IP from Traefik's X-Forwarded-For.
# UVICORN_WORKERS is read by uvicorn itself; keep it at 1 unless you accept
# that the in-memory rate limiters (app/core/rate_limit.py) become per-worker.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--no-server-header"]
