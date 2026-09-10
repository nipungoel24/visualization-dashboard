import { describe, expect, it } from "vitest";

import { placeTooltip } from "@/lib/d3/tooltip";

describe("placeTooltip", () => {
  it("sits above the anchor with room to spare", () => {
    expect(placeTooltip(200, 200, 400, 300, 120, 60)).toEqual({
      left: 140,
      top: 130,
      placement: "above",
    });
  });

  it("drops below the anchor near the top edge", () => {
    const placed = placeTooltip(200, 20, 400, 300, 120, 60);
    expect(placed.placement).toBe("below");
    expect(placed.top).toBeGreaterThanOrEqual(4);
  });

  it("clamps horizontally inside the container", () => {
    expect(placeTooltip(10, 200, 400, 300, 120, 60).left).toBe(4);
    expect(placeTooltip(395, 200, 400, 300, 120, 60).left).toBe(276);
  });
});
