/**
 * Single authoritative filter-state model (Architecture §8.1).
 * `lib/filters.ts` is the only serializer/parser between the URL query string
 * and the typed `FilterState`. All filter components read/write through it.
 *
 * The URL uses the backend's repeated-parameter model (`?topic=oil&topic=gas`)
 * in a stable canonical order — never an opaque JSON blob.
 */

import type { FilterParams } from "./api";

export type CategoricalField =
  | "topic"
  | "sector"
  | "region"
  | "pestle"
  | "source"
  | "country";

export type YearField = "end_year" | "start_year";

export type RangeField =
  | "intensity_min"
  | "intensity_max"
  | "likelihood_min"
  | "likelihood_max"
  | "relevance_min"
  | "relevance_max";

export interface FilterState {
  topic: string[];
  sector: string[];
  region: string[];
  pestle: string[];
  source: string[];
  country: string[];
  end_year: number[];
  start_year: number[];
  intensity_min: number | null;
  intensity_max: number | null;
  likelihood_min: number | null;
  likelihood_max: number | null;
  relevance_min: number | null;
  relevance_max: number | null;
  q: string;
  page: number;
  sort: string;
  order: "asc" | "desc";
  record: string | null;
}

export const EMPTY_FILTERS: FilterState = {
  topic: [],
  sector: [],
  region: [],
  pestle: [],
  source: [],
  country: [],
  end_year: [],
  start_year: [],
  intensity_min: null,
  intensity_max: null,
  likelihood_min: null,
  likelihood_max: null,
  relevance_min: null,
  relevance_max: null,
  q: "",
  page: 1,
  sort: "source_row_index",
  order: "asc",
  record: null,
};

export const CATEGORICAL_FIELDS: readonly CategoricalField[] = [
  "topic",
  "sector",
  "region",
  "pestle",
  "source",
  "country",
];

export const YEAR_FIELDS: readonly YearField[] = ["end_year", "start_year"];

export const RANGE_FIELDS: readonly RangeField[] = [
  "intensity_min",
  "intensity_max",
  "likelihood_min",
  "likelihood_max",
  "relevance_min",
  "relevance_max",
];

export const FIELD_LABELS: Record<CategoricalField | YearField | RangeField | "q", string> = {
  topic: "Topic",
  sector: "Sector",
  region: "Region",
  pestle: "PESTLE",
  source: "Source",
  country: "Country",
  end_year: "End year",
  start_year: "Start year",
  intensity_min: "Min intensity",
  intensity_max: "Max intensity",
  likelihood_min: "Min likelihood",
  likelihood_max: "Max likelihood",
  relevance_min: "Min relevance",
  relevance_max: "Max relevance",
  q: "Search",
};

function uniqueNonEmpty(values: (string | null)[]): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    if (value === null) continue;
    const trimmed = value.trim();
    if (trimmed !== "" && !seen.has(trimmed)) seen.add(trimmed);
  }
  return [...seen];
}

function parseIntegers(values: string[]): number[] {
  const parsed: number[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed === "") continue;
    const number = Number(trimmed);
    if (Number.isInteger(number)) parsed.push(number);
  }
  return [...new Set(parsed)];
}

function parseOptionalInt(value: string | null): number | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const number = Number(trimmed);
  return Number.isInteger(number) ? number : null;
}

const SORTABLE_FIELDS: readonly string[] = [
  "source_row_index",
  "end_year",
  "start_year",
  "intensity",
  "likelihood",
  "relevance",
  "topic",
  "sector",
  "country",
];

function parsePage(value: string | null): number {
  const n = parseOptionalInt(value);
  return n !== null && n >= 1 ? n : 1;
}

function parseSort(value: string | null): string {
  const raw = (value ?? "").trim();
  return SORTABLE_FIELDS.includes(raw) ? raw : "source_row_index";
}

function parseOrder(value: string | null): "asc" | "desc" {
  const raw = (value ?? "").trim().toLowerCase();
  return raw === "desc" ? "desc" : "asc";
}

function parseRecordId(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return /^[0-9a-f]{64}$/.test(trimmed) ? trimmed : null;
}

/** URL query string → typed filter state. Unknown params are ignored. */
export function parseFilterState(search: string): FilterState {
  const params = new URLSearchParams(search);
  return {
    topic: uniqueNonEmpty(params.getAll("topic")),
    sector: uniqueNonEmpty(params.getAll("sector")),
    region: uniqueNonEmpty(params.getAll("region")),
    pestle: uniqueNonEmpty(params.getAll("pestle")),
    source: uniqueNonEmpty(params.getAll("source")),
    country: uniqueNonEmpty(params.getAll("country")),
    end_year: parseIntegers(params.getAll("end_year")).sort((a, b) => a - b),
    start_year: parseIntegers(params.getAll("start_year")).sort((a, b) => a - b),
    intensity_min: parseOptionalInt(params.get("intensity_min")),
    intensity_max: parseOptionalInt(params.get("intensity_max")),
    likelihood_min: parseOptionalInt(params.get("likelihood_min")),
    likelihood_max: parseOptionalInt(params.get("likelihood_max")),
    relevance_min: parseOptionalInt(params.get("relevance_min")),
    relevance_max: parseOptionalInt(params.get("relevance_max")),
    q: (params.get("q") ?? "").trim(),
    page: parsePage(params.get("page")),
    sort: parseSort(params.get("sort")),
    order: parseOrder(params.get("order")),
    record: parseRecordId(params.get("record")),
  };
}

/**
 * Canonical string for the filter dimensions only (topic…q), excluding the
 * records-list params (page/sort/order) and the UI-only `record` param.
 * Used as the query-key basis for facets/overview/records so pagination or
 * record-detail changes never refetch the analytical queries.
 */
export function serializeFilterParams(state: FilterState): string {
  const params = new URLSearchParams();
  for (const field of CATEGORICAL_FIELDS) {
    for (const value of state[field]) params.append(field, value);
  }
  for (const field of YEAR_FIELDS) {
    for (const value of state[field]) params.append(field, String(value));
  }
  for (const field of RANGE_FIELDS) {
    const value = state[field];
    if (value !== null) params.append(field, String(value));
  }
  if (state.q.trim() !== "") params.set("q", state.q.trim());
  return params.toString();
}

/**
 * Full canonical URL query string: filter dimensions plus the records-list
 * params (`page`, `sort`, `order`) and the `record` param. This is what the
 * address bar reflects.
 */
export function serializeFilterState(state: FilterState): string {
  const params = new URLSearchParams(serializeFilterParams(state));
  if (state.page > 1) params.set("page", String(state.page));
  if (state.sort !== "source_row_index") params.set("sort", state.sort);
  if (state.order !== "asc") params.set("order", state.order);
  if (state.record) params.set("record", state.record);
  return params.toString();
}

/** Typed filter state → backend repeated-parameter list (same canonical order). */
export function toFilterParams(state: FilterState): FilterParams {
  const params: FilterParams = [];
  for (const field of CATEGORICAL_FIELDS) {
    for (const value of state[field]) params.push([field, value]);
  }
  for (const field of YEAR_FIELDS) {
    for (const value of state[field]) params.push([field, String(value)]);
  }
  for (const field of RANGE_FIELDS) {
    const value = state[field];
    if (value !== null) params.push([field, String(value)]);
  }
  if (state.q.trim() !== "") params.push(["q", state.q.trim()]);
  return params;
}

export function isEmptyState(state: FilterState): boolean {
  return (
    CATEGORICAL_FIELDS.every((field) => state[field].length === 0) &&
    YEAR_FIELDS.every((field) => state[field].length === 0) &&
    RANGE_FIELDS.every((field) => state[field] === null) &&
    state.q.trim() === ""
  );
}

/** Total number of active filter selections (for badges and reset labels). */
export function countActiveFilters(state: FilterState): number {
  let count = 0;
  for (const field of CATEGORICAL_FIELDS) count += state[field].length;
  for (const field of YEAR_FIELDS) count += state[field].length;
  for (const field of RANGE_FIELDS) {
    if (state[field] !== null) count += 1;
  }
  if (state.q.trim() !== "") count += 1;
  return count;
}

export function toggleValue<T extends string | number>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function statesEqual(a: FilterState, b: FilterState): boolean {
  return serializeFilterParams(a) === serializeFilterParams(b);
}
