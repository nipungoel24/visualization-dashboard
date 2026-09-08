# Memory — InsightScope: Global Intelligence Dashboard

Execution-state summary. Never overrides PRD/Architecture/Rules/Phases/Design — those files are
authoritative. Read them first in every new session.

---

## Project status

- Project: InsightScope — Global Intelligence Dashboard (`blackcoffer-visualization-dashboard`)
- **Phase 2 — FastAPI Filtering/Analytics API: IMPLEMENTED + VERIFIED against running MongoDB
  2026-09-08** (full suite 113 passed, live smoke matrix green). Phase 2 approval still pending.
- Phase 0: **APPROVED**. Phase 1: **COMPLETE**. Phase 2: **COMPLETE, awaiting approval**.
- Phase 3 (Frontend Design System and Dashboard Shell) is NOT authorized. Do not begin Phase 3.

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
- 2026-09-08 (Phase 2):
  - PyMongo 4.18 runtime bug: `collection.aggregate()` returns a **coroutine** (must `await`),
    while `collection.find()` returns an **AsyncCursor** directly (no await). Caught by pyright;
    fixed in `app/services.py`.
  - Pydantic `BaseModel` has a `.schema()` method; a field named `schema` would conflict.
    Renamed to `dataset_schema` with `Field(serialization_alias="schema")` in `MetaResponse`.
  - `FilterSpec` uses repeated query params (`?topic=oil&topic=gas`) not comma-separated;
    ranges use snake_case (`intensity_min`/`intensity_max`). Default `page_size` is 25 not 20.
  - `SEARCH_FIELDS` covers 7 fields (not just `title`/`insight`); sort whitelist is
    `source_row_index, end_year, start_year, intensity, likelihood, relevance, topic, sector, country`.
  - `city`/`swot` dimensions always 422 `unavailable_dimension`.
  - Added `app/errors.py`, `app/aggregations.py` (COVERAGE_FIELDS, SOURCES_OVERVIEW_LIMIT=20, METRIC_BINS),
    `app/filters.py` (CATEGORICAL_PARAMS, YEAR_PARAMS, RANGE_PARAMS, FACET_DIMENSIONS, SEARCH_FIELDS,
    SORTABLE_FIELDS, RECORD_ID_PATTERN, UNAVAILABLE_DIMENSIONS), `app/schemas.py` (all typed response models),
    `app/routers/{meta,facets,overview,records}.py`.
  - Added `pyright` to dev dependencies; pyright 0 errors achieved.
- 2026-09-08 (Phase 2 verification against running MongoDB — real bugs found and fixed):
  - pytest-asyncio 0.26 runs session-scoped async fixtures and async tests on different event
    loops by default; `AsyncMongoClient` binds to its creation loop, so all 42 integration
    tests failed with `RuntimeError: Cannot use AsyncMongoClient in different event loop`.
    Fixed by pinning `asyncio_default_fixture_loop_scope = "session"` and
    `asyncio_default_test_loop_scope = "session"` in `pyproject.toml` plus explicit
    `loop_scope="session"` on `api_db`/`api_client` (session) and `test_db` (function).
  - Landscape dominance bug: `landscape_dominance` let a null sector win when null was the most
    frequent sector for a topic (e.g. `growth`: 40 null vs 4 Government returned
    `dominant_sector=None`). Architecture §7 specifies most-frequent *non-null* sector, so the
    pipeline now pre-filters `sector: {$ne: None}`; topics with no non-null sector still yield
    `None` via the missing-key default in `services.py`.
  - Facets zero-result test was wrong: with disjunctive faceting, `country=Atlantis` correctly
    returns the unfiltered country list in the *country* facet (own filter excluded) while all
    other dimensions are empty. Test updated to assert that scoped behavior.
  - A stale Phase-1 uvicorn (health+ready only) was still bound to port 8000 from an earlier
    session; killed it (PID 38516) before live smoke. Lesson: verify `/openapi.json` routes
    before trusting a listening port.
  - Docker Desktop daemon was stopped at session start (`sc.exe start` → Access denied, service
    Manual); started the `Docker Desktop.exe` user process instead, daemon came up (v29.3.1),
    `docker compose up -d mongo` → healthy.
  - Seed terminology verified accurate: second seed reports `documents_processed: 1000`,
    `documents_inserted: 0`, `documents_matched: 1000`, `documents_modified: 1000`
    (ReplaceOne-upsert counters straight from `BulkWriteResult`; replacement always counts as
    modified), `stale_documents_removed: 0`, `final_document_count: 1000`. No misleading
    `documents_imported` metric exists; no rename needed.
  - Environment note (not a project change): the user's unrelated docker stack
    (`olist-analytics-blueprint`) occupies host ports 3000 and 5433. Our compose project is
    `insightscope` (mongo 27017 free). If 3000 is busy, Next picks 3001 and that origin must be
    added to `ALLOWED_ORIGINS` (documented in README troubleshooting).

## Testing status (Phase 2 verification run, 2026-09-08, Mongo UP)

- Full backend suite with `MONGODB_TEST_URI=mongodb://localhost:27017`: **113 passed,
  0 failed, 0 skipped, 0 errors — total 113. Mongo integration tests executed: YES.**
- Ruff check: clean. Ruff format check: 33 files formatted. Pyright: **0 errors**.
- Mongo pre-verification: container `healthy`; `insights.countDocuments()` = 1000;
  `dataset_meta.current` exists with `source_sha256=f45b67f7…aeb1744`;
  raw `jsondata.json` SHA-256 matches pinned value; indexes `_id_` + 11× `idx_*` present.
- Live smoke (real uvicorn + Mongo, independent raw-JSON cross-checks all match):
  health 200; ready 200 (seeded/1000); meta 200 (SHA match, city/swot false);
  overview 1000; `topic=oil` 403; `topic=oil&topic=gas` 492 (OR proven);
  `topic=oil&country=USA` 51 (AND proven); intensity 10–20 → 352; `q=energy` → 563;
  `q=.*` → 0 (literal, not regex match-all); scoped facets exact-match raw expectations;
  zero-result overview → count 0 + null averages (no fake zeros); zero-result records →
  total 0/pages 0; bad range → 422 `invalid_range`; city/swot → 422
  `unavailable_dimension`; page 2 → rows 25–49; page_size 101 → 422; asc/desc sorts ordered;
  unsafe sort → 422 `invalid_sort`; record row-0 detail exact (no sha leak); malformed id →
  422 `invalid_record_id`; unknown id → 404 `record_not_found`; `World`=131/`world`=1
  distinct; years 2126:1/2200:1; intensity `not_specified`=38 = raw nulls (nulls never zero).
- Mongo-outage probe (app pointed at closed port 59999): `/overview` → **503
  `database_unavailable`**, `/ready` → 503. No fake empty analytics.
- `/openapi.json`: all 7 Phase 2 routes + 29 typed schemas (+ FastAPI validation wrappers).
- Frontend regression (no Phase 3 work): `pnpm lint` exit 0, `pnpm typecheck` exit 0,
  `pnpm build` exit 0 (Next 16.3.3, 3 static pages).
- Final integrity: raw SHA unchanged (`f45b67f7…aeb1744`), Mongo count 1000, no `.env`
  created, no secrets, no junk files (stray `query` artifact removed pre-commit).

## Known failures / issues

- None. (Session-start Docker outage resolved by launching Docker Desktop user process.)

## Next allowed task

- STOP. Await explicit user approval of Phase 2. Do NOT begin Phase 3.

## Last verified commit

- Phase 2 verification commit (loop-scope fix + dominance fix + facet test fix). See `git log`.
