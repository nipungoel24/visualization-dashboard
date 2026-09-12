"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ActiveFilterChips } from "@/components/filters/ActiveFilterChips";
import type { MetricName } from "@/components/filters/FilterGroups";
import { userFacingMessage } from "@/lib/api";
import { useCanonicalSectors } from "@/lib/d3/palette";
import {
  EMPTY_FILTERS,
  countActiveFilters,
  isEmptyState,
  parseFilterState,
  serializeFilterState,
  toFilterParams,
  toggleValue,
  type CategoricalField,
  type FilterState,
  type YearField,
} from "@/lib/filters";
import {
  useFacetsQuery,
  useMetaQuery,
  useOverviewQuery,
  useReadyQuery,
} from "@/lib/query";
import { FilterRail } from "../layout/FilterRail";
import { FilterSheet } from "../layout/FilterSheet";
import { Header } from "../layout/Header";
import { RecordsExplorer } from "../records/RecordsExplorer";
import { KpiStrip } from "./KpiStrip";
import { VisualizationSections } from "./VisualizationSections";
import { ZeroResults } from "./ZeroResults";

/**
 * Dashboard composition root.
 *
 * Partial-failure policy: `/meta` or `/ready` failures degrade the header only;
 * a `/facets` failure shows a rail-level banner with retry while the rest of the
 * page keeps working; an `/overview` failure replaces the KPI strip, sections
 * and records count with an error + retry (they all derive from that payload).
 */
export function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters = useMemo(
    () => parseFilterState(searchParams.toString()),
    [searchParams],
  );
  const params = useMemo(() => toFilterParams(filters), [filters]);

  const update = useCallback(
    (next: FilterState) => {
      const query = serializeFilterState(next);
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const meta = useMetaQuery();
  const ready = useReadyQuery();
  const facets = useFacetsQuery(filters, params);
  const overview = useOverviewQuery(filters, params);

  const readyOk = ready.data?.status === "ready" && ready.data.dataset === "seeded";
  const serviceDown = ready.isError || meta.isError;
  const hasResults =
    overview.data !== undefined && overview.data.summary.filtered_count > 0;
  const isZeroResult =
    overview.data !== undefined && overview.data.summary.filtered_count === 0;

  const handleToggle = useCallback(
    (field: CategoricalField | YearField, value: string | number) => {
      const next = { ...filters };
      if (field === "end_year" || field === "start_year") {
        const numeric = typeof value === "number" ? value : Number(value);
        if (!Number.isInteger(numeric)) return;
        next[field] = toggleValue(filters[field], numeric);
      } else {
        next[field] = toggleValue(filters[field], String(value));
      }
      update({ ...next, page: 1 });
    },
    [filters, update],
  );

  const handleClearField = useCallback(
    (field: CategoricalField | YearField) => {
      if (filters[field].length === 0) return;
      update({ ...filters, [field]: [], page: 1 });
    },
    [filters, update],
  );

  const handleMetricRange = useCallback(
    (metric: MetricName, min: number | null, max: number | null) => {
      update({ ...filters, [`${metric}_min`]: min, [`${metric}_max`]: max, page: 1 });
    },
    [filters, update],
  );

  const handleSearch = useCallback(
    (value: string) => {
      if (value === filters.q) return;
      update({ ...filters, q: value, page: 1 });
    },
    [filters, update],
  );

  const handleReset = useCallback(() => {
    if (serializeFilterState(filters) === serializeFilterState(EMPTY_FILTERS)) return;
    update(EMPTY_FILTERS);
  }, [filters, update]);

  const handleSetPage = useCallback(
    (page: number) => {
      if (page === filters.page) return;
      update({ ...filters, page });
    },
    [filters, update],
  );

  const handleSetSort = useCallback(
    (sort: string, order: "asc" | "desc") => {
      if (sort === filters.sort && order === filters.order) return;
      update({ ...filters, sort, order, page: 1 });
    },
    [filters, update],
  );

  const handleOpenRecord = useCallback(
    (id: string) => {
      if (filters.record === id) return;
      // Push so the browser Back/Forward can close and reopen the drawer while
      // preserving filter/page/sort state.
      const next = { ...filters, record: id };
      const query = serializeFilterState(next);
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [filters, router, pathname],
  );

  const handleCloseRecord = useCallback(() => {
    if (!filters.record) return;
    update({ ...filters, record: null });
  }, [filters, update]);

  const canonicalSectors = useCanonicalSectors(overview.data?.sectors.values);

  const railProps = {
    filters,
    facets: facets.data,
    facetsLoading: facets.isPending,
    facetsError: facets.isError ? userFacingMessage(facets.error) : null,
    onRetryFacets: () => void facets.refetch(),
    onToggle: handleToggle,
    onClearField: handleClearField,
    onMetricRange: handleMetricRange,
    onSearch: handleSearch,
    onReset: handleReset,
  };

  return (
    <div className="min-h-dvh">
      <Header
        meta={meta.data}
        ready={ready.data}
        readyOk={readyOk}
        serviceDown={serviceDown}
        filtersOpen={filtersOpen}
        onOpenFilters={() => setFiltersOpen(true)}
        activeFilterCount={countActiveFilters(filters)}
      />
      <div className="mx-auto flex max-w-[1400px] items-start">
        <FilterRail {...railProps} />
        <main id="dashboard-content" className="min-w-0 flex-1 space-y-4 px-3 py-4 sm:px-4">
          <h1 className="sr-only">Global Intelligence Dashboard</h1>
          {!isEmptyState(filters) && (
            <ActiveFilterChips
              filters={filters}
              onRemoveValue={handleToggle}
              onClearRange={(field) =>
                update({ ...filters, [field]: null })
              }
              onClearSearch={() => handleSearch("")}
              onReset={handleReset}
            />
          )}

          <KpiStrip
            summary={overview.data?.summary}
            isLoading={overview.isPending}
            error={overview.isError ? userFacingMessage(overview.error) : null}
            onRetry={() => void overview.refetch()}
          />

          {isZeroResult ? (
            <ZeroResults onReset={handleReset} />
          ) : (
            <>
              <VisualizationSections
                overview={overview.data}
                isPending={overview.isPending}
                isError={overview.isError}
                errorMessage={overview.isError ? userFacingMessage(overview.error) : null}
                onRetry={() => void overview.refetch()}
                hasResults={hasResults}
                filters={filters}
                canonicalSectors={canonicalSectors}
                onToggle={handleToggle}
              />
              <RecordsExplorer
                filters={filters}
                params={params}
                total={overview.data?.summary.filtered_count}
                onChangePage={handleSetPage}
                onChangeSort={handleSetSort}
                onOpenRecord={handleOpenRecord}
                onCloseRecord={handleCloseRecord}
              />
            </>
          )}
        </main>
      </div>
      <FilterSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        {...railProps}
      />
    </div>
  );
}
