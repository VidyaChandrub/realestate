"use client";
import type { Device, SectionInstance } from "@/lib/prestate/types";

export const PREMIUM_CONTAINER = { maxWidth: 1200, paddingX: 24 };
export const PREMIUM_SPACING = {
  sectionY: 80,
  sectionYMobile: 56,
  containerX: 24,
  cardGap: 16,
  headingGap: 12,
  paragraphGap: 16,
};
export const PREMIUM_RADIUS = { card: 16, image: 14, button: 11, badge: 999 };
export const PREMIUM_SHADOW = { card: "0 4px 18px rgba(17,24,39,.07)", cardHover: "0 12px 32px rgba(17,24,39,.10)" };

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "center",
  device = "desktop",
  typo,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center" | "right";
  device?: Device;
  typo?: React.CSSProperties;
}) {
  const isCenter = align === "center";
  return (
    <div style={{ textAlign: align, maxWidth: isCenter ? 640 : undefined, margin: isCenter ? "0 auto" : undefined, marginBottom: 32 }}>
      {eyebrow ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--ps-primary)", background: "rgba(109,93,252,.12)", padding: "5px 12px", borderRadius: 999, border: "1px solid rgba(109,93,252,.18)" }}>
          {eyebrow}
        </span>
      ) : null}
      <h2 style={{ fontSize: device === "mobile" ? 26 : device === "tablet" ? 30 : 34, fontWeight: 800, letterSpacing: -0.5, margin: eyebrow ? "14px 0 10px" : "0 0 10px", lineHeight: 1.15, color: "var(--ps-ink)", ...typo }}>{title}</h2>
      {subtitle ? <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "var(--ps-slate)", margin: 0, ...typo }}>{subtitle}</p> : null}
    </div>
  );
}

export function PremiumCard({ children, hover = true, style }: { children: React.ReactNode; hover?: boolean; style?: React.CSSProperties }) {
  return (
    <div className="ps-card" style={{ borderRadius: PREMIUM_RADIUS.card, padding: 22, background: "#fff", border: "1px solid #E8EAF1", boxShadow: PREMIUM_SHADOW.card, transition: "box-shadow .2s, transform .2s", ...(hover ? { cursor: "default" } : {}), ...style }}>
      {children}
    </div>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--ps-primary)", background: "rgba(109,93,252,.14)", padding: "4px 10px", borderRadius: 999 }}>{children}</span>;
}

export function PremiumGrid({ cols = 3, gap = 16, device, children }: { cols?: number; gap?: number; device: Device; children: React.ReactNode }) {
  const c = device === "mobile" ? 1 : device === "tablet" ? Math.min(2, cols) : cols;
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${c},1fr)`, gap, width: "100%" }}>{children}</div>;
}
