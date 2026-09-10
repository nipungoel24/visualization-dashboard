import { scaleLinear } from "d3-scale";

import { formatCount, formatPercentage } from "@/lib/format";

export interface CoverageDatum {
  field: string;
  populated_count: number;
  missing_count: number;
  populated_percentage: number;
}

const FIELD_LABELS: Record<string, string> = {
  end_year: "End year",
  start_year: "Start year",
  intensity: "Intensity",
  likelihood: "Likelihood",
  relevance: "Relevance",
  topic: "Topic",
  sector: "Sector",
  region: "Region",
  country: "Country",
  pestle: "PESTLE",
  impact: "Impact",
};

/**
 * Data Coverage: compact horizontal completeness bars for the current
 * filtered set. Informational only — no filter interaction, and City/SWOT
 * never appear (they are absent dimensions, not 0% fields).
 */
export function CoverageChart({ values }: { values: CoverageDatum[] }) {
  const widthScale = scaleLinear().domain([0, 100]).range([0, 100]);

  return (
    <div role="list" aria-label="Data coverage by field" className="space-y-2">
      {values.map((entry) => (
        <div key={entry.field} role="listitem">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-small">
              {FIELD_LABELS[entry.field] ?? entry.field}
            </span>
            <span className="shrink-0 font-mono text-micro text-foreground-muted tabular-nums">
              {formatPercentage(entry.populated_percentage)} ·{" "}
              {formatCount(entry.populated_count)}
            </span>
          </div>
          <div
            role="img"
            aria-label={`${FIELD_LABELS[entry.field] ?? entry.field}: ${formatPercentage(entry.populated_percentage)} populated, ${formatCount(entry.populated_count)} of ${formatCount(entry.populated_count + entry.missing_count)} records`}
            className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-muted"
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${widthScale(Math.min(Math.max(entry.populated_percentage, 0), 100))}%`,
                backgroundColor: "var(--heat-mid)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
