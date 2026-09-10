import { useState } from "react";

/**
 * Deterministic categorical color strategy (Design §4.1, adapted).
 *
 * Design assigns the 10 palette slots by record-count rank. Rank is unstable
 * under filtering (selecting a topic reshuffles every rank), while Phase 4
 * requires colors to stay stable across filters. Resolution: the canonical
 * rank is the FIRST sector ranking seen in the session — on a fresh load that
 * is the unfiltered overview, i.e. the true global rank. Later filtered
 * payloads never re-rank. Colors are therefore stable within every session
 * and exact for the overwhelmingly common fresh-load case.
 */

export const SECTOR_PALETTE: readonly string[] = [
  "#0F5A3C",
  "#3F6FB5",
  "#C98A2D",
  "#B6463F",
  "#2E7D78",
  "#7A5FA0",
  "#7D8A2E",
  "#5C6B7A",
  "#A65A2E",
  "#33507A",
];

export const SECTOR_OTHER = "#8B8E93";

/** Count-desc, name-asc canonical ordering for a sector list. */
export function canonicalSectorOrder(
  sectors: readonly { sector: string; record_count: number }[],
): string[] {
  return [...sectors]
    .sort(
      (a, b) => b.record_count - a.record_count || (a.sector < b.sector ? -1 : 1),
    )
    .map((entry) => entry.sector);
}

export function sectorColor(sector: string | null, canonicalOrder: readonly string[]): string {
  if (sector === null) return SECTOR_OTHER;
  const rank = canonicalOrder.indexOf(sector);
  if (rank === -1 || rank >= SECTOR_PALETTE.length) return SECTOR_OTHER;
  return SECTOR_PALETTE[rank];
}

/**
 * Session-canonical sector order: latches the first defined ranking and keeps
 * it for the session (see module doc). The latch uses render-time state
 * adjustment (the sanctioned pattern for deriving state during render) rather
 * than a ref, so no ref is read during render. Pure core
 * (`canonicalSectorOrder`) is unit-tested; this hook only owns the latch.
 */
export function useCanonicalSectors(
  sectors: readonly { sector: string; record_count: number }[] | undefined,
): readonly string[] {
  const [canonical, setCanonical] = useState<readonly string[] | null>(null);
  if (canonical === null && sectors && sectors.length > 0) {
    setCanonical(canonicalSectorOrder(sectors));
  }
  return canonical ?? [];
}

export interface TopNResult<T> {
  visible: T[];
  /** Items hidden by the limit (selected extras are never hidden). */
  omittedCount: number;
  total: number;
  limit: number;
  truncated: boolean;
}

/**
 * Presentation-only Top-N limiting with selected-value inclusion: the first N
 * items (caller passes them pre-sorted per the API contract) plus any selected
 * values that fall outside the Top N, in API order. Global aggregates are
 * never altered — only what this chart draws.
 */
export function topNWithSelected<T, K>(
  items: readonly T[],
  keyOf: (item: T) => K,
  selected: ReadonlySet<K>,
  n: number,
): TopNResult<T> {
  const head = items.slice(0, n);
  const extra = items.slice(n).filter((item) => selected.has(keyOf(item)));
  const visible = [...head, ...extra];
  return {
    visible,
    omittedCount: items.length - visible.length,
    total: items.length,
    limit: n,
    truncated: items.length > n,
  };
}
