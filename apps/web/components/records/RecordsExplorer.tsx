"use client";

import { useCallback, useEffect, useRef, type KeyboardEvent } from "react";

import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { FilterParams, RecordItem } from "@/lib/api";
import { UNAVAILABLE_GLYPH, formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FilterState } from "@/lib/filters";
import { useRecordQuery, useRecordsQuery } from "@/lib/query";
import { RecordDetailSheet } from "./RecordDetailSheet";
import { RecordPagination } from "./RecordPagination";

const SORTABLE_COLUMNS = [
  { key: "source_row_index", label: "#", className: "w-14" },
  { key: "topic", label: "Topic", className: "min-w-[100px]" },
  { key: "sector", label: "Sector", className: "min-w-[100px]" },
  { key: "country", label: "Country", className: "min-w-[90px]" },
  { key: "end_year", label: "Year", className: "w-16" },
  { key: "intensity", label: "Int", className: "w-14" },
  { key: "likelihood", label: "Lik", className: "w-14" },
  { key: "relevance", label: "Rel", className: "w-14" },
] as const;

interface RecordsExplorerProps {
  filters: FilterState;
  params: FilterParams;
  total: number | undefined;
  onChangePage: (page: number) => void;
  onChangeSort: (sort: string, order: "asc" | "desc") => void;
  onOpenRecord: (id: string) => void;
  onCloseRecord: () => void;
}

function cell(value: string | number | null | undefined): string {
  return value == null ? UNAVAILABLE_GLYPH : String(value);
}

function TableSkeleton() {
  return (
    <div className="space-y-2 py-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function MetricCell({ value }: { value: number | null | undefined }) {
  if (value == null) {
    return (
      <span className="text-foreground-faint tabular-nums">{UNAVAILABLE_GLYPH}</span>
    );
  }
  return (
    <span className={cn("font-mono text-small tabular-nums", value >= 7 ? "text-emerald-700 dark:text-emerald-400" : value >= 4 ? "text-foreground" : "text-foreground-muted")}>
      {value}
    </span>
  );
}

function RecordDesktopRow({
  record,
  onSelect,
}: {
  record: RecordItem;
  onSelect: (id: string) => void;
}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(record.id);
      }
    },
    [record.id, onSelect],
  );

  return (
    <tr
      className="group cursor-pointer border-b border-border/60 transition-colors duration-150 hover:bg-surface-muted/50 focus:outline-none focus-visible:bg-surface-muted/70"
      onClick={() => onSelect(record.id)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Open record ${cell(record.title)}`}
    >
      <td className="py-2.5 pl-4 pr-2 font-mono text-micro tabular-nums text-foreground-muted">
        {cell(record.source_row_index)}
      </td>
      <td className="max-w-[280px] py-2.5 pr-2 text-small">
        <span className="line-clamp-1 font-medium">
          {record.title ?? UNAVAILABLE_GLYPH}
        </span>
        <span className="line-clamp-1 text-micro text-foreground-muted">
          {record.insight ?? UNAVAILABLE_GLYPH}
        </span>
      </td>
      <td className="py-2.5 pr-2">
        {record.topic ? (
          <Badge variant="outline" className="max-w-[160px]">
            <span className="truncate">{record.topic}</span>
          </Badge>
        ) : (
          <span className="text-foreground-faint">{UNAVAILABLE_GLYPH}</span>
        )}
      </td>
      <td className="max-w-[160px] truncate py-2.5 pr-2 text-small text-foreground-muted">
        {cell(record.sector)}
      </td>
      <td className="max-w-[140px] truncate py-2.5 pr-2 text-small text-foreground-muted">
        {cell(record.country)}
      </td>
      <td className="py-2.5 pr-2 font-mono text-small tabular-nums text-foreground-muted">
        {cell(record.end_year)}
      </td>
      <td className="py-2.5 pr-2">
        <MetricCell value={record.intensity} />
      </td>
      <td className="py-2.5 pr-2">
        <MetricCell value={record.likelihood} />
      </td>
      <td className="py-2.5 pl-2 pr-4">
        <MetricCell value={record.relevance} />
      </td>
    </tr>
  );
}

function SortButton({
  column,
  sort,
  order,
  onSort,
}: {
  column: (typeof SORTABLE_COLUMNS)[number];
  sort: string;
  order: "asc" | "desc";
  onSort: (field: string) => void;
}) {
  const active = sort === column.key;
  return (
    <button
      type="button"
      aria-label={
        active
          ? `Sorted by ${column.label} ${order === "asc" ? "ascending" : "descending"}. Press to toggle.`
          : `Sort by ${column.label}`
      }
      onClick={() => onSort(column.key)}
      className="inline-flex h-7 cursor-pointer items-center gap-1 text-left text-micro font-medium tracking-wider text-foreground-muted hover:text-foreground focus:outline-none focus-visible:text-foreground"
    >
      <span className="uppercase">{column.label}</span>
      <ArrowGlyph active={active} order={order} />
    </button>
  );
}

function ArrowGlyph({ active, order }: { active: boolean; order: "asc" | "desc" }) {
  if (!active) {
    return (
      <span className="text-foreground-faint" aria-hidden="true">
        ↕
      </span>
    );
  }
  return <span aria-hidden="true">{order === "asc" ? "↑" : "↓"}</span>;
}

function RecordsError({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-8 text-center" role="alert">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10">
        <AlertCircle size={20} strokeWidth={1.75} className="text-destructive" aria-hidden="true" />
      </span>
      <div>
        <h3 className="text-base font-semibold text-destructive">
          Records could not be loaded
        </h3>
        <p className="mt-1 text-small text-foreground-muted">
          The records service returned an error. KPIs and charts are unaffected.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="focus-visible:ring-2 focus-visible:ring-destructive"
        aria-label="Retry loading records"
      >
        Retry
      </Button>
    </div>
  );
}

function RecordMobileItem({
  record,
  onSelect,
}: {
  record: RecordItem;
  onSelect: (id: string) => void;
}) {
  const handleClick = useCallback(() => onSelect(record.id), [record.id, onSelect]);
  return (
    <button
      type="button"
      onClick={handleClick}
      className="block w-full cursor-pointer rounded-md border border-border bg-surface p-3 text-left transition-colors duration-150 hover:bg-surface-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`Open record ${cell(record.title)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-small font-medium">{record.title ?? UNAVAILABLE_GLYPH}</p>
        <span className="shrink-0 font-mono text-micro tabular-nums text-foreground-muted">
          #{cell(record.source_row_index)}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {record.topic && (
          <Badge variant="outline" className="max-w-[45%]">
            <span className="truncate">{record.topic}</span>
          </Badge>
        )}
        {record.sector && (
          <span className="text-micro text-foreground-muted">{record.sector}</span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-micro text-foreground-muted">
          {([record.country, record.end_year].filter(Boolean) as string[]).join(" · ") || UNAVAILABLE_GLYPH}
        </span>
        <span className="flex shrink-0 gap-2 font-mono text-micro tabular-nums">
          <MetricCell value={record.intensity} />
          <MetricCell value={record.likelihood} />
          <MetricCell value={record.relevance} />
        </span>
      </div>
    </button>
  );
}

export function RecordsExplorer({
  filters,
  params,
  total,
  onChangePage,
  onChangeSort,
  onOpenRecord,
  onCloseRecord,
}: RecordsExplorerProps) {
  const query = useRecordsQuery(filters, params, {
    sort: filters.sort,
    order: filters.order,
    page: filters.page,
  });

  const recordId = filters.record;
  const detail = useRecordQuery(recordId);

  const record = recordId ? detail.data : undefined;
  const detailLoading = recordId !== null && detail.isPending;

  const data = query.data;
  const items = data?.items ?? [];
  const pageSize = data?.page_size ?? 25;
  const totalPages = data?.total_pages ?? 0;
  const totalVisible = data?.total ?? total ?? 0;

  const from = totalVisible === 0 ? 0 : (filters.page - 1) * pageSize + 1;
  const to = Math.min(filters.page * pageSize, totalVisible);

  const handleSort = useCallback(
    (field: string) => {
      if (field === filters.sort) {
        onChangeSort(field, filters.order === "asc" ? "desc" : "asc");
      } else {
        onChangeSort(field, "asc");
      }
    },
    [filters.sort, filters.order, onChangeSort],
  );

  const handleOpenRecord = useCallback(
    (id: string) => {
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        active.getAttribute("aria-label")?.startsWith("Open record")
      ) {
        openTriggerRef.current = active;
      }
      onOpenRecord(id);
    },
    [onOpenRecord],
  );

  const openTriggerRef = useRef<HTMLElement | null>(null);
  const prevRecordIdRef = useRef<string | null>(filters.record);

  useEffect(() => {
    if (prevRecordIdRef.current !== null && filters.record === null) {
      openTriggerRef.current?.focus();
    }
    prevRecordIdRef.current = filters.record;
  }, [filters.record]);

  const showSummary = totalVisible > 0;
  const isRecordsLoading = query.isPending && items.length === 0;

  return (
    <section
      aria-label="Records Explorer"
      className="scroll-mt-16 rounded-md border border-border bg-surface p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg leading-[26px] font-semibold tracking-tight">
            Records Explorer
          </h2>
          <p className="mt-0.5 font-mono text-micro text-foreground-muted">
            Individual signals · sortable · paginated
          </p>
        </div>
        {showSummary && (
          <span className="font-mono text-micro text-foreground-muted tabular-nums">
            {formatCount(from)}–{formatCount(to)} of {formatCount(totalVisible)} matching
          </span>
        )}
      </div>

      <div className="mt-3">
        {query.isError ? (
          <RecordsError onRetry={() => query.refetch()} />
        ) : isRecordsLoading ? (
          <TableSkeleton />
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-small text-foreground-muted">
            No records match the current filters.
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    {SORTABLE_COLUMNS.map((column) => (
                      <th
                        key={column.key}
                        className={cn("py-2 pr-2 text-left", column.className)}
                        aria-sort={
                          filters.sort === column.key
                            ? filters.order === "asc"
                              ? "ascending"
                              : "descending"
                            : undefined
                        }
                      >
                        <SortButton
                          column={column}
                          sort={filters.sort}
                          order={filters.order}
                          onSort={handleSort}
                        />
                      </th>
                    ))}
                    <th className="w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((record) => (
                    <RecordDesktopRow
                      key={record.id}
                      record={record}
                      onSelect={handleOpenRecord}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 lg:hidden">
              {items.map((record) => (
                <RecordMobileItem
                  key={record.id}
                  record={record}
                  onSelect={handleOpenRecord}
                />
              ))}
            </div>

            <RecordPagination
              page={filters.page}
              totalPages={totalPages}
              total={totalVisible}
              onChangePage={onChangePage}
            />
          </>
        )}
      </div>

      <RecordDetailSheet
        open={recordId !== null}
        record={record}
        isLoading={detailLoading}
        isError={detail.isError}
        errorMessage={
          detail.isError
            ? detail.error instanceof Error
              ? detail.error.message
              : "Could not load this record."
            : null
        }
        onOpenChange={(open) => {
          if (!open) onCloseRecord();
        }}
      />
    </section>
  );
}