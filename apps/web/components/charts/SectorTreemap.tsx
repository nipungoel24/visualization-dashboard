"use client";

import { scaleLinear } from "d3-scale";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { useChartSize } from "@/components/charts/useChartSize";
import { useRovingFocus } from "@/components/charts/useRovingFocus";
import { layoutTreemap, tileFitsLabel, type TreemapDatum } from "@/lib/d3/treemap";
import { placeTooltip, type TooltipRow } from "@/lib/d3/tooltip";
import { formatAverage, formatCount } from "@/lib/format";

interface SectorTreemapProps {
  sectors: TreemapDatum[];
  selected: ReadonlySet<string>;
  onToggleSector: (sector: string) => void;
}

const heatScale = scaleLinear<string>()
  .domain([1, 48, 96])
  .range(["#E8E4DA", "#6B8E7C", "#0F5A3C"])
  .clamp(true);

function heatColor(avg: number | null): string {
  if (avg === null) return "#C9C6BC";
  return heatScale(avg);
}

/**
 * Sector Composition: a real D3 treemap (squarified). Tile AREA = record
 * count; tile COLOR = average intensity on the fixed 1–96 heat scale
 * (stable across filters; null averages render neutral gray, never zero).
 * Labels appear only where tiles fit them; tiny sectors stay discoverable
 * through tooltips and keyboard focus.
 */
export function SectorTreemap({ sectors, selected, onToggleSector }: SectorTreemapProps) {
  const [containerRef, { width }] = useChartSize<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ sector: string; x: number; y: number } | null>(null);

  const height = width === 0 ? 0 : Math.round(Math.min(Math.max(width * 0.52, 220), 320));
  const tiles = useMemo(() => layoutTreemap(sectors, width, height), [sectors, width, height]);

  const { activeIndex, handleKeyDown, svgRef: rovingSvgRef } = useRovingFocus(
    tiles.length,
    (index) => onToggleSector(tiles[index].sector),
  );

  // Sync the roving focus SVG ref (must be before early return for hook order)
  useEffect(() => {
    rovingSvgRef.current = svgRef.current;
  }, [rovingSvgRef, svgRef]);

  if (width === 0 || height === 0) {
    return <div ref={containerRef} className="h-64 w-full" aria-hidden="true" />;
  }

  const activeTile = tooltip ? (tiles.find((tile) => tile.sector === tooltip.sector) ?? null) : null;
  const rows: TooltipRow[] = activeTile
    ? [
        { label: "Records", value: formatCount(activeTile.record_count) },
        { label: "Avg intensity", value: formatAverage(activeTile.avg_intensity) },
      ]
    : [];
  const placed =
    activeTile && tooltip
      ? placeTooltip(tooltip.x, tooltip.y, width, height, 210, 40 + rows.length * 20)
      : null;

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        ref={svgRef}
        role="listbox"
        data-roving-root
        aria-label={`Sector treemap: ${tiles.length} sectors sized by record count and shaded by average intensity. Use arrow keys to navigate, Enter to filter.`}
        aria-activedescendant={tiles[activeIndex] ? `mark-${tiles[activeIndex].sector}` : undefined}
        width={width}
        height={height}
        className="block"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{ outline: "none" }}
      >
        {tiles.map((tile, index) => {
          const isSelected = selected.has(tile.sector);
          const fits = tileFitsLabel(tile);
          const isActive = index === activeIndex;
          const markId = `mark-${tile.sector}`;
          return (
            <g
              key={tile.sector}
              data-mark-index={index}
              data-testid="mark"
              id={markId}
              role="option"
              aria-label={`${tile.sector}, ${formatCount(tile.record_count)} records, average intensity ${formatAverage(tile.avg_intensity)}${isSelected ? ", selected. Press Enter to remove the filter." : ". Press Enter to filter."}`}
              aria-selected={isSelected}
              className="cursor-pointer outline-none"
              onMouseEnter={() =>
                setTooltip({ sector: tile.sector, x: (tile.x0 + tile.x1) / 2, y: tile.y0 })
              }
              onMouseLeave={() => setTooltip(null)}
              onClick={() => onToggleSector(tile.sector)}
            >
              <rect
                x={tile.x0}
                y={tile.y0}
                width={tile.x1 - tile.x0}
                height={tile.y1 - tile.y0}
                rx={4}
                fill={heatColor(tile.avg_intensity)}
                fillOpacity={0.88}
                stroke={isActive ? "var(--foreground)" : isSelected ? "var(--highlight)" : "var(--surface)"}
                strokeWidth={isActive ? 2.5 : isSelected ? 2.5 : 2}
              />
              {fits && (
                <text
                  x={tile.x0 + 6}
                  y={tile.y0 + 16}
                  aria-hidden="true"
                  className="fill-foreground text-small font-medium"
                >
                  {tile.sector}
                </text>
              )}
              {fits && (
                <text
                  x={tile.x0 + 6}
                  y={tile.y0 + 32}
                  aria-hidden="true"
                  className="fill-foreground font-mono text-micro tabular-nums"
                >
                  {formatCount(tile.record_count)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {activeTile && placed && (
        <ChartTooltip
          title={activeTile.sector}
          rows={rows}
          left={placed.left}
          top={placed.top}
        />
      )}

      <div className="mt-2 flex items-center gap-2" aria-label="Tile color represents average intensity from 1 to 96">
        <span className="font-mono text-micro text-foreground-muted">1</span>
        <span
          aria-hidden="true"
          className="h-2 w-28 rounded-full"
          style={{ background: "linear-gradient(to right, #E8E4DA, #6B8E7C, #0F5A3C)" }}
        />
        <span className="font-mono text-micro text-foreground-muted tabular-nums">96</span>
        <span className="font-mono text-micro text-foreground-muted">avg intensity</span>
      </div>
    </div>
  );
}
