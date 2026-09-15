# Verification Report — InsightScope

Final verification results for Phase 7 submission readiness.

**Date**: 2026-09-15

**Commits**:
- Code-under-test / Phase 6 integration: `90ef0f8ad362618912dee483501e4b7203783b61`
- Phase 7 packaging (screenshots, docs): `1c06d74df2275867918d1e978056912db25c6541`
- Phase 7 closeout (verification corrections): see final commit below

---

## Backend Verification (apps/api)

| Check | Result |
|-------|--------|
| `uv run ruff format --check .` | 33 files already formatted — PASS |
| `uv run ruff check .` | All checks passed — PASS |
| `uv run pyright` | 0 errors, 0 warnings — PASS |
| `uv run pytest` | 113 passed in 10.40s — PASS |

### Test Breakdown

| Suite | Tests | Status |
|-------|-------|--------|
| integration/test_api_facets | 9 | PASS |
| integration/test_api_meta | 3 | PASS |
| integration/test_api_overview | 18 | PASS |
| integration/test_api_records | 14 | PASS |
| integration/test_seed | 8 | PASS |
| unit/test_config | 4 | PASS |
| unit/test_filters | 33 | PASS |
| unit/test_health | 2 | PASS |
| unit/test_normalize | 22 | PASS |
| **Total** | **113** | **ALL PASS** |

## Frontend Verification (apps/web)

| Check | Result |
|-------|--------|
| `pnpm lint` (ESLint) | 0 errors — PASS |
| `pnpm typecheck` (tsc --noEmit) | 0 errors — PASS |
| `pnpm test` (vitest) | 151 passed in 33.63s — PASS |
| `pnpm build` (next build) | Compiled successfully — PASS |

### Vitest Breakdown

| Suite | Tests | Status |
|-------|-------|--------|
| tooltip.spec.ts | 3 | PASS |
| palette.spec.ts | 7 | PASS |
| filters.spec.ts | 20 | PASS |
| format.spec.ts | 10 | PASS |
| treemap.spec.ts | 3 | PASS |
| dashboard-states.spec.tsx | 5 | PASS |
| record-detail.spec.tsx | 12 | PASS |
| agent3-records-accessibility.spec.tsx | 17 | PASS |
| explorer.spec.tsx | 7 | PASS |
| landscape.spec.ts | 17 | PASS |
| filter-ui.spec.tsx | 9 | PASS |
| agent3-filter-accessibility.spec.tsx | 29 | PASS |
| charts.spec.tsx | 12 | PASS |
| **Total** | **151** | **ALL PASS** |

## E2E Verification (Playwright) — Phase 7 Final Run

| Check | Result |
|-------|--------|
| `pnpm test:e2e` | 94/94 passed — PASS |
| Duration | 1.1 minutes |
| Failures | 0 |
| Skipped | 0 |
| Console errors | 0 captured |
| axe-core violations | 0 critical, 0 serious |

### E2E Breakdown

| Suite | Tests | Status |
|-------|-------|--------|
| smoke.spec.ts | 19 | PASS |
| records.spec.ts | 24 | PASS |
| accessibility.spec.ts | 19 | PASS |
| security.spec.ts | 6 | PASS |
| agent3-accessibility.spec.ts | 26 | PASS |
| **Total** | **94** | **ALL PASS** |

## Dataset Integrity

| Check | Result |
|-------|--------|
| SHA-256 of `data/raw/jsondata.json` | `f45b67f7d4a252c5daa3ec0dfd9c7ceb4e415106c404646f66bff93d9aeb1744` — MATCHES |
| Record count after seed | 1,000 — PASS |
| Idempotent seed | Second run: 0 inserted, 1000 matched — PASS |
| Fields | 17 source fields + `source_row_index` + `source_dataset_sha256` |

## Production Build

| Check | Result |
|-------|--------|
| `pnpm build` | ✓ Compiled successfully |
| Static pages | 3 generated (/, /_not-found) |
| Build output | `.next/` directory |

## Screenshots Captured

| Viewport | File | Size |
|----------|------|------|
| 1440x900 (desktop) | `desktop-1440x900-dashboard.png` | 644 KB |
| 1440x900 (filtered) | `desktop-1440x900-filtered-oil.png` | 534 KB |
| 1024x768 (tablet) | `tablet-1024x768-dashboard.png` | 504 KB |
| 1024x768 (filtered) | `tablet-1024x768-filtered-oil.png` | 441 KB |
| 390x844 (mobile) | `mobile-390x844-dashboard.png` | 526 KB |
| 390x844 (filtered) | `mobile-390x844-filtered-oil.png` | 451 KB |

## Summary

| Metric | Value |
|--------|-------|
| Backend tests | 113/113 PASS |
| Frontend tests | 151/151 PASS |
| E2E tests | 94/94 PASS |
| Lint violations | 0 |
| Type errors | 0 |
| axe violations | 0 |
| PRD requirements met | 68/68 |
| **Overall** | **PASS — Submission Ready** |
