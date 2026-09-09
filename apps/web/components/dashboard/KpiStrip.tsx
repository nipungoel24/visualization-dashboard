import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SummarySection } from "@/lib/api";
import { formatAverage, formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

interface KpiStripProps {
  summary: SummarySection | undefined;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function Kpi({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-surface px-4 py-3">
      <p className="font-mono text-micro font-medium tracking-wide text-foreground-muted uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate text-[32px] leading-10 font-semibold tabular-nums",
          mono && "font-mono",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * Restrained KPI strip: hairline grid, strong Mono numerals, no SaaS cards,
 * no trend arrows. Null aggregates render as "—", never 0.
 */
export function KpiStrip({ summary, isLoading, error, onRetry }: KpiStripProps) {
  if (isLoading && !summary) {
    return (
      <div
        className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-5"
        aria-label="Loading summary metrics"
      >
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="bg-surface px-4 py-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-10 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-4 py-4"
      >
        <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" className="text-danger" />
        <p className="min-w-52 flex-1 text-small">{error}</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-5"
      aria-label="Summary metrics"
    >
      <Kpi label="Filtered records" value={formatCount(summary?.filtered_count)} />
      <Kpi label="Avg intensity" value={formatAverage(summary?.avg_intensity)} />
      <Kpi label="Avg likelihood" value={formatAverage(summary?.avg_likelihood)} />
      <Kpi label="Avg relevance" value={formatAverage(summary?.avg_relevance)} />
      <Kpi label="Top sector" value={summary?.top_sector ?? "—"} mono={false} />
    </div>
  );
}
