import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom lacks ResizeObserver (used by cmdk and useChartSize). The stub reports
// a fixed 640×360 rect so charts render their measurable content in tests;
// option lists do not depend on measured sizes.
class ResizeObserverStub {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe() {
    this.callback(
      [{ contentRect: { width: 640, height: 360 } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }

  unobserve() {}
  disconnect() {}
}

if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

// jsdom lacks Element.scrollIntoView (used by cmdk to reveal active options).
if (typeof window !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

afterEach(() => {
  cleanup();
});
