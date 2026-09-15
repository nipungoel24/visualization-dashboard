"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/format";

interface RecordPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onChangePage: (page: number) => void;
}

/**
 * Records list pagination: compact previous/next footer. Page buttons are
 * omitted to keep the control minimal; the API enforces a small maximum page
 * size so navigation stays predictable even on low-resolution screens.
 */
export function RecordPagination({
  page,
  totalPages,
  total,
  onChangePage,
}: RecordPaginationProps) {
  if (totalPages <= 1) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex items-center justify-between gap-2 border-t border-border px-1 pt-3 mt-3">
      <span className="font-mono text-micro text-foreground-muted tabular-nums">
        {formatCount(total)} matching
      </span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-micro text-foreground-muted tabular-nums">
          Page {formatCount(page)} of {formatCount(totalPages)}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!canPrev}
            aria-label="Previous page"
            onClick={() => onChangePage(page - 1)}
            className="h-10 w-10 sm:h-8 sm:w-8"
          >
            <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!canNext}
            aria-label="Next page"
            onClick={() => onChangePage(page + 1)}
            className="h-10 w-10 sm:h-8 sm:w-8"
          >
            <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}