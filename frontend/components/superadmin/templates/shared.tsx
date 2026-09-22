"use client";

import type { ReactNode } from "react";
import { SceneImage } from "@/components/openpage/art";
import { TEMPLATES } from "@/lib/openpage/data";
import { isMediaSrc } from "@/lib/media";
import { localPreviewPath } from "@/lib/openpage/paths";
import { ensureConfig } from "@/lib/openpage/site-config";
import type { LandingPageData } from "@/lib/openpage/types";

/* ------------------------------------------------------------------ *
 * Shared, reusable Template Management primitives.
 * Both the listing (/admin-console/templates) and the manage screen
 * (/admin-console/template-detail/[id]) render from these so every
 * template follows one identical, standardized structure.
 * ------------------------------------------------------------------ */

export type TemplateKind = "preset" | "custom";

export type TemplateRow = {
  /** Stable react key (design id for presets, page id for customs). */
  key: string;
  /** Present once a LandingPageData exists in the store. */
  pageId?: string;
  name: string;
  description: string;
  thumbnail: string;
  /** Cover background colour. */
  accent: string;
  kind: TemplateKind;
  /** Chip label — originating design name or "From scratch". */
  source: string;
  status?: LandingPageData["status"];
  domain: string;
  designId: string;
  tier?: "free" | "paid" | "premium";
  category?: string | null;
  categoryId?: string | null;
};

export function findPreset(pages: LandingPageData[], designId: string) {
  return (
    pages.find((p) => (p.kind ?? "custom") === "preset" && p.designId === designId) ??
    pages.find((p) => p.designId === designId)
  );
}

/** Build the unified, filterable list of template rows from the store. */
export function buildTemplateRows(pages: LandingPageData[]): TemplateRow[] {
  const catalogIds = new Set(TEMPLATES.map((d) => d.id));

  const presets: TemplateRow[] = TEMPLATES.map((design) => {
    const page = findPreset(pages, design.id);
    const thumb =
      page?.thumbnail && isMediaSrc(page.thumbnail) ? page.thumbnail : design.thumbnail;
    return {
      key: design.id,
      pageId: page?.id,
      name: page?.name ?? design.name,
      description: design.description,
      thumbnail: thumb,
      accent: design.accent2,
      kind: "preset",
      source: design.name,
      status: page?.status,
      domain: page ? page.domain || localPreviewPath(page) : "Not created yet",
      designId: design.id,
      tier: page?.tier ?? "free",
      category: page?.category ?? design.category,
      categoryId: page?.categoryId ?? null,
    };
  });

  // API presets that aren't in the static catalog still show up.
  const orphanPresets: TemplateRow[] = pages
    .filter(
      (p) =>
        (p.kind ?? "custom") === "preset" &&
        p.pageType !== "thank-you" &&
        !catalogIds.has(p.designId ?? "") &&
        // Legacy seeded demo — hide from Template Studio.
        p.slug !== "skyline-heights-builder" &&
        p.designId !== "tpl-estatepro" &&
        !/project launch\s*\(builder\)/i.test(p.name),
    )
    .map((p) => {
      const cfg = ensureConfig(p);
      return {
        key: p.id,
        pageId: p.id,
        name: p.name,
        description: p.template || "Predefined template",
        thumbnail: p.thumbnail || "tower",
        accent: cfg.brand.primary,
        kind: "preset" as const,
        source: p.template || p.name,
        status: p.status,
        domain: p.domain || localPreviewPath(p),
        designId: p.designId ?? p.id,
        tier: p.tier ?? "free",
        category: p.category ?? null,
        categoryId: p.categoryId ?? null,
      };
    });

  const customs: TemplateRow[] = pages
    .filter((p) => (p.kind ?? "custom") === "custom")
    .map((p) => {
      const cfg = ensureConfig(p);
      return {
        key: p.id,
        pageId: p.id,
        name: p.name,
        description: `${p.template} · ${cfg.brand.headingFont}`,
        thumbnail: p.thumbnail,
        accent: cfg.brand.primary,
        kind: "custom",
        source: p.designId === "tpl-blank" ? "From scratch" : p.template,
        status: p.status,
        domain: p.domain || localPreviewPath(p),
        designId: p.designId ?? "tpl-blank",
        tier: p.tier ?? "free",
        category: p.category ?? null,
        categoryId: p.categoryId ?? null,
      };
    });

  return [...presets, ...orphanPresets, ...customs];
}

export function tierStyle(tier?: "free" | "paid" | "premium"): { cls: string; label: string } {
  switch (tier) {
    case "premium":
      return { cls: "b-violet", label: "Premium" };
    case "paid":
      return { cls: "b-indigo", label: "Paid" };
    case "free":
    default:
      return { cls: "b-green", label: "Free" };
  }
}

export function TierBadge({ tier }: { tier?: "free" | "paid" | "premium" }) {
  const t = tierStyle(tier);
  return (
    <span className={`badge ${t.cls}`} style={{ textTransform: "capitalize", fontWeight: 600 }}>
      {t.label}
    </span>
  );
}

export type TemplateStats = {
  total: number;
  predefined: number;
  custom: number;
  published: number;
};

export function deriveStats(rows: TemplateRow[]): TemplateStats {
  return {
    total: rows.length,
    predefined: rows.filter((r) => r.kind === "preset").length,
    custom: rows.filter((r) => r.kind === "custom").length,
    published: rows.filter((r) => r.status === "published").length,
  };
}

export type TemplateFilter = "All" | "Predefined" | "Custom" | "Published";
export const TEMPLATE_FILTERS: TemplateFilter[] = ["All", "Predefined", "Custom", "Published"];

export function matchesFilter(row: TemplateRow, filter: TemplateFilter): boolean {
  switch (filter) {
    case "Predefined":
      return row.kind === "preset";
    case "Custom":
      return row.kind === "custom";
    case "Published":
      return row.status === "published";
    default:
      return true;
  }
}

/* ---------- Status badge (superadmin badge classes) ---------- */

type StatusStyle = { cls: string; label: string };

const STATUS_STYLES: Record<string, StatusStyle> = {
  published: { cls: "b-green", label: "Published" },
  draft: { cls: "b-gray", label: "Draft" },
  unpublished: { cls: "b-amber", label: "Unpublished" },
  scheduled: { cls: "b-violet", label: "Scheduled" },
  password: { cls: "b-indigo", label: "Password" },
};

export function statusStyle(status?: LandingPageData["status"]): StatusStyle {
  if (!status) return { cls: "b-gray", label: "Ready" };
  return STATUS_STYLES[status] ?? { cls: "b-gray", label: status };
}

export function StatusBadge({ status }: { status?: LandingPageData["status"] }) {
  const s = statusStyle(status);
  return (
    <span className={`badge ${s.cls}`}>
      <span className="dot" style={{ background: "currentColor" }} />
      {s.label}
    </span>
  );
}

/* ---------- Cover (thumbnail art over the accent colour) ---------- */

export function TemplateCover({
  thumbnail,
  accent,
  height = 168,
  radius = "18px 18px 0 0",
  children,
}: {
  thumbnail: string;
  accent: string;
  height?: number;
  radius?: string;
  children?: ReactNode;
}) {
  const realPreview = isMediaSrc(thumbnail);
  return (
    <div
      style={{
        height,
        background: accent,
        position: "relative",
        overflow: "hidden",
        borderRadius: radius,
        flexShrink: 0,
      }}
    >
      {realPreview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top center",
          }}
        />
      ) : (
        <SceneImage art={thumbnail || "hero"} />
      )}
      {children}
    </div>
  );
}

/** Path to the manage screen for a given template page. */
export function manageHref(pageId: string): string {
  return `/admin-console/template-detail/${encodeURIComponent(pageId)}`;
}
