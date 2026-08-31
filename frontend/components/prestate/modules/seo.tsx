"use client";

import { useState } from "react";
import {
  Check,
  Code2,
  Copy,
  ExternalLink,
  Eye,
  FileSearch,
  Gauge,
  Globe,
  ImagePlus,
  Link2,
  ListTree,
  Monitor,
  Save,
  Search,
  Settings2,
  Share2,
  Smartphone,
  Sparkles,
  Tablet,
} from "lucide-react";
import type { LandingPageData, SiteConfig } from "@/lib/prestate/types";
import { ensureConfig, siteThemeStyle } from "@/lib/prestate/site-config";
import { buildJsonLd, jsonLdValid, suggestedCanonical } from "@/lib/prestate/seo";
import { localPreviewPath } from "@/lib/prestate/paths";
import { MediaPicker } from "@/components/media-picker";

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
  const { seo, brand } = cfg;
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [previewTab, setPreviewTab] = useState<"google" | "social" | "schema">("google");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const patchSeo = (partial: Partial<SiteConfig["seo"]>) =>
    onPatch((c) => ({ ...c, seo: { ...c.seo, ...partial } }));

  const title = seo.metaTitle || "";
  const desc = seo.metaDescription || "";
  const json = buildJsonLd(site, cfg);
  const jsonText = JSON.stringify(json, null, 2);

  const isLandingPage = site.kind === "custom" || (site.pageType === "landing" && site.id.includes("-"));
  const previewPath = isLandingPage && site.id ? `/preview/${encodeURIComponent(site.id)}` : localPreviewPath(site);
  const fullDomain = site.domain ? `https://${site.domain}` : `https://preview.estatepro.com${previewPath}`;

  const fillMissing = () => {
    const nextTitle = title.trim() || `${brand.name || site.name} | Luxury Residences`.slice(0, 60);
    const nextDesc =
      desc.trim() ||
      brand.tagline ||
      `Explore ${brand.name || site.name}. Download brochure, floor plans, pricing & book site visit online.`;
    patchSeo({
      metaTitle: nextTitle,
      metaDescription: nextDesc,
      ogTitle: seo.ogTitle?.trim() || nextTitle,
      ogDescription: seo.ogDescription?.trim() || nextDesc,
      canonical: seo.canonical?.trim() || suggestedCanonical(site),
      keywords: seo.keywords?.trim() || `${brand.name || site.name}, luxury apartments, real estate, brochure, floor plans`,
    });
    onToast("Filled empty SEO fields with optimized defaults");
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      onToast("JSON-LD schema copied to clipboard");
    } catch {
      onToast("Could not copy JSON-LD");
    }
  };

  const handleSave = () => {
    setSavedSuccess(true);
    onToast(`SEO settings saved for ${site.name}`);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const titleLength = title.length;
  const descLength = desc.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--ps-bg)", color: "var(--ps-ink)", overflow: "hidden", ...siteThemeStyle(brand) }}>
      {/* Top Action Ribbon */}
      <div
        style={{
          background: "var(--ps-panel)",
          borderBottom: "1px solid var(--ps-line-strong)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 7 }}>
            <Search size={16} style={{ color: "var(--ps-primary)" }} /> SEO & Social Share Center
          </span>
          <span style={{ fontSize: 11, color: "var(--ps-muted)", borderLeft: "1px solid var(--ps-line-strong)", paddingLeft: 12 }}>
            Search engine metadata & Open Graph preview for {site.name}
          </span>
        </div>

        {/* Center Preview Mode Switcher */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 2, background: "rgba(0, 0, 0, 0.35)", borderRadius: 10, padding: 3, border: "1px solid var(--ps-line-strong)" }}>
          {[
            { key: "google", label: "Google Snippet", icon: Search },
            { key: "social", label: "Social Card", icon: Share2 },
            { key: "schema", label: "JSON-LD Schema", icon: Code2 },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPreviewTab(tab.key as any)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 7,
                border: "none",
                background: previewTab === tab.key ? "var(--ps-panel-raised)" : "transparent",
                color: previewTab === tab.key ? "#fff" : "var(--ps-muted)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <tab.icon size={13} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={fillMissing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 9,
              border: "1px solid var(--ps-line-strong)",
              background: "var(--ps-panel-raised)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Sparkles size={14} style={{ color: "var(--ps-primary)" }} /> Auto-Fill SEO
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 18px",
              borderRadius: 9,
              border: "none",
              background: savedSuccess ? "var(--ps-success)" : "var(--ps-primary)",
              color: "#fff",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
              transition: "background 0.2s",
            }}
          >
            {savedSuccess ? <Check size={15} /> : <Save size={15} />}
            <span>{savedSuccess ? "Saved!" : "Save SEO"}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Panel Studio Layout */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Left Settings Sidebar */}
        <div
          style={{
            width: 440,
            background: "var(--ps-panel)",
            borderRight: "1px solid var(--ps-line)",
            overflowY: "auto",
            padding: "20px 20px 60px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            flexShrink: 0,
          }}
        >
          {/* Section 1: Search Engine Meta */}
          <div style={{ background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line-strong)", borderRadius: 14, padding: "16px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Search size={16} style={{ color: "var(--ps-primary)" }} /> Google Search Meta Tags
            </div>

            {/* Meta Title */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-muted)" }}>Meta Title</label>
                <span style={{ fontSize: 11, fontWeight: 700, color: titleLength >= 40 && titleLength <= 60 ? "var(--ps-success)" : "#fbbf24" }}>
                  {titleLength}/60 chars
                </span>
              </div>
              <input
                className="ps-input"
                value={title}
                placeholder="e.g. Prestige Green Park | Luxury 3 & 4 BHK in Sarjapur"
                onChange={(e) => patchSeo({ metaTitle: e.target.value })}
                style={{ width: "100%", fontSize: 12.5, background: "var(--ps-bg)", color: "#fff" }}
              />
            </div>

            {/* Meta Description */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-muted)" }}>Meta Description</label>
                <span style={{ fontSize: 11, fontWeight: 700, color: descLength >= 120 && descLength <= 160 ? "var(--ps-success)" : "#fbbf24" }}>
                  {descLength}/160 chars
                </span>
              </div>
              <textarea
                className="ps-input"
                rows={3}
                value={desc}
                placeholder="e.g. Explore luxury residences with world-class amenities. Download brochure, check pricing & floor plans."
                onChange={(e) => patchSeo({ metaDescription: e.target.value })}
                style={{ width: "100%", fontSize: 12, background: "var(--ps-bg)", color: "#fff", resize: "none" }}
              />
            </div>

            {/* Meta Keywords */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", display: "block", marginBottom: 4 }}>Keywords (comma separated)</label>
              <input
                className="ps-input"
                value={seo.keywords || ""}
                placeholder="e.g. luxury apartments, sarjapur road, brochure, floor plan"
                onChange={(e) => patchSeo({ keywords: e.target.value })}
                style={{ width: "100%", fontSize: 12, background: "var(--ps-bg)", color: "#fff" }}
              />
            </div>
          </div>

          {/* Section 2: Social Media & Open Graph */}
          <div style={{ background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line-strong)", borderRadius: 14, padding: "16px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Share2 size={16} style={{ color: "var(--ps-primary)" }} /> Social Sharing (Open Graph)
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", display: "block", marginBottom: 4 }}>Social Share Image (OG Image)</label>
                <MediaPicker
                  kind="image"
                  label="Upload 1200x630px Banner"
                  value={seo.ogImage || ""}
                  onChange={(v) => patchSeo({ ogImage: v })}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", display: "block", marginBottom: 4 }}>Social Title (Optional override)</label>
                <input
                  className="ps-input"
                  value={seo.ogTitle || ""}
                  placeholder="Defaults to Meta Title if blank"
                  onChange={(e) => patchSeo({ ogTitle: e.target.value })}
                  style={{ width: "100%", fontSize: 12, background: "var(--ps-bg)", color: "#fff" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", display: "block", marginBottom: 4 }}>Social Description</label>
                <textarea
                  className="ps-input"
                  rows={2}
                  value={seo.ogDescription || ""}
                  placeholder="Defaults to Meta Description if blank"
                  onChange={(e) => patchSeo({ ogDescription: e.target.value })}
                  style={{ width: "100%", fontSize: 12, background: "var(--ps-bg)", color: "#fff", resize: "none" }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Indexing & Robots Controls */}
          <div style={{ background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line-strong)", borderRadius: 14, padding: "16px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <ListTree size={16} style={{ color: "var(--ps-primary)" }} /> Indexing & Robot Controls
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fff" }}>Allow Search Indexing</div>
                  <div style={{ fontSize: 11, color: "var(--ps-muted)" }}>Permits Google & Bing to crawl and index page</div>
                </div>
                <input
                  type="checkbox"
                  checked={seo.index ?? true}
                  onChange={(e) => patchSeo({ index: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fff" }}>Include in XML Sitemap</div>
                  <div style={{ fontSize: 11, color: "var(--ps-muted)" }}>Adds this page URL to sitemap.xml</div>
                </div>
                <input
                  type="checkbox"
                  checked={seo.sitemap ?? true}
                  onChange={(e) => patchSeo({ sitemap: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", display: "block", marginBottom: 4 }}>Canonical URL</label>
                <input
                  className="ps-input"
                  value={seo.canonical || ""}
                  placeholder={suggestedCanonical(site)}
                  onChange={(e) => patchSeo({ canonical: e.target.value })}
                  style={{ width: "100%", fontSize: 11.5, fontFamily: "monospace", background: "var(--ps-bg)", color: "#fff" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Live Preview Stage */}
        <div
          className="ps-canvas-dots"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "28px 36px 80px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {previewTab === "google" ? (
            /* Google Search Engine Preview */
            <div
              style={{
                width: 680,
                maxWidth: "100%",
                background: "#fff",
                borderRadius: 16,
                border: "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: "0 25px 70px rgba(0, 0, 0, 0.65)",
                overflow: "hidden",
              }}
            >
              <div style={{ background: "#0f172a", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", padding: "12px 18px", display: "flex", alignItems: "center", gap: 8 }}>
                <Search size={15} style={{ color: "#818cf8" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1" }}>Google Search Result Preview</span>
              </div>
              <div style={{ padding: "28px 32px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#475569" }}>
                    {brand.name?.slice(0, 1) || "G"}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "#202124", fontWeight: 500 }}>{brand.name || "Estate Pro"}</div>
                    <div style={{ fontSize: 11, color: "#4d5156", fontFamily: "monospace" }}>{fullDomain}</div>
                  </div>
                </div>

                <h3 style={{ fontSize: 19, fontWeight: 500, color: "#1a0dab", margin: "6px 0", cursor: "pointer", textDecoration: "underline", lineHeight: 1.35 }}>
                  {title || "Luxury Residences | Prime Real Estate Development"}
                </h3>

                <p style={{ fontSize: 13.5, color: "#4d5156", lineHeight: 1.55, margin: 0 }}>
                  {desc || "Explore master plans, luxury 3 & 4 BHK floor layouts, clubhouse amenities, price sheets, and location map. Book site visit."}
                </p>
              </div>
            </div>
          ) : previewTab === "social" ? (
            /* Social Card Preview */
            <div
              style={{
                width: 580,
                maxWidth: "100%",
                background: "#fff",
                borderRadius: 16,
                border: "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: "0 25px 70px rgba(0, 0, 0, 0.65)",
                overflow: "hidden",
              }}
            >
              <div style={{ background: "#0f172a", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", padding: "12px 18px", display: "flex", alignItems: "center", gap: 8 }}>
                <Share2 size={15} style={{ color: "#818cf8" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1" }}>Social Media Share Preview (WhatsApp / FB / LinkedIn)</span>
              </div>

              {/* Social Image */}
              <div style={{ width: "100%", height: 260, background: "#0f172a", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {seo.ogImage ? (
                  <img src={seo.ogImage} alt="OG" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ textAlign: "center", color: "#94a3b8" }}>
                    <ImagePlus size={36} style={{ margin: "0 auto 8px" }} />
                    <div style={{ fontSize: 12, fontWeight: 700 }}>No Social Share Image Uploaded</div>
                  </div>
                )}
              </div>

              {/* Social Text Excerpt */}
              <div style={{ padding: "18px 22px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#64748b", letterSpacing: 0.5 }}>
                  {site.domain || "preview.estatepro.com"}
                </div>
                <h4 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "6px 0 4px" }}>
                  {seo.ogTitle || title || "Luxury Residences by Estate Pro"}
                </h4>
                <p style={{ fontSize: 12.5, color: "#475569", margin: 0, lineHeight: 1.5 }}>
                  {seo.ogDescription || desc || "Download official brochure, explore floor plans & pricing."}
                </p>
              </div>
            </div>
          ) : (
            /* JSON-LD Schema Viewer */
            <div
              style={{
                width: 680,
                maxWidth: "100%",
                background: "#0f172a",
                borderRadius: 16,
                border: "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: "0 25px 70px rgba(0, 0, 0, 0.65)",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 6 }}>
                  <Code2 size={14} style={{ color: "#818cf8" }} /> Generated Schema.org (JSON-LD)
                </span>
                <button
                  type="button"
                  onClick={copyJson}
                  style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                >
                  <Copy size={12} /> Copy JSON
                </button>
              </div>
              <pre style={{ margin: 0, padding: "20px 24px", color: "#38bdf8", fontSize: 12, lineHeight: 1.6, overflowX: "auto", fontFamily: "monospace" }}>
                {jsonText}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
