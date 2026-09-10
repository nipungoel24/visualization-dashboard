import { describe, expect, it } from "vitest";

import {
  SECTOR_OTHER,
  SECTOR_PALETTE,
  canonicalSectorOrder,
  sectorColor,
  topNWithSelected,
} from "@/lib/d3/palette";

describe("canonicalSectorOrder", () => {
  it("orders by count desc with deterministic name tiebreak", () => {
    expect(
      canonicalSectorOrder([
        { sector: "Retail", record_count: 38 },
        { sector: "Energy", record_count: 525 },
        { sector: "Manufacturing", record_count: 49 },
        { sector: "Government", record_count: 49 },
      ]),
    ).toEqual(["Energy", "Government", "Manufacturing", "Retail"]);
  });
});

describe("sectorColor", () => {
  const canonical = ["Energy", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];

  it("assigns palette slots by canonical rank", () => {
    expect(sectorColor("Energy", canonical)).toBe(SECTOR_PALETTE[0]);
    expect(sectorColor("I", canonical)).toBe(SECTOR_PALETTE[9]);
  });

  it("maps ranks beyond the palette and unknown/null sectors to Other", () => {
    expect(sectorColor("J", canonical)).toBe(SECTOR_OTHER);
    expect(sectorColor("Unknown", canonical)).toBe(SECTOR_OTHER);
    expect(sectorColor(null, canonical)).toBe(SECTOR_OTHER);
  });

  it("is stable because callers always pass the canonical order", () => {
    const sectors = [
      { sector: "Retail", record_count: 38 },
      { sector: "Energy", record_count: 525 },
      { sector: "Manufacturing", record_count: 49 },
    ];
    const forward = canonicalSectorOrder(sectors);
    const reversed = canonicalSectorOrder([...sectors].reverse());
    expect(reversed).toEqual(forward);
    for (const sector of forward) {
      expect(sectorColor(sector, reversed)).toBe(sectorColor(sector, forward));
    }
  });
});

describe("topNWithSelected", () => {
  const items = ["a", "b", "c", "d", "e"].map((value) => ({ value }));

  it("returns the head untouched when nothing extra is selected", () => {
    const result = topNWithSelected(items, (item) => item.value, new Set(), 3);
    expect(result.visible.map((item) => item.value)).toEqual(["a", "b", "c"]);
    expect(result).toMatchObject({ omittedCount: 2, total: 5, limit: 3, truncated: true });
  });

  it("appends selected values beyond the limit in API order", () => {
    const result = topNWithSelected(items, (item) => item.value, new Set(["e", "d"]), 3);
    expect(result.visible.map((item) => item.value)).toEqual(["a", "b", "c", "d", "e"]);
    expect(result.omittedCount).toBe(0);
  });

  it("reports no truncation when everything fits", () => {
    const result = topNWithSelected(items, (item) => item.value, new Set(), 15);
    expect(result.truncated).toBe(false);
    expect(result.omittedCount).toBe(0);
  });
});
