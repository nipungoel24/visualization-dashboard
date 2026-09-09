"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FilterGroups, type MetricName } from "@/components/filters/FilterGroups";
import type { FacetsResponse } from "@/lib/api";
import {
  countActiveFilters,
  type CategoricalField,
  type FilterState,
  type YearField,
} from "@/lib/filters";

interface RailProps {
  filters: FilterState;
  facets: FacetsResponse | undefined;
  facetsLoading: boolean;
  facetsError: string | null;
  onRetryFacets: () => void;
  onToggle: (field: CategoricalField | YearField, value: string | number) => void;
  onClearField: (field: CategoricalField | YearField) => void;
  onMetricRange: (metric: MetricName, min: number | null, max: number | null) => void;
  onSearch: (value: string) => void;
  onReset: () => void;
}

/**
 * Desktop filter rail (≥1024px): sticky grouped sections + quiet reset.
 * The same `FilterGroups` content renders inside the mobile Sheet.
 */
export function FilterRail(props: RailProps) {
  const { onReset, filters } = props;
  const active = countActiveFilters(filters);
  return (
    <aside
      aria-label="Dashboard filters"
      className="hidden w-68 shrink-0 lg:block"
    >
      <div className="sticky top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto px-4 py-4">
        <FilterGroups {...props} />
        <div className="mt-3 border-t border-border pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={active === 0}
            className="w-full"
          >
            <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />
            Reset filters{active > 0 ? ` (${active})` : ""}
          </Button>
        </div>
      </div>
    </aside>
  );
}
