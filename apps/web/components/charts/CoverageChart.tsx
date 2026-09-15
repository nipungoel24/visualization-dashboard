import { scaleLinear } from "d3-scale";

import { formatCount, formatPercentage } from "@/lib/format";

export interface CoverageDatum {
  field: string;
  populated_count: number;
  missing_count: number;
  populated_percentage: number;
}

export interface FullCoverageDatum {
  field: string;
  populated_count: number;
  total_count: number;
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
 * Data Coverage: paired horizontal bars comparing full dataset vs current
 * filtered selection. Informational only — no filter interaction, and City/SWOT
 * never appear (they are absent dimensions, not 0% fields).
 */
export function CoverageChart({
  values,
  fullValues,
}: {
  values: CoverageDatum[];
  fullValues: FullCoverageDatum[];
}) {
  const widthScale = scaleLinear().domain([0, 100]).range([0, 100]);

  const fullMap = new Map(fullValues.map((v) => [v.field, v]));

  return (
    <div role="list" aria-label="Data coverage by field: full dataset vs filtered" className="space-y-3">
      {values.map((entry) => {
        const full = fullMap.get(entry.field);
        return (
          <div key={entry.field} role="listitem" className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-small">
                {FIELD_LABELS[entry.field] ?? entry.field}
              </span>
              <span className="shrink-0 font-mono text-micro text-foreground-muted tabular-nums">
                {formatPercentage(entry.populated_percentage)} ·{" "}
                {formatCount(entry.populated_count)}
                {full && ` (full: ${formatPercentage(full.populated_percentage)})`}
              </span>
            </div>
            <div className="space-y-0.5" style={{ fontSize: "10px" }}>
              <div
                role="img"
                aria-label={`Filtered: ${FIELD_LABELS[entry.field] ?? entry.field}: ${formatPercentage(entry.populated_percentage)} populated, ${formatCount(entry.populated_count)} of ${formatCount(entry.populated_count + entry.missing_count)} records`}
                className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${widthScale(Math.min(Math.max(entry.populated_percentage, 0), 100))}%`,
                    backgroundColor: "var(--primary)",
                  }}
                />
              </div>
              {full && (
                <div
                  role="img"
                  aria-label={`Full dataset: ${FIELD_LABELS[entry.field] ?? entry.field}: ${formatPercentage(full.populated_percentage)} populated, ${formatCount(full.populated_count)} of ${formatCount(full.total_count)} records`}
                  className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${widthScale(Math.min(Math.max(full.populated_percentage, 0), 100))}%`,
                      backgroundColor: "var(--border-strong)",
                      opacity: 0.5,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
