export interface TooltipRow {
  label: string;
  value: string;
}

export interface TooltipPlacement {
  left: number;
  top: number;
  /** Whether the tooltip sits above (default) or below the anchor. */
  placement: "above" | "below";
}

/**
 * Pure tooltip-position math (testable, no DOM): place above the anchor when
 * there is room, otherwise below; clamp horizontally inside the container.
 * All coordinates are relative to the chart container.
 */
export function placeTooltip(
  anchorX: number,
  anchorY: number,
  containerWidth: number,
  containerHeight: number,
  tooltipWidth: number,
  tooltipHeight: number,
  gap = 10,
  pad = 4,
): TooltipPlacement {
  const left = Math.min(
    Math.max(anchorX - tooltipWidth / 2, pad),
    Math.max(containerWidth - tooltipWidth - pad, pad),
  );
  const aboveTop = anchorY - gap - tooltipHeight;
  if (aboveTop >= pad) {
    return { left, top: aboveTop, placement: "above" };
  }
  return {
    left,
    top: Math.min(anchorY + gap, Math.max(containerHeight - tooltipHeight - pad, pad)),
    placement: "below",
  };
}
