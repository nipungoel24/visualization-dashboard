# Phases — InsightScope: Global Intelligence Dashboard

Implementation is split into explicit, approval-gated phases. **Only the currently authorized
phase may be executed.** When a phase completes, run all verification, fix failures, update
documents and Memory.md, inspect git, submit a completion report, and STOP for explicit
approval. No auto-advancing.

---

## Phase 0 — Requirements, Data Audit, Planning Documents ✅ (current, awaiting approval)

- **Objective**: Establish the verified facts and the five governing documents.
- **In scope**: repository inspection; extract and read `reference/Assignment.docx`; parse and
  profile `data/raw/jsondata.json`; verify SHA-256; compare real data vs expected profile;
  verify external tooling facts (versions/exports of next, react, tailwind, d3, tanstack,
  morphicons, thesvg, pymongo async, ui-skills, skills CLI); organize source files into
  `data/raw/` and `reference/`; write PRD/Architecture/Rules/Phases/Design; cross-check them.
- **Out of scope**: application code, scaffolding, dependencies, MongoDB, Memory.md, git init.
- **Expected files**: `PRD.md`, `Architecture.md`, `Rules.md`, `Phases.md`, `Design.md`,
  `data/raw/jsondata.json`, `reference/Assignment.docx`.
- **Acceptance criteria**: five documents exist, are internally consistent, and govern the full
  implementation; all source-data discrepancies are documented; Phase 0 report delivered.
- **Exit criteria**: user explicitly approves Phase 0.

## Phase 1 — Reproducible Project Foundation, MongoDB, Data Import

- **Objective**: A reproducible, locked-toolchain foundation with seeded MongoDB.
- **In scope**: `git init` (repo name `blackcoffer-visualization-dashboard`; the local working
  directory `Blackcoffee` may keep its name — only the git repo/remote uses the canonical
  name); root files
  (`.gitignore`, `.env.example`, `docker-compose.yml` with `mongo:8` + volume); `apps/api`
  scaffold via `uv` (Python 3.13, fastapi/uvicorn/pydantic v2/pydantic-settings/pymongo async,
  pytest, pytest-asyncio, httpx, ruff; commit `uv.lock`); config with startup validation; db
  accessor with lifespan; `app/normalize.py`; `app/seed.py` idempotent seed; deterministic
  `_id` = SHA-256 of normalized record; indexes per Architecture §3.2; `dataset_meta` document;
  `apps/web` scaffold via `pnpm create next-app` (Next 16.3.3 pinned, React 19.2.x, TypeScript
  strict, Tailwind 4); commit `pnpm-lock.yaml`. **Create `Memory.md`.**
- **Out of scope**: API endpoints (except none), UI components, visualizations, E2E.
- **Expected files**: `Memory.md`, `.gitignore`, `.env.example`, `docker-compose.yml`,
  `apps/api/{pyproject.toml,uv.lock,.python-version,app/{__init__,config,db,normalize,seed}.py}`,
  `apps/api/tests/unit/test_normalize.py` (+ seed tests), `apps/web` scaffold with lockfile.
- **Implementation tasks**:
  1. git init; initial commit of source data + control docs (data file is source, not generated).
  2. Root env + compose; `docker compose up -d mongo` verified.
  3. API scaffold; config fails fast without `MONGODB_URI`/`MONGODB_DB`.
  4. Normalization module: blank->null, trim categoricals, preserve everything else.
  5. Validation module: record count, field whitelist, type checks, SHA-256 check.
  6. Seed CLI: validate -> upsert by deterministic id -> delete absent ids -> write meta.
  7. Web scaffold with pinned versions; hello page renders; no raw JSON imports anywhere.
- **Tests**: normalization unit tests (blanks, trimming, extreme years, World/world, mixed
  types); validation failure cases; seed idempotency integration test (double seed).
- **Verification commands**:
  - `docker compose up -d mongo` clean start; `uv run python -m app.seed --source ...`; run
    seed again (idempotency); `uv run ruff format --check .` and `uv run ruff check .`;
    `uv run pytest`; `pnpm lint`; `pnpm typecheck`; `pnpm build`.
  - Confirm Mongo contains 1,000 docs + meta; confirm frontend bundle contains no `jsondata`.
- **Exit criteria**: everything above passes; Memory.md created and updated; completion report;
  explicit approval.

## Phase 2 — FastAPI Filtering/Analytics API

- **Objective**: Complete versioned backend per Architecture §5–7.
- **In scope**: routers `health`, `ready`, `meta`, `facets`, `overview`, `records`,
  `records/{id}`; `app/filters.py` (FilterSpec + whitelists + central `$match` builder);
  `app/aggregations.py` (`$facet` overview + scoped facets); `app/schemas.py`; error handling
  (central exception handlers, no stack traces to clients); CORS; request validation.
- **Out of scope**: frontend integration, visualizations, deployment.
- **Expected files**: `apps/api/app/{main,filters,aggregations,schemas}.py`,
  `apps/api/app/routers/{health,meta,facets,overview,records}.py`,
  `apps/api/tests/unit/{test_filters,test_pagination,test_schemas,test_health}.py`,
  `apps/api/tests/integration/{test_api_overview,test_api_records,test_api_facets,test_api_meta,test_seed_idempotency}.py`.
- **Implementation tasks**: filter builder + exhaustive unit tests; overview aggregation
  sections; facets scoping; pagination/search/sort; health/ready semantics; integration tests
  against Docker Mongo with a small deterministic fixture dataset.
- **Tests**: `$match` output for OR/AND/combined/range/empty cases; 422 on unknown
  fields/operators/bad pagination; overview sections against fixture; facet scoping; records
  404; meta availability flags (city/swot false).
- **Verification commands**: `uv run ruff format --check .`; `uv run ruff check .`;
  `uv run pytest` (unit + integration with Mongo up); manual curl checks:
  `/health`, `/ready`, `/meta`, `/facets?topics=oil`, `/overview?countries=India`,
  `/records?page=2&pageSize=20`, combined-filter query, 422 cases.
- **Exit criteria**: all pass; representative API queries return verified correct aggregates;
  completion report; explicit approval.

## Phase 3 — Frontend Design System and Dashboard Shell

- **Objective**: The editorial design system, layout shell, filter rail, and data plumbing.
- **In scope**: `npx ui-skills start` routing workflow before substantial UI work; install
  `emilkowalski/skills`; Tailwind 4 `@theme` tokens per Design.md; IBM Plex fonts; shadcn
  primitives generated and customized (Button, Popover, Command, Select, Sheet, Tooltip,
  Dialog, Tabs, Skeleton, Table, ScrollArea, Badge, Separator, DropdownMenu); Header (product
  name, dataset status, connectivity, About action), About/Data Provenance panel (theSVG brand
  marks for stack); filter rail with all required + optional filters incl. disabled City/SWOT
  with `Not present in supplied dataset`; ActiveFilterChips + Reset; URL filter state
  (`lib/filters.ts`); typed API client + TanStack Query wiring for meta/ready/facets/overview/
  records; loading/error/empty states for the shell.
- **Out of scope**: D3 charts, records explorer detail, E2E (skeletons/stubs only where
  absolutely needed to render the shell).
- **Expected files**: `apps/web/{app/{layout,page,globals.css}, components/ui/*,
  components/layout/*, components/filters/*, lib/{api,filters,format,query}.ts,
  tests/{filters.spec.ts,format.spec.ts,filter-ui.spec.tsx}}`.
- **Implementation tasks**: tokens; typography; primitives customization; shell layout (left
  filter rail at ≥1024, Sheet below); status header; filter components with searchable
  multi-select (Command+Popover); disabled City/SWOT; URL sync; query wiring; motion review.
- **Tests**: URL serialization round-trips; date/number formatters; multi-select interaction;
  ChartFrame-like state components (loading/empty/error) where introduced.
- **Verification commands**: `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm build`;
  manual check at 1440x900/1024x768/390x844 against the running API; run the design/motion
  skill review (or report the limitation honestly per Rules R7).
- **Exit criteria**: all pass; shell reflects Design.md; completion report; explicit approval.

## Phase 4 — D3 Visualizations and Cross-Filtering

- **Objective**: Every required visualization, driven by the single filtered overview payload.
- **In scope**: shared chart infra (`ChartFrame`, `useChartSize`, `ChartTooltip`); D3 pure-math
  modules; KPI strip; Signals Landscape (flagship, click-to-filter); End Year categorical bars;
  Sector treemap; PESTLE comparison; Region + Country rankings; Topics ranked (click-to-filter);
  Sources ranking; Intensity/Likelihood/Relevance distributions; Data Coverage (dataset vs
  filtered); all charts respond to filters; reduced-motion behavior.
- **Out of scope**: records explorer polish, deployment, optional features.
- **Expected files**: `apps/web/components/charts/*` (one file per visual + shared infra),
  `apps/web/lib/d3/*`, `apps/web/tests/landscape-math.spec.ts` + chart render smoke tests.
- **Implementation tasks**: `useChartSize`; `ChartFrame` states (loading/skeleton/empty/error);
  tooltip with viewport clamping; per-chart D3 math modules (bins, scales, treemap layout,
  dominant sector, coverage math); component render tests; empty-filter-result states.
- **Tests**: D3 math unit tests (binning, treemap totals, dominant sector tie-break, coverage);
  render tests with fixture overview payloads; a11y labels on chart SVGs.
- **Verification commands**: `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm build`; manual:
  click landscape bubble -> filter applies -> all charts + KPI change; empty result state;
  reduced-motion (OS setting) produces no chart animation; animation review per Rules R7/R8.
- **Exit criteria**: all pass; every required visual verified against the running API;
  completion report; explicit approval.

## Phase 5 — Records Explorer, Responsiveness, Accessibility, Polish

- **Objective**: Complete records explorer, responsive/a11y hardening, interaction polish.
- **In scope**: paginated explorer table (sortable columns, search, page controls);
  RecordDetailSheet (all available fields, formatted dates, external original link); mobile
  filter Sheet; keyboard navigation and focus management; skip link; aria labels/landmarks;
  table horizontal scroll within container; tooltip/popover clamping audit at all three
  viewports; KPI/reduced-motion polish; run the animation/design review again.
- **Out of scope**: deployment, optional features, new visualizations.
- **Expected files**: `apps/web/components/records/*`, accessibility utilities if needed,
  updated filter sheet, `apps/web/tests/explorer.spec.tsx`.
- **Tests**: explorer interactions (pagination, sort, search, open record); sheet focus trap;
  axe-driven manual audit script if introduced here (full axe in Phase 6 E2E).
- **Verification commands**: `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm build`; manual
  keyboard-only walkthrough; three-viewport audit with no document-level horizontal scroll.
- **Exit criteria**: all pass; completion report; explicit approval.

## Phase 6 — Testing, QA, Performance, Production Hardening

- **Objective**: Full automated verification suite and hardening.
- **In scope**: Playwright + axe E2E (dashboard loads; KPIs appear; topic filter; count
  changes; second chart updates; active chip; reset; open record; mobile sheet; zero console
  errors; axe scan); backend integration suite green against clean Docker Mongo; error-path
  verification (API down, Mongo down, malformed response); load/perf sanity (overview latency,
  bundle size); production build hardening; README runbook.
- **Out of scope**: new features; deployment execution (prepared, not performed).
- **Expected files**: `apps/web/e2e/*.spec.ts`, `playwright.config.ts`, axe setup,
  `apps/web/e2e/fixtures/*`, any hardening fixes; `README.md` draft.
- **Tests**: full E2E list; backend integration; frontend unit suite.
- **Verification commands**: full frontend lint/typecheck/test/build; backend ruff format/check/
  pytest; E2E against docker-compose stack; clean-Mongo repro from README steps.
- **Exit criteria**: all green, zero known unresolved failures; completion report; explicit
  approval.

## Phase 7 — Deployment, README, Screenshots, Submission

- **Objective**: Final packaging and submission preparation.
- **In scope**: README (exact repro steps, env vars, commands, architecture summary);
  screenshots at the three viewports; docker-compose full-stack verification; deployment
  (only if explicitly authorized by the user); final submission checklist from PRD §12;
  optional features only if user requests them.
- **Out of scope**: everything not in PRD §12.
- **Expected files**: `README.md`, `docs/screenshots/*`, deployment config if authorized.
- **Verification commands**: full suite one final time from a clean state; PRD §12 checklist
  walked end-to-end.
- **Exit criteria**: every PRD §12 item proven with captured verification output; completion
  report.

---

## Phase Boundaries (consistency notes)

- Phase 1 creates `Memory.md`; Phases 2+ maintain it.
- Phases 3–5 require the UI-skill workflow and animation/design reviews (Rules R7, R8).
- No phase is considered passed without running its verification commands and reporting exact
  results. Approval gates are per-phase and explicit.
