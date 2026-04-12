# pfe-scraper

FastAPI microservice for social-media + generic-web scraping. Runs as a sidecar
next to the Node backend.

## Prerequisites

- Python ≥ 3.11
- [`uv`](https://docs.astral.sh/uv/) (install with `pipx install uv` or `winget install astral-sh.uv`)

## Run (local dev)

```bash
cd backend/scraper
uv sync                           # installs HTTP-only deps
uv run uvicorn scraper_service:app --reload --port 8000
```

Then hit `http://localhost:8000/health`.

### With real browser automation

```bash
uv sync --extra browser           # adds Playwright + Crawl4AI
uv run playwright install chromium
SCRAPER_USE_BROWSER=true uv run uvicorn scraper_service:app --reload --port 8000
```

## API

| Method | Path       | Purpose                                        |
|--------|------------|------------------------------------------------|
| GET    | `/health`  | Liveness + mode info                           |
| POST   | `/scrape`  | Fetch a URL, parse HTML, extract by CSS sels   |

### Example

```bash
curl -X POST http://localhost:8000/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","selectors":{"headings":"h1"}}'
```

## Env vars

| Var                      | Default   | Purpose                               |
|--------------------------|-----------|---------------------------------------|
| `SCRAPER_HOST`           | `0.0.0.0` | Bind address                          |
| `SCRAPER_PORT`           | `8000`    | Bind port                             |
| `SCRAPER_RELOAD`         | `true`    | Enable uvicorn auto-reload            |
| `SCRAPER_USE_BROWSER`    | `false`   | Switch to Playwright for rendering    |
