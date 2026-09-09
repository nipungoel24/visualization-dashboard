"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FilterGroups, type MetricName } from "@/components/filters/FilterGroups";
import type { FacetsResponse } from "@/lib/api";
import {
  countActiveFilters,
  type CategoricalField,
  type FilterState,
  type YearField,
} from "@/lib/filters";

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

/** Mobile filter drawer (<1024px). Same content as the desktop rail. */
export function FilterSheet({ open, onOpenChange, onReset, filters, ...groupProps }: FilterSheetProps) {
  const active = countActiveFilters(filters);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent id="mobile-filter-sheet">
        <SheetHeader>
          <SheetTitle>
            Filters
            {active > 0 && (
              <span className="ml-2 font-mono text-micro font-medium text-foreground-muted">
                {active} active
              </span>
            )}
          </SheetTitle>
        </SheetHeader>
        <SheetBody>
          <FilterGroups filters={filters} {...groupProps} />
        </SheetBody>
        <SheetFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onReset();
            }}
            disabled={active === 0}
            className="w-full"
          >
            <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />
            Reset filters{active > 0 ? ` (${active})` : ""}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
