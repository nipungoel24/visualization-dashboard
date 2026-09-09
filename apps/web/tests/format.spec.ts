import { describe, expect, it } from "vitest";

import {
  UNAVAILABLE_GLYPH,
  formatAverage,
  formatCount,
  formatImportedAt,
  formatPercentage,
  formatShortSha,
  formatSourceDate,
} from "@/lib/format";

describe("formatCount", () => {
  it("formats thousands with separators", () => {
    expect(formatCount(1000)).toBe("1,000");
  });

  it("renders null as the unavailable glyph and zero as zero", () => {
    expect(formatCount(null)).toBe(UNAVAILABLE_GLYPH);
    expect(formatCount(undefined)).toBe(UNAVAILABLE_GLYPH);
    expect(formatCount(0)).toBe("0");
  });
});

describe("formatAverage", () => {
  it("renders null averages as the unavailable glyph, never zero", () => {
    expect(formatAverage(null)).toBe("—");
    expect(formatAverage(undefined)).toBe("—");
  });

  it("keeps zero as a legitimate value", () => {
    expect(formatAverage(0)).toBe("0.00");
  });

  it("rounds backend 4dp averages to 2dp", () => {
    expect(formatAverage(12.3457)).toBe("12.35");
  });
});

describe("formatPercentage", () => {
  it("formats one decimal with a percent sign", () => {
    expect(formatPercentage(25.8)).toBe("25.8%");
    expect(formatPercentage(null)).toBe("—");
  });
});

describe("formatSourceDate", () => {
  it("formats the dataset's verbatim date shape", () => {
    expect(formatSourceDate("January, 20 2017 03:51:25")).toBe("20 January 2017");
  });

  it("returns blank input as unavailable and unknown shapes verbatim", () => {
    expect(formatSourceDate("")).toBe("—");
    expect(formatSourceDate(null)).toBe("—");
    expect(formatSourceDate("not a date")).toBe("not a date");
  });
});

describe("formatImportedAt", () => {
  it("formats ISO timestamps as day month year", () => {
    expect(formatImportedAt("2026-09-08T11:08:50.518115+00:00")).toBe("8 September 2026");
    expect(formatImportedAt(null)).toBe("—");
  });
});

describe("formatShortSha", () => {
  it("abbreviates long hashes and guards short input", () => {
    expect(formatShortSha("f45b67f7d4a252c5daa3ec0dfd9c7ceb4e415106c404646f66bff93d9aeb1744")).toBe(
      "f45b67f7…aeb1744",
    );
    expect(formatShortSha("abc")).toBe("—");
  });
});
