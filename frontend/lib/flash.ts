"use client";

import { useEffect, useRef } from "react";

// One-shot "flash" messages carried across a client-side navigation — used by
// the full-page create / edit forms to show a success toast (and optionally
// pick a tab) on the list they redirect back to.
//
// sessionStorage can be unavailable (private mode, blocked storage); every
// access is wrapped so a missing flash never breaks the save or the list.

export interface Flash {
  message: string;
  /** Optional extra state for the list page, e.g. which tab to open. */
  tab?: string;
}

export function setFlash(key: string, flash: Flash): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(flash));
  } catch {
    // Storage unavailable — the redirect still happens, just without a toast.
  }
}

/**
 * Calls `onFlash` once with the flash stored under `key`, then clears it.
 * Read in a deferred callback (not the effect body) and removed only when it
 * fires, so a StrictMode double-mount can't consume it before it shows.
 */
export function useFlash(key: string, onFlash: (flash: Flash) => void): void {
  const handler = useRef(onFlash);
  useEffect(() => {
    handler.current = onFlash;
  });
  useEffect(() => {
    const t = window.setTimeout(() => {
      let flash: Flash | null = null;
      try {
        const raw = sessionStorage.getItem(key);
        if (raw) {
          sessionStorage.removeItem(key);
          const parsed = JSON.parse(raw) as Flash;
          if (parsed && typeof parsed.message === "string") flash = parsed;
        }
      } catch {
        // Unavailable or malformed — nothing to show.
      }
      if (flash) handler.current(flash);
    }, 0);
    return () => window.clearTimeout(t);
  }, [key]);
}
