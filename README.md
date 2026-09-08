# InsightScope — Global Intelligence Dashboard

`blackcoffer-visualization-dashboard`

InsightScope is a data intelligence dashboard that visualizes the supplied `jsondata.json`
dataset (1,000 records) through a strict data pipeline:

```
jsondata.json -> validation/normalization -> MongoDB -> FastAPI -> Next.js -> D3 visualizations
```

The browser never loads the raw JSON; after seeding, all dashboard data comes from the backend
API backed by MongoDB.

**Project control files** (read these first): `PRD.md`, `Architecture.md`, `Rules.md`,
`Phases.md`, `Design.md`. Current execution state: `Memory.md`.

> Status: Phase 2 (filtering/analytics API) complete. Frontend arrives in Phase 3.
> This README documents the reproducible developer setup.

## Prerequisites

- Docker (for local MongoDB)
- Node.js >= 22 and pnpm >= 11
- uv >= 0.9 (Python toolchain; Python 3.13 is installed automatically by `uv sync`)
- MongoDB shell `mongosh` (optional, for direct database inspection)

## 1. Environment setup

```sh
cp .env.example .env
```

Defaults target local development (`mongodb://localhost:27017`, database `insightscope`).
`.env` is git-ignored; never commit secrets.

## 2. Install dependencies

```sh
cd apps/api && uv sync          # creates .venv with Python 3.13 + locked deps (uv.lock)
cd ../web && pnpm install       # locked via pnpm-lock.yaml
```

## 3. Start MongoDB

```sh
docker compose up -d            # mongo:8.0 on port 27017, named volume, healthcheck
docker compose ps               # wait for "healthy"
```

## 4. Seed the dataset

```sh
cd apps/api
uv run python -m app.seed       # defaults to ../../data/raw/jsondata.json
```

The seed validates the entire dataset (schema, types, record count, pinned SHA-256) before
touching the database, normalizes it (blank strings -> `null`, whitespace trimmed, unusual
values preserved), imports 1,000 documents with deterministic ids
(`sha256("<dataset_sha256>:<source_row_index>")`), creates 11 indexes, and writes dataset
metadata. Re-running is idempotent: the second run still reports 1,000 documents and removes 0.

## 5. Start the backend API

```sh
cd apps/api
uv run uvicorn app.main:app --reload --port 8000
```

- `GET http://localhost:8000/api/v1/health` — process liveness.
- `GET http://localhost:8000/api/v1/ready` — MongoDB connectivity + seeded dataset check.
- `GET http://localhost:8000/api/v1/meta` — dataset metadata and schema.
- `GET http://localhost:8000/api/v1/overview?topic=oil` — dashboard overview (single `$facet`).
- `GET http://localhost:8000/api/v1/facets?topic=oil` — filter options (scoped).
- `GET http://localhost:8000/api/v1/records?page=1&page_size=25` — paginated records.

## 6. Start the frontend

```sh
cd apps/web
pnpm dev                         # http://localhost:3000
```

Phase 1 serves a minimal development status screen that checks `/health` and `/ready` against
the backend. Set `NEXT_PUBLIC_API_BASE_URL` in `.env` if the API runs elsewhere.

## 7. Verification commands

Backend:

```sh
cd apps/api
uv run ruff format --check .      # formatting
uv run ruff check .               # lint
uv run pyright                    # type checking
uv run pytest                     # unit tests (always run)
MONGODB_TEST_URI=mongodb://localhost:27017 uv run pytest   # + integration tests (Mongo up)
```

Frontend:

```sh
cd apps/web
pnpm lint
pnpm typecheck
pnpm build
```

## Troubleshooting

- **Port conflicts**: if `3000` is busy, Next.js picks the next free port; add that origin to
  `ALLOWED_ORIGINS` in `.env` so CORS permits browser requests.
- **Inspect MongoDB directly**: `docker exec insightscope-mongo mongosh --quiet insightscope`
  (e.g. `db.insights.countDocuments()`, `db.dataset_meta.findOne()`).
- **Reset everything**: `docker compose down -v && docker compose up -d`, then seed again.
- **Seed refuses to run**: hash mismatch or validation failure means the source file changed
  from the pinned version (`f45b67f7…aeb1744`) — the database is left untouched.

## Repository layout

```
apps/api        FastAPI backend (Python 3.13, uv): seed, health/ready/meta/facets/overview/records, normalization, Pyright
apps/web        Next.js 16.3.3 frontend (pnpm, TypeScript strict, Tailwind 4)
data/raw/       Immutable source dataset (pinned SHA-256)
reference/      Original assignment document
docker-compose.yml  Local MongoDB (mongo:8.0, named volume, healthcheck)
```
