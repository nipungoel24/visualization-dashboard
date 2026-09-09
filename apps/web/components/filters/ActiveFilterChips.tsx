"use client";

import { RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CATEGORICAL_FIELDS,
  FIELD_LABELS,
  RANGE_FIELDS,
  YEAR_FIELDS,
  type FilterState,
} from "@/lib/filters";

interface ActiveFilterChipsProps {
  filters: FilterState;
  onRemoveValue: (field: "topic" | "sector" | "region" | "pestle" | "source" | "country" | "end_year" | "start_year", value: string | number) => void;
  onClearRange: (field: (typeof RANGE_FIELDS)[number]) => void;
  onClearSearch: () => void;
  onReset: () => void;
}

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

const MAX_VISIBLE_CHIPS = 10;

/**
 * Compact active-filter display with individual removal + reset.
 * Long selections are summarized instead of consuming the viewport.
 */
export function ActiveFilterChips({
  filters,
  onRemoveValue,
  onClearRange,
  onClearSearch,
  onReset,
}: ActiveFilterChipsProps) {
  const chips: Chip[] = [];

  for (const field of CATEGORICAL_FIELDS) {
    for (const value of filters[field]) {
      chips.push({
        key: `${field}:${value}`,
        label: `${FIELD_LABELS[field]}: ${value}`,
        onRemove: () => onRemoveValue(field, value),
      });
    }
  }
  for (const field of YEAR_FIELDS) {
    for (const value of filters[field]) {
      chips.push({
        key: `${field}:${value}`,
        label: `${FIELD_LABELS[field]}: ${value}`,
        onRemove: () => onRemoveValue(field, value),
      });
    }
  }
  for (const field of RANGE_FIELDS) {
    const value = filters[field];
    if (value !== null) {
      chips.push({
        key: `${field}:${value}`,
        label: `${FIELD_LABELS[field]} ${value}`,
        onRemove: () => onClearRange(field),
      });
    }
  }
  if (filters.q.trim() !== "") {
    chips.push({
      key: `q:${filters.q}`,
      label: `Search: “${filters.q.trim()}”`,
      onRemove: onClearSearch,
    });
  }

  if (chips.length === 0) return null;

  const visible = chips.slice(0, MAX_VISIBLE_CHIPS);
  const hidden = chips.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
      {visible.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex h-7 max-w-56 items-center gap-1 rounded-sm bg-surface-muted pr-0.5 pl-2 text-xs"
        >
          <span className="truncate">{chip.label}</span>
          <button
            type="button"
            aria-label={`Remove filter ${chip.label}`}
            onClick={chip.onRemove}
            className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm text-foreground-muted transition-[background-color,color] duration-150 ease-out hover:bg-border hover:text-foreground"
          >
            <X size={12} strokeWidth={2} aria-hidden="true" />
          </button>
        </span>
      ))}
      {hidden > 0 && (
        <span className="font-mono text-micro text-foreground-muted">+{hidden} more</span>
      )}
      <Button type="button" variant="quiet" size="sm" onClick={onReset}>
        <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />
        Reset filters ({chips.length})
      </Button>
    </div>
  );
}
