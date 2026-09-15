# Memory — InsightScope: Global Intelligence Dashboard

Execution-state summary. Never overrides PRD/Architecture/Rules/Phases/Design — those files are
authoritative. Read them first in every new session.

---

## Project status

- Project: InsightScope — Global Intelligence Dashboard (`blackcoffer-visualization-dashboard`)
- **Phase 5 — Records Explorer: IMPLEMENTED + CLOSEOUT VERIFIED 2026-09-12**
  (ESLint 0, tsc 0, vitest 105/105, Playwright 43/43, backend 113/113, production build green).
  Phase 5 provisionally accepted; closeout passed.
- **Phase 6 — Testing, QA, Accessibility, Performance, Production Hardening: COMPLETE**
  - Phase 6 Agent 1 (accessibility/frontend quality) completed at commit `7271314`:
    - Interactive SVG charts converted to composite widget model (role="listbox"/"option")
    - Roving focus hook supports "svg" and "buttons" modes
    - E2E selectors updated for new ARIA roles
    - Added `@axe-core/playwright` and deterministic E2E orchestration script
  - Phase 6 Agent 2 (security hardening) cherry-picked at `180d5cc`:
    - `poweredByHeader: false`, X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy
    - `e2e/security.spec.ts` (6 tests)
  - Phase 6 Agent 3 (accessibility) cherry-picked at `b143f78`:
    - Filter/records/pagination accessibility fixes
    - `agent3-accessibility.spec.ts` (E2E), `agent3-filter-accessibility.spec.tsx` (29 tests), `agent3-records-accessibility.spec.tsx` (17 tests)
  - Final integration verification (commit `fix: complete Phase 6 integration verification`):
    - Fixed Data Coverage contract: `meta?.document_count` (was incorrectly `meta?.schema?.document_count`)
    - Added malformed response validation: runtime type guards for all API responses
    - Fixed touch targets: mobile ≥40px, desktop ≥32px on chip/search/pagination controls
    - Fixed E2E orchestration: removed duplicate server startup from run-e2e.mjs; playwright.config.ts owns lifecycle
    - Fixed EndYearChart `aria-activedescendant` ID mismatch (`mark-` → `end-year-mark-`)
    - E2E database isolation: `insightscope_e2e` database
    - Cleaned stale phase comments
  - Verification results (FINAL):
    - Backend: 113 passed (61 unit + 52 integration), ruff format/check clean, pyright 0 errors
    - Frontend: 151 Vitest passed, ESLint clean, TypeScript strict clean, production build clean
    - E2E: 94 Playwright tests, 3 consecutive runs all 94/94 passed, 0 flaky
    - Axe: 0 critical, 0 serious, 0 moderate, 0 minor violations across all viewports
    - Security: all headers verified via Playwright
    - Dataset SHA-256: `f45b67f7d4a252c5daa3ec0dfd9c7ceb4e415106c404646f66bff93d9aeb1744` (verified)
    - MongoDB: 1,000 records (insightscope_e2e, idempotent seed verified)
    - dangerouslySetInnerHTML: 1 deliberate use (thesvg brand marks in AboutPanel, trusted package, no dataset values)
    - Lighthouse: NOT RUN
- **Phase 7 — Deployment Preparation, README, Screenshots, Final Submission: COMPLETE**
  - Final verification (2026-09-15):
    - Backend: 113 passed, ruff format/check clean, pyright 0 errors
    - Frontend: 151 vitest passed, ESLint clean, tsc clean, production build clean
    - E2E: 94/94 passed (1.1m), 0 failures, 0 skipped
    - Dataset SHA-256 verified: `f45b67f7…aeb1744`
    - Screenshots captured at 1440x900, 1024x768, 390x844 (unfiltered + filtered)
  - Documentation created:
    - `docs/SUBMISSION_CHECKLIST.md` — 68/68 requirements PASS
    - `docs/VERIFICATION.md` — full test/build results
    - `docs/screenshots/` — 6 screenshots (3 viewports × 2 states)
  - README updated with screenshots, polished setup instructions
  - Memory.md updated with Phase 7 status
    - Interactive SVG charts converted to composite widget model (role="listbox"/"option")
    - Roving focus hook supports "svg" and "buttons" modes
    - E2E selectors updated for new ARIA roles
    - Added `@axe-core/playwright` and deterministic E2E orchestration script
  - Phase 6 Agent 2 (security hardening) cherry-picked at `180d5cc`:
    - `poweredByHeader: false`, X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy
    - `e2e/security.spec.ts` (6 tests)
  - Phase 6 Agent 3 (accessibility) cherry-picked at `b143f78`:
    - Filter/records/pagination accessibility fixes
    - `agent3-accessibility.spec.ts` (E2E), `agent3-filter-accessibility.spec.tsx` (29 tests), `agent3-records-accessibility.spec.tsx` (17 tests)
  - Final integration verification (commit `fix: complete Phase 6 integration verification`):
    - Fixed Data Coverage contract: `meta?.document_count` (was incorrectly `meta?.schema?.document_count`)
    - Added malformed response validation: runtime type guards for all API responses
    - Fixed touch targets: mobile ≥40px, desktop ≥32px on chip/search/pagination controls
    - Fixed E2E orchestration: removed duplicate server startup from run-e2e.mjs; playwright.config.ts owns lifecycle
    - Fixed EndYearChart `aria-activedescendant` ID mismatch (`mark-` → `end-year-mark-`)
    - E2E database isolation: `insightscope_e2e` database
    - Cleaned stale phase comments
  - Verification results (FINAL):
    - Backend: 113 passed (61 unit + 52 integration), ruff format/check clean, pyright 0 errors
    - Frontend: 151 Vitest passed, ESLint clean, TypeScript strict clean, production build clean
    - E2E: 94 Playwright tests, 3 consecutive runs all 94/94 passed, 0 flaky
    - Axe: 0 critical, 0 serious, 0 moderate, 0 minor violations across all viewports
    - Security: all headers verified via Playwright
    - Dataset SHA-256: `f45b67f7d4a252c5daa3ec0dfd9c7ceb4e415106c404646f66bff93d9aeb1744` (verified)
    - MongoDB: 1,000 records (insightscope_e2e, idempotent seed verified)
    - dangerouslySetInnerHTML: 1 deliberate use (thesvg brand marks in AboutPanel, trusted package, no dataset values)
    - Lighthouse: NOT RUN
- Phase 0–4: all **APPROVED** (`9400812` + `1a058db` for Phase 4 feat/docs).

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

## Testing status (Phase 6 final integration verification, 2026-09-15, Mongo UP)

- Backend regression: **113 passed, 0 failed, 0 skipped** (Mongo UP).
- Frontend unit/component (vitest): **151 passed, 0 failed** —
  `filters.spec` (20), `format.spec` (10), `palette.spec` (7), `landscape.spec` (17),
  `treemap.spec` (3), `tooltip.spec` (3), `filter-ui.spec` (9), `dashboard-states.spec` (5),
  `charts.spec` (12), `explorer.spec` (7), `record-detail.spec` (12),
  `agent3-filter-accessibility.spec` (29), `agent3-records-accessibility.spec` (17).
- Playwright E2E (94 tests, 3 consecutive runs all green):
  - `smoke.spec.ts`: 19 tests
  - `records.spec.ts`: 24 tests
  - `accessibility.spec.ts`: 19 tests
  - `security.spec.ts`: 6 tests
  - `agent3-accessibility.spec.ts`: 26 tests
- Axe: 0 critical/serious/moderate/minor across all viewports (1440, 1024, 390).
- Final: ruff format/check 0, pyright 0, ESLint 0, tsc 0, vitest 151, Playwright 94.

## Phase 5 closeout decisions (2026-09-12)

- **Source-URL policy (FINAL, user-mandated)**: clickable ONLY `http:` and `https:`. NOT clickable:
  `mailto:` (removed from allow-list), `javascript:`, `data:`, `file:`, `ftp:`, malformed, any other
  scheme. `isSafeUrl()` in `RecordDetailSheet.tsx` now allows `["http:", "https:"]`; schemes are never
  silently rewritten. External links carry `target="_blank" rel="noopener noreferrer"`.
  Covered by vitest `record-detail.spec` + E2E link assertions.
- **Browser Back/Forward (record drawer)**: all state changes use `router.replace` EXCEPT record open,
  which uses `router.push` (`handleOpenRecord` in `Dashboard.tsx`), so Back closes the drawer while
  filters/page/sort persist and Forward reopens the same record. Close/other changes still `replace`.
- **Required-viewport QA**: 1440×900, 1024×768, 390×844 asserted via
  `document.documentElement.scrollWidth <= window.innerWidth + 1` (plus the no-vertical-jank KPI check).
- **Records-list API failure**: explicit localized error state ("Records could not be loaded") with
  accessible Retry button (`<button>` with focus ring, Enter/Space support). Retry calls TanStack Query
  `refetch()`; KPIs/charts/overview stay accurate (never depend on records query). Distinct from
  legitimate zero-results ("No records match the current filters."). Detail failure = distinct: drawer
  shows localized alert, dashboard remains, drawer closable.
- **Graceful empty vs error**: `filtered_count === 0` → `ZeroResults` panel replaces whole content
  area (never broken chart frames); individual facets bar themselves.
- **Query isolation verified**: `serializeFilterParams` excludes `page`/`sort`/`order`/`record`; records
  query key = `["records", filterParams, sort, order, page, pageSize]` (no `record`); detail query key
  = `["record", id]`. E2E confirms: open/close record → no records/overview/facets refetch; change
  page/sort → records refetch only; change analytical filter → overview/facets/records refetch.
- **Detail cache**: `["record", id]` key structure verified; open A → close → open B → no A data bleed;
  return to A → cached per TanStack policy (staleTime 30s).
- **E2E console guard**: captures console **errors + warnings** and `pageerror` on every covered flow;
  any hydration/Radix warning fails the suite. 43/43 green with zero captures.

## Phase 5 records-explorer decisions

- **FilterState extension**: `page`, `sort`, `order`, `record` added to FilterState; `EMPTY_FILTERS`
  includes `page:1, sort:"source_row_index", order:"asc", record:null`. Defaults omitted from
  URL via `serializeFilterState()` to keep URLs clean.
- **Dual serialization**: `serializeFilterParams()` returns a filter-only canonical string used
  for React Query keys (facets, overview, records) so page/sort/record changes never refetch
  analytics data. `serializeFilterState()` returns the full URL string (omits defaults) used
  for the history replace and `statesEqual()` comparisons.
- **Sortable whitelist**: `SORTABLE_FIELDS` in `lib/filters.ts` mirrors the backend whitelist;
  `parseSort()` falls back to `"source_row_index"` if the value isn't in the set.
- **Pagination defaults**: `useRecordsQuery` accepts `{ page?, pageSize?, sort?, order? }`
  and defaults to `pageSize: 25` / `keepPreviousData` so new-page fetches show stale data
  while loading rather than a skeleton flash.
- **Desktop table**: rows are `<tr role="button" tabIndex={0}>` with `aria-label="Open record …"`;
  Enter/Space dispatches to `onOpenRecord`. Header columns use `aria-sort` on the active column
  and `SortButton` whose aria-label switches between `Sort by X` / `Sorted by X ascending/descending`.
- **Mobile card list**: `RecordMobileItem` renders `<button>` with identical `aria-label` to
  the desktop row. 25 items shown without virtualization (acceptable at page-size 25).
- **Horizontal scroll**: desktop table wrapper gets `overflow-x-auto` and the `<table>` gets
  `min-w-[760px]` so the table scrolls within the section, never at document level.
- **Focus restoration**: Radix's built-in restore does not survive the Next soft-navigation
  triggered by `router.replace` on record-close. Explicit `openTriggerRef` in RecordsExplorer
  captures the `document.activeElement` on open; a `useEffect` restores it when `filters.record`
  transitions non-null → null. The E2E keyboard test (`document.activeElement` poll) asserts this.
- **RecordDetailSheet URL**: `record=<sha256>` is parsed by `parseRecordId()`; Radix Dialog is
  rendered at all times with `open={recordId !== null}` so the sheet mounts/dismounts with URL state.
  `onOpenChange(false)` dispatches `onCloseRecord()` → `filters.record: null`.
- **Safe external links**: `isSafeUrl()` checks `URL.protocol ∈ [http:, https:]` and the `<a>` carries
  `target="_blank" rel="noopener noreferrer"`. `mailto:`/`javascript:`/`data:`/`file:`/`ftp:`/malformed
  schemes are rejected (never clickable, never rewritten). Covered by the record-detail URL-scheme matrix.
- **Desktop row title cell**: the second `<td>` holds both `title` and `insight` in line-clamped
  spans; the sort test targets this cell for title text comparison (unique label).
- **Test file naming**: `explorer.spec.tsx` aligns with Phases.md expected file `tests/explorer.spec.tsx`.

## Phase 4 D3 visualization decisions

- D3 deps: `d3-scale`, `d3-array`, `d3-hierarchy`, `d3-delaunay` (not full d3 umbrella).
  Types: `@types/d3-scale`, `@types/d3-array`, `@types/d3-hierarchy`.
- SignalsLandscape: X=likelihood, Y=relevance, area=intensity, color=dominant-sector.
  Fixed domains: likelihood [1,4], relevance [1,6], intensity [0,96]. Sqrt radius [5,26px].
  Golden-angle spiral jitter (max 30px) for colliding (lik,rel) pairs. Labels top-5 + selected.
  Click → `onToggle("topic", value)`.
- **Pointer architecture**: SVG has `pointerEvents="all"` and a native `addEventListener("click")`
  attached via `useEffect` with `[rendered]` deps (not `[]` — SSR hydration runs the effect
  before `svgRef.current` is populated; `[rendered]` ensures re-attachment when data arrives).
  All `<g>` bubble elements have `pointerEvents="none"` so clicks pass through to the SVG.
  On click: `localFromEvent()` computes SVG-local coords from `clientX/Y - svgRect`, then
  `nearestPoint()` (Delaunay) resolves to the nearest rendered bubble. Overlapping bubbles
  are resolved by proximity, not SVG paint order. `rendered`, `onToggleTopic`, `margin`,
  `xScale`, `yScale` are synced via refs in a separate `useEffect` (React 19 `react-hooks/refs`
  compliance — refs must not be updated during render). `margin` is wrapped in `useMemo([compact])`
  to prevent stale-deps lint warnings.
- **Root-cause note**: In this project's React 19 + SVG + Playwright interaction path,
  browser-level pointer activation was not reliably reaching the previous React SVG synthetic
  handlers. The Signals Landscape therefore uses a native SVG event listener for pointer
  interaction. Evidence: CDP-dispatched `page.mouse.click()` lands on the SVG (`elementFromPoint`
  confirms `hit=svg pe=all`), the native listener fires (`isTrusted: true`), and Delaunay
  resolution correctly invokes `onToggleTopic`. The hypothesis is React 19's event delegation
  system in production builds; the fact is the native listener works reliably.
- EndYearChart: band-scale categorical bars. Click → `onToggle("end_year", value)`.
  **SVG interaction fix**: added `onClick` to both `<rect>` elements (transparent hit target
  + visual bar) so Playwright can dispatch click events directly on the visual mark, bypassing
  React 19 event delegation issues with `<g>` elements.
- SectorTreemap: D3 squarified treemap, tile area = count, color = avg intensity via
  `scaleLinear` domain [1,48,96] → `["#E8E4DA","#6B8E7C","#0F5A3C"]`. Click → sector filter.
  **SVG interaction fix**: added `onClick` to the visual `<rect>` for the same reason.
- RankingChart: shared HTML horizontal bars with D3 `scaleLinear` widths. Roving focus,
  tooltips, selected inset border. Top-N: Country=15, Topic=15, Source=all from backend.
- CoverageChart: horizontal completeness bars. MetricDistribution: backend bins. Both informational.
- `overflow-visible` removed from landscape SVG to prevent jittered bubbles from causing
  document-level horizontal scroll at the `lg` grid breakpoint. `overflow-x: clip` added to
  html/body as belt-and-suspenders.
- `SectionFrame` gets `scroll-mt-16` to prevent sticky header from covering chart tops.

## UI skills actually invoked (Phase 3–5)

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

- None. All 94 E2E tests pass across 3 consecutive runs. All 151 Vitest tests pass. All 113 backend tests pass.

## Next allowed task

- Phase 7 is COMPLETE. The project is ready for submission.

## Last verified commit

- Phase 7: docs/screenshots, SUBMISSION_CHECKLIST.md, VERIFICATION.md, README.md updates
- Phase 6 final integration: `fix: complete Phase 6 integration verification`
- Agent 2 cherry-pick: `180d5cc` (security hardening)
- Agent 3 cherry-pick: `b143f78` (accessibility)
- Integration branch: `phase6-final-integration`
