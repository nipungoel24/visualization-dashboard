"use client";

import { useCallback, useState } from "react";

/**
 * Uniform roving-focus strategy for every interactive chart: exactly one Tab
 * stop per chart; Left/Up = previous mark, Right/Down = next mark, Home/End
 * jump; Enter/Space activates via the parent callback. DOM order is the
 * deterministic data order, so navigation is stable across renders.
 */
export function useRovingFocus(count: number, onActivate: (index: number) => void) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = count === 0 ? 0 : Math.min(activeIndex, count - 1);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      if (count === 0) return;
      let next: number | null = null;
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          next = (index + 1) % count;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          next = (index + count - 1) % count;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = count - 1;
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          onActivate(index);
          return;
        default:
          return;
      }
      event.preventDefault();
      setActiveIndex(next);
      const root = (event.currentTarget as HTMLElement).closest("[data-roving-root]");
      const sibling = root?.querySelector<HTMLElement>(`[data-mark-index="${next}"]`);
      sibling?.focus();
    },
    [count, onActivate],
  );

  const tabIndexFor = useCallback(
    (index: number): 0 | -1 => (index === safeIndex ? 0 : -1),
    [safeIndex],
  );

  return { activeIndex: safeIndex, setActiveIndex, handleKeyDown, tabIndexFor };
}
