"use client";

import { useState } from "react";
import { MorphIcon } from "morphicons/react";
import { Menu, X } from "lucide";
import { Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MetaResponse, ReadyResponse } from "@/lib/api";
import { formatCount, formatImportedAt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AboutPanel } from "./AboutPanel";

interface HeaderProps {
  meta: MetaResponse | undefined;
  ready: ReadyResponse | undefined;
  readyOk: boolean;
  serviceDown: boolean;
  filtersOpen: boolean;
  onOpenFilters: () => void;
  activeFilterCount: number;
}

/**
 * Compact 56px application header (Design §7): wordmark left; dataset status,
 * connectivity, About action right. Mobile filter trigger morphs menu↔close.
 */
export function Header({
  meta,
  ready,
  readyOk,
  serviceDown,
  filtersOpen,
  onOpenFilters,
  activeFilterCount,
}: HeaderProps) {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-3 sm:px-4">
      <button
        type="button"
        onClick={onOpenFilters}
        aria-expanded={filtersOpen}
        aria-controls="mobile-filter-sheet"
        aria-label={filtersOpen ? "Close filters" : "Open filters"}
        className="inline-flex h-10 min-w-10 cursor-pointer items-center gap-1.5 rounded-md px-2 text-foreground transition-[background-color] duration-150 ease-out outline-none hover:bg-surface-muted lg:hidden"
      >
        <MorphIcon
          icon={filtersOpen ? X : Menu}
          size={18}
          strokeWidth={1.75}
          reducedMotion="user"
          aria-hidden="true"
        />
        <span className="text-small font-medium">Filters</span>
        {activeFilterCount > 0 && (
          <Badge variant="primary" aria-label={`${activeFilterCount} active filters`}>
            {activeFilterCount}
          </Badge>
        )}
      </button>

      <div className="min-w-0">
        <p className="truncate text-[15px] leading-5 font-semibold tracking-tight">
          InsightScope
        </p>
        <p className="hidden font-mono text-micro text-foreground-muted sm:block">
          Global Intelligence Dashboard
        </p>
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
        <div
          className="hidden min-w-0 items-center gap-2 md:flex"
          aria-label="Dataset status"
        >
          {meta ? (
            <p className="truncate font-mono text-micro text-foreground-muted tabular-nums">
              {formatCount(meta.document_count)} records · imported{" "}
              {formatImportedAt(meta.imported_at)}
            </p>
          ) : (
            <Skeleton className="h-4 w-44" />
          )}
        </div>

        <span
          className="hidden h-4 w-px bg-border sm:block"
          aria-hidden="true"
        />

        <p
          className="flex items-center gap-1.5 font-mono text-micro whitespace-nowrap"
          role="status"
          aria-label={serviceDown ? "Data service unreachable" : readyOk ? "Data service connected" : "Checking data service"}
        >
          <span
            aria-hidden="true"
            className={cn(
              "h-2 w-2 rounded-full",
              serviceDown ? "bg-danger" : readyOk ? "bg-success" : "bg-border-strong",
            )}
          />
          <span className="hidden text-foreground-muted sm:inline">
            {serviceDown ? "Offline" : readyOk ? `Ready · ${formatCount(ready?.document_count)}` : "Checking…"}
          </span>
        </p>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setAboutOpen(true)}
          aria-haspopup="dialog"
          className="h-10 w-10 p-0 sm:h-8 sm:w-auto sm:px-2.5"
        >
          <Info size={16} strokeWidth={1.75} aria-hidden="true" />
          <span className="hidden sm:inline">About</span>
          <span className="sr-only sm:hidden">About InsightScope</span>
        </Button>
      </div>

      <AboutPanel open={aboutOpen} onOpenChange={setAboutOpen} meta={meta} />
    </header>
  );
}
