import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from './use-mobile';

const MOBILE_BREAKPOINT = 768;

function setWindowWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
}

afterEach(() => {
  setWindowWidth(1024);
});

describe('useIsMobile', () => {
  it('returns false for a desktop-width viewport', () => {
    setWindowWidth(1280);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns true for a mobile-width viewport', () => {
    setWindowWidth(375);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('returns false exactly at the breakpoint boundary (768px)', () => {
    setWindowWidth(MOBILE_BREAKPOINT);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns true one pixel below the breakpoint', () => {
    setWindowWidth(MOBILE_BREAKPOINT - 1);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('updates when window width changes and a matchMedia change event fires', () => {
    // Override the global matchMedia mock locally to capture and invoke listeners
    const listeners: Array<(e: Event) => void> = [];
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_: string, listener: (e: Event) => void) => listeners.push(listener),
        removeEventListener: () => {},
        dispatchEvent: () => {},
      }),
    });

    setWindowWidth(1280);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      setWindowWidth(375);
      listeners.forEach((l) => l(new Event('change')));
    });

    expect(result.current).toBe(true);
  });
});
