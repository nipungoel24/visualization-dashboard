# Rules — InsightScope: Global Intelligence Dashboard

Strict agent rulebook. Every rule here is binding for all phases. When a rule and an instruction
conflict, escalate to the user before proceeding.

---

## R1. Data integrity (non-negotiable)

1. Use **only** the supplied dataset (`data/raw/jsondata.json`). Never scrape, fetch, infer,
   geocode, classify, or externally enrich missing values.
2. Never invent data: no fabricated records, values, City fields, or SWOT fields.
3. City and SWOT are **not in the source data** and must never be manufactured. They exist only
   as disabled filter sections with the explanation `Not present in supplied dataset`, and as
   `available: false` in `/meta`.
4. Blank strings mean missing. `""` -> `null` for every field. Never convert missing numerics
   to 0.
5. The only permitted value normalization is trimming accidental leading/trailing whitespace
   from categorical strings. No case folding, no renaming, no "fixing" of unusual values.
6. Preserve unusual values exactly: extreme `end_year` values (2126, 2200), hierarchical region
   overlaps, the case-distinct `"World"`/`"world"` pair.
7. Article URLs are presented only as original-source links. Never fetch article content.
8. Derived aggregates (averages, counts, percentages, rankings, coverage) are allowed — they are
   calculations made solely from supplied data.
9. `data/raw/jsondata.json` is immutable. Its SHA-256
   (`f45b67f7d4a252c5daa3ec0dfd9c7ceb4e415106c404646f66bff93d9aeb1744`) is pinned and re-verified
   before destructive data operations.

## R2. Runtime data authority

10. MongoDB is the authoritative runtime data store. The browser MUST NOT load or import
    `jsondata.json`, directly or transitively. After seeding, every dashboard value comes from
    the backend API.
11. Never fake this architecture: no client-side copy of the dataset, no fallback data file in
    the web app, no hardcoded aggregate tables.

## R3. API boundaries

12. All API routes are versioned under `/api/v1/`.
13. Filter semantics are centralized in one module: multi-value within a field = OR, across
    fields = AND. Individual endpoints never re-implement filtering.
14. Clients may never submit raw Mongo operators. Every field name, sort key, and parameter is
    validated against an explicit whitelist. Unknown/invalid input -> `422`.
15. Pagination is validated: `page >= 1`, `pageSize` default 20, max 100.
16. Never interpolate untrusted values into aggregation pipelines without validation.
17. Errors: user-facing message in the response; full trace logged server-side only. Never
    expose credentials, stack traces, or internal exception text to the browser.

## R4. Dependency boundaries

18. Do not introduce an ORM/ODM; use direct official PyMongo (async API, `AsyncMongoClient`).
19. Do not use Motor.
20. No unnecessary libraries. Before adding any dependency, justify it against: already in the
    stack, or objectively necessary (no native reimplementation of what shadcn/D3/TanStack
    provide). Redux, Redis, queues, GraphQL, auth, websockets, AI/LLM SDKs, chart component
    libraries, and map libraries are forbidden.
21. `pnpm` for JS deps, `uv` for Python. Lockfiles (`pnpm-lock.yaml`, `uv.lock`) are committed.
    Versions are pinned for the required stack (Next.js 16.3.3, React 19.2.x, Python 3.13).

## R5. Code quality

22. Strict TypeScript everywhere in `apps/web`; `strict: true`; no `any` without explicit
    justification and a type guard. Pydantic models for all API I/O.
23. Python: type hints on public functions, Ruff format + Ruff check clean, `uv.lock` committed.
24. No comments unless genuinely clarifying a non-obvious decision; no dead code, no console
    spam. Warnings are investigated, not hidden.
25. No premature abstraction: a helper becomes shared code only at its second real use
    (exception: the chart infrastructure — `ChartFrame`, `useChartSize`, `ChartTooltip` — is
    designed shared from the start).

## R6. Environment and secrets

26. Configuration comes from environment variables (`MONGODB_URI`, `MONGODB_DB`,
    `ALLOWED_ORIGINS`, `NEXT_PUBLIC_API_BASE_URL`). Provide `.env.example`; never commit `.env`
    or any secret.
27. Backend validates required environment values at startup and fails fast with a clear message.

## R7. UI tooling rules

28. **shadcn/ui** is the primitive layer: Button, Popover, Command, Select, Sheet, Tooltip,
    Dialog, Tabs, Skeleton, Table, ScrollArea, Badge, Separator, DropdownMenu. Never rebuild
    these interactions by hand. Do not decorate pages with dozens of default shadcn Cards —
    primitives are customized per `Design.md`.
29. **Morphicons** (`morphicons` package) are used only where morphing communicates a real state
    change (menu<->close, expand/collapse, theme state, filter/panel state). Every Morphicon
    MUST set `reducedMotion="user"`. Icons come from `lucide` **data** exports. Keep size and
    stroke styling consistent (size 16/18, strokeWidth 1.75). Do not animate every icon.
30. **theSVG** (`thesvg` package) is for recognizable brand marks only: tech stack branding and
    the About/Data Provenance panel. Verify the exact export path before use
    (e.g., `thesvg/<icon>` with `{svg, title, hex}`); never guess package exports. If a brand
    icon is unavailable, use clean text. Never use brand icons as generic UI controls.
31. **UI skills**: before substantial UI work run `npx ui-skills start` and follow its routing
    workflow; load only the smallest relevant skill context for the current task.
32. **Design engineering skills**: install `emilkowalski/skills` via
    `npx skills@latest add emilkowalski/skills`; apply the relevant design/motion skills during
    UI implementation and run an animation/design review before a UI phase is considered
    complete. If a skill system cannot run in the environment, say so explicitly and follow the
    installed skill guidance manually — never pretend it worked.

## R8. Animation rules

33. Motion communicates state; duration restrained (120–180 ms controls, 200–260 ms panels).
34. No dashboard-wide choreography on every filter change.
35. `prefers-reduced-motion` is respected everywhere: Morphicons via `reducedMotion="user"`;
    chart/component transitions disabled or reduced via CSS `motion-reduce:`. Run the animation
    review (see rule 32) before accepting a UI phase.

## R9. Accessibility

36. Target WCAG 2.2 AA: semantic landmarks, keyboard-operable controls, real buttons, visible
    focus styles, sufficient contrast, charts never communicate essential meaning by color
    alone (labels/legend/counts), accessible chart titles/descriptions, labels on form controls,
    ARIA only when semantic HTML is insufficient, meaningful empty/error states, tooltips never
    the sole location of essential information.

## R10. Responsiveness

37. Verify 1440x900, 1024x768, 390x844. No document-level horizontal overflow; no clipped
    popovers; no tooltips outside the viewport; no text collisions; no illegibly tiny labels.
    Mobile: filters in a Sheet, charts stack, tables scroll inside their own container.

## R11. D3/React responsibilities

38. D3 = calculations only (scales, layouts, hierarchy, bins, geometry, interpolation, ticks).
39. React = component lifecycle, rendering, state, events, accessibility. No uncontrolled D3 DOM
    mutation where React owns the DOM.
40. Shared responsive chart infrastructure (`useChartSize` + `ChartFrame`) — no copied
    ResizeObserver logic. Observers/listeners/simulations are cleaned up; no memory leaks.

## R12. Testing and verification

41. Never claim success without running the check. Never state a test passed, a UI looks right,
    a package API exists, a build passed, or the DB contains records without actually running
    or inspecting it.
42. Required verification commands per phase (Phases.md) are mandatory, including: frontend
    lint/typecheck/tests/production build; backend Ruff format+check/tests/typecheck; Mongo clean
    start; seed; second seed; API health/ready; representative API query; frontend against the
    running API; production build. Warnings are investigated, not hidden.
43. E2E (Playwright + axe) covers the mandated flows, including "no console errors".

## R13. Seeding safety

44. Seed is idempotent (deterministic `_id`s; re-running never duplicates).
45. The entire dataset is validated before any database mutation. If validation fails, the
    existing valid database is left untouched.
46. No destructive operation (drop/replace/delete) without prior full-dataset validation.

## R14. Process rules

47. No phase skipping; no auto-advancing phases. Complete only the currently authorized phase,
    run its verification, report, and STOP for explicit approval.
48. Phase gates: tests/lint/typecheck/build/smoke pass before a phase commit. A commit is never
    evidence of working software — verification output is.
49. Change control: if implementation reveals a controlling document (PRD/Architecture/Rules/
    Phases/Design) is wrong or incomplete, explain the required change, update the document
    intentionally, record it in Memory.md (once it exists), then implement against the updated
    source of truth. Never silently diverge.
50. `Memory.md` is created only at Phase 1 start (after Phase 0 approval) and updated after
    every meaningful task and before ending a session. It never overrides the five controlling
    documents. New sessions begin by reading PRD, Architecture, Rules, Phases, Design, Memory
    (in that order), then the relevant code.
51. Git: keep commits phase-focused; never commit secrets; never use `--force` or rewrite
    history; inspect `git status`/`diff` before committing; never destroy uncommitted work.
52. Simplicity: quality over quantity. No authentication, accounts, or infra demos. Optional
    features (CSV export, share URLs, chart export, About polish) only after all required
    functionality is complete and never at the cost of stability.
