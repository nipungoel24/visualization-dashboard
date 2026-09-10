import { describe, expect, it } from "vitest";

import { layoutTreemap, tileFitsLabel } from "@/lib/d3/treemap";

const SECTORS = [
  { sector: "Energy", record_count: 525, avg_intensity: 12.5 },
  { sector: "Retail", record_count: 38, avg_intensity: null },
  { sector: "Water", record_count: 3, avg_intensity: 4 },
];

describe("layoutTreemap", () => {
  it("preserves hierarchy sums and stays inside bounds", () => {
    const tiles = layoutTreemap(SECTORS, 400, 200);
    expect(tiles).toHaveLength(3);
    const area = tiles.reduce((sum, tile) => sum + (tile.x1 - tile.x0) * (tile.y1 - tile.y0), 0);
    expect(area).toBeGreaterThan(0);
    expect(area).toBeLessThanOrEqual(400 * 200);
    for (const tile of tiles) {
      expect(tile.x0).toBeGreaterThanOrEqual(0);
      expect(tile.y0).toBeGreaterThanOrEqual(0);
      expect(tile.x1).toBeLessThanOrEqual(400);
      expect(tile.y1).toBeLessThanOrEqual(200);
    }
    const energy = tiles.find((tile) => tile.sector === "Energy");
    const water = tiles.find((tile) => tile.sector === "Water");
    expect(energy).toBeDefined();
    expect(water).toBeDefined();
    if (energy && water) {
      expect((energy.x1 - energy.x0) * (energy.y1 - energy.y0)).toBeGreaterThan(
        (water.x1 - water.x0) * (water.y1 - water.y0),
      );
    }
  });

  it("is deterministic and guards degenerate input", () => {
    expect(layoutTreemap(SECTORS, 400, 200)).toEqual(layoutTreemap(SECTORS, 400, 200));
    expect(layoutTreemap([], 400, 200)).toEqual([]);
    expect(layoutTreemap(SECTORS, 0, 200)).toEqual([]);
    expect(
      layoutTreemap([{ sector: "X", record_count: -5, avg_intensity: 1 }], 400, 200),
    ).toEqual([]);
  });
});

describe("tileFitsLabel", () => {
  it("hides labels on tiny tiles", () => {
    expect(
      tileFitsLabel({ sector: "E", record_count: 1, avg_intensity: 1, x0: 0, y0: 0, x1: 100, y1: 40 }),
    ).toBe(true);
    expect(
      tileFitsLabel({ sector: "W", record_count: 1, avg_intensity: 1, x0: 0, y0: 0, x1: 20, y1: 10 }),
    ).toBe(false);
  });
});
