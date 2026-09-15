"use client";

import { useState } from "react";
import { MorphIcon } from "morphicons/react";
import { ChevronDown, ChevronUp } from "lucide";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface FacetOption {
  value: string | number;
  count: number;
}

interface MultiSelectFilterProps {
  label: string;
  options: FacetOption[];
  selected: (string | number)[];
  onToggle: (value: string | number) => void;
  onClear: () => void;
  isLoading?: boolean;
}

/**
 * Searchable multi-select filter (Trigger + Popover + Command).
 * Option counts come from the scoped `/facets` response — never recomputed here.
 * Source casing is preserved exactly ("World" and "world" stay distinct).
 */
export function MultiSelectFilter({
  label,
  options,
  selected,
  onToggle,
  onClear,
  isLoading = false,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedSet = new Set(selected);

  // cmdk owns the accessible listbox, keyboard navigation and selection.
  // Filtering itself is a one-line substring match over our option array:
  // cmdk's built-in DOM reorder crashes under jsdom, and explicit filtering
  // keeps search behavior unit-testable without changing any UX.
  const needle = query.trim().toLowerCase();
  const visible =
    needle === ""
      ? options
      : options.filter((option) => String(option.value).toLowerCase().includes(needle));

  return (
    <div>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Filter by ${label}`}
            aria-expanded={open}
            disabled={isLoading}
            className={cn(
              "flex h-8 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-surface px-2.5 text-small transition-[border-color] duration-150 ease-out outline-none hover:border-border-strong focus-visible:border-primary disabled:cursor-wait disabled:opacity-70",
              selected.length > 0 ? "text-foreground" : "text-foreground-muted",
            )}
          >
            <span className="truncate">
              {isLoading ? (
                "Loading…"
              ) : selected.length > 0 ? (
                <>
                  {selected.length} selected
                </>
              ) : (
                <>All {label.toLowerCase()}</>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              {selected.length > 0 && (
                <Badge variant="primary" aria-hidden="true">
                  {selected.length}
                </Badge>
              )}
              <MorphIcon
                icon={open ? ChevronUp : ChevronDown}
                size={16}
                strokeWidth={1.75}
                reducedMotion="user"
                aria-hidden="true"
                className="text-foreground-muted"
              />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <Command label={`Search ${label} options`} shouldFilter={false}>
            <CommandInput
              placeholder={`Search ${label.toLowerCase()}…`}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {visible.length === 0 && (
                <CommandEmpty>No matching options.</CommandEmpty>
              )}
              <ScrollArea className="max-h-64">
                {visible.map((option) => {
                  const key = `${option.value}`;
                  const checked = selectedSet.has(option.value);
                  return (
                    <CommandItem
                      key={key}
                      value={key}
                      keywords={[key]}
                      aria-label={`${key}, ${option.count.toLocaleString("en-US")} records${checked ? ", selected" : ""}`}
                      onSelect={() => onToggle(option.value)}
                      className="cursor-pointer"
                    >
                      <Checkbox
                        checked={checked}
                        tabIndex={-1}
                        aria-hidden="true"
                        className="pointer-events-none"
                      />
                      <span aria-hidden="true" className="min-w-0 flex-1 truncate">
                        {key}
                      </span>
                      <span
                        aria-hidden="true"
                        className="font-mono text-micro text-foreground-muted tabular-nums"
                      >
                        {option.count.toLocaleString("en-US")}
                      </span>
                    </CommandItem>
                  );
                })}
              </ScrollArea>
            </CommandList>
            {selected.length > 0 && (
              <div className="border-t border-border p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    onClear();
                  }}
                >
                  Clear {label.toLowerCase()}
                </Button>
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
