"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Free-text search across title, insight, topic, sector, source, country, region.
 * Commits are debounced (300ms) so typing never causes a refetch storm.
 */
export function SearchField({ value, onChange }: SearchFieldProps) {
  const [draft, setDraft] = useState(value);
  const [lastCommitted, setLastCommitted] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync the draft when the committed value changes externally (reset, chip
  // removal). Render-time adjustment — never setState inside an effect.
  if (value !== lastCommitted) {
    setLastCommitted(value);
    setDraft(value);
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const schedule = (next: string) => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next.trim()), 300);
  };

  return (
    <div className="relative">
      <Search
        size={14}
        strokeWidth={1.75}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-foreground-muted"
      />
      <Input
        type="search"
        aria-label="Search records"
        placeholder="Search title, topic, source…"
        value={draft}
        onChange={(event) => schedule(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            if (timer.current) clearTimeout(timer.current);
            onChange(draft.trim());
          }
        }}
        className="pr-8 pl-8"
      />
      {draft !== "" && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            if (timer.current) clearTimeout(timer.current);
            setDraft("");
            onChange("");
          }}
          className="absolute top-1/2 right-1 inline-flex h-10 min-w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm p-1 text-foreground-muted transition-[background-color,color] duration-150 ease-out hover:bg-surface-muted hover:text-foreground sm:h-8 sm:min-w-8 sm:right-1.5 sm:p-0"
        >
          <X size={14} strokeWidth={1.75} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
