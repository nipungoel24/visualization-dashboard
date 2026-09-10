/**
 * Intentional placeholder body for a future visualization module.
 * Title + explanatory subtitle come from the section; this adds only the
 * honest development state — never invented chart data or fake SVG.
 */
export function PhaseNote({
  children,
  note = "Visualization added in Phase 4",
}: {
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <div className="flex min-h-40 flex-col justify-end gap-2 border-t border-dashed border-border pt-3">
      <p className="max-w-prose text-small leading-5 text-foreground-muted">{children}</p>
      <p className="flex items-center gap-1.5 font-mono text-micro text-foreground-muted">
        <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-highlight ring-1 ring-border-strong" />
        {note}
      </p>
    </div>
  );
}
