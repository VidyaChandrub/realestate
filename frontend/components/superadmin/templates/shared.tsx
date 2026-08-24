"use client";

import type { ReactNode } from "react";
import { SceneImage } from "@/components/prestate/art";
import { TEMPLATES } from "@/lib/prestate/data";
import { localPreviewPath } from "@/lib/prestate/paths";
import { ensureConfig } from "@/lib/prestate/site-config";
import type { LandingPageData } from "@/lib/prestate/types";

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
};

export function findPreset(pages: LandingPageData[], designId: string) {
  return (
    pages.find((p) => (p.kind ?? "custom") === "preset" && p.designId === designId) ??
    pages.find((p) => p.designId === designId)
  );
}

/** Build the unified, filterable list of template rows from the store. */
export function buildTemplateRows(pages: LandingPageData[]): TemplateRow[] {
  const presets: TemplateRow[] = TEMPLATES.map((design) => {
    const page = findPreset(pages, design.id);
    return {
      key: design.id,
      pageId: page?.id,
      name: page?.name ?? design.name,
      description: design.description,
      thumbnail: page?.thumbnail || design.thumbnail,
      accent: design.accent2,
      kind: "preset",
      source: design.name,
      status: page?.status,
      domain: page ? page.domain || localPreviewPath(page) : "Not created yet",
      designId: design.id,
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
      };
    });

  return [...presets, ...customs];
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
      <SceneImage art={thumbnail || "hero"} />
      {children}
    </div>
  );
}

/** Path to the manage screen for a given template page. */
export function manageHref(pageId: string): string {
  return `/admin-console/template-detail/${encodeURIComponent(pageId)}`;
}
