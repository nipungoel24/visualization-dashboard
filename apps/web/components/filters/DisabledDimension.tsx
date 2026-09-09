interface DisabledDimensionProps {
  label: string;
}

/**
 * City / SWOT are not in the supplied dataset (Rules R1). They render as
 * disabled sections with the mandated explanation — never selectable,
 * never manufactured.
 */
export function DisabledDimension({ label }: DisabledDimensionProps) {
  const descriptionId = `unavailable-${label.toLowerCase()}`;
  return (
    <div aria-disabled="true" aria-describedby={descriptionId} className="opacity-60">
      <div className="flex h-8 w-full cursor-not-allowed items-center justify-between gap-2 rounded-md border border-border bg-surface px-2.5 text-small text-foreground-muted">
        <span className="truncate">All {label.toLowerCase()}</span>
      </div>
      <p id={descriptionId} className="mt-1 text-xs text-foreground-muted italic">
        Not present in supplied dataset
      </p>
    </div>
  );
}
