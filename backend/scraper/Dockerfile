# syntax=docker/dockerfile:1.7

# Playwright's official image ships Chromium + OS deps; lets us flip
# SCRAPER_USE_BROWSER=true without extra install steps.
FROM mcr.microsoft.com/playwright/python:v1.47.0-jammy

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    UV_SYSTEM_PYTHON=1

WORKDIR /app

# Install uv (fast Python package manager)
RUN pip install --no-cache-dir uv

# Install deps first for better layer caching
COPY pyproject.toml README.md ./
RUN uv sync --no-dev

COPY scraper_service.py ./

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8000/health >/dev/null || exit 1

CMD ["uv", "run", "uvicorn", "scraper_service:app", "--host", "0.0.0.0", "--port", "8000"]
