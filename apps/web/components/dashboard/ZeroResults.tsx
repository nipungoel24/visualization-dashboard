import { ListFilter } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ZeroResultsProps {
  onReset: () => void;
}

/**
 * Intentional zero-result state: one composed panel for the whole content
 * area — never ten broken empty chart frames.
 */
export function ZeroResults({ onReset }: ZeroResultsProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-surface px-6 py-12 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-surface-muted">
        <ListFilter size={18} strokeWidth={1.75} aria-hidden="true" className="text-foreground-muted" />
      </span>
      <h2 className="mt-1 text-lg leading-[26px] font-semibold tracking-tight">
        No signals match these filters
      </h2>
      <p className="max-w-md text-small leading-5 text-foreground-muted">
        The current selection returns zero records. Broadening a dimension or clearing the
        search usually restores the signal.
      </p>
      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onReset}>
        Reset filters
      </Button>
    </div>
  );
}
