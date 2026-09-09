"use client";

import { hex as fastApiHex, svg as fastApiSvg, title as fastApiTitle } from "thesvg/fastapi";
import { hex as mongoHex, svg as mongoSvg, title as mongoTitle } from "thesvg/mongodb";
import { hex as nextHex, svg as nextSvg, title as nextTitle } from "thesvg/nextdotjs";
import { hex as pythonHex, svg as pythonSvg, title as pythonTitle } from "thesvg/python";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { MetaResponse } from "@/lib/api";
import { formatCount, formatImportedAt, formatShortSha } from "@/lib/format";

const STACK_MARKS = [
  { title: mongoTitle, hex: mongoHex, svg: mongoSvg },
  { title: nextTitle, hex: nextHex, svg: nextSvg },
  { title: pythonTitle, hex: pythonHex, svg: pythonSvg },
  { title: fastApiTitle, hex: fastApiHex, svg: fastApiSvg },
];

function BrandMark({ title, hex, svg }: { title: string; hex: string; svg: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2 py-1"
      title={title}
    >
      <span
        aria-hidden="true"
        className="inline-flex h-4 w-4 items-center justify-center [&>svg]:h-4 [&>svg]:w-4"
        // Brand marks ship as raw SVG strings from theSVG — rendered as-is.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <span className="text-xs font-medium">{title}</span>
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: `#${hex}` }}
      />
    </span>
  );
}

interface AboutPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta: MetaResponse | undefined;
}

/**
 * Data Provenance dialog: dataset facts straight from `/meta`, the
 * no-invention policy, and the stack behind the dashboard.
 */
export function AboutPanel({ open, onOpenChange, meta }: AboutPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>About InsightScope</DialogTitle>
        <DialogDescription>
          Global Intelligence Dashboard over 1,000 supplied records. Every value on screen
          comes from the API — nothing is invented.
        </DialogDescription>

        <div className="space-y-4">
          <section aria-label="Dataset provenance">
            <h3 className="font-mono text-micro font-medium tracking-wide text-foreground-muted uppercase">
              Provenance
            </h3>
            <dl className="mt-2 space-y-1.5 text-small">
              <div className="flex justify-between gap-4">
                <dt className="text-foreground-muted">Source file</dt>
                <dd className="font-mono">{meta?.source_filename ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-foreground-muted">SHA-256</dt>
                <dd className="font-mono" title={meta?.source_sha256}>
                  {formatShortSha(meta?.source_sha256)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-foreground-muted">Records</dt>
                <dd className="font-mono tabular-nums">
                  {formatCount(meta?.document_count)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-foreground-muted">Imported</dt>
                <dd>{formatImportedAt(meta?.imported_at)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-foreground-muted">City / SWOT</dt>
                <dd className="text-right">Not in supplied data — never manufactured</dd>
              </div>
            </dl>
          </section>

          <Separator />

          <section aria-label="Technology stack">
            <h3 className="font-mono text-micro font-medium tracking-wide text-foreground-muted uppercase">
              Stack
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {STACK_MARKS.map((mark) => (
                <BrandMark key={mark.title} {...mark} />
              ))}
              <span className="inline-flex items-center rounded-sm border border-border bg-surface px-2 py-1 text-xs font-medium">
                TanStack Query
              </span>
              <span className="inline-flex items-center rounded-sm border border-border bg-surface px-2 py-1 text-xs font-medium">
                D3 <span className="ml-1 text-foreground-muted">(Phase 4)</span>
              </span>
            </div>
            <p className="mt-2 text-xs leading-4 text-foreground-muted">
              Pipeline: supplied JSON → validation/normalization → MongoDB → FastAPI →
              Next.js. Values shown exactly as supplied.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
