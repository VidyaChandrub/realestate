// ---------------------------------------------------------------------------
// Shared widget design system — 3 predefined layout themes
// ---------------------------------------------------------------------------
// Single source of truth for the visual language used by every landing-page
// widget. Three layout themes (Standard, Premium, Modern) share the same
// token shape so the canvas can swap them via React context without touching
// any widget's functional code.
//
// Values are hard-coded (not CSS variables) on purpose: the published landing
// page may render outside the studio shell where `--ps-*` tokens are absent,
// so a self-contained module keeps the widgets identical everywhere.
// ---------------------------------------------------------------------------
import type { CSSProperties } from "react";

// ---------------------------------------------------------------------------
// Layout theme type
// ---------------------------------------------------------------------------

export type LayoutTheme = "standard" | "premium" | "modern";

// ---------------------------------------------------------------------------
// Standard token set (the original baseline)
// ---------------------------------------------------------------------------

const WT_STANDARD = {
  // Radii
  radius: 16,
  radiusSm: 12,
  radiusXs: 10,
  radiusLg: 20,
  radiusXl: 24,
  radiusPill: 999,

  // Surfaces
  surface: "#ffffff",
  surfaceMuted: "#f7f8fb",
  surfaceTint: "#f3f5fb",
  surfaceElevated: "#ffffff",
  // Borders
  border: "1px solid rgba(16,24,40,.08)",
  borderStrong: "1px solid rgba(16,24,40,.12)",
  borderFaint: "1px solid rgba(16,24,40,.05)",
  borderHover: "1px solid rgba(79,70,229,.18)",

  // Text
  ink: "#0f172a",
  inkSoft: "#1e293b",
  slate: "#475569",
  muted: "#94a3b8",
  faint: "#cbd5e1",

  // Brand — indigo primary + warm gold (platform defaults match BRAND/site-config)
  primary: "#6d5dfc",
  primaryHover: "#5c55ee",
  primaryDark: "#5448e8",
  primaryLite: "#9690ff",
  primarySoft: "rgba(109,93,252,.10)",
  primarySoft2: "rgba(109,93,252,.06)",
  primaryGlow: "rgba(109,93,252,.22)",
  gold: "#cda45e",
  goldHover: "#b8893b",
  goldSoft: "rgba(205,164,94,.12)",
  goldSoft2: "rgba(205,164,94,.07)",

  // Dark ink surfaces (hero/band backgrounds over images)
  inkDark: "#090d16",
  inkDeep: "#0b1220",

  // Form fields — single input language for every widget
  fieldBg: "#ffffff",
  fieldBgDark: "rgba(6,10,18,.45)",
  fieldBorder: "#cbd5e1",
  fieldBorderDark: "rgba(255,255,255,.18)",
  fieldRadius: 10,
  fieldPadX: 13,
  fieldPadY: 11,
  fieldFont: 13.5,
  fieldText: "#0f172a",
  fieldTextDark: "#ffffff",
  fieldPlaceholder: "#94a3b8",
  fieldFocus: "#6d5dfc",
  fieldFocusRing: "0 0 0 3px rgba(109,93,252,.16)",

  // Status
  success: "#0f9d58",
  successSoft: "rgba(15,157,88,.10)",
  warn: "#d97706",
  warnSoft: "rgba(217,119,6,.10)",
  danger: "#dc2626",
  dangerSoft: "rgba(220,38,38,.08)",

  // Shadows
  shadow: "0 1px 3px rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.06)",
  shadowSm: "0 1px 2px rgba(16,24,40,.04), 0 4px 12px rgba(16,24,40,.05)",
  shadowMd: "0 4px 12px rgba(16,24,40,.05), 0 16px 32px rgba(16,24,40,.08)",
  shadowLg: "0 8px 24px rgba(16,24,40,.06), 0 24px 48px rgba(16,24,40,.10)",
  shadowHover: "0 8px 24px rgba(16,24,40,.08), 0 16px 40px rgba(16,24,40,.12)",

  // Typography
  font: 'var(--font-inter), "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif:
    'var(--font-playfair), "Playfair Display", Georgia, "Times New Roman", serif',
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",

  // Spacing
  spaceXs: 8,
  spaceSm: 12,
  spaceMd: 20,
  spaceLg: 32,
  spaceXl: 48,

  // Animation
  transition: "all .2s cubic-bezier(.4,0,.2,1)",
  transitionSlow: "all .3s cubic-bezier(.4,0,.2,1)",
} as const;

// ---------------------------------------------------------------------------
// Premium token set — elegant, high-end, gold-centric luxury
// ---------------------------------------------------------------------------

const WT_PREMIUM_TOKENS = {
  ...WT_STANDARD,
  // Larger, softer radii — luxury rounded corners
  radius: 22,
  radiusSm: 16,
  radiusXs: 12,
  radiusLg: 28,
  radiusXl: 32,

  // Richer surfaces — slightly warm white
  surfaceMuted: "#f9f7f4",
  surfaceTint: "#f5f0ea",

  // Borders — warmer, gold-tinted
  border: "1px solid rgba(196,164,106,.14)",
  borderStrong: "1px solid rgba(196,164,106,.22)",
  borderFaint: "1px solid rgba(196,164,106,.08)",
  borderHover: "1px solid rgba(196,164,106,.45)",

  // Text — warmer slate
  ink: "#110d08",
  inkSoft: "#2d2318",
  slate: "#5a4a38",
  muted: "#9b8c7a",
  faint: "#d4c8b8",

  // Brand — gold elevated as primary accent, indigo secondary
  gold: "#b8893b",
  goldHover: "#9e7430",
  goldSoft: "rgba(184,137,59,.14)",
  goldSoft2: "rgba(184,137,59,.08)",

  // Deeper, richer shadows for a sense of depth
  shadow: "0 2px 8px rgba(16,10,4,.06), 0 10px 28px rgba(16,10,4,.08)",
  shadowSm: "0 1px 4px rgba(16,10,4,.05), 0 6px 16px rgba(16,10,4,.07)",
  shadowMd: "0 6px 18px rgba(16,10,4,.07), 0 20px 40px rgba(16,10,4,.10)",
  shadowLg: "0 10px 32px rgba(16,10,4,.08), 0 32px 60px rgba(16,10,4,.12)",
  shadowHover: "0 12px 32px rgba(16,10,4,.10), 0 24px 52px rgba(16,10,4,.14)",

  // Slower, more graceful transitions
  transition: "all .25s cubic-bezier(.25,0,.2,1)",
  transitionSlow: "all .4s cubic-bezier(.25,0,.2,1)",

  // More generous spacing
  spaceXs: 10,
  spaceSm: 16,
  spaceMd: 24,
  spaceLg: 40,
  spaceXl: 60,
} as const;

// ---------------------------------------------------------------------------
// Modern token set — minimal, sharp, bold contrast
// ---------------------------------------------------------------------------

const WT_MODERN_TOKENS = {
  ...WT_STANDARD,
  // Sharp, reduced radii — contemporary geometric
  radius: 8,
  radiusSm: 6,
  radiusXs: 4,
  radiusLg: 12,
  radiusXl: 16,
  radiusPill: 6,

  // Surfaces — pure white, clean
  surfaceMuted: "#f8f9fc",
  surfaceTint: "#f1f4fb",

  // Borders — stronger, clear contrast
  border: "1px solid rgba(16,24,40,.12)",
  borderStrong: "1px solid rgba(16,24,40,.20)",
  borderFaint: "1px solid rgba(16,24,40,.07)",
  borderHover: "1px solid rgba(109,93,252,.40)",

  // Text — pure black/dark for bold contrast
  ink: "#080d18",
  inkSoft: "#111827",
  slate: "#374151",
  muted: "#6b7280",

  // Brand — vibrant indigo, strong contrast
  primarySoft: "rgba(109,93,252,.08)",
  primarySoft2: "rgba(109,93,252,.04)",

  // Minimal shadows — flat, clean
  shadow: "0 1px 2px rgba(16,24,40,.06), 0 4px 12px rgba(16,24,40,.06)",
  shadowSm: "none",
  shadowMd: "0 2px 8px rgba(16,24,40,.07), 0 8px 20px rgba(16,24,40,.08)",
  shadowLg: "0 4px 16px rgba(16,24,40,.08), 0 16px 32px rgba(16,24,40,.09)",
  shadowHover: "0 4px 16px rgba(16,24,40,.10), 0 12px 28px rgba(16,24,40,.10)",

  // Snappier transitions
  transition: "all .15s cubic-bezier(.4,0,.2,1)",
  transitionSlow: "all .22s cubic-bezier(.4,0,.2,1)",

  // Tighter spacing
  spaceXs: 6,
  spaceSm: 10,
  spaceMd: 16,
  spaceLg: 28,
  spaceXl: 40,
} as const;

// ---------------------------------------------------------------------------
// Public token type + exports
// ---------------------------------------------------------------------------

/** Mutable token object — same shape for all 3 themes so helpers are interchangeable. */
export type WtTokens = typeof WT_STANDARD;

/** Standard baseline — kept as `WT` for backward compat with non-themed usages. */
export const WT: WtTokens = WT_STANDARD;

/** Return the token set for the given layout theme (defaults to "standard"). */
export function getWidgetTheme(t?: LayoutTheme | string): WtTokens {
  if (t === "premium") return WT_PREMIUM_TOKENS as unknown as WtTokens;
  if (t === "modern") return WT_MODERN_TOKENS as unknown as WtTokens;
  return WT_STANDARD;
}

type AccentOpts = { accent?: string; gold?: boolean };

function accentColor(o?: AccentOpts, wt: WtTokens = WT): string {
  if (o?.accent) return o.accent;
  return o?.gold ? wt.gold : wt.primary;
}
function accentSoft(o?: AccentOpts, wt: WtTokens = WT): string {
  if (o?.accent) return hexToSoft(o.accent);
  return o?.gold ? wt.goldSoft : wt.primarySoft;
}

/** Best-effort translucent tint from a hex/string; falls back to primary. */
export function hexToSoft(color: string, alpha = 0.12): string {
  const c = (color || "").trim();
  if (c.startsWith("#")) {
    const h = c.slice(1);
    const full =
      h.length === 3
        ? h
            .split("")
            .map((x) => x + x)
            .join("")
        : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    if ([r, g, b].every((n) => !Number.isNaN(n)))
      return `rgba(${r},${g},${b},${alpha})`;
  }
  return `rgba(109,93,252,${alpha})`;
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export function wtCard(
  extra?: CSSProperties,
  wt: WtTokens = WT,
): CSSProperties {
  return {
    background: wt.surface,
    border: wt.border,
    borderRadius: wt.radius,
    boxShadow: wt.shadow,
    ...extra,
  };
}

export function wtCardMuted(
  extra?: CSSProperties,
  wt: WtTokens = WT,
): CSSProperties {
  return {
    background: wt.surfaceMuted,
    border: wt.borderFaint,
    borderRadius: wt.radius,
    boxShadow: wt.shadowSm,
    ...extra,
  };
}

/** Card for use on dark/image backgrounds — translucent, luminous. */
export function wtCardGlass(
  extra?: CSSProperties,
  wt: WtTokens = WT,
): CSSProperties {
  return {
    background: "rgba(255,255,255,.10)",
    border: "1px solid rgba(255,255,255,.22)",
    borderRadius: wt.radius,
    boxShadow: "0 12px 34px rgba(8,10,20,.30)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    ...extra,
  };
}

/** Premium elevated card with hover lift — conversion focused. */
export function wtCardPremium(
  extra?: CSSProperties,
  wt: WtTokens = WT,
): CSSProperties {
  return {
    background: wt.surface,
    border: wt.border,
    borderRadius: wt.radiusLg,
    boxShadow: wt.shadowMd,
    transition: wt.transition,
    ...extra,
  };
}

export function wtCardHover(wt: WtTokens = WT): CSSProperties {
  return {
    transform: "translateY(-2px)",
    boxShadow: wt.shadowHover,
    border: wt.borderHover,
  };
}

/** Image treatment — consistent radius + shadow */
export function wtImage(
  extra?: CSSProperties,
  wt: WtTokens = WT,
): CSSProperties {
  return {
    borderRadius: wt.radius,
    overflow: "hidden",
    boxShadow: wt.shadowSm,
    ...extra,
  };
}

/** Premium section wrapper — generous whitespace, max-width */
export function wtSection(extra?: CSSProperties): CSSProperties {
  return {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "0 24px",
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

type BtnOpts = AccentOpts & {
  size?: "sm" | "md" | "lg";
  outline?: boolean;
  block?: boolean;
};

export function wtButton(o: BtnOpts = {}, wt: WtTokens = WT): CSSProperties {
  const accent = accentColor(o, wt);
  const size =
    o.size === "lg"
      ? { padding: "14px 28px", fontSize: 14.5 }
      : o.size === "sm"
        ? { padding: "9px 16px", fontSize: 12.5 }
        : { padding: "11px 20px", fontSize: 13.5 };
  if (o.outline) {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      fontWeight: 700,
      borderRadius: wt.radiusSm,
      background: "transparent",
      color: accent,
      border: `1.5px solid ${hexToSoft(accent, 0.5)}`,
      textDecoration: "none",
      cursor: "pointer",
      transition: "all .15s",
      ...size,
      ...(o.block ? { width: "100%" } : {}),
    };
  }
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontWeight: 700,
    borderRadius: wt.radiusSm,
    background: accent,
    color: "#fff",
    border: "1px solid transparent",
    boxShadow: `0 8px 22px ${hexToSoft(accent, 0.35)}`,
    textDecoration: "none",
    cursor: "pointer",
    transition: "all .15s",
    ...size,
    ...(o.block ? { width: "100%" } : {}),
  };
}

/** Light/ghost button used on dark backgrounds. */
export function wtButtonLight(
  o: BtnOpts = {},
  wt: WtTokens = WT,
): CSSProperties {
  const size =
    o.size === "lg"
      ? { padding: "14px 28px", fontSize: 14.5 }
      : o.size === "sm"
        ? { padding: "9px 16px", fontSize: 12.5 }
        : { padding: "11px 20px", fontSize: 13.5 };
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontWeight: 700,
    borderRadius: wt.radiusSm,
    background: "rgba(255,255,255,.12)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,.34)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    textDecoration: "none",
    cursor: "pointer",
    transition: "all .15s",
    ...size,
    ...(o.block ? { width: "100%" } : {}),
  };
}

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

/** Standard light input — used on white/muted surfaces across every widget. */
export function wtField(
  extra?: CSSProperties,
  wt: WtTokens = WT,
): CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    padding: `${wt.fieldPadY}px ${wt.fieldPadX}px`,
    fontSize: wt.fieldFont,
    fontWeight: 500,
    lineHeight: 1.5,
    color: wt.fieldText,
    backgroundColor: wt.fieldBg,
    border: `1.5px solid ${wt.fieldBorder}`,
    borderRadius: wt.fieldRadius,
    outline: "none",
    transition: wt.transition,
    ...extra,
  };
}

/** Glossy dark input — used on hero forms over images. */
export function wtFieldDark(
  extra?: CSSProperties,
  wt: WtTokens = WT,
): CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    padding: `${wt.fieldPadY}px ${wt.fieldPadX}px`,
    fontSize: wt.fieldFont,
    fontWeight: 500,
    lineHeight: 1.5,
    color: wt.fieldTextDark,
    backgroundColor: wt.fieldBgDark,
    border: `1px solid ${wt.fieldBorderDark}`,
    borderRadius: wt.fieldRadius,
    outline: "none",
    transition: wt.transition,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Pills / badges / icon badges
// ---------------------------------------------------------------------------

export function wtPill(
  bg: string,
  color: string,
  extra?: CSSProperties,
  wt: WtTokens = WT,
): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: wt.radiusPill,
    padding: "7px 13px",
    fontSize: 11.5,
    fontWeight: 700,
    background: bg,
    color,
    ...extra,
  };
}

export function wtBadge(
  o: AccentOpts = {},
  extra?: CSSProperties,
  wt: WtTokens = WT,
): CSSProperties {
  const accent = accentColor(o, wt);
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    borderRadius: wt.radiusPill,
    padding: "3px 9px",
    fontSize: 11,
    fontWeight: 700,
    background: accentSoft(o, wt),
    color: accent,
    ...extra,
  };
}

export function wtIconBadge(
  o: AccentOpts & { size?: number } = {},
  wt: WtTokens = WT,
): CSSProperties {
  const accent = accentColor(o, wt);
  const s = o.size ?? 42;
  return {
    width: s,
    height: s,
    borderRadius: Math.round(s * 0.28),
    background: accentSoft(o, wt),
    color: accent,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };
}

export function wtIconBadgeGlass(size = 42, wt: WtTokens = WT): CSSProperties {
  void wt;
  return {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.28),
    background: "rgba(255,255,255,.16)",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };
}

// ---------------------------------------------------------------------------
// Typography helpers
// ---------------------------------------------------------------------------

export function wtEyebrow(
  o: AccentOpts = {},
  extra?: CSSProperties,
  wt: WtTokens = WT,
): CSSProperties {
  const accent = accentColor(o, wt);
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: accent,
    background: accentSoft(o, wt),
    padding: "5px 12px",
    borderRadius: wt.radiusPill,
    border: `1px solid ${hexToSoft(accent, 0.3)}`,
    ...extra,
  };
}

export function wtSectionTitle(
  extra?: CSSProperties,
  wt: WtTokens = WT,
): CSSProperties {
  return {
    fontFamily: wt.serif,
    fontSize: "clamp(24px, 3.2vw, 34px)",
    fontWeight: 700,
    letterSpacing: "-0.4px",
    lineHeight: 1.15,
    color: wt.ink,
    margin: 0,
    ...extra,
  };
}

export function wtSectionLede(
  extra?: CSSProperties,
  wt: WtTokens = WT,
): CSSProperties {
  return {
    fontSize: 14.5,
    lineHeight: 1.7,
    color: wt.slate,
    ...extra,
  };
}

export function wtStatValue(
  extra?: CSSProperties,
  wt: WtTokens = WT,
): CSSProperties {
  return {
    fontFamily: wt.serif,
    fontSize: "clamp(24px, 3vw, 32px)",
    fontWeight: 700,
    letterSpacing: "-0.5px",
    lineHeight: 1.1,
    color: wt.ink,
    ...extra,
  };
}

/** Subtle divider used between list/grid items. */
export function wtDivider(
  extra?: CSSProperties,
  wt: WtTokens = WT,
): CSSProperties {
  return { height: 1, background: wt.border, ...extra };
}
