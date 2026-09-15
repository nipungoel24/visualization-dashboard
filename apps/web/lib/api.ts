/**
 * Centralized typed API client for the backend.
 * All dashboard data flows through these fetchers — no scattered `fetch()` calls,
 * no client-side copy of the dataset (Rules R2).
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type ApiErrorCode =
  | "database_unavailable"
  | "dataset_not_seeded"
  | "unavailable_dimension"
  | "invalid_range"
  | "invalid_sort"
  | "invalid_record_id"
  | "record_not_found"
  | "validation_error"
  | "internal_error";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode | string;

  constructor(status: number, code: ApiErrorCode | string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function userFacingMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "database_unavailable":
        return "The dashboard could not reach the data service. Check that the API and database are running, then retry.";
      case "dataset_not_seeded":
        return "The dataset has not been imported yet. Run the seed command, then retry.";
      default:
        return error.message || "The dashboard could not load this section.";
    }
  }
  return "The dashboard could not reach the data service. Check your connection, then retry.";
}

export interface HealthResponse {
  status: string;
}

export interface ReadyResponse {
  status: string;
  database: string;
  dataset: string;
  document_count: number;
}

export interface MetaSchema {
  fields: string[];
  field_availability: Record<string, boolean>;
  populated: Record<string, number>;
}

export interface MetaResponse {
  source_filename: string;
  source_sha256: string;
  source_row_count: number;
  document_count: number;
  imported_at: string;
  import_version: number;
  normalization_version: number;
  api_version: string;
  schema: MetaSchema;
}

export interface FacetValue {
  value: string | number;
  count: number;
}

export interface FacetDimension {
  values: FacetValue[];
  missing_count: number;
}

export type FacetField =
  | "end_year"
  | "start_year"
  | "topic"
  | "sector"
  | "region"
  | "pestle"
  | "source"
  | "country";

export type FacetsResponse = Record<FacetField, FacetDimension>;

export interface SummarySection {
  filtered_count: number;
  avg_intensity: number | null;
  intensity_populated: number;
  avg_likelihood: number | null;
  likelihood_populated: number;
  avg_relevance: number | null;
  relevance_populated: number;
  complete_metrics_populated: number;
  complete_metrics_percentage: number;
  top_sector: string | null;
}

export interface MetricBin {
  label: string;
  min: number;
  max: number;
  count: number;
}

export interface MetricDistribution {
  bins: MetricBin[];
  not_specified: number;
}

export interface YearCount {
  year: number;
  count: number;
}

export interface OverviewResponse {
  summary: SummarySection;
  intensity: MetricDistribution;
  likelihood: MetricDistribution;
  relevance: MetricDistribution;
  years: { values: YearCount[]; missing_count: number };
  topics: {
    values: {
      topic: string;
      record_count: number;
      avg_intensity: number | null;
      avg_likelihood: number | null;
      avg_relevance: number | null;
    }[];
    missing_count: number;
  };
  sectors: {
    values: { sector: string; record_count: number; avg_intensity: number | null }[];
    missing_count: number;
  };
  pestle: {
    values: {
      pestle: string;
      record_count: number;
      avg_intensity: number | null;
      avg_likelihood: number | null;
      avg_relevance: number | null;
    }[];
    missing_count: number;
  };
  regions: {
    values: { region: string; record_count: number; avg_intensity: number | null }[];
    missing_count: number;
  };
  countries: {
    values: { country: string; record_count: number; avg_intensity: number | null }[];
    missing_count: number;
  };
  sources: {
    values: { source: string; record_count: number }[];
    missing_count: number;
    total_unique: number;
    limit: number;
    limited: boolean;
  };
  landscape: {
    values: {
      topic: string;
      record_count: number;
      avg_intensity: number | null;
      avg_likelihood: number | null;
      avg_relevance: number | null;
      dominant_sector: string | null;
    }[];
  };
  data_coverage: {
    values: {
      field: string;
      populated_count: number;
      missing_count: number;
      populated_percentage: number;
    }[];
  };
}

export interface RecordItem {
  id: string;
  source_row_index: number;
  end_year: number | null;
  intensity: number | null;
  sector: string | null;
  topic: string | null;
  insight: string | null;
  url: string | null;
  region: string | null;
  start_year: number | null;
  impact: number | null;
  added: string | null;
  published: string | null;
  country: string | null;
  relevance: number | null;
  pestle: string | null;
  source: string | null;
  title: string | null;
  likelihood: number | null;
}

export interface RecordsPage {
  items: RecordItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** Filter query params in the backend's repeated-parameter model. */
export type FilterParams = [string, string][];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isString);
}

type Validator<T> = (data: unknown) => data is T;

const validators = {
  meta: (d: unknown): d is MetaResponse =>
    isObject(d) &&
    isNumber(d.document_count) &&
    isObject(d.schema) &&
    isStringArray(d.schema.fields) &&
    isObject(d.schema.populated),

  facets: (d: unknown): d is FacetsResponse => {
    if (!isObject(d)) return false;
    for (const key of ["topic", "sector", "region", "country", "pestle", "source", "end_year", "start_year"] as const) {
      const dim = d[key];
      if (!isObject(dim) || !Array.isArray(dim.values) || !isNumber(dim.missing_count)) return false;
    }
    return true;
  },

  overview: (d: unknown): d is OverviewResponse => {
    if (!isObject(d)) return false;
    const s = d.summary;
    if (!isObject(s) || !isNumber(s.filtered_count)) return false;
    const dc = d.data_coverage;
    if (!isObject(dc) || !Array.isArray(dc.values)) return false;
    return true;
  },

  records: (d: unknown): d is RecordsPage =>
    isObject(d) &&
    Array.isArray(d.items) &&
    isNumber(d.total) &&
    isNumber(d.page) &&
    isNumber(d.page_size) &&
    isNumber(d.total_pages),

  record: (d: unknown): d is RecordItem =>
    isObject(d) &&
    isString(d.id) &&
    isNumber(d.source_row_index),

  ready: (d: unknown): d is ReadyResponse =>
    isObject(d) &&
    isString(d.status) &&
    isString(d.database) &&
    isString(d.dataset) &&
    isNumber(d.document_count),

  health: (d: unknown): d is HealthResponse =>
    isObject(d) && isString(d.status),
} as const;

async function request<T>(
  path: string,
  params?: FilterParams,
  validator?: Validator<T>,
): Promise<T> {
  const query = params?.length
    ? `?${params.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&")}`
    : "";
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1${path}${query}`);
  } catch {
    throw new ApiError(0, "database_unavailable", "The data service is unreachable.");
  }
  if (!response.ok) {
    let code: string = "internal_error";
    let message = "The dashboard could not load this section.";
    try {
      const payload = (await response.json()) as {
        error?: { code?: string; message?: string };
      };
      if (payload.error?.code) code = payload.error.code;
      if (payload.error?.message) message = payload.error.message;
    } catch {
      // Keep the generic message when the body is not JSON.
    }
    throw new ApiError(response.status, code, message);
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(response.status, "validation_error", "The data service returned invalid JSON.");
  }
  if (validator && !validator(data)) {
    throw new ApiError(response.status, "validation_error", "The data service returned an unexpected response shape.");
  }
  return data as T;
}

export const api = {
  health: () => request<HealthResponse>("/health", undefined, validators.health),
  ready: () => request<ReadyResponse>("/ready", undefined, validators.ready),
  meta: () => request<MetaResponse>("/meta", undefined, validators.meta),
  facets: (params: FilterParams) => request<FacetsResponse>("/facets", params, validators.facets),
  overview: (params: FilterParams) => request<OverviewResponse>("/overview", params, validators.overview),
  records: (
    params: FilterParams,
    pagination?: { page?: number; pageSize?: number; sort?: string; order?: string },
  ) => {
    const all: FilterParams = [...params];
    if (pagination) {
      if (pagination.page && pagination.page > 1) all.push(["page", String(pagination.page)]);
      if (pagination.pageSize) all.push(["page_size", String(pagination.pageSize)]);
      if (pagination.sort) all.push(["sort", pagination.sort]);
      if (pagination.order) all.push(["order", pagination.order]);
    }
    return request<RecordsPage>("/records", all, validators.records);
  },
  record: (id: string) => request<RecordItem>(`/records/${encodeURIComponent(id)}`, undefined, validators.record),
};
