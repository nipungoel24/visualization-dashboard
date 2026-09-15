# InsightScope — Global Intelligence Dashboard

A data intelligence dashboard that visualizes 1,000 global intelligence records through a strict data pipeline:

```
jsondata.json → validation/normalization → MongoDB → FastAPI → Next.js → D3 visualizations
```

The browser never loads the raw JSON. All dashboard data comes from the backend API backed by MongoDB.

---

## Screenshots

### Desktop (1440x900)

![Dashboard — Desktop](docs/screenshots/desktop-1440x900-dashboard.png)

### Filtered View — Topic: "oil"

![Dashboard — Filtered](docs/screenshots/desktop-1440x900-filtered-oil.png)

### Mobile (390x844)

![Dashboard — Mobile](docs/screenshots/mobile-390x844-dashboard.png)

### More screenshots

- [Tablet 1024x768](docs/screenshots/tablet-1024x768-dashboard.png)
- [Tablet — Filtered](docs/screenshots/tablet-1024x768-filtered-oil.png)
- [Mobile — Filtered](docs/screenshots/mobile-390x844-filtered-oil.png)

---

**Project control files**: `PRD.md`, `Architecture.md`, `Rules.md`, `Phases.md`, `Design.md`.
Current execution state: `Memory.md`.

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

Set `NEXT_PUBLIC_API_BASE_URL` in `.env` if the API runs elsewhere.

## 7. Verification commands

### Backend

```sh
cd apps/api
uv run ruff format --check .      # formatting
uv run ruff check .               # lint
uv run pyright                    # type checking
uv run pytest                     # unit tests (always run)
MONGODB_TEST_URI=mongodb://localhost:27017 uv run pytest   # + integration tests (Mongo up)
```

### Frontend

```sh
cd apps/web
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

### End-to-end (full stack)

```sh
cd apps/web
pnpm test:e2e          # runs scripts/run-e2e.mjs: Mongo -> seed -> FastAPI -> Next.js build -> Playwright
# or for headed mode:
pnpm test:e2e:headed
```

The E2E orchestration:
1. Verifies ports 3001 and 8000 are free
2. Starts MongoDB via Docker Compose and waits for healthy
3. Seeds the database (validates SHA-256, imports 1,000 records into `insightscope_e2e`)
4. Builds the production frontend (with `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`)
5. Runs Playwright tests — Playwright owns the FastAPI and Next.js lifecycle via `webServer` config

## 8. Troubleshooting

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

## Dataset integrity

- **Source**: `data/raw/jsondata.json` (immutable, git-tracked)
- **SHA-256**: `f45b67f7d4a252c5daa3ec0dfd9c7ceb4e415106c404646f66bff93d9aeb1744`
- **Records**: 1,000
- **Fields**: 17 (end_year, intensity, sector, topic, insight, url, region, start_year, impact, added, published, country, relevance, pestle, source, title, likelihood)
- **City/SWOT**: NOT present in source dataset; filters exist but are disabled with explanation "Not present in supplied dataset"
- **MongoDB record count after seed**: 1,000

## Accessibility approach

- WCAG 2.2 AA targeting: semantic landmarks, keyboard-operable controls, visible focus, contrast, reduced-motion support
- Interactive charts use composite widget pattern (`role="listbox"` + `role="option"`) with roving focus via `aria-activedescendant`
- `@axe-core/playwright` scans in E2E suite; zero critical/serious violations required
- All Morphicons use `reducedMotion="user"`

## Testing overview

- **Backend**: 113 tests (61 unit, 52 integration with MongoDB); 0 failures
- **Frontend**: 151 Vitest unit/component tests; 0 failures
- **E2E**: 94 Playwright tests (smoke, records, accessibility, security, a11y audit); zero console errors, zero axe critical/serious violations

## Security notes

- No `.env` or credentials committed; `.env.example` only contains safe defaults
- CORS restricted to `ALLOWED_ORIGINS`
- External links only `http:`/`https:` with `rel="noopener noreferrer"`
- Unknown query parameters rejected with 422
- No raw Mongo operators accepted from clients
- Error responses never leak stack traces or internal details
- Frontend bundle does not contain `jsondata.json` or secrets