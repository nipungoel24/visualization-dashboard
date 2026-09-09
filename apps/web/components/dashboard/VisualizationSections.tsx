import { userFacingMessage } from "@/lib/api";
import { useOverviewQuery } from "@/lib/query";
import type { FilterState } from "@/lib/filters";
import { PhaseNote } from "./PhaseNote";
import { SectionFrame } from "./SectionFrame";

const SECTIONS: {
  title: string;
  subtitle: string;
  span: string;
  note: string;
}[] = [
  {
    title: "Signals Landscape",
    subtitle: "Flagship · avg likelihood × avg relevance · radius = avg intensity",
    span: "lg:col-span-8",
    note: "One bubble per topic, colored by dominant sector. Selecting a bubble will filter the whole dashboard by that topic.",
  },
  {
    title: "PESTLE Pulse",
    subtitle: "Nine supplied labels · exact wording preserved",
    span: "lg:col-span-4",
    note: "Side-by-side comparison across Economic, Environmental, Healthcare, Industries, Lifestyles, Organization, Political, Social and Technological.",
  },
  {
    title: "End-Year Outlook",
    subtitle: "Categorical axis · extremes 2126 and 2200 preserved",
    span: "lg:col-span-4",
    note: "One bar per supplied year value plus a Not specified category. No continuous time scale — the dense 2016–2022 range is never crushed.",
  },
  {
    title: "Sector Composition",
    subtitle: "Treemap · area = records · shade = avg intensity",
    span: "lg:col-span-8",
    note: "Every sector sized by record count, shaded by average intensity, labeled exactly as supplied.",
  },
  {
    title: "Regional Signals",
    subtitle: "Supplied values only · World and world stay distinct",
    span: "lg:col-span-6",
    note: "Ranked distribution over the 23 supplied region values, hierarchical overlaps included.",
  },
  {
    title: "Country Signals",
    subtitle: "Ranked distribution · 56 supplied countries",
    span: "lg:col-span-6",
    note: "Ranked bars with counts; missing countries surface as Not specified, never as zero.",
  },
  {
    title: "Topic Intelligence",
    subtitle: "97 topics · click a row to filter",
    span: "lg:col-span-8",
    note: "Ranked topic list with record counts and averages. Selecting a topic applies it as a dashboard filter.",
  },
  {
    title: "Source Landscape",
    subtitle: "Top 20 of 403 sources · unique count noted",
    span: "lg:col-span-4",
    note: "Top sources by record count with the total-unique figure alongside, so the ranking reads honestly.",
  },
  {
    title: "Metric Distributions",
    subtitle: "Intensity · Likelihood · Relevance · nulls labeled",
    span: "lg:col-span-8",
    note: "Binned distributions with a Not specified bar per metric. Averages always pair with their record denominators.",
  },
  {
    title: "Data Coverage",
    subtitle: "Filtered set · populated share per field",
    span: "lg:col-span-4",
    note: "Share of populated values per key field for the current selection — the honesty panel for every aggregate above.",
  },
];

/**
 * Phase 3 section shell: deliberate containers with real loading/error
 * behavior, ready to host the Phase 4 production charts.
 */
export function VisualizationSections({
  filters,
  params,
  hasResults,
}: {
  filters: FilterState;
  params: Parameters<typeof useOverviewQuery>[1];
  hasResults: boolean;
}) {
  const overview = useOverviewQuery(filters, params);

  if (overview.isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12" aria-label="Loading visualizations">
        {SECTIONS.map((section) => (
          <SectionFrame
            key={section.title}
            title={section.title}
            subtitle={section.subtitle}
            status="loading"
            className={section.span}
          />
        ))}
      </div>
    );
  }

  if (overview.isError) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12" aria-label="Visualization errors">
        {SECTIONS.map((section) => (
          <SectionFrame
            key={section.title}
            title={section.title}
            subtitle={section.subtitle}
            status="error"
            error={userFacingMessage(overview.error)}
            onRetry={() => void overview.refetch()}
            className={section.span}
          />
        ))}
      </div>
    );
  }

  if (!hasResults) return null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {SECTIONS.map((section) => (
        <SectionFrame
          key={section.title}
          title={section.title}
          subtitle={section.subtitle}
          className={section.span}
        >
          <PhaseNote>{section.note}</PhaseNote>
        </SectionFrame>
      ))}
    </div>
  );
}
