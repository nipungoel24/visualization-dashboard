# Memory — InsightScope: Global Intelligence Dashboard

Execution-state summary. Never overrides PRD/Architecture/Rules/Phases/Design — those files are
authoritative. Read them first in every new session.

---

## Project status

- Project: InsightScope — Global Intelligence Dashboard (`blackcoffer-visualization-dashboard`)
- Current approved phase: **Phase 1 — Reproducible Project Foundation, MongoDB, Data Import** (authorized 2026-09-08)
- Phase 0: **APPROVED**
- **Phase 1: COMPLETE — completion report delivered, awaiting user approval of Phase 2.**
- **Phase 2 is NOT authorized.** No analytics endpoints, filters, aggregations, or dashboard work.

## Source dataset

- Path: `data/raw/jsondata.json` (immutable, git-tracked)
- SHA-256: `f45b67f7d4a252c5daa3ec0dfd9c7ceb4e415106c404646f66bff93d9aeb1744` (re-verified at Phase 1 start)
- Profile: 1,000 records; 17 fields; 97 topics; 18 sectors; 23 regions; 56 countries; 9 PESTLE;
  403 sources; no duplicates; 670 unique URLs.
- Anomalies preserved by policy: blank-string-as-missing; extreme `end_year` (2126, 2200);
  case-distinct `World`(131)/`world`(1); trailing whitespace in 16 `source` values (trimmed);
  non-standard dates (`"January, 20 2017 03:51:25"`, kept verbatim).
- City: NOT present in dataset. SWOT: NOT present in dataset. Neither is manufactured.

## Change control log

- 2026-09-08 (Phase 1, user directive): Record identity = `sha256("<dataset_sha256>:<source_row_index>")`;
  `source_row_index` + `source_dataset_sha256` stored per document. Updated PRD FR-4,
  Architecture §1 diagram + §3.1 + ADR 2, Phases.md Phase 1.
- 2026-09-08 (Phase 1): CORS middleware included in the Phase 1 foundation (config
  `ALLOWED_ORIGINS` already defined) so the web app can call the API during development.
- 2026-09-08 (Phase 1, discovered during implementation):
  - PyMongo 4.18: `pymongo.asynchronous.AsyncMongoClient` is a documented alias but is **not
    exported at package top level**; correct import is
    `from pymongo.asynchronous.mongo_client import AsyncMongoClient`. Architecture §10 updated.
  - pydantic-settings JSON-decodes `list` env fields before validators; `ALLOWED_ORIGINS` uses
    `Annotated[list[str], NoDecode]` + a before-validator that splits on commas. (Code change
    only; Architecture §11 unchanged — env var names/behavior identical.)
  - Next.js 16 auto-generates `AGENTS.md`/`CLAUDE.md` during dev; disabled via
    `agentRules: false` in `next.config.ts`, files deleted (repo hygiene).
  - ESLint `react-hooks/set-state-in-effect` (new in eslint-config-next 16): data-fetch
    effects must set state only in async callbacks; implemented with a pure async fetcher +
    `.then()` + cancellation flag in the dev status page.
- Environment note (not a project change): the user's unrelated docker stack
  (`olist-analytics-blueprint`) occupies host ports 3000 and 5433. Our compose project is
  `insightscope` (mongo 27017 free). If 3000 is busy, Next picks 3001 and that origin must be
  added to `ALLOWED_ORIGINS` (documented in README troubleshooting).

## Phase 1 deliverables (complete)

- Git repo initialized (baseline commit + foundation commit); `.gitignore` in place.
- `apps/api`: uv + Python 3.13.9, FastAPI, pydantic v2 + pydantic-settings, PyMongo async
  (no Motor), config (fail-fast, `.env` loading from repo root), db accessor, lifespan,
  `normalize.py` (validation + normalization + identity), `seed.py` (idempotent CLI + reusable
  `seed_database`), routers `health` + `ready`, `uv.lock` committed.
- `docker-compose.yml`: project `insightscope`, `mongo:8.0`, port 27017, named volume
  `insightscope-mongo-data`, mongosh ping healthcheck.
- `apps/web`: Next 16.3.3, React 19.2.8, TypeScript strict, Tailwind 4.3.3, pnpm-lock
  committed; minimal dev status screen (health/ready checks); no raw JSON anywhere.
- Root: `.env.example`, `README.md` (Phase 1 developer docs), `Memory.md`.

## Testing status (final Phase 1 run, 2026-09-08)

- Backend unit: **30 passed** (normalization, identity, validation, config, health/ready).
- Backend integration (with `MONGODB_TEST_URI` + Mongo up): **8 passed** → **38 total passed**.
- Backend without Mongo env: 30 passed, 8 skipped gracefully. Ruff format + check clean.
- Frontend: `pnpm lint` clean, `pnpm typecheck` clean, `pnpm build` clean (static route).
- DB: clean-volume seed → 1,000 docs; second seed → 1,000 docs / 0 removed; container restart
  → data persists; `/ready` → `{"status":"ready","database":"connected","dataset":"seeded","document_count":1000}`.
- Live smoke: uvicorn health 200, ready 200; Next dev page 200 with status screen;
  CORS `Access-Control-Allow-Origin: http://localhost:3000` verified; build output contains no
  `jsondata` references.

## Known failures / issues

- None.

## Next allowed task

- Await explicit user approval of Phase 1 → then Phase 2 (analytics/filtering API).

## Last verified commit

- Phase 1 foundation commit: `feat: establish data and application foundation`
  SHA `ee504a3405b8ba96951ad072b677593a63b0ef7a` (baseline commit `877e25a`).
