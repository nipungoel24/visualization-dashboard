import { describe, expect, it } from "vitest";

import {
  EMPTY_FILTERS,
  countActiveFilters,
  isEmptyState,
  parseFilterState,
  serializeFilterState,
  statesEqual,
  toFilterParams,
} from "@/lib/filters";

describe("parseFilterState", () => {
  it("parses an empty query into the empty state", () => {
    expect(parseFilterState("")).toEqual(EMPTY_FILTERS);
    expect(isEmptyState(parseFilterState(""))).toBe(true);
  });

  it("parses repeated topic values with OR semantics preserved", () => {
    const state = parseFilterState("topic=oil&topic=gas");
    expect(state.topic).toEqual(["oil", "gas"]);
  });

  it("parses multiple dimensions independently", () => {
    const state = parseFilterState("topic=oil&country=India&pestle=Economic");
    expect(state.topic).toEqual(["oil"]);
    expect(state.country).toEqual(["India"]);
    expect(state.pestle).toEqual(["Economic"]);
  });

  it("parses year lists as sorted integers and drops non-integers", () => {
    const state = parseFilterState("end_year=2020&end_year=abc&end_year=2017");
    expect(state.end_year).toEqual([2017, 2020]);
  });

  it("parses numeric ranges", () => {
    const state = parseFilterState("intensity_min=10&intensity_max=20&q=energy");
    expect(state.intensity_min).toBe(10);
    expect(state.intensity_max).toBe(20);
    expect(state.q).toBe("energy");
  });

  it("preserves source casing exactly (no case folding)", () => {
    const state = parseFilterState("region=World&region=world&source=CNBC");
    expect(state.region).toEqual(["World", "world"]);
    expect(state.source).toEqual(["CNBC"]);
  });

  it("ignores unknown params and trims whitespace", () => {
    const state = parseFilterState("topic=%20%20oil%20%20&city=Sydney&foo=bar");
    expect(state.topic).toEqual(["oil"]);
    expect(state.q).toBe("");
  });

  it("dedupes repeated identical values", () => {
    expect(parseFilterState("topic=oil&topic=oil").topic).toEqual(["oil"]);
  });
});

describe("serializeFilterState", () => {
  it("round-trips URL → state → URL", () => {
    const original = "topic=oil&topic=gas&country=India&end_year=2017&intensity_min=10&q=energy";
    const state = parseFilterState(original);
    expect(serializeFilterState(state)).toBe(original);
  });

  it("serializes an empty state to an empty string (reset)", () => {
    expect(serializeFilterState(EMPTY_FILTERS)).toBe("");
    expect(serializeFilterState(parseFilterState(""))).toBe("");
  });

  it("uses a stable canonical field order", () => {
    const state = parseFilterState("country=India&topic=oil&q=x&intensity_min=1");
    expect(serializeFilterState(state)).toBe(
      "topic=oil&country=India&intensity_min=1&q=x",
    );
  });
});

describe("toFilterParams", () => {
  it("produces repeated backend params in canonical order", () => {
    const state = parseFilterState("topic=oil&topic=gas&country=India");
    expect(toFilterParams(state)).toEqual([
      ["topic", "oil"],
      ["topic", "gas"],
      ["country", "India"],
    ]);
  });
});

describe("countActiveFilters / statesEqual", () => {
  it("counts every active selection", () => {
    const state = parseFilterState(
      "topic=oil&topic=gas&end_year=2020&intensity_min=5&q=x",
    );
    expect(countActiveFilters(state)).toBe(5);
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
  });

  it("compares states by canonical serialization", () => {
    expect(
      statesEqual(parseFilterState("topic=oil&topic=gas"), parseFilterState("topic=gas&topic=oil")),
    ).toBe(false);
    expect(statesEqual(EMPTY_FILTERS, parseFilterState(""))).toBe(true);
  });
});
