"use client";

import { ExternalLink, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { RecordItem } from "@/lib/api";
import { UNAVAILABLE_GLYPH, formatCount, formatSourceDate } from "@/lib/format";

/** Scheme allow-list for external links (Rules R50): http/https/mailto only. */
const SAFE_LINK_SCHEMES = ["http:", "https:", "mailto:"];

function isSafeUrl(value: string | null | undefined): value is string {
  if (value === null || value === undefined || value.trim() === "") return false;
  try {
    const url = new URL(value);
    return SAFE_LINK_SCHEMES.includes(url.protocol);
  } catch {
    return false;
  }
}

function field(label: string, value: string) {
  return (
    <div className="min-w-0">
      <dt className="text-micro font-medium tracking-wider text-foreground-muted uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 break-words">{value}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-16 w-full" />
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>
    </div>
  );
}

interface RecordDetailSheetProps {
  open: boolean;
  record: RecordItem | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  onOpenChange: (open: boolean) => void;
}

export function RecordDetailSheet({
  open,
  record,
  isLoading,
  isError,
  errorMessage,
  onOpenChange,
}: RecordDetailSheetProps) {
  const safeUrl = isSafeUrl(record?.url) ? record.url : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Record detail</SheetTitle>
        </SheetHeader>
        <SheetBody>
          {isLoading ? (
            <DetailSkeleton />
          ) : record ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-base leading-[22px] font-semibold tracking-tight">
                  {record.title ?? UNAVAILABLE_GLYPH}
                </h3>
                {record.insight && (
                  <p className="mt-1.5 text-small text-foreground-muted">
                    {record.insight}
                  </p>
                )}
              </div>

              {safeUrl && (
                <a
                  href={safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-muted px-3 text-small font-medium text-foreground transition-colors duration-150 hover:bg-surface hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
                  View original source
                </a>
              )}

              <div className="flex flex-wrap gap-2">
                {record.pestle && <Badge variant="highlight">{record.pestle}</Badge>}
                {record.topic && <Badge variant="outline">{record.topic}</Badge>}
                {record.sector && <Badge variant="outline">{record.sector}</Badge>}
                {record.source && <Badge variant="muted">{record.source}</Badge>}
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                {field("Region", record.region ?? UNAVAILABLE_GLYPH)}
                {field("Country", record.country ?? UNAVAILABLE_GLYPH)}
                {field(
                  "End year",
                  record.end_year != null ? formatCount(record.end_year) : UNAVAILABLE_GLYPH,
                )}
                {field(
                  "Start year",
                  record.start_year != null ? formatCount(record.start_year) : UNAVAILABLE_GLYPH,
                )}
                {field(
                  "Intensity",
                  record.intensity != null ? formatCount(record.intensity) : UNAVAILABLE_GLYPH,
                )}
                {field(
                  "Likelihood",
                  record.likelihood != null ? formatCount(record.likelihood) : UNAVAILABLE_GLYPH,
                )}
                {field(
                  "Relevance",
                  record.relevance != null ? formatCount(record.relevance) : UNAVAILABLE_GLYPH,
                )}
                {field(
                  "Impact",
                  record.impact != null ? formatCount(record.impact) : UNAVAILABLE_GLYPH,
                )}
                {field("Published", formatSourceDate(record.published))}
                {field("Added", formatSourceDate(record.added))}
              </dl>
            </div>
          ) : isError ? (
            <div role="alert" className="flex flex-col items-start gap-2 py-6">
              <p className="flex items-center gap-2 text-small">
                <TriangleAlert
                  size={14}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="shrink-0 text-danger"
                />
                {errorMessage ?? "This record could not be loaded."}
              </p>
            </div>
          ) : (
            <p className="py-6 text-center text-small text-foreground-muted">
              No record selected.
            </p>
          )}
        </SheetBody>
        {record && (
          <SheetFooter>
            <span className="font-mono text-micro text-foreground-muted tabular-nums">
              #{formatCount(record.source_row_index)} ·{" "}
              {record.id.slice(0, 8)}
            </span>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}