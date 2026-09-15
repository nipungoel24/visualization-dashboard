"use client";

import { ascending, max } from "d3-array";
import { scaleBand, scaleLinear } from "d3-scale";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { useChartSize } from "@/components/charts/useChartSize";
import { useRovingFocus } from "@/components/charts/useRovingFocus";
import { placeTooltip, type TooltipRow } from "@/lib/d3/tooltip";
import { formatCount } from "@/lib/format";

export interface YearDatum {
  year: number;
  count: number;
}

interface NotSpecifiedDatum {
  year: "not_specified";
  count: number;
}

interface EndYearChartProps {
  values: YearDatum[];
  notSpecified: NotSpecifiedDatum | null;
  selected: ReadonlySet<number>;
  onToggleYear: (year: number) => void;
}

type ChartEntry = YearDatum | NotSpecifiedDatum;

/**
 * End-Year Outlook: categorical bars over the supplied year values
 * (D3 band scale — never a continuous 2016→2200 axis). Extreme values like
 * 2126 and 2200 render as their own bars. Includes a "Not specified" category
 * for records with missing end_year. Bar height = record count.
 */
export function EndYearChart({ values, notSpecified, selected, onToggleYear }: EndYearChartProps) {
  const [containerRef, { width }] = useChartSize<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ year: number | "not_specified"; x: number; y: number } | null>(null);

  const compact = width > 0 && width < 480;
  const height = width === 0 ? 0 : compact ? 220 : 260;
  const margin = { top: 8, right: 8, bottom: 30, left: 36 };

  const yearEntries = useMemo(
    () => [...values].sort((a, b) => ascending(a.year, b.year)),
    [values],
  );

  // Combine year entries with "Not specified" at the end
  const allEntries = useMemo((): ChartEntry[] => {
    const entries: ChartEntry[] = [...yearEntries];
    if (notSpecified && notSpecified.count > 0) {
      entries.push(notSpecified);
    }
    return entries;
  }, [yearEntries, notSpecified]);

  const { activeIndex, handleKeyDown, svgRef: rovingSvgRef } = useRovingFocus(
    allEntries.length,
    (index) => {
      const entry = allEntries[index];
      if (entry.year !== "not_specified") {
        onToggleYear(entry.year);
      }
    },
  );

  const plotW = Math.max(width - margin.left - margin.right, 0);
  const plotH = Math.max(height - margin.top - margin.bottom, 0);
  const xScale = useMemo(
    () =>
      scaleBand()
        .domain(allEntries.map((entry) => entry.year === "not_specified" ? "not_specified" : String(entry.year)))
        .range([0, plotW])
        .padding(0.3),
    [allEntries, plotW],
  );
  const top = max(allEntries, (entry) => entry.count) ?? 0;
  const yScale = useMemo(
    () => scaleLinear().domain([0, Math.max(top, 1)]).nice().range([plotH, 0]),
    [top, plotH],
  );
  const yTicks = useMemo(() => yScale.ticks(4), [yScale]);

  // Mobile: label roughly every Nth bar so text never collides; all bars stay.
  const tickStep = Math.max(1, Math.ceil(allEntries.length / (compact ? 8 : 25)));

  // Sync the roving focus SVG ref (must be before early return for hook order)
  useEffect(() => {
    rovingSvgRef.current = svgRef.current;
  }, [rovingSvgRef, svgRef]);

  if (width === 0 || plotW <= 0 || plotH <= 0) {
    return <div ref={containerRef} className="h-56 w-full" aria-hidden="true" />;
  }

  const activeEntry = tooltip
    ? allEntries.find((entry) => entry.year === tooltip.year) ?? null
    : null;
  const rows: TooltipRow[] = activeEntry
    ? [
        { label: "End year", value: activeEntry.year === "not_specified" ? "Not specified" : String(activeEntry.year) },
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
        ref={svgRef}
        role="listbox"
        aria-multiselectable="true"
        data-roving-root
        aria-label={`End-year distribution: ${yearEntries.length} supplied year values${notSpecified && notSpecified.count > 0 ? ` plus ${formatCount(notSpecified.count)} Not specified` : ""}. Use arrow keys to navigate, Enter to filter.`}
        aria-activedescendant={allEntries[activeIndex] ? `end-year-mark-${allEntries[activeIndex].year === "not_specified" ? "not-specified" : allEntries[activeIndex].year}` : undefined}
        width={width}
        height={height}
        className="block overflow-visible"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{ outline: "none" }}
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
        {allEntries.map((entry, index) => {
          const isNotSpecified = entry.year === "not_specified";
          const domainKey = isNotSpecified ? "not_specified" : String(entry.year);
          const barW = xScale.bandwidth();
          const barH = plotH - yScale(entry.count);
          const x = margin.left + (xScale(domainKey) ?? 0);
          const y = margin.top + yScale(entry.count);
          const isSelected = !isNotSpecified && selected.has(entry.year);
          const isActive = index === activeIndex;
          const markId = `end-year-mark-${isNotSpecified ? "not-specified" : entry.year}`;
          const displayLabel = isNotSpecified ? "Not specified" : String(entry.year);
          return (
            <g
              key={domainKey}
              data-mark-index={index}
              data-testid="mark"
              id={markId}
              role="option"
              aria-label={`${displayLabel}, ${formatCount(entry.count)} records${isSelected ? ", selected. Press Enter to remove the filter." : ". Press Enter to filter."}`}
              aria-selected={isSelected}
              className="cursor-pointer outline-none"
              onMouseEnter={() => setTooltip({ year: entry.year, x: x + barW / 2, y })}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => !isNotSpecified && onToggleYear(entry.year)}
            >
              <rect
                x={x - 6}
                y={margin.top}
                width={barW + 12}
                height={plotH}
                fill="transparent"
                onClick={() => !isNotSpecified && onToggleYear(entry.year)}
              />
              <rect
                x={x}
                y={y}
                width={Math.max(barW, 3)}
                height={Math.max(barH, entry.count > 0 ? 2 : 0)}
                rx={2}
                fill={isNotSpecified ? "var(--foreground-muted)" : "var(--primary)"}
                fillOpacity={isSelected ? 1 : isNotSpecified ? 0.6 : 0.78}
                stroke={isActive ? "var(--foreground)" : isSelected ? "var(--highlight)" : "none"}
                strokeWidth={isActive ? 2 : isSelected ? 2 : 0}
                onClick={() => !isNotSpecified && onToggleYear(entry.year)}
              />
              {index % tickStep === 0 && (
                <text
                  x={x + barW / 2}
                  y={margin.top + plotH + 16}
                  textAnchor="middle"
                  aria-hidden="true"
                  className="fill-foreground-muted font-mono text-micro"
                >
                  {displayLabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {activeEntry && placed && (
        <ChartTooltip title={activeEntry.year === "not_specified" ? "Not specified" : String(activeEntry.year)} rows={rows} left={placed.left} top={placed.top} />
      )}
    </div>
  );
}
