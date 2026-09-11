/**
 * TanStack Query wiring (Architecture §8.1). Query keys encode the serialized
 * filter state. One consistent filtered `overview` query feeds every section.
 */

"use client";

import { QueryClient, keepPreviousData, useQuery } from "@tanstack/react-query";
import { ApiError, api, type FilterParams } from "./api";
import { serializeFilterParams, type FilterState } from "./filters";

let browserClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    return new QueryClient({
      defaultOptions: {
        queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
      },
    });
  }
  browserClient ??= new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Retry server-side failures only; 4xx responses fail fast.
        retry: (count, error) =>
          count < 2 && (!(error instanceof ApiError) || error.status >= 500),
        refetchOnWindowFocus: false,
        // Keep the previous filtered payload visible during filter transitions.
        placeholderData: keepPreviousData,
      },
    },
  });
  return browserClient;
}

export const queryKeys = {
  meta: ["meta"] as const,
  ready: ["ready"] as const,
  facets: (filters: FilterState) => ["facets", serializeFilterParams(filters)] as const,
  overview: (filters: FilterState) =>
    ["overview", serializeFilterParams(filters)] as const,
  records: (
    filters: FilterState,
    sort: string,
    order: string,
    page: number,
    pageSize: number,
  ) =>
    ["records", serializeFilterParams(filters), sort, order, page, pageSize] as const,
  record: (id: string) => ["record", id] as const,
};

export function useMetaQuery() {
  return useQuery({ queryKey: queryKeys.meta, queryFn: () => api.meta() });
}

export function useReadyQuery() {
  return useQuery({ queryKey: queryKeys.ready, queryFn: () => api.ready() });
}

export function useFacetsQuery(filters: FilterState, params: FilterParams) {
  return useQuery({
    queryKey: queryKeys.facets(filters),
    queryFn: () => api.facets(params),
  });
}

export function useOverviewQuery(filters: FilterState, params: FilterParams) {
  return useQuery({
    queryKey: queryKeys.overview(filters),
    queryFn: () => api.overview(params),
  });
}

const DEFAULT_PAGE_SIZE = 25;

export function useRecordsQuery(
  filters: FilterState,
  params: FilterParams,
  opts: { sort: string; order: string; page: number; pageSize?: number },
) {
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  return useQuery({
    queryKey: queryKeys.records(filters, opts.sort, opts.order, opts.page, pageSize),
    queryFn: () =>
      api.records(params, {
        page: opts.page,
        pageSize,
        sort: opts.sort,
        order: opts.order,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useRecordQuery(id: string | null) {
  return useQuery({
    queryKey: queryKeys.record(id!),
    queryFn: () => api.record(id!),
    enabled: id !== null,
  });
}
