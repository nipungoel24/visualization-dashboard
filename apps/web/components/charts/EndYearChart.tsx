"use client";

import { ascending, max } from "d3-array";
import { scaleBand, scaleLinear } from "d3-scale";
import { useMemo, useState } from "react";

import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { useChartSize } from "@/components/charts/useChartSize";
import { useRovingFocus } from "@/components/charts/useRovingFocus";
import { placeTooltip, type TooltipRow } from "@/lib/d3/tooltip";
import { formatCount } from "@/lib/format";

export interface YearDatum {
  year: number;
  count: number;
}

interface EndYearChartProps {
  values: YearDatum[];
  selected: ReadonlySet<number>;
  onToggleYear: (year: number) => void;
}

/**
 * End-Year Outlook: categorical bars over the supplied year values
 * (D3 band scale — never a continuous 2016→2200 axis). Extreme values like
 * 2126 and 2200 render as their own bars. Bar height = record count.
 */
export function EndYearChart({ values, selected, onToggleYear }: EndYearChartProps) {
  const [containerRef, { width }] = useChartSize<HTMLDivElement>();
  const [tooltip, setTooltip] = useState<{ year: number; x: number; y: number } | null>(null);

  const compact = width > 0 && width < 480;
  const height = width === 0 ? 0 : compact ? 220 : 260;
  const margin = { top: 8, right: 8, bottom: 30, left: 36 };

  const years = useMemo(
    () => [...values].sort((a, b) => ascending(a.year, b.year)),
    [values],
  );

  const { handleKeyDown, tabIndexFor, setActiveIndex } = useRovingFocus(
    years.length,
    (index) => onToggleYear(years[index].year),
  );

  const plotW = Math.max(width - margin.left - margin.right, 0);
  const plotH = Math.max(height - margin.top - margin.bottom, 0);
  const xScale = useMemo(
    () =>
      scaleBand()
        .domain(years.map((entry) => String(entry.year)))
        .range([0, plotW])
        .padding(0.3),
    [years, plotW],
  );
  const top = max(years, (entry) => entry.count) ?? 0;
  const yScale = useMemo(
    () => scaleLinear().domain([0, Math.max(top, 1)]).nice().range([plotH, 0]),
    [top, plotH],
  );
  const yTicks = useMemo(() => yScale.ticks(4), [yScale]);

  // Mobile: label roughly every Nth bar so text never collides; all bars stay.
  const tickStep = Math.max(1, Math.ceil(years.length / (compact ? 8 : 25)));

  if (width === 0 || plotW <= 0 || plotH <= 0) {
    return <div ref={containerRef} className="h-56 w-full" aria-hidden="true" />;
  }

  const activeEntry = tooltip ? (years.find((entry) => entry.year === tooltip.year) ?? null) : null;
  const rows: TooltipRow[] = activeEntry
    ? [
        { label: "End year", value: String(activeEntry.year) },
        { label: "Records", value: formatCount(activeEntry.count) },
      ]
    : [];
  const placed =
    activeEntry && tooltip
      ? placeTooltip(tooltip.x, tooltip.y, width, height, 200, 40 + rows.length * 20)
      : null;

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        role="img"
        data-roving-root
        aria-label={`End-year distribution: ${years.length} supplied year values, bars show record counts. Select a year to filter the dashboard.`}
        width={width}
        height={height}
        className="block overflow-visible"
      >
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={margin.left}
              x2={margin.left + plotW}
              y1={margin.top + yScale(tick)}
              y2={margin.top + yScale(tick)}
              stroke="var(--border)"
              strokeOpacity={0.4}
              strokeWidth={1}
            />
            <text
              x={margin.left - 6}
              y={margin.top + yScale(tick)}
              textAnchor="end"
              dominantBaseline="central"
              className="fill-foreground-muted font-mono text-micro"
            >
              {tick}
            </text>
          </g>
        ))}
        {years.map((entry, index) => {
          const barW = xScale.bandwidth();
          const barH = plotH - yScale(entry.count);
          const x = margin.left + (xScale(String(entry.year)) ?? 0);
          const y = margin.top + yScale(entry.count);
          const isSelected = selected.has(entry.year);
          return (
<g
                key={entry.year}
                data-mark-index={index}
                role="button"
                tabIndex={tabIndexFor(index)}
                aria-label={`${entry.year}, ${formatCount(entry.count)} records${isSelected ? ", selected. Press Enter to remove the filter." : ". Press Enter to filter."}`}
                aria-pressed={isSelected}
                className="cursor-pointer outline-none"
                onMouseEnter={() => setTooltip({ year: entry.year, x: x + barW / 2, y })}
                onMouseLeave={() => setTooltip(null)}
                onFocus={() => {
                  setActiveIndex(index);
                  setTooltip({ year: entry.year, x: x + barW / 2, y });
                }}
                onBlur={() => setTooltip(null)}
                onClick={() => onToggleYear(entry.year)}
                onKeyDown={(event) => handleKeyDown(event, index)}
              >
                <rect
                  x={x - 6}
                  y={margin.top}
                  width={barW + 12}
                  height={plotH}
                  fill="transparent"
                  onClick={() => onToggleYear(entry.year)}
                />
                <rect
                  x={x}
                  y={y}
                  width={Math.max(barW, 3)}
                  height={Math.max(barH, entry.count > 0 ? 2 : 0)}
                  rx={2}
                  fill="var(--primary)"
                  fillOpacity={isSelected ? 1 : 0.78}
                  stroke={isSelected ? "var(--highlight)" : "none"}
                  strokeWidth={isSelected ? 2 : 0}
                  onClick={() => onToggleYear(entry.year)}
                />
              {index % tickStep === 0 && (
                <text
                  x={x + barW / 2}
                  y={margin.top + plotH + 16}
                  textAnchor="middle"
                  aria-hidden="true"
                  className="fill-foreground-muted font-mono text-micro"
                >
                  {entry.year}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {activeEntry && placed && (
        <ChartTooltip title={String(activeEntry.year)} rows={rows} left={placed.left} top={placed.top} />
      )}
    </div>
  );
}
