"use client";

import { max } from "d3-array";
import { scaleLinear } from "d3-scale";
import { useMemo } from "react";

import { useChartSize } from "@/components/charts/useChartSize";
import type { MetricBin } from "@/lib/api";
import { formatCount } from "@/lib/format";

interface MetricDistributionProps {
  metric: string;
  bins: MetricBin[];
  notSpecified: number;
}

/**
 * Compact binned distribution (Intensity / Likelihood / Relevance):
 * one bar per backend bin with direct count labels; missing values get an
 * explicit "Not specified" line. Informational only — no filter mapping.
 */
export function MetricDistribution({ metric, bins, notSpecified }: MetricDistributionProps) {
  const [containerRef, { width }] = useChartSize<HTMLDivElement>();
  const height = 120;
  const margin = { top: 18, right: 4, bottom: 22, left: 4 };

  const plotW = Math.max(width - margin.left - margin.right, 0);
  const plotH = Math.max(height - margin.top - margin.bottom, 0);
  const top = max(bins, (bin) => bin.count) ?? 0;
  const yScale = useMemo(
    () => scaleLinear().domain([0, Math.max(top, 1)]).range([plotH, 0]),
    [top, plotH],
  );

  if (width === 0) {
    return <div ref={containerRef} className="h-28 w-full" aria-hidden="true" />;
  }

  const slot = plotW / Math.max(bins.length, 1);
  const barW = Math.max(Math.min(slot * 0.62, 44), 3);

  return (
    <div ref={containerRef} className="w-full">
      <p className="font-mono text-micro font-medium tracking-wide text-foreground-muted uppercase">
        {metric}
      </p>
      <svg
        role="img"
        aria-label={`${metric} distribution: ${bins.map((bin) => `${bin.label}: ${bin.count}`).join(", ")}. ${notSpecified} records not specified.`}
        width={width}
        height={height}
        className="mt-1 block overflow-visible"
      >
        {bins.map((bin, index) => {
          const x = margin.left + slot * index + (slot - barW) / 2;
          const y = margin.top + yScale(bin.count);
          return (
            <g key={bin.label}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(plotH - yScale(bin.count), bin.count > 0 ? 2 : 0)}
                rx={2}
                fill="var(--heat-mid)"
              />
              {bin.count > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 4}
                  textAnchor="middle"
                  aria-hidden="true"
                  className="fill-foreground-muted font-mono text-micro tabular-nums"
                >
                  {formatCount(bin.count)}
                </text>
              )}
              <text
                x={x + barW / 2}
                y={margin.top + plotH + 15}
                textAnchor="middle"
                aria-hidden="true"
                className="fill-foreground-muted font-mono text-micro"
              >
                {bin.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-0.5 font-mono text-micro text-foreground-muted tabular-nums">
        Not specified: {formatCount(notSpecified)}
      </p>
    </div>
  );
}
