"use client";

import { useEffect, useRef, useState } from "react";

export interface ChartSize {
  width: number;
  height: number;
}

/**
 * Single shared responsive-measurement mechanism (Architecture §8.2).
 * Measures the container with one ResizeObserver; cleans up on unmount;
 * SSR-safe (starts at 0×0, measures after mount — no hydration mismatch
 * because charts render nothing measurable until width > 0).
 */
export function useChartSize<T extends HTMLElement = HTMLDivElement>(): [
  React.RefObject<T | null>,
  ChartSize,
] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<ChartSize>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((previous) =>
        previous.width === width && previous.height === height
          ? previous
          : { width, height },
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
