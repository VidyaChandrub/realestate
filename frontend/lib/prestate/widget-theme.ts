// ---------------------------------------------------------------------------
// Shared widget design system
// ---------------------------------------------------------------------------
// Single source of truth for the visual language used by every landing-page
// widget (hero, pricing, gallery, forms, header/footer, …). Centralising the
// card, button, badge, pill and heading styles here guarantees that all
// widgets share one consistent, modern, premium real-estate look.
//
// Values are hard-coded (not CSS variables) on purpose: the published landing
// page may render outside the studio shell where `--ps-*` tokens are absent,
// so a self-contained module keeps the widgets identical everywhere.
// ---------------------------------------------------------------------------
import type { CSSProperties } from "react";

export const WT = {
  // Radii
  radius: 16,
  radiusSm: 12,
  radiusXs: 10,
  radiusPill: 999,

  // Surfaces (light, premium)
  surface: "#ffffff",
  surfaceMuted: "#f7f8fb",
  surfaceTint: "#f3f5fb",

  // Lines / borders
  border: "1px solid rgba(16,24,40,.09)",
  borderStrong: "1px solid rgba(16,24,40,.14)",
  borderFaint: "1px solid rgba(16,24,40,.06)",

  // Text
  ink: "#0f172a",
  slate: "#475569",
  muted: "#94a3b8",

  // Brand accents — one primary + one warm secondary for real-estate trust
  primary: "#4f46e5",
  primaryHover: "#4338ca",
  primarySoft: "rgba(79,70,229,.12)",
  primarySoft2: "rgba(79,70,229,.07)",
  gold: "#b8893b",
  goldSoft: "rgba(184,137,59,.14)",
  goldSoft2: "rgba(184,137,59,.08)",

  // Status
  success: "#15a34a",
  successSoft: "rgba(21,163,74,.12)",
  warn: "#b45309",
  warnSoft: "rgba(180,83,9,.12)",
  danger: "#dc2626",
  dangerSoft: "rgba(220,38,38,.10)",

  // Shadows — soft, layered, modern
  shadow: "0 1px 2px rgba(16,24,40,.04), 0 12px 30px rgba(16,24,40,.08)",
  shadowSm: "0 1px 2px rgba(16,24,40,.05), 0 4px 14px rgba(16,24,40,.06)",
  shadowMd: "0 2px 6px rgba(16,24,40,.06), 0 18px 44px rgba(16,24,40,.10)",

  // Typography stacks
  font: 'var(--font-inter), "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'var(--font-playfair), "Playfair Display", Georgia, "Times New Roman", serif',
} as const;

type AccentOpts = { accent?: string; gold?: boolean };

function accentColor(o?: AccentOpts): string {
  if (o?.accent) return o.accent;
  return o?.gold ? WT.gold : WT.primary;
}
function accentSoft(o?: AccentOpts): string {
  if (o?.accent) return hexToSoft(o.accent);
  return o?.gold ? WT.goldSoft : WT.primarySoft;
}

/** Best-effort translucent tint from a hex/string; falls back to primary. */
export function hexToSoft(color: string, alpha = 0.12): string {
  const c = (color || "").trim();
  if (c.startsWith("#")) {
    const h = c.slice(1);
    const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    if ([r, g, b].every((n) => !Number.isNaN(n))) return `rgba(${r},${g},${b},${alpha})`;
  }
  return `rgba(79,70,229,${alpha})`;
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export function wtCard(extra?: CSSProperties): CSSProperties {
  return {
    background: WT.surface,
    border: WT.border,
    borderRadius: WT.radius,
    boxShadow: WT.shadow,
    ...extra,
  };
}

export function wtCardMuted(extra?: CSSProperties): CSSProperties {
  return {
    background: WT.surfaceMuted,
    border: WT.borderFaint,
    borderRadius: WT.radius,
    boxShadow: WT.shadowSm,
    ...extra,
  };
}

/** Card for use on dark/image backgrounds — translucent, luminous. */
export function wtCardGlass(extra?: CSSProperties): CSSProperties {
  return {
    background: "rgba(255,255,255,.10)",
    border: "1px solid rgba(255,255,255,.22)",
    borderRadius: WT.radius,
    boxShadow: "0 12px 34px rgba(8,10,20,.30)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
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

export function wtButton(o: BtnOpts = {}): CSSProperties {
  const accent = accentColor(o);
  const size =
    o.size === "lg"
      ? { padding: "13px 24px", fontSize: 14.5 }
      : o.size === "sm"
        ? { padding: "8px 14px", fontSize: 12.5 }
        : { padding: "11px 20px", fontSize: 13.5 };
  if (o.outline) {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      fontWeight: 700,
      borderRadius: WT.radiusSm,
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
    borderRadius: WT.radiusSm,
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
export function wtButtonLight(o: BtnOpts = {}): CSSProperties {
  const size =
    o.size === "lg"
      ? { padding: "13px 24px", fontSize: 14.5 }
      : o.size === "sm"
        ? { padding: "8px 14px", fontSize: 12.5 }
        : { padding: "11px 20px", fontSize: 13.5 };
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontWeight: 700,
    borderRadius: WT.radiusSm,
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
// Pills / badges / icon badges
// ---------------------------------------------------------------------------

export function wtPill(bg: string, color: string, extra?: CSSProperties): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: WT.radiusPill,
    padding: "7px 13px",
    fontSize: 11.5,
    fontWeight: 700,
    background: bg,
    color,
    ...extra,
  };
}

export function wtBadge(o: AccentOpts = {}, extra?: CSSProperties): CSSProperties {
  const accent = accentColor(o);
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    borderRadius: WT.radiusPill,
    padding: "3px 9px",
    fontSize: 11,
    fontWeight: 700,
    background: accentSoft(o),
    color: accent,
    ...extra,
  };
}

export function wtIconBadge(o: AccentOpts & { size?: number } = {}): CSSProperties {
  const accent = accentColor(o);
  const s = o.size ?? 42;
  return {
    width: s,
    height: s,
    borderRadius: Math.round(s * 0.28),
    background: accentSoft(o),
    color: accent,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };
}

export function wtIconBadgeGlass(size = 42): CSSProperties {
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

export function wtEyebrow(o: AccentOpts = {}, extra?: CSSProperties): CSSProperties {
  const accent = accentColor(o);
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: accent,
    background: accentSoft(o),
    padding: "5px 12px",
    borderRadius: WT.radiusPill,
    border: `1px solid ${hexToSoft(accent, 0.3)}`,
    ...extra,
  };
}

export function wtSectionTitle(extra?: CSSProperties): CSSProperties {
  return {
    fontFamily: WT.serif,
    fontSize: "clamp(24px, 3.2vw, 34px)",
    fontWeight: 700,
    letterSpacing: "-0.4px",
    lineHeight: 1.15,
    color: WT.ink,
    margin: 0,
    ...extra,
  };
}

export function wtSectionLede(extra?: CSSProperties): CSSProperties {
  return {
    fontSize: 14.5,
    lineHeight: 1.7,
    color: WT.slate,
    ...extra,
  };
}

export function wtStatValue(extra?: CSSProperties): CSSProperties {
  return {
    fontFamily: WT.serif,
    fontSize: "clamp(24px, 3vw, 32px)",
    fontWeight: 700,
    letterSpacing: "-0.5px",
    lineHeight: 1.1,
    color: WT.ink,
    ...extra,
  };
}

/** Subtle divider used between list/grid items. */
export function wtDivider(extra?: CSSProperties): CSSProperties {
  return { height: 1, background: WT.border, ...extra };
}
