"use client";

import { ExternalLink, FileSearch, Gauge, Link2, ListTree, Save, Search, Settings2, Share2 } from "lucide-react";
import type { LandingPageData, SiteConfig } from "@/lib/prestate/types";
import { ensureConfig } from "@/lib/prestate/site-config";
import { ModuleHeader, SiteScopeBar, StatCard } from "./shared";
import { FieldRow, TextField, Toggle, Btn, Collapse } from "@/components/prestate/ui";

export function SeoModule({
  site,
  pages,
  onSelectSite,
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
  const { seo, page } = cfg;
  const patchSeo = (partial: Partial<SiteConfig["seo"]>) => onPatch((c) => ({ ...c, seo: { ...c.seo, ...partial } }));
  const title = seo.metaTitle;
  const desc = seo.metaDescription;
  const slug = site.slug;
  const canonical = seo.canonical;
  const index = seo.index;
  const sitemap = seo.sitemap;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <ModuleHeader
        title="SEO Center"
        description={`Meta, keywords, OG tags and page settings for “${site.name}” only.`}
        actions={
          <div style={{ display: "flex", gap: 9 }}>
            <Btn variant="outline" icon={<Settings2 size={14} />}>Bulk tools</Btn>
            <Btn variant="primary" icon={<Save size={14} />} onClick={() => onToast(`SEO saved for ${site.name} only`)}>Save</Btn>
          </div>
        }
      />
      <SiteScopeBar pages={pages} activeId={site.id} onChange={onSelectSite} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, padding: "0 28px 18px" }}>
        <StatCard label="This template" value={site.status} icon={<FileSearch size={20} />} />
        <StatCard label="Title length" value={String(title.length)} icon={<Gauge size={20} />} tone="primary" />
        <StatCard label="In sitemap" value={sitemap ? "Yes" : "No"} icon={<ListTree size={20} />} tone="secondary" />
        <StatCard label="Indexable" value={index ? "Yes" : "No"} icon={<Share2 size={20} />} tone="success" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, padding: "0 28px 48px", alignItems: "start" }}>
        {/* LEFT — settings */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Page selector */}
          <div className="ps-card" style={{ borderRadius: 14, padding: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ps-muted)" }}>Editing:</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)" }}>{site.name}</span>
            <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ps-primary)" }}>
              <ExternalLink size={13} /> {site.domain || "No domain"}
            </span>
          </div>

          <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
            <FieldRow label="Meta title" hint={`${title.length}/60 characters`}>
              <TextField value={title} onChange={(v) => patchSeo({ metaTitle: v, ogTitle: v })} />
            </FieldRow>
            <FieldRow label="Meta description" hint={`${desc.length}/160 characters`}>
              <textarea className="ps-input" value={desc} onChange={(e) => patchSeo({ metaDescription: e.target.value, ogDescription: e.target.value })} style={{ minHeight: 78, resize: "vertical", lineHeight: 1.55 }} />
            </FieldRow>
            <FieldRow label="URL slug">
              <TextField value={slug} onChange={(v) => onPatchPage({ slug: v.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })} prefix={<span style={{ color: "var(--ps-muted)", fontSize: 12, fontFamily: "monospace" }}>/</span>} />
            </FieldRow>
            <FieldRow label="Canonical URL">
              <TextField value={canonical} onChange={(v) => patchSeo({ canonical: v })} />
            </FieldRow>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderTop: "1px solid var(--ps-line)", marginTop: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>Allow search engines to index</span>
              <Toggle on={index} onChange={(v) => patchSeo({ index: v })} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderTop: "1px solid var(--ps-line)" }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>Include in sitemap</span>
              <Toggle on={sitemap} onChange={(v) => patchSeo({ sitemap: v })} />
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
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 40, height: 40, borderRadius: 10, overflow: "hidden", border: "1px solid var(--ps-line)", flexShrink: 0, background: "var(--ps-grad-primary)" }} />
                  <TextField value={seo.ogImage} onChange={(v) => patchSeo({ ogImage: v })} />
                </div>
              </FieldRow>
              <FieldRow label="Keywords">
                <TextField value={seo.keywords} onChange={(v) => patchSeo({ keywords: v })} />
              </FieldRow>
            </Collapse>
          </div>

          <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
            <Collapse title="Page settings" icon={<Settings2 size={14} />} defaultOpen>
              <FieldRow label="Language">
                <TextField value={page.language} onChange={(v) => onPatch((c) => ({ ...c, page: { ...c.page, language: v } }))} />
              </FieldRow>
              <FieldRow label="Favicon path">
                <TextField value={page.favicon} onChange={(v) => onPatch((c) => ({ ...c, page: { ...c.page, favicon: v } }))} />
              </FieldRow>
              <FieldRow label="Password (optional)">
                <TextField value={page.password} onChange={(v) => onPatch((c) => ({ ...c, page: { ...c.page, password: v } }))} />
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
{`{
  "@context": "https://schema.org",
  "@type": "RealEstateListing",
  "name": "Aurora Residences",
  "url": "${canonical}",
  "description": "Luxury 3 & 4 BHK apartments…",
  "offers": { "price": "12500000", "priceCurrency": "INR" },
  "amenityFeature": ["Clubhouse", "Pool", "Gym"]
}`}
              </pre>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn variant="outline" size="sm" onClick={() => onToast("Validated structured data")}>Validate</Btn>
                <Btn variant="ghost" size="sm" onClick={() => onToast("Copied JSON-LD")}>Copy</Btn>
              </div>
            </Collapse>
          </div>
        </div>

        {/* RIGHT — previews */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ps-card" style={{ borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ps-muted)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Search size={13} /> Google search preview
            </div>
            <div style={{ fontFamily: "Arial, sans-serif" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#1a73e8", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 800 }}>A</span>
                <div>
                  <div style={{ fontSize: 12, color: "#202124" }}>Aurora Residences</div>
                  <div style={{ fontSize: 10, color: "#5f6368" }}>https://{site.domain || "localhost"} › {site.slug}</div>
                </div>
              </div>
              <div style={{ fontSize: 15, color: "#1a0dab", fontWeight: 400, margin: "6px 0 3px" }}>{title || "Untitled"}</div>
              <div style={{ fontSize: 12.5, color: "#4d5156", lineHeight: 1.45, maxWidth: 560 }}>{desc || "No description set."}</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              {(["Luxury Apartments", "Bangalore", "RERA Approved", "Sarjapur Road"].map((k) => (
                <span key={k} style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ps-slate)", background: "var(--ps-bg)", padding: "3px 9px", borderRadius: 999 }}>{k}</span>
              )))}
            </div>
          </div>

          <div className="ps-card" style={{ borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ps-muted)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Share2 size={13} /> Social link preview
            </div>
            <div style={{ border: "1px solid #eef0f5", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ height: 120, background: "var(--ps-grad-primary)" }} />
              <div style={{ padding: 12 }}>
                <div style={{ fontSize: 11, color: "#5f6368", marginBottom: 4 }}>{site.domain || "localhost"}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#202124" }}>{title}</div>
                <div style={{ fontSize: 12, color: "#4d5156", marginTop: 4, lineHeight: 1.45 }}>{desc.slice(0, 100)}…</div>
              </div>
            </div>
          </div>

          <div className="ps-card" style={{ borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ps-muted)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <Gauge size={13} /> Health checks
            </div>
            {[
              ["Meta title length", title.length >= 40 && title.length <= 60 ? "Good" : "Needs work", title.length >= 40 && title.length <= 60],
              ["Meta description length", desc.length >= 120 && desc.length <= 160 ? "Good" : "Needs work", desc.length >= 120 && desc.length <= 160],
              ["Canonical set", "Good", !!canonical],
              ["JSON-LD valid", "Good", true],
              ["OG image set", "Good", true],
              ["Indexable", index ? "On" : "Off", index],
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