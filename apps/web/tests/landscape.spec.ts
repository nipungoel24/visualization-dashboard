import { describe, expect, it } from "vitest";

import {
  BUBBLE_R_MAX,
  BUBBLE_R_MIN,
  HIT_R_MIN,
  INTERACTION_PADDING,
  JITTER_MAX_OFFSET,
  LIKELIHOOD_DOMAIN,
  RELEVANCE_DOMAIN,
  intensityRadius,
  layoutLandscape,
  nearestPoint,
  paintOrder,
  pickLabels,
  type LandscapePoint,
  type RenderedPoint,
} from "@/lib/d3/landscape";

function point(overrides: Partial<LandscapePoint> & { topic: string }): LandscapePoint {
  return {
    record_count: 1,
    avg_intensity: 10,
    avg_likelihood: 3,
    avg_relevance: 3,
    dominant_sector: "Energy",
    ...overrides,
  };
}

describe("scale domains", () => {
  it("pins likelihood and relevance to their metric ranges", () => {
    expect(LIKELIHOOD_DOMAIN).toEqual([1, 4]);
    expect(RELEVANCE_DOMAIN).toEqual([1, 6]);
  });
});

describe("intensityRadius", () => {
  it("maps null and zero to the minimum radius and clamps giants", () => {
    expect(intensityRadius(null)).toBe(BUBBLE_R_MIN);
    expect(intensityRadius(0)).toBe(BUBBLE_R_MIN);
    expect(intensityRadius(96)).toBe(BUBBLE_R_MAX);
    expect(intensityRadius(500)).toBe(BUBBLE_R_MAX);
  });

  it("encodes AREA via square-root scaling above the visibility floor", () => {
    const floor = intensityRadius(0);
    const area = (value: number) => (intensityRadius(value) - floor) ** 2;
    expect(area(24)).toBeCloseTo(area(6) * 4, 6);
  });
});

describe("layoutLandscape", () => {
  it("keeps singletons exactly on their true position", () => {
    const [only] = layoutLandscape([point({ topic: "oil" })]);
    expect(only.dx).toBe(0);
    expect(only.dy).toBe(0);
    expect(only.xValue).toBe(3);
    expect(only.yValue).toBe(3);
    expect(only.positionable).toBe(true);
  });

  it("is deterministic across runs and caps drift", () => {
    const group = ["b", "a", "c", "d", "e", "f", "g", "h"].map((topic) => point({ topic }));
    const first = layoutLandscape(group);
    const second = layoutLandscape([...group].reverse());
    expect(second).toEqual(first);
    for (const item of first) {
      expect(Math.hypot(item.dx, item.dy)).toBeLessThanOrEqual(JITTER_MAX_OFFSET);
    }
    const anchor = first.find((item) => item.topic === "a");
    expect(anchor?.dx).toBe(0);
    expect(anchor?.dy).toBe(0);
  });

  it("flags unpositionable topics instead of fabricating coordinates", () => {
    const [item] = layoutLandscape([
      point({ topic: "mystery", avg_likelihood: null, avg_relevance: 2 }),
    ]);
    expect(item.positionable).toBe(false);
    expect(item.xValue).toBeNaN();
  });
});

describe("paintOrder", () => {
  it("paints largest first with deterministic tiebreaks", () => {
    const ordered = paintOrder(
      layoutLandscape([
        point({ topic: "b", avg_intensity: 4 }),
        point({ topic: "a", avg_intensity: 4 }),
        point({ topic: "c", avg_intensity: 40 }),
      ]),
    );
    expect(ordered.map((item) => item.topic)).toEqual(["c", "a", "b"]);
  });
});

describe("pickLabels", () => {
  it("labels the top five plus every selected topic", () => {
    const points = layoutLandscape(
      ["t1", "t2", "t3", "t4", "t5", "t6", "t7"].map((topic, index) =>
        point({ topic, record_count: 10 - index }),
      ),
    );
    expect(pickLabels(points, new Set(["t7"]))).toEqual(
      new Set(["t1", "t2", "t3", "t4", "t5", "t7"]),
    );
  });
});

describe("nearestPoint", () => {
  function rendered(
    topic: string,
    cx: number,
    cy: number,
    radius: number,
  ): RenderedPoint {
    return {
      cx,
      cy,
      point: {
        topic,
        record_count: 1,
        avg_intensity: 10,
        avg_likelihood: 3,
        avg_relevance: 3,
        dominant_sector: "Energy",
        xValue: 3,
        yValue: 3,
        radius,
        hitRadius: Math.max(radius, HIT_R_MIN),
        dx: 0,
        dy: 0,
        stackIndex: 0,
        groupSize: 1,
        positionable: true,
      },
    };
  }

  it("returns null for an empty dataset", () => {
    expect(nearestPoint([], 100, 100)).toBeNull();
  });

  it("resolves to the exact center of a single point", () => {
    const items = [rendered("oil", 200, 150, 12)];
    const result = nearestPoint(items, 200, 150);
    expect(result?.topic).toBe("oil");
  });

  it("resolves exact oil center to oil and exact population center to population", () => {
    const items = [
      rendered("oil", 513, 241, 12),
      rendered("population", 513 + 9.7, 241, 12),
    ];
    expect(nearestPoint(items, 513, 241)?.topic).toBe("oil");
    expect(nearestPoint(items, 513 + 9.7, 241)?.topic).toBe("population");
  });

  it("rejects pointer outside the interaction threshold", () => {
    const items = [rendered("oil", 200, 200, 5)];
    const threshold = Math.max(5 + INTERACTION_PADDING, HIT_R_MIN);
    const result = nearestPoint(items, 200 + threshold + 1, 200);
    expect(result).toBeNull();
  });

  it("accepts pointer at the exact threshold boundary", () => {
    const items = [rendered("oil", 200, 200, 5)];
    const threshold = Math.max(5 + INTERACTION_PADDING, HIT_R_MIN);
    const result = nearestPoint(items, 200 + threshold, 200);
    expect(result?.topic).toBe("oil");
  });

  it("picks the closer of two non-overlapping points", () => {
    const items = [
      rendered("left", 100, 200, 40),
      rendered("right", 300, 200, 40),
    ];
    const threshold = Math.max(40 + INTERACTION_PADDING, HIT_R_MIN);
    expect(nearestPoint(items, 100 + threshold - 1, 200)?.topic).toBe("left");
    expect(nearestPoint(items, 300 - threshold + 1, 200)?.topic).toBe("right");
  });

  it("handles a one-point dataset", () => {
    const items = [rendered("only", 50, 50, 8)];
    expect(nearestPoint(items, 50, 50)?.topic).toBe("only");
  });

  it("is deterministic — repeated calls return the same result", () => {
    const items = [
      rendered("a", 100, 100, 10),
      rendered("b", 110, 100, 10),
    ];
    const first = nearestPoint(items, 105, 100);
    const second = nearestPoint(items, 105, 100);
    expect(first?.topic).toBe(second?.topic);
  });

  it("resolves correctly with different rendered coordinates", () => {
    const items = [
      rendered("near", 100, 100, 30),
      rendered("far", 400, 400, 30),
    ];
    expect(nearestPoint(items, 105, 105)?.topic).toBe("near");
    expect(nearestPoint(items, 395, 395)?.topic).toBe("far");
  });
});
