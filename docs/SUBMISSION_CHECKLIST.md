# Submission Checklist — InsightScope

Item-by-item compliance verification against the assignment requirements (`reference/Assignment.docx`)
and the project PRD (`PRD.md`).

---

## Data Requirements

| # | Requirement | Status | Evidence |
|---|------------|--------|----------|
| 1 | Use the given JSON data only | PASS | `data/raw/jsondata.json` is immutable, SHA-256 `f45b67f7…aeb1744` verified at seed time |
| 2 | Create a MongoDB database from the JSON data | PASS | Seed loads 1,000 normalized records; idempotent (second run changes nothing) |
| 3 | Dashboard reads data from MongoDB via backend API | PASS | Browser never loads raw JSON; all data from `GET /api/v1/*` endpoints backed by MongoDB |

## Backend

| # | Requirement | Status | Evidence |
|---|------------|--------|----------|
| 4 | Python FastAPI backend | PASS | `apps/api/app/main.py` — FastAPI 0.115+, Python 3.13 |
| 5 | API in Python to get data from MongoDB | PASS | Versioned `/api/v1/*` endpoints: health, ready, meta, facets, overview, records |
| 6 | Node.js or Python backend (permitted) | PASS | Python FastAPI selected |

## Frontend

| # | Requirement | Status | Evidence |
|---|------------|--------|----------|
| 7 | Next.js / React frontend | PASS | `apps/web` — Next.js 16.3.3, React 19, TypeScript strict |
| 8 | D3.js visualizations (highly recommended) | PASS | Signals Landscape (bubble chart), Sector Treemap, End-Year categorical bars all use D3 |
| 9 | Interactive graphs, charts, and visuals | PASS | All charts support click-to-filter, tooltips, roving focus |
| 10 | Creative visualizations that generate insights | PASS | Signals Landscape (bubble = topic, X=likelihood, Y=relevance, radius=intensity, color=sector) |

## Important Variables Visualized

| # | Variable | Status | Visualization |
|---|----------|--------|---------------|
| 11 | Intensity | PASS | KPI strip (avg), Signals Landscape (radius), Sector Treemap (fill), Metric Distributions |
| 12 | Likelihood | PASS | KPI strip (avg), Signals Landscape (X-axis), Metric Distributions |
| 13 | Relevance | PASS | KPI strip (avg), Signals Landscape (Y-axis), Metric Distributions |
| 14 | Year | PASS | End-Year Outlook bar chart |
| 15 | Country | PASS | Country Signals ranked bar chart |
| 16 | Topics | PASS | Topic Intelligence ranked bar chart, Signals Landscape |
| 17 | Region | PASS | Regional Signals ranked bar chart |
| 18 | City | PASS | Filter exists, disabled with "Not present in supplied dataset" (honest) |

## Filters

| # | Filter | Status | Notes |
|---|--------|--------|-------|
| 19 | End Year | PASS | Categorical dropdown, extreme values (2126, 2200) preserved |
| 20 | Topics | PASS | Multi-select with search, 97 unique values |
| 21 | Sector | PASS | Multi-select with search, 18 unique values |
| 22 | Region | PASS | Multi-select with search, 23 unique values |
| 23 | PEST | PASS | PESTLE filter, 9 categories (labeled PESTLE in UI) |
| 24 | Source | PASS | Multi-select with search, 403 unique values |
| 25 | SWOT | PASS | Filter exists, disabled with "Not present in supplied dataset" (honest) |
| 26 | Country | PASS | Multi-select with search, 56 unique values |
| 27 | City | PASS | Filter exists, disabled with "Not present in supplied dataset" (honest) |
| 28 | Additional filters from data | PASS | Start Year, Intensity range, Likelihood range, Relevance range added |
| 29 | Reset all filters | PASS | "Reset Filters" button in filter rail |

## Dashboard Features

| # | Requirement | Status | Evidence |
|---|------------|--------|----------|
| 30 | Dashboard reads from MongoDB via API | PASS | All data fetched from `/api/v1/*` endpoints |
| 31 | Filter state in URL (shareable/refreshable) | PASS | URL serialization via `serializeFilterState()` |
| 32 | Active filters as removable chips | PASS | Filter chips with one-click remove |
| 33 | All visualizations respond to filters | PASS | KPIs, charts, explorer all update on filter change |
| 34 | Records explorer with detail panel | PASS | Paginated table with sortable columns, detail sheet with all fields + external link |
| 35 | Original article links (not fetched) | PASS | External links with `target="_blank" rel="noopener noreferrer"` |
| 36 | Loading states | PASS | Skeleton loaders for all sections |
| 37 | Empty states | PASS | "No records match" message, honest empty facets |
| 38 | Error states | PASS | API offline, records load failure, all with retry buttons |

## Accessibility

| # | Requirement | Status | Evidence |
|---|------------|--------|----------|
| 39 | WCAG 2.2 AA targeting | PASS | Semantic landmarks, keyboard-operable controls, visible focus, contrast |
| 40 | Keyboard navigation | PASS | Roving focus in charts, tab navigation in filters and records |
| 41 | Screen reader support | PASS | ARIA labels, live regions, composite widget pattern for charts |
| 42 | Reduced motion support | PASS | `prefers-reduced-motion` respected in all animations |
| 43 | axe-core audit | PASS | 0 critical/serious violations across all viewports |

## Responsiveness

| # | Viewport | Status | Evidence |
|---|----------|--------|----------|
| 44 | 1440x900 (desktop) | PASS | Full filter rail + 3-column chart grid |
| 45 | 1024x768 (tablet) | PASS | Responsive layout, all content visible |
| 46 | 390x844 (mobile) | PASS | Filters in Sheet, charts stack vertically, no horizontal scroll |

## Testing

| # | Requirement | Status | Evidence |
|---|------------|--------|----------|
| 47 | Backend unit/integration tests | PASS | 113 tests (61 unit + 52 integration), all green |
| 48 | Frontend unit tests | PASS | 151 Vitest tests, all green |
| 49 | E2E flow tests | PASS | 94 Playwright tests, 3 consecutive runs all green |
| 50 | Production build | PASS | `pnpm build` succeeds, static pages generated |
| 51 | Lint clean | PASS | ruff format/check, ESLint, TypeScript strict — all clean |

## Security

| # | Requirement | Status | Evidence |
|---|------------|--------|----------|
| 52 | No raw JSON in browser | PASS | Frontend bundle does not contain `jsondata.json` |
| 53 | No raw Mongo operators from clients | PASS | All field names validated against whitelist |
| 54 | CORS restricted | PASS | `ALLOWED_ORIGINS` configurable, defaults to localhost |
| 55 | Security headers | PASS | X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy |
| 56 | External links safe | PASS | `rel="noopener noreferrer"`, protocol whitelist (http/https only) |
| 57 | Error responses safe | PASS | No stack traces or internal details leaked |

## Documentation

| # | Requirement | Status | Evidence |
|---|------------|--------|----------|
| 58 | README reproduces setup from clean machine | PASS | Step-by-step: env setup, install deps, start Mongo, seed, start API, start frontend |
| 59 | Verification commands documented | PASS | Backend, frontend, and E2E commands in README |
| 60 | Dataset integrity documented | PASS | SHA-256, record count, field list, City/SWOT status |
| 61 | Screenshots at required viewports | PASS | 1440x900, 1024x768, 390x844 captured |

## Final Success Criteria (PRD §12)

| # | Criterion | Status |
|---|-----------|--------|
| 62 | Start MongoDB, seed, start API, start web app | PASS |
| 63 | See real data on the dashboard | PASS |
| 64 | Apply single and combined filters, every visualization responds | PASS |
| 65 | Click a landscape bubble to filter by topic | PASS |
| 66 | Inspect records and open original links | PASS |
| 67 | See honest unavailable states for City and SWOT | PASS |
| 68 | Reproduce all automated checks | PASS |

---

**Overall: 68/68 requirements PASS**
