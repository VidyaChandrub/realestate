import "@testing-library/jest-dom";

// Radix UI Select calls scrollIntoView when content opens — jsdom doesn't have it
Element.prototype.scrollIntoView = function () {};

// Radix UI Popover/Select use ResizeObserver for positioning calculations.
// Without this no-op stub, floating-ui enters an infinite resize loop in jsdom.
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = NoopResizeObserver;

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
