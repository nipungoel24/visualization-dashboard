"use client";

import { useCallback, useRef, useState } from "react";

type RovingMode = "svg" | "buttons";

interface UseRovingFocusOptions {
  mode?: RovingMode;
}

/**
 * Uniform roving-focus strategy.
 * - mode "svg": the SVG is the single tab stop (tabIndex=0); arrow keys navigate
 *   between marks; Enter/Space activates the focused mark. Marks have NO tabindex
 *   and are NOT focusable. The SVG handles all keyboard navigation and updates
 *   aria-activedescendant. This is the proper composite widget pattern per WAI-ARIA.
 * - mode "buttons": each item is a real <button> with roving tabindex (0 for
 *   active, -1 for others). This is the traditional pattern for HTML button lists.
 *   Each button handles its own keydown via the shared handleKeyDown, passing its index.
 */
export function useRovingFocus(
  count: number,
  onActivate: (index: number) => void,
  options: UseRovingFocusOptions = {}
) {
  const { mode = "svg" } = options;
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = count === 0 ? 0 : Math.min(activeIndex, count - 1);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, itemIndex?: number) => {
      if (count === 0) return;
      const currentIndex = mode === "svg" ? activeIndex : (itemIndex ?? activeIndex);
      let next: number | null = null;
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          next = (currentIndex + 1) % count;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          next = (currentIndex + count - 1) % count;
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
          onActivate(currentIndex);
          return;
        default:
          return;
      }
      event.preventDefault();
      setActiveIndex(next);
      if (mode === "svg") {
        // For SVG mode: aria-activedescendant is updated via React render (activeIndex change)
        // No need to focus marks - they're not focusable
      }
    },
    [activeIndex, count, onActivate, mode],
  );

  const handleFocus = useCallback(
    (index: number) => {
      setActiveIndex(index);
    },
    [],
  );

  const tabIndexFor = useCallback(
    (index: number): 0 | -1 => (mode === "svg" ? -1 : index === safeIndex ? 0 : -1),
    [mode, safeIndex],
  );

  // For SVG mode: marks have NO tabindex, not focusable
  // SVG handles all keyboard via handleKeyDown
  // activeIndex change triggers aria-activedescendant update via React
  // For buttons mode: buttons have roving tabindex, handle their own focus

  return {
    activeIndex: safeIndex,
    setActiveIndex,
    handleKeyDown,
    handleFocus,
    tabIndexFor,
    svgRef,
  };
}