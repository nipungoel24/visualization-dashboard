/**
 * Centralized display formatting (Architecture §9: `lib/format.ts`).
 * Null means missing and renders as "—". Zero is a legitimate value —
 * always use explicit null checks, never truthiness.
 */

export const UNAVAILABLE_GLYPH = "—";

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return UNAVAILABLE_GLYPH;
  return value.toLocaleString("en-US");
}

/** Metric averages (backend rounds to 4dp) display at 2dp in Mono. */
export function formatAverage(value: number | null | undefined): string {
  if (value === null || value === undefined) return UNAVAILABLE_GLYPH;
  return value.toFixed(2);
}

export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return UNAVAILABLE_GLYPH;
  return `${value.toFixed(1)}%`;
}

const SOURCE_DATE_PATTERN =
  /^([A-Za-z]+),\s*(\d{1,2})\s+(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Formats the dataset's verbatim date strings ("January, 20 2017 03:51:25")
 * as "20 January 2017". Unparseable input is returned verbatim — never blanked.
 */
export function formatSourceDate(value: string | null | undefined): string {
  if (value === null || value === undefined || value.trim() === "") {
    return UNAVAILABLE_GLYPH;
  }
  const match = SOURCE_DATE_PATTERN.exec(value.trim());
  if (!match) return value;
  const monthIndex = MONTHS.findIndex(
    (month) => month.toLowerCase() === match[1].toLowerCase(),
  );
  if (monthIndex === -1) return value;
  const day = Number(match[2]);
  const year = match[3];
  return `${day} ${MONTHS[monthIndex]} ${year}`;
}

/** Formats ISO timestamps (e.g. `dataset_meta.imported_at`) as "8 September 2026". */
export function formatImportedAt(value: string | null | undefined): string {
  if (value === null || value === undefined || value.trim() === "") {
    return UNAVAILABLE_GLYPH;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Short SHA for provenance display ("f45b67f7…aeb1744"). */
export function formatShortSha(value: string | null | undefined): string {
  if (value === null || value === undefined || value.length < 16) {
    return UNAVAILABLE_GLYPH;
  }
  return `${value.slice(0, 8)}…${value.slice(-7)}`;
}
