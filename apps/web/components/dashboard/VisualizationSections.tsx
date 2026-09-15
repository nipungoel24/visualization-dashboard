import { useMemo } from "react";
import { topNWithSelected } from "@/lib/d3/palette";
import type { OverviewResponse, MetaResponse } from "@/lib/api";
import {
  type CategoricalField,
  type FilterState,
  type YearField,
} from "@/lib/filters";
import { formatAverage, formatCount, round } from "@/lib/format";
import { CoverageChart, type FullCoverageDatum } from "../charts/CoverageChart";
import { EndYearChart } from "../charts/EndYearChart";
import { MetricDistribution } from "../charts/MetricDistribution";
import { RankingChart, type RankRow } from "../charts/RankingChart";
import { SectorTreemap } from "../charts/SectorTreemap";
import { SignalsLandscape } from "../charts/SignalsLandscape";
import { SectionFrame, type SectionStatus } from "./SectionFrame";

const TOPIC_LIMIT = 15;
const COUNTRY_LIMIT = 15;

interface VisualizationSectionsProps {
  overview: OverviewResponse | undefined;
  meta: MetaResponse | undefined;
  isPending: boolean;
  isError: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  hasResults: boolean;
  filters: FilterState;
  canonicalSectors: readonly string[];
  onToggle: (field: CategoricalField | YearField, value: string | number) => void;
}

interface Facetish {
  record_count: number;
  avg_intensity?: number | null;
  avg_likelihood?: number | null;
  avg_relevance?: number | null;
}

function rankRows<T extends Facetish>(
  values: T[],
  labelOf: (item: T) => string,
  keyOf: (item: T) => string,
  selected: ReadonlySet<string>,
  limit: number | null,
  withAverages: ("intensity" | "likelihood" | "relevance")[],
): { rows: RankRow[]; omittedCount: number; total: number; truncated: boolean } {
  const sliced: { visible: readonly T[]; omittedCount: number } =
    limit === null
      ? { visible: values, omittedCount: 0 }
      : topNWithSelected(values, keyOf, selected, limit);
  const visible = sliced.visible;
  const omitted = sliced.omittedCount;
  const rows = visible.map((item) => {
    const parts: string[] = [];
    if (withAverages.includes("intensity")) parts.push(`avg ${formatAverage(item.avg_intensity)}`);
    if (withAverages.includes("likelihood")) parts.push(`lik ${formatAverage(item.avg_likelihood)}`);
    if (withAverages.includes("relevance")) parts.push(`rel ${formatAverage(item.avg_relevance)}`);
    const tooltipRows = [
      { label: "Records", value: formatCount(item.record_count) },
      ...(withAverages.includes("intensity")
        ? [{ label: "Avg intensity", value: formatAverage(item.avg_intensity) }]
        : []),
      ...(withAverages.includes("likelihood")
        ? [{ label: "Avg likelihood", value: formatAverage(item.avg_likelihood) }]
        : []),
      ...(withAverages.includes("relevance")
        ? [{ label: "Avg relevance", value: formatAverage(item.avg_relevance) }]
        : []),
    ];
    return {
      key: keyOf(item),
      label: labelOf(item),
      count: item.record_count,
      secondary: parts.length > 0 ? parts.join(" · ") : null,
      tooltipRows,
    };
  });
  return { rows, omittedCount: omitted, total: values.length, truncated: limit !== null && values.length > limit };
}

/**
 * Production visualization shell: every section below is a real D3-backed
 * chart driven by the single filtered overview payload. Chart clicks toggle
 * values through the shared URL filter helpers — charts never own filter
 * state. The Records Explorer renders a complete paginated table with detail panel.
 */
export function VisualizationSections({
  overview,
  meta,
  isPending,
  isError,
  errorMessage,
  onRetry,
  hasResults,
  filters,
  canonicalSectors,
  onToggle,
}: VisualizationSectionsProps) {
  const frame = (
    title: string,
    subtitle: string,
    span: string,
    body: (status: SectionStatus) => React.ReactNode,
    emptyNote: string,
    isEmpty: boolean,
  ) => {
    if (isPending && !overview) {
      return (
        <SectionFrame key={title} title={title} subtitle={subtitle} status="loading" className={span} />
      );
    }
    if (isError && !overview) {
      return (
        <SectionFrame
          key={title}
          title={title}
          subtitle={subtitle}
          status="error"
          error={errorMessage}
          onRetry={onRetry}
          className={span}
        />
      );
    }
    if (!hasResults || isEmpty) {
      return (
        <SectionFrame
          key={title}
          title={title}
          subtitle={subtitle}
          status="empty"
          emptyMessage={emptyNote}
          className={span}
        />
      );
    }
    return (
      <SectionFrame key={title} title={title} subtitle={subtitle} className={span}>
        {body("ready")}
      </SectionFrame>
    );
  };

  const topicSet = new Set(filters.topic);
  const empty = overview === undefined;

  // Compute full dataset coverage from meta
  const fullCoverage: FullCoverageDatum[] = useMemo(() => {
    const populated = meta?.schema?.populated;
    const documentCount = meta?.document_count;
    if (!populated || !documentCount) return [];
    const total = documentCount;
    return Object.entries(populated as Record<string, number>).map(([field, populated]) => ({
      field,
      populated_count: populated,
      total_count: total,
      populated_percentage: total > 0 ? round(populated / total * 100, 2) : 0,
    }));
  }, [meta?.schema?.populated, meta?.document_count]);

  const topics = overview?.topics.values ?? [];
  const countries = overview?.countries.values ?? [];
  const countrySet = new Set(filters.country);
  const sources = overview?.sources.values ?? [];
  const sourceSet = new Set(filters.source);

  const sections = [
    frame(
      "Signals Landscape",
      "Topics by avg likelihood × avg relevance · area = avg intensity",
      "lg:col-span-8",
      () => (
        <SignalsLandscape
          points={overview?.landscape.values ?? []}
          selected={topicSet}
          canonicalSectors={canonicalSectors}
          onToggleTopic={(topic) => onToggle("topic", topic)}
        />
      ),
      "No topic values are available for these filters.",
      empty || (overview?.landscape.values.length ?? 0) === 0,
    ),
    frame(
      "PESTLE Pulse",
      "Nine supplied labels · count with avg intensity",
      "lg:col-span-4",
      () => {
        const built = rankRows(
          overview?.pestle.values ?? [],
          (item) => item.pestle,
          (item) => item.pestle,
          new Set(filters.pestle),
          null,
          ["intensity", "likelihood", "relevance"],
        );
        return (
          <RankingChart
            rows={built.rows}
            selected={new Set(filters.pestle)}
            onToggle={(value) => onToggle("pestle", value)}
            ariaLabel="PESTLE comparison"
          />
        );
      },
      "No PESTLE values are available for these filters.",
      empty || (overview?.pestle.values.length ?? 0) === 0,
    ),
    frame(
      "End-Year Outlook",
      "Categorical bars · one per supplied year · Not specified shown separately",
      "lg:col-span-4",
      () => (
        <EndYearChart
          values={overview?.years.values ?? []}
          notSpecified={overview?.years.missing_count ? { year: "not_specified" as const, count: overview.years.missing_count } : null}
          selected={new Set(filters.end_year)}
          onToggleYear={(year) => onToggle("end_year", year)}
        />
      ),
      "No end-year values are available for these filters.",
      empty || ((overview?.years.values.length ?? 0) === 0 && !overview?.years.missing_count),
    ),
    frame(
      "Sector Composition",
      "Area = records · shade = avg intensity",
      "lg:col-span-8",
      () => (
        <SectorTreemap
          sectors={overview?.sectors.values ?? []}
          selected={new Set(filters.sector)}
          onToggleSector={(sector) => onToggle("sector", sector)}
        />
      ),
      "No sector values are available for these filters.",
      empty || (overview?.sectors.values.length ?? 0) === 0,
    ),
    frame(
      "Regional Signals",
      "All supplied regions · World and world distinct",
      "lg:col-span-6",
      () => {
        const built = rankRows(
          overview?.regions.values ?? [],
          (item) => item.region,
          (item) => item.region,
          new Set(filters.region),
          null,
          ["intensity"],
        );
        return (
          <RankingChart
            rows={built.rows}
            selected={new Set(filters.region)}
            onToggle={(value) => onToggle("region", value)}
            ariaLabel="Regional ranking"
          />
        );
      },
      "No region values are available for these filters.",
      empty || (overview?.regions.values.length ?? 0) === 0,
    ),
    frame(
      "Country Signals",
      `Top ${COUNTRY_LIMIT} of ${formatCount(countries.length)} countries · full list in filters`,
      "lg:col-span-6",
      () => {
        const built = rankRows(
          countries,
          (item) => item.country,
          (item) => item.country,
          countrySet,
          COUNTRY_LIMIT,
          ["intensity"],
        );
        return (
          <RankingChart
            rows={built.rows}
            selected={countrySet}
            onToggle={(value) => onToggle("country", value)}
            limitNote={`Top ${COUNTRY_LIMIT} of ${formatCount(built.total)} countries`}
            omittedCount={built.omittedCount}
            ariaLabel="Country ranking"
          />
        );
      },
      "No country values are available for these filters.",
      empty || countries.length === 0,
    ),
    frame(
      "Topic Intelligence",
      `Top ${TOPIC_LIMIT} of ${formatCount(topics.length)} topics · select to filter`,
      "lg:col-span-8",
      () => {
        const built = rankRows(
          topics,
          (item) => item.topic,
          (item) => item.topic,
          topicSet,
          TOPIC_LIMIT,
          ["intensity"],
        );
        return (
          <RankingChart
            rows={built.rows}
            selected={topicSet}
            onToggle={(value) => onToggle("topic", value)}
            limitNote={`Top ${TOPIC_LIMIT} of ${formatCount(built.total)} topics`}
            omittedCount={built.omittedCount}
            ariaLabel="Topic ranking"
          />
        );
      },
      "No topic values are available for these filters.",
      empty || topics.length === 0,
    ),
    frame(
      "Source Landscape",
      `Top ${formatCount(sources.length)} of ${formatCount(overview?.sources.total_unique ?? 0)} sources · full list in filters`,
      "lg:col-span-4",
      () => {
        // The backend already caps sources at its top 20: there is no deeper
        // payload to append, so a selected source outside that window stays
        // reachable through the filter control (documented, not hidden).
        const built = rankRows(
          sources,
          (item) => item.source,
          (item) => item.source,
          sourceSet,
          null,
          [],
        );
        return (
          <RankingChart
            rows={built.rows}
            selected={sourceSet}
            onToggle={(value) => onToggle("source", value)}
            limitNote={`Top ${formatCount(sources.length)} of ${formatCount(overview?.sources.total_unique ?? 0)} sources`}
            ariaLabel="Source ranking"
          />
        );
      },
      "No source values are available for these filters.",
      empty || sources.length === 0,
    ),
    frame(
      "Metric Distributions",
      "Backend bins · missing labeled Not specified",
      "lg:col-span-8",
      () => (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricDistribution
            metric="Intensity"
            bins={overview?.intensity.bins ?? []}
            notSpecified={overview?.intensity.not_specified ?? 0}
          />
          <MetricDistribution
            metric="Likelihood"
            bins={overview?.likelihood.bins ?? []}
            notSpecified={overview?.likelihood.not_specified ?? 0}
          />
          <MetricDistribution
            metric="Relevance"
            bins={overview?.relevance.bins ?? []}
            notSpecified={overview?.relevance.not_specified ?? 0}
          />
        </div>
      ),
      "No metric values are available for these filters.",
      empty,
    ),
    frame(
      "Data Coverage",
      "Populated share: current selection (solid) vs full dataset (outline)",
      "lg:col-span-4",
      () => <CoverageChart values={overview?.data_coverage.values ?? []} fullValues={fullCoverage} />,
      "No coverage values are available for these filters.",
      empty || (overview?.data_coverage.values.length ?? 0) === 0,
    ),
  ];

  if (!hasResults) return null;

  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">{sections}</div>;
}
