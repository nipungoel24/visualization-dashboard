# Memory — InsightScope: Global Intelligence Dashboard

Execution-state summary. Never overrides PRD/Architecture/Rules/Phases/Design — those files are
authoritative. Read them first in every new session.

---

## Project status

- Project: InsightScope — Global Intelligence Dashboard (`blackcoffer-visualization-dashboard`)
- **Phase 5 — Records Explorer: IMPLEMENTED + CLOSEOUT VERIFIED 2026-09-12**
  (ESLint 0, tsc 0, vitest 105/105, Playwright 43/43, backend 113/113, production build green).
  Phase 5 provisionally accepted; closeout passed. Phase 6 NOT started.
- Phase 0–4: all **APPROVED** (`9400812` + `1a058db` for Phase 4 feat/docs).
- Phase 6 (Testing, QA, Performance) is NOT authorized.

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

## Testing status (Phase 5 closeout verification run, 2026-09-12, Mongo UP)

- Frontend unit/component (vitest): **105 passed, 0 failed** —
  `filters.spec` (19), `format.spec` (10), `palette.spec` (7), `landscape.spec` (17),
  `treemap.spec` (3), `tooltip.spec` (3), `filter-ui.spec` (9), `dashboard-states.spec` (5),
  `charts.spec` (12), `explorer.spec` (7), `record-detail.spec` (11) —
  last grew from 4 to 11 tests: the URL-scheme safety matrix (`mailto:`/`javascript:`/`data:`/`ftp:`/`file:`/
  malformed/null rejected; `http:`/`https:` allowed with `target="_blank" rel="noopener noreferrer"`).
- Playwright real-API E2E (`e2e/smoke.spec.ts` + `e2e/records.spec.ts`): **43 passed, 0 failed** —
  smoke: 19; records: 24 — table render (1,000 + page 1/40 + no doc overflow), sort toggle (URL + reorder),
  sort resets page, pagination (page=2 + URL + step back), filter resets page (oil→403 / page 1/17),
  real workflow cross-checks (unfiltered 1000/40 pages, oil 403/17, oil+USA 51/3, true detail fields from API),
  row click→dialog + `record=<sha256>`, deep-link `/?record=<id>`, browser back/forward with filters intact,
  keyboard Enter/Escape/focus-restore, Close-button focus restore, request isolation (overview/facets not
  refetched on page/sort/record change), records API failure (explicit error + Retry button, KPI intact),
  detail API failure (drawer alert, dashboard intact, closable), zero-result panel (count=0 → ZeroResults,
  not broken frames), URL-safety E2E of rendered links, mobile card list (390 × 844, no table, no overflow),
  required-viewport overflow audit (1440/1024/390), query isolation (open/close record does not refetch
  records/overview/facets), detail cache (ID-specific key, no stale bleed). Every guarded flow asserts
  **zero console errors AND zero console warnings AND zero pageerrors** (hydration/Radix warnings would fail).
- Backend regression (untouched in Phase 5): **113 passed, 0 failed, 0 skipped** (Mongo UP).
- Final: `npm run lint` 0, `npm run typecheck` 0, `npm run build` (next) clean, vitest 105, Playwright 43.

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

- None. Records-list API failures show explicit error + Retry (distinct from zero-results).

## Next allowed task

- STOP. Await explicit user approval of the Phase 5 closeout report. Do NOT begin Phase 6.

## Last verified commit

- `a471d0b` — Phase 5 records explorer (feat + docs)
- `d32ded6` — Phase 5 docs
- `783c5e6` — fix(web): finalize records explorer safety and QA
- **New closeout commit**: `fix(web): harden records error recovery and query isolation` (to be created)
