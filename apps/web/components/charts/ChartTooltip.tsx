import type { TooltipRow } from "@/lib/d3/tooltip";
import { cn } from "@/lib/utils";

export interface ChartTooltipProps {
  title: string;
  rows: TooltipRow[];
  left: number;
  top: number;
}

/**
 * Shared restrained tooltip: white surface, mono values right-aligned,
 * pointer-events-none, compact hierarchy (Design §9). Position is computed by
 * the parent with `placeTooltip` and passed as left/top.
 */
export function ChartTooltip({ title, rows, left, top }: ChartTooltipProps) {
  return (
    <div
      role="tooltip"
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute z-10 w-max max-w-60 rounded-sm border border-border-strong bg-surface px-2.5 py-2 shadow-overlay",
      )}
      style={{ left, top }}
    >
      <p className="text-xs font-semibold">{title}</p>
      <dl className="mt-1 space-y-0.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-foreground-muted">{row.label}</dt>
            <dd className="font-mono text-xs tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
