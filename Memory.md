# Memory — InsightScope: Global Intelligence Dashboard

Execution-state summary. Never overrides PRD/Architecture/Rules/Phases/Design — those files are
authoritative. Read them first in every new session.

---

## Project status

- Project: InsightScope — Global Intelligence Dashboard (`blackcoffer-visualization-dashboard`)
- **Phase 3 — Design System + Dashboard Shell: IMPLEMENTED + VERIFIED 2026-09-08**
  (vitest 38/38, Playwright real-API smoke 9/9, lint/typecheck/build green,
  backend regression 113/113). Phase 3 approval pending.
- Phase 0: **APPROVED**. Phase 1: **COMPLETE**. Phase 2: **APPROVED** (`ddc199d` + `be76739`).
- Phase 4 (Production D3 visualization system) is NOT authorized. Do not begin Phase 4.

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
- 2026-09-08 (Phase 3):
  - Architecture §10 clarified: `lucide` (icon data for MorphIcon) vs `lucide-react`
    (static icons, version-aligned); `@thesvg/icons` added as a pinned direct dependency
    because pnpm does not link the transitive copy, so `thesvg/<icon>` subpaths would not
    resolve without it. `d3` install deferred to Phase 4 (no charts yet; no unused deps).
  - shadcn set up manually but faithfully (radix + cva + `cn`, `components.json` for future
    CLI use) instead of `shadcn init`, to avoid the CLI overwriting the Design.md token
    theme; primitives customized to tokens (button, badge, sheet, dialog, popover, command,
    checkbox, separator, scroll-area, skeleton, tooltip, label, input, collapsible).
  - cmdk owns listbox/keyboard/selection; option *filtering* is an explicit one-line
    substring match (`shouldFilter={false}`) because cmdk's built-in DOM reorder crashes
    under jsdom (`appendChild` of null) and explicit filtering is unit-testable with zero
    UX change.
  - Touch targets: chip remove buttons 24px + group headers min 32px + mobile header
    actions 40px (WCAG 2.2 AA 24px minimum met everywhere; 24px chosen for dense chips
    over Design §15's 32px desktop guidance — recorded here intentionally).
  - Added page-level sr-only h1 (the wordmark is a styled <p>, not a heading).
  - Test-only fixes (no app impact): Playwright `getByLabel`/`getByRole` need
    `{ exact: true }` (substring matching hit loading skeletons and count badges);
    Radix-assigned `aria-labelledby` overrides custom `aria-label` on Dialog content and
    cmdk inputs (use visible titles / cmdk `label` prop); rapid Escape chains get eaten by
    Radix exit animations (125–150ms) — tests now await each layer's dismissal.
  - Environment incident (not a project defect): Docker Desktop daemon died mid-session;
    every API-dependent browser check failed with the app correctly showing its Offline
    states (accidental end-to-end proof of the error UX). Daemon restarted via the
    `Docker Desktop.exe` user process; mongo volume data intact (COUNT=1000).
  - Tooling placement: `app/providers.tsx` added (QueryClient + Tooltip providers; not in
    the Architecture tree — single client boundary beside `page.tsx`).

## Testing status (Phase 3 verification run, 2026-09-08, Mongo UP)

- Frontend unit/component (vitest 5.0.0, jsdom): **38 passed, 0 failed** —
  `filters.spec` (14: URL↔state round-trips, repeated topics, ranges, reset, casing),
  `format.spec` (10: null→—, zero stays zero, dates, percentages, SHA),
  `filter-ui.spec` (9: multi-select select/clear/search, disabled City, range validation,
  chips remove/reset/summarize), `dashboard-states.spec` (5: KPI nulls/loading/error,
  SectionFrame states, ZeroResults).
- Playwright real-API smoke (`e2e/smoke.spec.ts`, Chromium, prod build + live backend):
  **9 passed, 0 failed** — unfiltered 1,000 + zero console errors; oil→403, +gas→492
  (OR proven in browser); USA narrows to 51 (AND) with chip removal; refresh persistence;
  reset→1,000; zero-result intentional state; outage interception → error UI (never fake
  empty); 1024 rail + no overflow; 390 sheet open/filter/Escape + no overflow; reduced-motion
  interaction intact.
- Frontend: `pnpm lint` exit 0, `pnpm typecheck` exit 0, `pnpm build` exit 0 (Next 16.3.3).
- Backend regression (untouched in Phase 3): **113 passed** with Mongo up.
- Final integrity: raw SHA `f45b67f7…aeb1744` unchanged; Mongo COUNT=1000; no `jsondata` /
  `data/raw` strings in frontend source; no dataset JSON files under `apps/web`; no `.env`
  committed; `test-results/` + `.next/` gitignored; working tree contains only Phase 3 files.

## UI skills actually invoked (Phase 3)

- `npx ui-skills start` → categories → `list --category systems/accessibility` →
  `get nextlevelbuilder/ui-styling` (SUCCEEDED, content applied: radix+shadcn primitive
  structure, accessible component patterns, responsive layout guidance).
- `npx skills@latest add emilkowalski/skills -g` (FAILED: PromptScript skills do not
  support global install; project-level install would pollute the repo). Per Rules R32,
  followed the guidance manually via raw GitHub `SKILL.md` reads: `emil-design-eng`
  (APPLIED: custom ease curves, 150/200ms budgets, button `scale(0.97)` press feedback,
  origin-aware popovers, transition-property specificity, no entrance choreography) and
  `review-animations` (APPLIED as a self-review: findings table produced zero violations;
  one consistency fix — `ease-out` added to all overlay enter states; verdict: approve).
- `npx ui-skills get superfuture/design-review` (SUCCEEDED; rubric self-applied —
  h1 landmark, touch-target, nested-scroller and overflow findings fixed above).
- No Pro license present (`~/.design-review/license` absent) — free review only, no
  fabricated Pro findings.
- Morphicons: `MorphIcon` from `morphicons/react` + icon *data* from `lucide` (NOT
  lucide-react components — verified against package README); usages: mobile
  menu↔close trigger, rail group expand/collapse chevrons; every instance
  `reducedMotion="user"`, size 16/18, strokeWidth 1.75.
- theSVG: verified `import { svg, title, hex } from "thesvg/mongodb"` resolves at runtime
  (MongoDB/47A248); used ONLY in the About/Data Provenance panel
  (MongoDB, Next.js, Python, FastAPI marks + text badges for the rest).

## Known failures / issues

- None.

## Next allowed task

- STOP. Await explicit user approval of Phase 3. Do NOT begin Phase 4.

## Last verified commit

- Phase 3 commit (dashboard design system + shell). See `git log`.
