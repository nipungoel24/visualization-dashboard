import { Delaunay } from "d3-delaunay";
import { scaleSqrt } from "d3-scale";

/**
 * Signals Landscape pure visualization math (React renders; D3 calculates).
 *
 * Encodings: X = avg likelihood · Y = avg relevance · bubble AREA = avg
 * intensity (square-root radius) · color = dominant sector.
 *
 * Fixed domains: likelihood averages live on the 1–4 metric and relevance
 * averages on 1–6; fixing the domains keeps axes (and bubble positions)
 * stable across filter changes instead of rescaling on every selection.
 * Intensity uses the fixed 0–96 metric range for the same reason.
 */

export const LIKELIHOOD_DOMAIN: readonly [number, number] = [1, 4];
export const RELEVANCE_DOMAIN: readonly [number, number] = [1, 6];
export const INTENSITY_DOMAIN: readonly [number, number] = [0, 96];

/** Visual bubble radii (px). Small signals stay visible; giants are clamped. */
export const BUBBLE_R_MIN = 5;
export const BUBBLE_R_MAX = 26;
/** Invisible hit area never drops below this radius (touch usability). */
export const HIT_R_MIN = 12;
/** Extra px added to visual radius when resolving pointer nearest-point. */
export const INTERACTION_PADDING = 8;

/** Max pixel offset a jittered bubble may drift from its true position. */
export const JITTER_MAX_OFFSET = 30;
const JITTER_STEP = 9;
/** Golden angle — deterministic, evenly spreading spiral. */
const GOLDEN_ANGLE = 2.39996;

export interface LandscapePoint {
  topic: string;
  record_count: number;
  avg_intensity: number | null;
  avg_likelihood: number | null;
  avg_relevance: number | null;
  dominant_sector: string | null;
}

export interface PositionedPoint extends LandscapePoint {
  /** True data-space position (always faithful to the averages). */
  xValue: number;
  yValue: number;
  radius: number;
  hitRadius: number;
  /** Visual-only pixel offset; tooltips/axes always use the true values. */
  dx: number;
  dy: number;
  /** 1-based position inside its collision group (0 = exact anchor). */
  stackIndex: number;
  groupSize: number;
  positionable: boolean;
}

const radiusScale = scaleSqrt()
  .domain(INTENSITY_DOMAIN)
  .range([BUBBLE_R_MIN, BUBBLE_R_MAX])
  .clamp(true);

export function intensityRadius(avgIntensity: number | null): number {
  if (avgIntensity === null) return BUBBLE_R_MIN;
  return radiusScale(avgIntensity);
}

/**
 * Deterministic overlap handling for topics sharing an exact
 * (avg_likelihood, avg_relevance) position (16 of 50 positions collide in the
 * unfiltered data, stacks up to 8). Group members are ordered by topic name;
 * member 0 stays exactly on the true position; the rest spiral outward with a
 * capped offset. Visual-only: tooltips, labels and axes use true values, and
 * the layout is identical on every render.
 */
export function layoutLandscape(points: readonly LandscapePoint[]): PositionedPoint[] {
  const groups = new Map<string, LandscapePoint[]>();
  for (const point of points) {
    if (point.avg_likelihood === null || point.avg_relevance === null) continue;
    const key = `${point.avg_likelihood}:${point.avg_relevance}`;
    const group = groups.get(key);
    if (group) group.push(point);
    else groups.set(key, [point]);
  }

  const positioned: PositionedPoint[] = [];
  const unpositionable = points.filter(
    (point) => point.avg_likelihood === null || point.avg_relevance === null,
  );

  for (const group of groups.values()) {
    const ordered = [...group].sort((a, b) => (a.topic < b.topic ? -1 : 1));
    ordered.forEach((point, index) => {
      const raw = JITTER_STEP * Math.sqrt(index);
      const dist = Math.min(raw, JITTER_MAX_OFFSET);
      const angle = index === 0 ? 0 : index * GOLDEN_ANGLE;
      const radius = intensityRadius(point.avg_intensity);
      positioned.push({
        ...point,
        xValue: point.avg_likelihood as number,
        yValue: point.avg_relevance as number,
        radius,
        hitRadius: Math.max(radius, HIT_R_MIN),
        dx: index === 0 ? 0 : dist * Math.cos(angle),
        dy: index === 0 ? 0 : dist * Math.sin(angle),
        stackIndex: index,
        groupSize: ordered.length,
        positionable: true,
      });
    });
  }

  for (const point of unpositionable) {
    positioned.push({
      ...point,
      xValue: NaN,
      yValue: NaN,
      radius: intensityRadius(point.avg_intensity),
      hitRadius: HIT_R_MIN,
      dx: 0,
      dy: 0,
      stackIndex: 0,
      groupSize: 0,
      positionable: false,
    });
  }

  return positioned;
}

/**
 * Paint order: largest bubbles first (bottom), smallest last (top), ties by
 * topic name — stable across renders.
 */
export function paintOrder(points: readonly PositionedPoint[]): PositionedPoint[] {
  return [...points]
    .filter((point) => point.positionable)
    .sort(
      (a, b) => b.radius - a.radius || (a.topic < b.topic ? -1 : a.topic > b.topic ? 1 : 0),
    );
}

/**
 * Label subset: top 5 by record count plus every selected topic. Small,
 * deterministic, never the full ~97.
 */
export function pickLabels(
  points: readonly PositionedPoint[],
  selected: ReadonlySet<string>,
  count = 5,
): Set<string> {
  const top = [...points]
    .filter((point) => point.positionable)
    .sort((a, b) => b.record_count - a.record_count || (a.topic < b.topic ? -1 : 1))
    .slice(0, count)
    .map((point) => point.topic);
  return new Set([...top, ...selected]);
}

export interface RenderedPoint {
  cx: number;
  cy: number;
  point: PositionedPoint;
}

/**
 * Nearest-point pointer resolution via D3 Delaunay. Given rendered bubble
 * coordinates and a pointer position in SVG space, returns the nearest
 * PositionedPoint if within the interaction radius, or null otherwise.
 *
 * interactionRadius = max(visualRadius + interactionPadding, HIT_R_MIN)
 *
 * This guarantees one unambiguous topic per pointer position and prevents
 * neighboring bubbles from stealing each other's centers.
 */
export function nearestPoint(
  rendered: readonly RenderedPoint[],
  pointerX: number,
  pointerY: number,
  interactionPadding: number = INTERACTION_PADDING,
): PositionedPoint | null {
  if (rendered.length === 0) return null;

  const delaunay = Delaunay.from(
    rendered,
    (d) => d.cx,
    (d) => d.cy,
  );

  const index = delaunay.find(pointerX, pointerY);
  if (index === -1) return null;

  const nearest = rendered[index];
  const dx = pointerX - nearest.cx;
  const dy = pointerY - nearest.cy;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const threshold = Math.max(nearest.point.radius + interactionPadding, HIT_R_MIN);

  return distance <= threshold ? nearest.point : null;
}
