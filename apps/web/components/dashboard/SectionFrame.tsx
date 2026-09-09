import { ListFilter, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type SectionStatus = "loading" | "error" | "empty" | "ready";

interface SectionFrameProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  status?: SectionStatus;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
  children?: React.ReactNode;
  className?: string;
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <div aria-label={`Loading ${title}`}>
      <Skeleton className="h-52 w-full" />
    </div>
  );
}

/**
 * Shared section framing for current placeholders and future charts:
 * title row, then exactly one of skeleton / error / empty / content.
 * Visual variation comes from grid placement and panel tone, not wrappers.
 */
export function SectionFrame({
  title,
  subtitle,
  action,
  status = "ready",
  error,
  onRetry,
  emptyMessage = "No records match the current filters.",
  children,
  className,
}: SectionFrameProps) {
  return (
    <section
      aria-label={title}
      className={cn("rounded-md border border-border bg-surface p-4 sm:p-5", className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg leading-[26px] font-semibold tracking-tight">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 font-mono text-micro text-foreground-muted">{subtitle}</p>
          )}
        </div>
        {action}
      </div>

      <div className="mt-3">
        {status === "loading" && <SectionSkeleton title={title} />}
        {status === "error" && (
          <div role="alert" className="flex flex-col items-start gap-2 py-6">
            <p className="flex items-center gap-2 text-small">
              <TriangleAlert
                size={14}
                strokeWidth={1.75}
                aria-hidden="true"
                className="shrink-0 text-danger"
              />
              {error ?? "This section could not be loaded."}
            </p>
            {onRetry && (
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        )}
        {status === "empty" && (
          <div className="flex flex-col items-start gap-1 py-6">
            <p className="flex items-center gap-2 text-small font-medium">
              <ListFilter
                size={14}
                strokeWidth={1.75}
                aria-hidden="true"
                className="shrink-0 text-foreground-muted"
              />
              {emptyMessage}
            </p>
            <p className="text-small text-foreground-muted">
              Adjust or reset the filters to see data here.
            </p>
          </div>
        )}
        {status === "ready" && children}
      </div>
    </section>
  );
}
