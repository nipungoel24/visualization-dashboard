# PRD — InsightScope: Global Intelligence Dashboard

Product working name: **InsightScope — Global Intelligence Dashboard**
Repository name: `blackcoffer-visualization-dashboard`
Document version: 1.0 (Phase 0)
Status: Approved for planning baseline — governs all implementation phases.

---

## 1. Project Summary

InsightScope is a single-page data intelligence dashboard that visualizes a fixed, supplied
dataset of ~1,000 intelligence/analytics records. The product presents aggregated signals —
intensity, likelihood, and relevance — across topics, sectors, regions, countries, PESTLE
categories, sources, and years, with a cross-filtering filter system and a searchable record
explorer.

The application reads data exclusively from MongoDB through a versioned FastAPI backend. The
browser never loads the raw JSON file.

## 2. Objective

Fulfill the Blackcoffer "Visualization Dashboard" test assignment:

- Build a polished, interactive dashboard from the supplied `data/raw/jsondata.json`.
- Data pipeline: `jsondata.json -> validation/normalization -> MongoDB -> FastAPI -> Next.js -> D3 visualizations`.
- Provide the assignment's required variables (Intensity, Likelihood, Relevance, Year, Country,
  Topics, Region) and required filters (End Year, Topics, Sector, Region, PESTLE, Source, SWOT,
  Country, City) using only the supplied data.

## 3. Assignment Requirements (from `reference/Assignment.docx`)

Quoted/paraphrased from the original assignment document:

- Use the given JSON data only ("You must use the given data only").
- Create a MongoDB database from the JSON data.
- Dashboard must read data from the MongoDB database via a backend API (Node/Python).
- Backend: Python FastAPI; Frontend: Next.js/React (both explicitly permitted).
- Charts: D3.js ("highly recommended").
- Important variables to visualize: Intensity, Likelihood, Relevance, Year, Country, Topics, Region, City.
- Required filters: End Year, Topics, Sector, Region, PEST, Source, SWOT, Country, City.
- "Any other control or filters that you can add from the data, best of your knowledge."
- Interactive graphs, charts and visuals are recommended.
- Creative visualizations that generate insights are encouraged.

## 4. Target Users

- Recruitment reviewers evaluating the assignment (primary).
- Analysts exploring intelligence signals across sectors/regions (secondary persona).

## 5. User Needs

1. See overall dataset health and coverage at a glance.
2. Compare topics/sectors/regions by intensity, likelihood, and relevance.
3. Drill into a subset of records via combinable filters and see every visualization react.
4. Understand how representative any aggregate is (record counts shown with averages).
5. Inspect individual records and follow links to the original source articles.
6. Trust that the dashboard never invents or enriches data.

## 6. User Stories

- As a reviewer, I open the dashboard and see real data with KPIs so I can verify the pipeline works.
- As an analyst, I filter Topic = "oil" and see all charts, KPIs, and the explorer update to the filtered set.
- As an analyst, I combine `topic IN [oil, gas] AND country = India AND pestle = Economic` and the dashboard applies OR-within-field, AND-across-fields semantics consistently.
- As an analyst, I click a topic bubble in the Signals Landscape and it becomes an active filter.
- As an analyst, I reset all filters with one click.
- As an analyst, I refresh or share a URL and the exact filter state is restored.
- As an analyst, I open a record and see every available field plus the original article link (without fetching it).
- As a reviewer, I see that City and SWOT filters exist but are honestly disabled with "Not present in supplied dataset" instead of fabricated options.
- As a mobile user, I can reach all filters through a Sheet and navigate charts without horizontal document scrolling.

## 7. Functional Requirements

### 7.1 Data pipeline

- FR-1: `data/raw/jsondata.json` is immutable input. It is never imported by the frontend.
- FR-2: A seed command validates the dataset, normalizes it, and loads it into MongoDB idempotently (running twice never duplicates records).
- FR-3: Normalization: blank strings -> `null`; trailing/leading whitespace trimmed from categorical strings; numeric values keep their type and are never defaulted to 0.
- FR-4: Deterministic record IDs derived from the source dataset identity plus the original row
  index (`sha256("<dataset_sha256>:<source_row_index>")`) so re-seeding is stable and row
  identity survives normalization-rule changes.
- FR-5: Dataset metadata (filename, SHA-256, imported timestamp, document count, schema keys, field availability) is stored in MongoDB and exposed by the API.

### 7.2 Backend API (versioned, `/api/v1/*`)

- FR-6: `GET /api/v1/health` — process health only.
- FR-7: `GET /api/v1/ready` — verifies MongoDB connectivity.
- FR-8: `GET /api/v1/meta` — dataset metadata, record count, source hash, known fields, per-field availability, City availability = false, SWOT availability = false.
- FR-9: `GET /api/v1/facets` — valid filter options with counts (counts scoped by the other active filters).
- FR-10: `GET /api/v1/overview` — one filtered aggregate payload (summary, intensity, likelihood, relevance, years, topics, sectors, regions, countries, pestle, sources, landscape, dataCoverage) built with a single MongoDB `$facet` pipeline.
- FR-11: `GET /api/v1/records` — paginated filtered records (page, pageSize with a maximum, whitelisted sort fields, optional text search).
- FR-12: `GET /api/v1/records/{id}` — single record detail.
- FR-13: Filter semantics are centralized: multi-value within a field = OR; across fields = AND. One shared implementation for all endpoints.
- FR-14: No raw Mongo operators accepted from clients; all field names validated against a whitelist.

### 7.3 Frontend dashboard

- FR-15: Header: product name, dataset record status (count + last import), API connectivity indicator, compact About/Data Provenance action.
- FR-16: Filter rail (desktop): End Year, Topics, Sector, Region, PESTLE, Source, Country, City (unavailable), SWOT (unavailable), plus optional Start Year, Intensity, Likelihood, Relevance range filters, and Reset Filters.
- FR-17: Mobile: filters move into a Sheet; charts stack vertically; tables scroll inside their own container; no document-level horizontal overflow.
- FR-18: Filter state is serialized to the URL so filtered views are refreshable and shareable; filter changes never reload the page.
- FR-19: Active filters are displayed as removable chips with one-click reset.
- FR-20: All visualizations + KPIs respond to the active filters.

### 7.4 Visualizations

- FR-21: KPI strip — filtered record count, average intensity, average likelihood, average relevance, and complete-metrics coverage (share of filtered records where intensity, likelihood, and relevance are all non-null).
- FR-22: Signals Landscape (flagship, D3): bubbles per topic; X = average likelihood, Y = average relevance, radius = average intensity, color = dominant sector. Tooltip: topic, record count, and the three averages. Click applies the topic as a filter. Labels must state that metrics are averages.
- FR-23: End Year — categorical bar chart of the actual non-empty year values plus a "Not specified" category (no continuous time scale; extreme future values like 2126/2200 must remain visible as their own categories).
- FR-24: Sector — D3 treemap; area = record count; fill intensity = average intensity.
- FR-25: PESTLE — comparison chart using the nine supplied labels exactly (Economic, Environmental, Healthcare, Industries, Lifestyles, Organization, Political, Social, Technological).
- FR-26: Region — distribution/ranking built only from supplied data (no external map data).
- FR-27: Country — ranked distribution.
- FR-28: Topics — ranked interactive chart; clicking a topic applies it as a filter.
- FR-29: Source — ranking (top sources) with total-unique note (403 unique values).
- FR-30: Intensity / Likelihood / Relevance — distribution visualizations (histogram/binned bars) with nulls labeled as "Not specified".
- FR-31: Data Coverage — % populated per key field, comparing the full dataset vs the current filtered selection.
- FR-32: Records Explorer — paginated table (Title, Topic, Sector, Country, Region, End Year, Intensity, Likelihood, Relevance, Source) with a detail panel (all available fields + original URL as an external link; content is never fetched).

### 7.5 Cross-cutting

- FR-33: Every visualization has a descriptive title, explanatory subtitle when needed, accessible labels, loading state, sensible empty state, and tooltips where useful.
- FR-34: WCAG 2.2 AA targeting: semantic landmarks, keyboard-operable controls, visible focus, contrast, non-color meaning, reduced-motion support, tooltips never the sole carrier of essential info.
- FR-35: Error handling: API unavailable, Mongo unavailable, malformed response, empty filter result, unexpected errors — all produce user-facing messages, never a blank page; technical details are logged server-side only.
- FR-36: Responsiveness verified at 1440x900, 1024x768, 390x844.

## 8. Source-Data Audit Summary (verified independently)

- SHA-256 of `data/raw/jsondata.json`: `f45b67f7d4a252c5daa3ec0dfd9c7ceb4e415106c404646f66bff93d9aeb1744` — matches expected.
- 1,000 records, 17 fields, all present in every record: `end_year`, `intensity`, `sector`, `topic`, `insight`, `url`, `region`, `start_year`, `impact`, `added`, `published`, `country`, `relevance`, `pestle`, `source`, `title`, `likelihood`.
- Unique non-empty values: topics 97, sectors 18, regions 23, countries 56, PESTLE 9, sources 403.
- No `city` field. No `swot` field. (See section 9.)
- Numeric fields are integers or blank strings (mixed types; normalization handles this). Ranges: intensity 1–96, likelihood 1–4, relevance 1–7.
- `end_year` non-empty in 258 records; values 2016–2200, including extreme future values (2126 x1, 2200 x1) that must be preserved.
- No duplicate records (1,000 unique content hashes). Titles are 1,000/1,000 unique; URLs are 670 unique (URL is not a reliable key).
- `added`/`published` use the format `"January, 20 2017 03:51:25"` (comma after month name); parsed for display only.
- Population rates: title/insight/url/added 100%, relevance/source 99.9%, intensity/likelihood 96.2%, published 92.6%, topic/pestle 90.7%, sector 77.1%, region 54.7%, country 35.0%, start_year 31.0%, end_year 25.8%, impact 3.4%.

## 9. Data Constraints and Source-Only-Data Policy

- The dashboard uses only the supplied dataset. No scraping, geocoding, classification, LLM enrichment, or external fetching of article content.
- The supplied data has no City field and no SWOT field. Per assignment they must appear in the filter schema; therefore:
  - City filter and SWOT filter exist in the UI but are disabled with the explanation "Not present in supplied dataset".
  - The backend metadata endpoint reports `city.available = false`, `swot.available = false`.
- Missing values are shown as "Not specified"/null, never as 0 or invented values.
- Unusual source values are preserved: extreme `end_year` values (e.g., 2200), hierarchical region overlaps (e.g., "Africa" vs "Eastern Africa"), and the case-distinct pair "World"/"world" are displayed exactly as supplied. Only accidental leading/trailing whitespace is trimmed (e.g., `"CNBC "`).
- Derived aggregates (averages, counts, percentages, rankings, coverage metrics) are calculations made solely from supplied data and are allowed.
- Article URLs are used only as original-source links.

## 10. Out of Scope

- Authentication, user accounts, multi-tenancy.
- Real-time data updates, websockets, message queues.
- External data enrichment, live scraping, AI-generated insights.
- Geographic map rendering with external GeoJSON (decorative dependency).
- Mobile native apps (the assignment permits but does not require them).
- CSV/chart export (optional, only after all required functionality is complete).
- Dark mode is optional; the light theme is the primary, non-negotiable quality bar.

## 11. Acceptance Criteria

1. `data/raw/jsondata.json` unchanged (hash verified) and never imported by the frontend.
2. Seed loads 1,000 normalized records into MongoDB; a second run changes nothing (idempotent).
3. All API endpoints behave per FR-6..FR-14 with correct filter semantics and validation.
4. Every required visualization renders from filtered API data with loading/empty/error states.
5. City and SWOT availability is handled transparently (disabled UI + meta `available: false`).
6. Combined filters update KPIs, all charts, and the explorer; URL state round-trips.
7. Responsive behavior verified at the three required viewports.
8. WCAG 2.2 AA basics pass (keyboard, focus, contrast, landmarks, reduced motion); Playwright + axe run green.
9. Backend unit/integration tests, frontend unit tests, and E2E flow pass.
10. Production build of the frontend passes; backend starts cleanly against Docker MongoDB.
11. README reproduces the whole setup from a clean machine.

## 12. Final Success Criteria

A reviewer can, from a clean clone:

- start MongoDB (Docker), seed, start API, start web app;
- see real data on the dashboard;
- apply single and combined filters and observe every visualization respond;
- click a landscape bubble to filter by topic;
- inspect records and open original links;
- see honest unavailable states for City and SWOT;
- and reproduce all automated checks (lint, typecheck, unit, integration, E2E, production build).
