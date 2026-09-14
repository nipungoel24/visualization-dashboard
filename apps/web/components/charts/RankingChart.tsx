"use client";

import { scaleLinear } from "d3-scale";
import { useRef, useState } from "react";

import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { useRovingFocus } from "@/components/charts/useRovingFocus";
import { placeTooltip, type TooltipRow } from "@/lib/d3/tooltip";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface RankRow {
  key: string;
  label: string;
  count: number;
  /** Compact secondary metric text (e.g. "avg 12.35"), or null. */
  secondary: string | null;
  tooltipRows: TooltipRow[];
}

interface RankingChartProps {
  rows: RankRow[];
  selected: ReadonlySet<string>;
  onToggle: (key: string) => void;
  /** Disclosure line, e.g. "Top 15 of 56 countries". */
  limitNote?: string;
  /** Omitted by the Top-N limit (selected extras are always drawn). */
  omittedCount?: number;
  ariaLabel: string;
}

/**
 * Shared horizontal ranking visualization (Region, Country, Topic, Source,
 * PESTLE): D3 linear scale maps counts to bar lengths; React renders rows as
 * real buttons with roving focus. Bar length is never the only encoding —
 * every row carries its count (and secondary metric) as visible text.
 */
export function RankingChart({
  rows,
  selected,
  onToggle,
  limitNote,
  omittedCount = 0,
  ariaLabel,
}: RankingChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<{
    key: string;
    x: number;
    y: number;
    containerWidth: number;
    containerHeight: number;
  } | null>(null);

  const { handleKeyDown, tabIndexFor, setActiveIndex } = useRovingFocus(
    rows.length,
    (index) => onToggle(rows[index].key),
    { mode: "buttons" }
  );

  const maxCount = rows.reduce((max, row) => Math.max(max, row.count), 0);
  const widthScale = scaleLinear()
    .domain([0, Math.max(maxCount, 1)])
    .range([0, 100]);

  const showTooltipFor = (key: string, target: HTMLElement) => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    setTooltip({
      key,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top,
      containerWidth: container.clientWidth,
      containerHeight: container.clientHeight,
    });
  };

  const activeRow = tooltip ? (rows.find((row) => row.key === tooltip.key) ?? null) : null;
  const placed =
    activeRow && tooltip
      ? placeTooltip(
          tooltip.x,
          tooltip.y,
          tooltip.containerWidth,
          tooltip.containerHeight,
          220,
          40 + activeRow.tooltipRows.length * 20,
        )
      : null;

  return (
    <div ref={containerRef} className="relative">
      <div role="list" aria-label={ariaLabel} data-roving-root className="space-y-0.5">
        {rows.map((row, index) => {
          const isSelected = selected.has(row.key);
          return (
            <div key={row.key} role="listitem">
              <button
                type="button"
                data-mark-index={index}
                tabIndex={tabIndexFor(index)}
                aria-pressed={isSelected}
                aria-label={`${row.label}, ${formatCount(row.count)} records${row.secondary ? `, ${row.secondary}` : ""}${isSelected ? ", selected. Press Enter to remove the filter." : ". Press Enter to filter."}`}
                onClick={() => onToggle(row.key)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                onMouseEnter={(event) => showTooltipFor(row.key, event.currentTarget)}
                onMouseLeave={() => setTooltip(null)}
                onFocus={(event) => {
                  setActiveIndex(index);
                  showTooltipFor(row.key, event.currentTarget);
                }}
                onBlur={() => setTooltip(null)}
                className={cn(
                  "group flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-left transition-[background-color] duration-150 ease-out outline-none hover:bg-surface-muted",
                  isSelected && "bg-surface-muted shadow-[inset_2px_0_0_var(--highlight)]",
                )}
              >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-small">
                  {row.label}
                  {isSelected && <span className="sr-only">, selected</span>}
                </span>
                <span
                  aria-hidden="true"
                  className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-muted transition-[background-color] duration-150 ease-out group-hover:bg-border"
                >
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.max(widthScale(row.count), row.count > 0 ? 1.5 : 0)}%`,
                      backgroundColor: isSelected ? "var(--primary)" : "var(--heat-mid)",
                    }}
                  />
                </span>
              </span>
              <span className="flex shrink-0 items-baseline gap-2">
                {row.secondary && (
                  <span className="font-mono text-micro text-foreground-muted tabular-nums">
                    {row.secondary}
                  </span>
                )}
                <span className="min-w-10 text-right font-mono text-small tabular-nums">
                  {formatCount(row.count)}
                </span>
              </span>
              </button>
            </div>
          );
        })}
      </div>

      {activeRow && placed && (
        <ChartTooltip
          title={activeRow.label}
          rows={activeRow.tooltipRows}
          left={placed.left}
          top={placed.top}
        />
      )}

      {(limitNote || omittedCount > 0) && (
        <p className="mt-2 font-mono text-micro text-foreground-muted">
          {limitNote}
          {limitNote && omittedCount > 0 ? " · " : ""}
          {omittedCount > 0 ? `${formatCount(omittedCount)} more in filters` : ""}
        </p>
      )}
    </div>
  );
}
