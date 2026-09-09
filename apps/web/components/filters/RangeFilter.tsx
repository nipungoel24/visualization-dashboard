"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RangeFilterProps {
  label: string;
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
}

/**
 * Compact min/max numeric range control. Only valid pairs reach the URL —
 * an inverted range shows an inline hint instead of producing a 422.
 */
export function RangeFilter({ label, min, max, onChange }: RangeFilterProps) {
  const [invalid, setInvalid] = useState(false);
  const inputId = `range-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  const commit = (nextMin: number | null, nextMax: number | null) => {
    if (nextMin !== null && nextMax !== null && nextMin > nextMax) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onChange(nextMin, nextMax);
  };

  const parse = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (trimmed === "") return null;
    const value = Number(trimmed);
    return Number.isInteger(value) ? value : null;
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <Label htmlFor={`${inputId}-min`} className="sr-only">
            Minimum {label}
          </Label>
          <Input
            id={`${inputId}-min`}
            inputMode="numeric"
            placeholder="Min"
            aria-label={`Minimum ${label}`}
            defaultValue={min ?? ""}
            key={`min-${min}`}
            onBlur={(event) => commit(parse(event.target.value), max)}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit(parse(event.currentTarget.value), max);
            }}
          />
        </div>
        <span aria-hidden="true" className="text-foreground-muted">
          –
        </span>
        <div className="min-w-0 flex-1">
          <Label htmlFor={`${inputId}-max`} className="sr-only">
            Maximum {label}
          </Label>
          <Input
            id={`${inputId}-max`}
            inputMode="numeric"
            placeholder="Max"
            aria-label={`Maximum ${label}`}
            defaultValue={max ?? ""}
            key={`max-${max}`}
            onBlur={(event) => commit(min, parse(event.target.value))}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit(min, parse(event.currentTarget.value));
            }}
          />
        </div>
      </div>
      {invalid && (
        <p role="alert" className="mt-1 text-xs text-danger">
          Minimum cannot exceed maximum.
        </p>
      )}
    </div>
  );
}
