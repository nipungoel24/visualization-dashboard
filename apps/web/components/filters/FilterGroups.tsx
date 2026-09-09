"use client";

import { useState } from "react";
import { MorphIcon } from "morphicons/react";
import { ChevronDown, ChevronUp } from "lucide";
import { TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import type { FacetField, FacetsResponse } from "@/lib/api";
import {
  FIELD_LABELS,
  type CategoricalField,
  type FilterState,
  type YearField,
} from "@/lib/filters";
import { DisabledDimension } from "./DisabledDimension";
import type { FacetOption } from "./MultiSelectFilter";
import { MultiSelectFilter } from "./MultiSelectFilter";
import { RangeFilter } from "./RangeFilter";
import { SearchField } from "./SearchField";

export type MetricName = "intensity" | "likelihood" | "relevance";

interface FilterGroupsProps {
  filters: FilterState;
  facets: FacetsResponse | undefined;
  facetsLoading: boolean;
  facetsError: string | null;
  onRetryFacets: () => void;
  onToggle: (field: CategoricalField | YearField, value: string | number) => void;
  onClearField: (field: CategoricalField | YearField) => void;
  onMetricRange: (metric: MetricName, min: number | null, max: number | null) => void;
  onSearch: (value: string) => void;
}

function facetOptions(
  facets: FacetsResponse | undefined,
  field: FacetField,
): FacetOption[] {
  if (!facets) return [];
  return facets[field].values.map((item) => ({ value: item.value, count: item.count }));
}

function Group({
  id,
  title,
  activeCount,
  defaultOpen = true,
  children,
}: {
  id: string;
  title: string;
  activeCount: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b border-border pb-3">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          aria-controls={id}
          className="flex min-h-8 w-full cursor-pointer items-center justify-between gap-2 rounded-sm py-1 text-left transition-[background-color] duration-150 ease-out hover:bg-surface-muted"
        >
          <span className="flex items-center gap-2 font-mono text-micro font-medium tracking-wide text-foreground-muted uppercase">
            {title}
            {activeCount > 0 && (
              <Badge variant="primary" aria-label={`${activeCount} active in ${title}`}>
                {activeCount}
              </Badge>
            )}
          </span>
          <MorphIcon
            icon={open ? ChevronUp : ChevronDown}
            size={16}
            strokeWidth={1.75}
            reducedMotion="user"
            aria-hidden="true"
            className="text-foreground-muted"
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent id={id} className="space-y-2.5 pt-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function FieldControl({
  field,
  options,
  selected,
  isLoading,
  onToggle,
  onClear,
}: {
  field: CategoricalField | YearField;
  options: FacetOption[];
  selected: (string | number)[];
  isLoading: boolean;
  onToggle: (value: string | number) => void;
  onClear: () => void;
}) {
  const controlId = `filter-${field}`;
  return (
    <div>
      <Label htmlFor={controlId} className="mb-1 block">
        {FIELD_LABELS[field]}
      </Label>
      <div id={controlId}>
        <MultiSelectFilter
          label={FIELD_LABELS[field]}
          options={options}
          selected={selected}
          onToggle={onToggle}
          onClear={onClear}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

/**
 * Shared filter content for the desktop rail and the mobile sheet.
 * Every option count comes from the scoped `/facets` payload.
 */
export function FilterGroups({
  filters,
  facets,
  facetsLoading,
  facetsError,
  onRetryFacets,
  onToggle,
  onClearField,
  onMetricRange,
  onSearch,
}: FilterGroupsProps) {
  const groupActive = (fields: (CategoricalField | YearField)[]): number =>
    fields.reduce((total, field) => total + filters[field].length, 0);

  const metricActive =
    (["intensity_min", "intensity_max", "likelihood_min", "likelihood_max", "relevance_min", "relevance_max"] as const).filter(
      (field) => filters[field] !== null,
    ).length;

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="dashboard-search" className="mb-1 block">
          Search
        </Label>
        <div id="dashboard-search">
          <SearchField value={filters.q} onChange={onSearch} />
        </div>
      </div>

      {facetsError && (
        <div
          role="alert"
          className="rounded-md border border-border bg-surface p-3"
        >
          <p className="flex items-start gap-2 text-small">
            <TriangleAlert
              size={14}
              strokeWidth={1.75}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-danger"
            />
            <span>Filter options could not be loaded. {facetsError}</span>
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onRetryFacets}>
            Retry
          </Button>
        </div>
      )}

      <Group
        id="filter-group-signals"
        title="Signals"
        activeCount={groupActive(["topic", "sector", "pestle"])}
      >
        {(["topic", "sector", "pestle"] as const).map((field) => (
          <FieldControl
            key={field}
            field={field}
            options={facetOptions(facets, field)}
            selected={filters[field]}
            isLoading={facetsLoading}
            onToggle={(value) => onToggle(field, value)}
            onClear={() => onClearField(field)}
          />
        ))}
      </Group>

      <Group
        id="filter-group-geography"
        title="Geography"
        activeCount={groupActive(["region", "country"])}
      >
        {(["region", "country"] as const).map((field) => (
          <FieldControl
            key={field}
            field={field}
            options={facetOptions(facets, field)}
            selected={filters[field]}
            isLoading={facetsLoading}
            onToggle={(value) => onToggle(field, value)}
            onClear={() => onClearField(field)}
          />
        ))}
      </Group>

      <Group
        id="filter-group-provenance"
        title="Provenance"
        activeCount={groupActive(["source"])}
      >
        <FieldControl
          field="source"
          options={facetOptions(facets, "source")}
          selected={filters.source}
          isLoading={facetsLoading}
          onToggle={(value) => onToggle("source", value)}
          onClear={() => onClearField("source")}
        />
      </Group>

      <Group
        id="filter-group-time"
        title="Time"
        activeCount={groupActive(["end_year", "start_year"])}
      >
        {(["end_year", "start_year"] as const).map((field) => (
          <FieldControl
            key={field}
            field={field}
            options={facetOptions(facets, field)}
            selected={filters[field]}
            isLoading={facetsLoading}
            onToggle={(value) => onToggle(field, value)}
            onClear={() => onClearField(field)}
          />
        ))}
      </Group>

      <Group id="filter-group-metrics" title="Metrics" activeCount={metricActive}>
        {(["intensity", "likelihood", "relevance"] as const).map((metric) => (
          <div key={metric}>
            <Label className="mb-1 block capitalize">{metric}</Label>
            <RangeFilter
              label={metric}
              min={filters[`${metric}_min`]}
              max={filters[`${metric}_max`]}
              onChange={(min, max) => onMetricRange(metric, min, max)}
            />
          </div>
        ))}
      </Group>

      <div className="space-y-2.5 pb-1">
        <p className="font-mono text-micro font-medium tracking-wide text-foreground-muted uppercase">
          Unavailable
        </p>
        <DisabledDimension label="City" />
        <DisabledDimension label="SWOT" />
      </div>
    </div>
  );
}
