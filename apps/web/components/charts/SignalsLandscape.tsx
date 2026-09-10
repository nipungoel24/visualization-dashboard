"use client";

import { scaleLinear } from "d3-scale";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { useChartSize } from "@/components/charts/useChartSize";
import { useRovingFocus } from "@/components/charts/useRovingFocus";
import {
  LIKELIHOOD_DOMAIN,
  RELEVANCE_DOMAIN,
  intensityRadius,
  layoutLandscape,
  nearestPoint,
  paintOrder,
  pickLabels,
  type PositionedPoint,
  type RenderedPoint,
} from "@/lib/d3/landscape";
import { sectorColor } from "@/lib/d3/palette";
import { placeTooltip, type TooltipRow } from "@/lib/d3/tooltip";
import { formatAverage, formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

const TICKS_X = [1, 2, 3, 4];
const TICKS_Y = [1, 2, 3, 4, 5, 6];
const SIZE_LEGEND_VALUES = [5, 20, 60];
const MAX_LEGEND_SECTORS = 8;

export interface LandscapeDatum {
  topic: string;
  record_count: number;
  avg_intensity: number | null;
  avg_likelihood: number | null;
  avg_relevance: number | null;
  dominant_sector: string | null;
}

interface SignalsLandscapeProps {
  points: LandscapeDatum[];
  selected: ReadonlySet<string>;
  canonicalSectors: readonly string[];
  onToggleTopic: (topic: string) => void;
}

function tooltipRows(point: PositionedPoint): TooltipRow[] {
  return [
    { label: "Records", value: formatCount(point.record_count) },
    { label: "Avg intensity", value: formatAverage(point.avg_intensity) },
    { label: "Avg likelihood", value: formatAverage(point.avg_likelihood) },
    { label: "Avg relevance", value: formatAverage(point.avg_relevance) },
    { label: "Dominant sector", value: point.dominant_sector ?? "—" },
  ];
}

function markLabel(point: PositionedPoint, isSelected: boolean): string {
  return (
    `${point.topic}, ${formatCount(point.record_count)} records. ` +
    `Average intensity ${formatAverage(point.avg_intensity)}, ` +
    `likelihood ${formatAverage(point.avg_likelihood)}, ` +
    `relevance ${formatAverage(point.avg_relevance)}. ` +
    `Dominant sector ${point.dominant_sector ?? "not available"}. ` +
    `${isSelected ? "Selected. Press Enter to remove the filter." : "Press Enter to filter by this topic."}`
  );
}

/**
 * Flagship Signals Landscape: topics positioned by average likelihood (X)
 * and average relevance (Y); bubble AREA encodes average intensity
 * (square-root radius); color encodes dominant sector. Clicking a bubble
 * toggles the topic in the shared URL filter state.
 */
export function SignalsLandscape({
  points,
  selected,
  canonicalSectors,
  onToggleTopic,
}: SignalsLandscapeProps) {
  const [containerRef, { width }] = useChartSize<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ topic: string; x: number; y: number } | null>(null);

  const compact = width > 0 && width < 480;
  const height = width === 0 ? 0 : Math.round(Math.min(Math.max(width * 0.62, 260), 420));
  const margin = useMemo(
    () =>
      compact
        ? { top: 8, right: 8, bottom: 30, left: 32 }
        : { top: 12, right: 12, bottom: 34, left: 36 },
    [compact],
  );

  const positioned = useMemo(() => layoutLandscape(points), [points]);
  const ordered = useMemo(() => paintOrder(positioned), [positioned]);
  const labels = useMemo(
    () => pickLabels(positioned, selected),
    [positioned, selected],
  );
  const unpositioned = useMemo(
    () => positioned.filter((point) => !point.positionable).length,
    [positioned],
  );

  const { handleKeyDown, tabIndexFor, setActiveIndex } = useRovingFocus(
    ordered.length,
    (index) => onToggleTopic(ordered[index].topic),
  );

  const plotW = Math.max(width - margin.left - margin.right, 0);
  const plotH = Math.max(height - margin.top - margin.bottom, 0);
  const xScale = useMemo(
    () => scaleLinear().domain([...LIKELIHOOD_DOMAIN]).range([0, plotW]),
    [plotW],
  );
  const yScale = useMemo(
    () => scaleLinear().domain([...RELEVANCE_DOMAIN]).range([plotH, 0]),
    [plotH],
  );

  const rendered = useMemo(() => {
    const items: RenderedPoint[] = [];
    for (const point of ordered) {
      items.push({
        cx: margin.left + xScale(point.xValue) + point.dx,
        cy: margin.top + yScale(point.yValue) + point.dy,
        point,
      });
    }
    return items;
  }, [ordered, margin.left, margin.top, xScale, yScale]);

  const renderedRef = useRef(rendered);
  const onToggleTopicRef = useRef(onToggleTopic);
  const marginRef = useRef(margin);
  const xScaleRef = useRef(xScale);
  const yScaleRef = useRef(yScale);
  const setTooltipRef = useRef(setTooltip);

  useEffect(() => {
    renderedRef.current = rendered;
    onToggleTopicRef.current = onToggleTopic;
    marginRef.current = margin;
    xScaleRef.current = xScale;
    yScaleRef.current = yScale;
    setTooltipRef.current = setTooltip;
  }, [rendered, onToggleTopic, margin, xScale, yScale]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    function localFromEvent(event: MouseEvent): { x: number; y: number } | null {
      const s = svgRef.current;
      if (!s) return null;
      const rect = s.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function handleClick(event: MouseEvent) {
      const local = localFromEvent(event);
      if (!local) return;
      const hit = nearestPoint(renderedRef.current, local.x, local.y);
      if (hit) onToggleTopicRef.current(hit.topic);
    }

    function handlePointerMove(event: PointerEvent) {
      const local = localFromEvent(event);
      if (!local) return;
      const hit = nearestPoint(renderedRef.current, local.x, local.y);
      if (hit) {
        const cx = marginRef.current.left + xScaleRef.current(hit.xValue) + hit.dx;
        const cy = marginRef.current.top + yScaleRef.current(hit.yValue) + hit.dy;
        setTooltipRef.current({ topic: hit.topic, x: cx, y: cy });
      } else {
        setTooltipRef.current(null);
      }
    }

    function handlePointerLeave() {
      setTooltipRef.current(null);
    }

    svg.addEventListener("click", handleClick);
    svg.addEventListener("pointermove", handlePointerMove);
    svg.addEventListener("pointerleave", handlePointerLeave);
    return () => {
      svg.removeEventListener("click", handleClick);
      svg.removeEventListener("pointermove", handlePointerMove);
      svg.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [rendered]);

  const legendSectors = useMemo(() => {
    const present = new Map<string, number>();
    for (const point of positioned) {
      if (point.dominant_sector) {
        present.set(point.dominant_sector, (present.get(point.dominant_sector) ?? 0) + 1);
      }
    }
    return [...present.entries()]
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .map(([sector]) => sector);
  }, [positioned]);

  if (width === 0 || plotW <= 0 || plotH <= 0) {
    return <div ref={containerRef} className="h-72 w-full" aria-hidden="true" />;
  }

  const activeTooltipPoint = tooltip
    ? (positioned.find((point) => point.topic === tooltip.topic) ?? null)
    : null;
  const placed =
    activeTooltipPoint && tooltip
      ? placeTooltip(tooltip.x, tooltip.y, width, height, 220, 40 + tooltipRows(activeTooltipPoint).length * 20)
      : null;

  const highlighted = tooltip?.topic ?? null;
  const labeledTopics = new Set(labels);
  if (highlighted) labeledTopics.add(highlighted);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        ref={svgRef}
        role="img"
        data-roving-root
        aria-label={`Signals Landscape: ${ordered.length} topics positioned by average likelihood (horizontal, 1 to 4) and average relevance (vertical, 1 to 6). Bubble area represents average intensity. Select a topic to filter the dashboard.`}
        width={width}
        height={height}
        className="block"
        style={{ pointerEvents: "all" }}
      >
        {TICKS_Y.map((tick) => (
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
        {TICKS_X.map((tick) => (
          <g key={tick}>
            <line
              x1={margin.left + xScale(tick)}
              x2={margin.left + xScale(tick)}
              y1={margin.top}
              y2={margin.top + plotH}
              stroke="var(--border)"
              strokeOpacity={0.4}
              strokeWidth={1}
            />
            <text
              x={margin.left + xScale(tick)}
              y={margin.top + plotH + 16}
              textAnchor="middle"
              className="fill-foreground-muted font-mono text-micro"
            >
              {tick}
            </text>
          </g>
        ))}
        <text
          x={margin.left + plotW / 2}
          y={height - 2}
          textAnchor="middle"
          className="fill-foreground-muted font-mono text-micro"
        >
          Avg likelihood
        </text>
        <text
          x={10}
          y={margin.top + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 10 ${margin.top + plotH / 2})`}
          className="fill-foreground-muted font-mono text-micro"
        >
          Avg relevance
        </text>

        {ordered.map((point, index) => {
          const cx = margin.left + xScale(point.xValue) + point.dx;
          const cy = margin.top + yScale(point.yValue) + point.dy;
          const isSelected = selected.has(point.topic);
          const color = sectorColor(point.dominant_sector, canonicalSectors);
          return (
            <g
              key={point.topic}
              data-mark-index={index}
              role="button"
              tabIndex={tabIndexFor(index)}
              aria-label={markLabel(point, isSelected)}
              aria-pressed={isSelected}
              className="cursor-pointer outline-none"
              pointerEvents="none"
              onFocus={() => {
                setActiveIndex(index);
                setTooltip({ topic: point.topic, x: cx, y: cy });
              }}
              onBlur={() => setTooltip(null)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              <circle
                cx={cx}
                cy={cy}
                r={point.radius}
                fill={color}
                fillOpacity={0.82}
                stroke={isSelected ? "var(--highlight)" : "var(--surface)"}
                strokeWidth={isSelected ? 2.5 : 1}
                className={cn(
                  "transition-transform duration-150 ease-out motion-reduce:transition-none",
                  highlighted === point.topic && "scale-[1.15]",
                )}
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
              />
              {labeledTopics.has(point.topic) && (
                <text
                  x={cx}
                  y={Math.max(cy - point.radius - 4, 10)}
                  textAnchor="middle"
                  aria-hidden="true"
                  className="fill-foreground font-mono text-micro"
                  style={{ paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: 3 }}
                >
                  {point.topic}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {activeTooltipPoint && placed && (
        <ChartTooltip
          title={activeTooltipPoint.topic}
          rows={tooltipRows(activeTooltipPoint)}
          left={placed.left}
          top={placed.top}
        />
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-2">
        <span className="flex items-center gap-1.5" aria-label="Bubble size represents average intensity">
          {SIZE_LEGEND_VALUES.map((value) => {
            const diameter = 2 * intensityRadius(value);
            return (
              <span key={value} className="flex items-center gap-1">
                <span
                  aria-hidden="true"
                  className="inline-block rounded-full bg-foreground-muted"
                  style={{ width: diameter, height: diameter }}
                />
                <span className="font-mono text-micro text-foreground-muted tabular-nums">{value}</span>
              </span>
            );
          })}
        </span>
        <span className="flex flex-wrap items-center gap-1.5" aria-label="Bubble color represents dominant sector">
          {legendSectors.slice(0, MAX_LEGEND_SECTORS).map((sector) => (
            <span key={sector} className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-[2px]"
                style={{ backgroundColor: sectorColor(sector, canonicalSectors) }}
              />
              <span className="font-mono text-micro text-foreground-muted">{sector}</span>
            </span>
          ))}
          {legendSectors.length > MAX_LEGEND_SECTORS && (
            <span className="font-mono text-micro text-foreground-muted">
              +{legendSectors.length - MAX_LEGEND_SECTORS} more
            </span>
          )}
        </span>
      </div>
      {unpositioned > 0 && (
        <p className="mt-1 font-mono text-micro text-foreground-muted">
          {unpositioned === 1
            ? "1 topic lacks positioned averages and is not plotted."
            : `${unpositioned} topics lack positioned averages and are not plotted.`}
        </p>
      )}
    </div>
  );
}
