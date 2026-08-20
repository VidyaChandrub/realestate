"use client";

import { useRef } from "react";
import { Copy, ExternalLink, FileSearch, Gauge, Link2, ListTree, Save, Search, Settings2, Share2 } from "lucide-react";
import type { LandingPageData, SiteConfig } from "@/lib/prestate/types";
import { ensureConfig, siteThemeStyle } from "@/lib/prestate/site-config";
import { buildJsonLd, jsonLdValid, suggestedCanonical } from "@/lib/prestate/seo";
import { localPreviewPath } from "@/lib/prestate/paths";
import { ModuleHeader, SiteScopeBar, StatCard } from "./shared";
import { FieldRow, TextField, Toggle, Btn, Collapse } from "@/components/prestate/ui";

export function SeoModule({
  site,
  pages,
  onPatch,
  onPatchPage,
  onToast,
}: {
  site: LandingPageData;
  pages: LandingPageData[];
  onSelectSite: (id: string) => void;
  onPatch: (fn: (c: SiteConfig) => SiteConfig) => void;
  onPatchPage: (patch: Partial<LandingPageData>) => void;
  onToast: (m: string) => void;
}) {
  const cfg = ensureConfig(site);
  const { seo, page, brand } = cfg;
  const fileRef = useRef<HTMLInputElement>(null);
  const patchSeo = (partial: Partial<SiteConfig["seo"]>) => onPatch((c) => ({ ...c, seo: { ...c.seo, ...partial } }));
  const title = seo.metaTitle;
  const desc = seo.metaDescription;
  const json = buildJsonLd(site, cfg);
  const jsonText = JSON.stringify(json, null, 2);
  const keywords = seo.keywords.split(",").map((k) => k.trim()).filter(Boolean);
  const titleOk = title.length >= 40 && title.length <= 60;
  const descOk = desc.length >= 120 && desc.length <= 160;
  const ogOk = Boolean(seo.ogImage);
  const schemaOk = jsonLdValid(json);
  const ogImageSrc = seo.ogImage.startsWith("http") || seo.ogImage.startsWith("data:") || seo.ogImage.startsWith("/") ? seo.ogImage : "";

  const fillMissing = () => {
    const nextTitle = title.trim() || `${brand.name} | ${site.template}`.slice(0, 60);
    const nextDesc = desc.trim() || brand.tagline || `Explore ${brand.name}. Book a site visit and get pricing, floor plans and offers.`;
    patchSeo({
      metaTitle: nextTitle,
      metaDescription: nextDesc,
      ogTitle: seo.ogTitle.trim() || nextTitle,
      ogDescription: seo.ogDescription.trim() || nextDesc,
      canonical: seo.canonical.trim() || suggestedCanonical(site),
      keywords: seo.keywords.trim() || `${brand.name}, ${site.template}, real estate`,
    });
    onToast("Filled empty SEO fields from this template’s brand");
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      onToast("JSON-LD copied");
    } catch {
      onToast("Could not copy JSON-LD");
    }
  };

  const onOgFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) {
      onToast("Choose an image for OG");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        patchSeo({ ogImage: reader.result });
        onToast("OG image updated");
      }
    };
    reader.readAsDataURL(file);
  };

  const setSlug = (raw: string) => {
    const next = raw.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    onPatchPage({ slug: next });
    if (!seo.canonical || seo.canonical.includes(site.slug)) {
      patchSeo({ canonical: suggestedCanonical({ ...site, slug: next }) });
    }
  };

  return (
    <div style={{ overflowY: "auto", height: "100%", ...siteThemeStyle(brand) }}>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onOgFile(e.target.files?.[0])} />
      <ModuleHeader
        title="SEO Center"
        description={`Meta, Open Graph, slug and schema for “${site.name}”. Applied on this template’s local preview.`}
        actions={
          <div style={{ display: "flex", gap: 9 }}>
            <Btn variant="outline" icon={<Settings2 size={14} />} onClick={fillMissing}>Fill missing</Btn>
            <Btn variant="primary" icon={<Save size={14} />} onClick={() => onToast(`SEO saved for ${site.name}`)}>Save</Btn>
          </div>
        }
      />
      <SiteScopeBar pages={pages} activeId={site.id} />

      <div className="ps-form-meta" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, padding: "0 28px 18px" }}>
        <StatCard label="This template" value={site.status} icon={<FileSearch size={20} />} />
        <StatCard label="Title length" value={`${title.length}/60`} icon={<Gauge size={20} />} tone={titleOk ? "success" : "primary"} />
        <StatCard label="In sitemap" value={seo.sitemap ? "Yes" : "No"} icon={<ListTree size={20} />} tone="secondary" />
        <StatCard label="Indexable" value={seo.index ? "Yes" : "No"} icon={<Share2 size={20} />} tone={seo.index ? "success" : "neutral"} />
      </div>

      <div className="ps-brand-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, padding: "0 28px 48px", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ps-card" style={{ borderRadius: 14, padding: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ps-muted)" }}>Local URL</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)", fontFamily: "ui-monospace, monospace" }}>{localPreviewPath(site)}</span>
            <a href={localPreviewPath(site)} target="_blank" rel="noreferrer" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ps-primary)", textDecoration: "none" }}>
              <ExternalLink size={13} /> Open preview
            </a>
          </div>

          <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
            <FieldRow label="Meta title" hint={`${title.length}/60 — aim for 40–60 characters`}>
              <TextField value={title} onChange={(v) => patchSeo({ metaTitle: v })} />
            </FieldRow>
            <FieldRow label="Meta description" hint={`${desc.length}/160 — aim for 120–160 characters`}>
              <textarea className="ps-input" value={desc} onChange={(e) => patchSeo({ metaDescription: e.target.value })} style={{ minHeight: 78, resize: "vertical", lineHeight: 1.55 }} />
            </FieldRow>
            <FieldRow label="URL slug">
              <TextField value={site.slug} onChange={setSlug} prefix={<span style={{ color: "var(--ps-muted)", fontSize: 12, fontFamily: "monospace" }}>/p/</span>} />
            </FieldRow>
            <FieldRow label="Canonical URL">
              <TextField value={seo.canonical} onChange={(v) => patchSeo({ canonical: v })} placeholder={suggestedCanonical(site)} />
            </FieldRow>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderTop: "1px solid var(--ps-line)", marginTop: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>Allow search engines to index</span>
              <Toggle on={seo.index} onChange={(v) => patchSeo({ index: v })} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderTop: "1px solid var(--ps-line)" }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>Include in sitemap</span>
              <Toggle on={seo.sitemap} onChange={(v) => patchSeo({ sitemap: v })} />
            </div>
          </div>

          <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
            <Collapse title="Social sharing (Open Graph)" icon={<Share2 size={14} />} defaultOpen>
              <FieldRow label="OG title">
                <TextField value={seo.ogTitle} onChange={(v) => patchSeo({ ogTitle: v })} />
              </FieldRow>
              <FieldRow label="OG description">
                <TextField value={seo.ogDescription} onChange={(v) => patchSeo({ ogDescription: v })} />
              </FieldRow>
              <FieldRow label="OG image">
                <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                  <button type="button" onClick={() => fileRef.current?.click()} style={{ width: 48, height: 48, borderRadius: 10, overflow: "hidden", border: "1px solid var(--ps-line)", flexShrink: 0, background: "var(--ps-grad-primary)", padding: 0, cursor: "pointer" }}>
                    {ogImageSrc ? <img src={ogImageSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                  </button>
                  <TextField value={seo.ogImage} onChange={(v) => patchSeo({ ogImage: v })} placeholder="/og.jpg or https://…" />
                </div>
              </FieldRow>
              <FieldRow label="Keywords">
                <TextField value={seo.keywords} onChange={(v) => patchSeo({ keywords: v })} placeholder="apartments, bangalore, rera" />
              </FieldRow>
              <Btn variant="ghost" size="sm" onClick={() => patchSeo({ ogTitle: title, ogDescription: desc })}>Copy meta into OG</Btn>
            </Collapse>
          </div>

          <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
            <Collapse title="Page settings" icon={<Settings2 size={14} />} defaultOpen>
              <FieldRow label="Language">
                <TextField value={page.language} onChange={(v) => onPatch((c) => ({ ...c, page: { ...c.page, language: v } }))} placeholder="en" />
              </FieldRow>
              <FieldRow label="Favicon path">
                <TextField value={page.favicon} onChange={(v) => onPatch((c) => ({ ...c, page: { ...c.page, favicon: v } }))} />
              </FieldRow>
              <FieldRow label="Password (optional)">
                <TextField value={page.password} onChange={(v) => onPatch((c) => ({ ...c, page: { ...c.page, password: v } }))} placeholder="Leave blank for public preview" />
              </FieldRow>
            </Collapse>
          </div>

          <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
            <Collapse title="Structured data (JSON-LD)" icon={<Link2 size={14} />} defaultOpen>
              <pre
                style={{
                  background: "#0b1020",
                  color: "#b8c2ff",
                  borderRadius: 10,
                  padding: 14,
                  fontSize: 10.5,
                  lineHeight: 1.6,
                  overflowX: "auto",
                  fontFamily: "monospace",
                  margin: "6px 0 12px",
                }}
              >
                {jsonText}
              </pre>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn variant="outline" size="sm" onClick={() => onToast(schemaOk ? "JSON-LD has name, url and description" : "Add title, description and canonical first")}>
                  Validate
                </Btn>
                <Btn variant="ghost" size="sm" icon={<Copy size={13} />} onClick={() => void copyJson()}>Copy</Btn>
              </div>
            </Collapse>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ps-card" style={{ borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ps-muted)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Search size={13} /> Google search preview
            </div>
            <div style={{ fontFamily: "Arial, sans-serif" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: brand.primary, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 800 }}>
                  {(brand.name || "P").slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <div style={{ fontSize: 12, color: "#202124" }}>{brand.name}</div>
                  <div style={{ fontSize: 10, color: "#5f6368" }}>{seo.canonical || `localhost/p/${site.slug}`}</div>
                </div>
              </div>
              <div style={{ fontSize: 15, color: "#1a0dab", fontWeight: 400, margin: "6px 0 3px" }}>{title || "Untitled"}</div>
              <div style={{ fontSize: 12.5, color: "#4d5156", lineHeight: 1.45, maxWidth: 560 }}>{desc || "No description set."}</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              {keywords.length ? keywords.map((k) => (
                <span key={k} style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ps-slate)", background: "var(--ps-bg)", padding: "3px 9px", borderRadius: 999 }}>{k}</span>
              )) : <span style={{ fontSize: 11.5, color: "var(--ps-muted)" }}>Add keywords to see chips here.</span>}
            </div>
          </div>

          <div className="ps-card" style={{ borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ps-muted)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Share2 size={13} /> Social link preview
            </div>
            <div style={{ border: "1px solid #eef0f5", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ height: 120, background: ogImageSrc ? `center/cover url(${ogImageSrc})` : "var(--ps-grad-primary)" }} />
              <div style={{ padding: 12 }}>
                <div style={{ fontSize: 11, color: "#5f6368", marginBottom: 4 }}>{site.domain || "localhost"}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#202124" }}>{seo.ogTitle || title || "Untitled"}</div>
                <div style={{ fontSize: 12, color: "#4d5156", marginTop: 4, lineHeight: 1.45 }}>{(seo.ogDescription || desc || "").slice(0, 140)}</div>
              </div>
            </div>
          </div>

          <div className="ps-card" style={{ borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ps-muted)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <Gauge size={13} /> Health checks
            </div>
            {[
              ["Meta title length", titleOk ? "Good" : "Needs work", titleOk],
              ["Meta description length", descOk ? "Good" : "Needs work", descOk],
              ["Canonical set", seo.canonical ? "Good" : "Missing", Boolean(seo.canonical)],
              ["JSON-LD valid", schemaOk ? "Good" : "Needs work", schemaOk],
              ["OG image set", ogOk ? "Good" : "Missing", ogOk],
              ["Indexable", seo.index ? "On" : "Off", seo.index],
              ["Sitemap", seo.sitemap ? "On" : "Off", seo.sitemap],
            ].map(([label, status, ok]) => (
              <div key={label as string} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 0", borderBottom: "1px solid var(--ps-line)" }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: ok ? "var(--ps-success)" : "var(--ps-warn)", flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)", flex: 1 }}>{label as string}</span>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: ok ? "var(--ps-success)" : "var(--ps-warn)" }}>{status as string}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
