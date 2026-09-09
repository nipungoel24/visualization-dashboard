import { formatCount } from "@/lib/format";
import { PhaseNote } from "./PhaseNote";
import { SectionFrame } from "./SectionFrame";

/**
 * Records Explorer placeholder: the live matching-record count (real data)
 * with the full table, search pagination and detail panel deferred.
 */
export function RecordsPlaceholder({
  total,
  isLoading,
}: {
  total: number | undefined;
  isLoading: boolean;
}) {
  if (isLoading && total === undefined) {
    return <SectionFrame title="Records Explorer" status="loading" />;
  }
  return (
    <SectionFrame
      title="Records Explorer"
      subtitle="Title · topic · sector · country · region · year · metrics · source"
      action={
        <span className="font-mono text-micro text-foreground-muted tabular-nums">
          {formatCount(total)} matching
        </span>
      }
    >
      <PhaseNote>
        A sortable, paginated table with per-record detail and original-source links. The
        count above already reflects the current filters.
      </PhaseNote>
    </SectionFrame>
  );
}
