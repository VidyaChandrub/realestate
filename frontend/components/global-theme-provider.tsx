"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getPlatformTheme } from "@/lib/api";
import type { PlatformTheme } from "@/lib/types";

export const DEFAULT_PRIMARY = "#0f1424";
export const DEFAULT_SECONDARY = "#2a3348";
export const THEME_STORAGE_KEY = "ipixxel_platform_theme";
export const THEME_CHANGE_EVENT = "ipixxel_theme_changed";
export const ORG_THEME_CHANGE_EVENT = "ipixxel_org_theme_changed";

interface GlobalThemeContextValue {
  primaryColor: string;
  secondaryColor: string;
  setGlobalTheme: (theme: { primaryColor: string; secondaryColor: string }) => void;
  refreshGlobalTheme: () => Promise<void>;
}

const GlobalThemeContext = createContext<GlobalThemeContextValue>({
  primaryColor: DEFAULT_PRIMARY,
  secondaryColor: DEFAULT_SECONDARY,
  setGlobalTheme: () => {},
  refreshGlobalTheme: async () => {},
});

export function applyThemeVariables(
  primary: string,
  secondary?: string,
  targetElement?: HTMLElement | null
) {
  if (typeof document === "undefined") return;
  const target = targetElement || document.documentElement;

  const prim = primary || DEFAULT_PRIMARY;
  const sec = secondary || `color-mix(in srgb, ${prim} 65%, #0f1424)`;

  target.style.setProperty("--primary", prim);
  target.style.setProperty("--secondary", sec);
  target.style.setProperty("--brand", prim);
  target.style.setProperty("--sidebar", "#090e1a");
  target.style.setProperty("--sidebar-2", "#060a12");
  target.style.setProperty("--sidebar-active", "#0066f5");
  target.style.setProperty("--sidebar-ink", "#94a3b8");
  target.style.setProperty("--ps-secondary", sec);
  target.style.setProperty("--color-primary", prim);
  target.style.setProperty("--color-secondary", sec);
  target.style.setProperty("--color-brand", prim);

  // Soft tints, hover shades, and glow shadows via standard color-mix
  target.style.setProperty("--primary-dark", `color-mix(in srgb, ${prim} 85%, black)`);
  target.style.setProperty("--primary-soft", `color-mix(in srgb, ${prim} 6%, white)`);
  target.style.setProperty("--primary-border", `color-mix(in srgb, ${prim} 15%, white)`);
  target.style.setProperty("--brand-600", `color-mix(in srgb, ${prim} 85%, black)`);
  target.style.setProperty("--brand-050", `color-mix(in srgb, ${prim} 6%, white)`);
  target.style.setProperty("--brand-100", `color-mix(in srgb, ${prim} 15%, white)`);
  target.style.setProperty("--secondary-050", `color-mix(in srgb, ${sec} 8%, white)`);
  target.style.setProperty("--secondary-100", `color-mix(in srgb, ${sec} 18%, white)`);
  target.style.setProperty("--sh-glow", `0 10px 28px -10px color-mix(in srgb, ${prim} 45%, transparent)`);
}

export function resetThemeVariables(targetElement: HTMLElement) {
  if (!targetElement) return;
  const props = [
    "--primary",
    "--secondary",
    "--brand",
    "--iris",
    "--sidebar",
    "--sidebar-2",
    "--ps-primary",
    "--ps-secondary",
    "--color-primary",
    "--color-secondary",
    "--color-brand",
    "--primary-dark",
    "--primary-soft",
    "--primary-border",
    "--brand-600",
    "--brand-050",
    "--brand-100",
    "--secondary-050",
    "--secondary-100",
    "--sh-glow",
  ];
  props.forEach((p) => targetElement.style.removeProperty(p));
}

export function GlobalThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<PlatformTheme>({
    primaryColor: DEFAULT_PRIMARY,
    secondaryColor: DEFAULT_SECONDARY,
  });

  const setGlobalTheme = useCallback((newTheme: { primaryColor: string; secondaryColor: string }) => {
    setThemeState(newTheme);
    applyThemeVariables(newTheme.primaryColor, newTheme.secondaryColor);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(newTheme));
      window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: newTheme }));
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, []);

  const refreshGlobalTheme = useCallback(async () => {
    try {
      const data = await getPlatformTheme();
      if (data?.primaryColor && data?.secondaryColor) {
        setThemeState(data);
        applyThemeVariables(data.primaryColor, data.secondaryColor);
        try {
          localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(data));
        } catch {
          // Ignore storage errors
        }
      }
    } catch {
      // Keep existing theme
    }
  }, []);

  useEffect(() => {
    // 1. Instant hydration from cached storage (prevents any visual flash)
    try {
      const cached = localStorage.getItem(THEME_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.primaryColor && parsed.secondaryColor) {
          setThemeState(parsed);
          applyThemeVariables(parsed.primaryColor, parsed.secondaryColor);
        }
      }
    } catch {
      // Ignore storage parsing errors
    }

    // 2. Fetch fresh config from backend API
    refreshGlobalTheme();

    // 3. Listen to intra-tab theme changes (e.g. from superadmin settings save)
    const handleThemeChange = (e: Event) => {
      const custom = e as CustomEvent<PlatformTheme>;
      if (custom.detail?.primaryColor && custom.detail?.secondaryColor) {
        setThemeState(custom.detail);
        applyThemeVariables(custom.detail.primaryColor, custom.detail.secondaryColor);
      }
    };
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);

    // 4. Listen to cross-tab storage changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.primaryColor && parsed.secondaryColor) {
            setThemeState(parsed);
            applyThemeVariables(parsed.primaryColor, parsed.secondaryColor);
          }
        } catch {
          // Ignore
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [refreshGlobalTheme]);

  return (
    <GlobalThemeContext.Provider
      value={{
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        setGlobalTheme,
        refreshGlobalTheme,
      }}
    >
      {children}
    </GlobalThemeContext.Provider>
  );
}

export function useGlobalTheme() {
  return useContext(GlobalThemeContext);
}
