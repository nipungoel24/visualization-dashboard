import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";

/**
 * Sector Composition treemap math (React renders the tiles).
 * Hierarchy root → sectors; tile area = record count. Negative counts are
 * clamped to zero (the API never sends them; the chart must never break).
 */

export interface TreemapDatum {
  sector: string;
  record_count: number;
  avg_intensity: number | null;
}

export interface TreemapTile extends TreemapDatum {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface SectorNode {
  sector?: string;
  record_count?: number;
  avg_intensity?: number | null;
  children?: SectorNode[];
}

export function layoutTreemap(
  data: readonly TreemapDatum[],
  width: number,
  height: number,
): TreemapTile[] {
  if (width <= 0 || height <= 0 || data.length === 0) return [];
  const root = hierarchy<SectorNode>({
    children: data.map((datum) => ({ ...datum })),
  })
    .sum((node) => {
      const count = node.record_count ?? 0;
      return Number.isFinite(count) && count > 0 ? count : 0;
    })
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const laidOut = treemap<SectorNode>()
    .size([width, height])
    .tile(treemapSquarify)
    .paddingInner(2)
    .paddingOuter(1)
    .round(true)(root);
  const tiles: TreemapTile[] = [];
  for (const leaf of laidOut.leaves()) {
    if (leaf.data.sector === undefined) continue;
    // Zero-area tiles carry no visual meaning; never mount them.
    if (leaf.x1 - leaf.x0 <= 0 || leaf.y1 - leaf.y0 <= 0) continue;
    tiles.push({
      sector: leaf.data.sector,
      record_count: leaf.data.record_count ?? 0,
      avg_intensity: leaf.data.avg_intensity ?? null,
      x0: leaf.x0,
      y0: leaf.y0,
      x1: leaf.x1,
      y1: leaf.y1,
    });
  }
  return tiles;
}

/** Tiles large enough for an internal label (Design §8: hide below ~44px). */
export function tileFitsLabel(tile: TreemapTile, minWidth = 44, minHeight = 26): boolean {
  return tile.x1 - tile.x0 >= minWidth && tile.y1 - tile.y0 >= minHeight;
}
