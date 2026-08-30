"use client";

import { useState } from "react";
import {
  Check,
  Download,
  Eye,
  Globe,
  ImagePlus,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageCircle,
  Monitor,
  Palette,
  Phone,
  Save,
  Share2,
  Smartphone,
  Sparkles,
  Tablet,
  Type,
} from "lucide-react";
import type { LandingPageData, SiteConfig } from "@/lib/prestate/types";
import type { LayoutTheme } from "@/lib/prestate/widget-theme";
import { ensureConfig, siteThemeStyle } from "@/lib/prestate/site-config";
import { MediaPicker } from "@/components/media-picker";

const PRIMARY_SWATCHES = [
  ["#6366F1", "Indigo"],
  ["#4F46E5", "Deep Indigo"],
  ["#8B5CF6", "Violet"],
  ["#0D9488", "Teal"],
  ["#B45309", "Amber Gold"],
  ["#E11D48", "Rose"],
  ["#0284C7", "Sky Blue"],
  ["#16A34A", "Emerald"],
] as const;

const ACCENT_SWATCHES = [
  ["#CDA45E", "Royal Gold"],
  ["#D4A017", "Mustard"],
  ["#1E3A5F", "Deep Navy"],
  ["#0F172A", "Slate Ink"],
  ["#10B981", "Emerald"],
  ["#F59E0B", "Sunset Amber"],
] as const;

const PALETTE_PRESETS = [
  { name: "Royal Prestige", primary: "#6366F1", accent: "#CDA45E", desc: "Vibrant Indigo & Imperial Gold for luxury developments" },
  { name: "Emerald Oasis", primary: "#0D9488", accent: "#10B981", desc: "Lush eco-residences & nature-themed communities" },
  { name: "Corporate Sapphire", primary: "#0284C7", accent: "#1E3A5F", desc: "High-trust commercial & ultra-modern tech townships" },
  { name: "Amber Elegance", primary: "#B45309", accent: "#D4A017", desc: "Warm boutique villas and Mediterranean architecture" },
];

const LAYOUT_THEMES: {
  key: LayoutTheme;
  label: string;
  tagline: string;
  previewRadius: number;
}[] = [
  { key: "standard", label: "Standard", tagline: "Clean · Professional · Balanced", previewRadius: 12 },
  { key: "premium", label: "Premium", tagline: "Elegant · Luxury · High-end", previewRadius: 18 },
  { key: "modern", label: "Modern", tagline: "Minimal · Bold · Contemporary", previewRadius: 6 },
];

export function BrandModule({
  site,
  pages,
  onPatch,
  onToast,
}: {
  site: LandingPageData;
  pages: LandingPageData[];
  onSelectSite: (id: string) => void;
  onPatch: (fn: (c: SiteConfig) => SiteConfig) => void;
  onToast: (m: string) => void;
}) {
  const cfg = ensureConfig(site);
  const { brand } = cfg;
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const patchBrand = (partial: Partial<SiteConfig["brand"]>) =>
    onPatch((c) => ({ ...c, brand: { ...c.brand, ...partial } }));

  const applyPreset = (primary: string, accent: string) => {
    patchBrand({ primary, accent });
    onToast(`Applied color palette: ${primary} & ${accent}`);
  };

  const handleSave = () => {
    setSavedSuccess(true);
    onToast(`Brand settings saved for ${site.name}`);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

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
            <Palette size={16} style={{ color: "var(--ps-primary)" }} /> Brand Center & Design Tokens
          </span>
          <span style={{ fontSize: 11, color: "var(--ps-muted)", borderLeft: "1px solid var(--ps-line-strong)", paddingLeft: 12 }}>
            Applied across all real estate widgets for {site.name}
          </span>
        </div>

        {/* Center Device Switcher */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 2, background: "rgba(0, 0, 0, 0.35)", borderRadius: 10, padding: 3, border: "1px solid var(--ps-line-strong)" }}>
          {[
            { key: "desktop", icon: Monitor, label: "Desktop" },
            { key: "tablet", icon: Tablet, label: "Tablet" },
            { key: "mobile", icon: Smartphone, label: "Mobile" },
          ].map((dev) => (
            <button
              key={dev.key}
              type="button"
              onClick={() => setDevice(dev.key as any)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 7,
                border: "none",
                background: device === dev.key ? "var(--ps-panel-raised)" : "transparent",
                color: device === dev.key ? "#fff" : "var(--ps-muted)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <dev.icon size={14} />
              <span>{dev.label}</span>
            </button>
          ))}
        </div>

        {/* Save button */}
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
          <span>{savedSuccess ? "Saved!" : "Save Brand"}</span>
        </button>
      </div>

      {/* Main 2-Panel Studio Layout */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Left Controls Panel */}
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
          {/* Section 1: 1-Click Curated Palettes */}
          <div style={{ background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line-strong)", borderRadius: 14, padding: "16px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={16} style={{ color: "var(--ps-primary)" }} /> Curated Color Palettes
            </div>
            <p style={{ fontSize: 11.5, color: "var(--ps-muted)", margin: "0 0 12px", lineHeight: 1.45 }}>
              Choose a harmonized palette tailored for luxury property marketing.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
              {PALETTE_PRESETS.map((p) => {
                const active = brand.primary?.toLowerCase() === p.primary.toLowerCase() && brand.accent?.toLowerCase() === p.accent.toLowerCase();
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p.primary, p.accent)}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: active ? "2px solid var(--ps-primary)" : "1px solid var(--ps-line)",
                      background: active ? "rgba(99, 102, 241, 0.18)" : "var(--ps-bg)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.12s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ display: "flex", gap: 3 }}>
                        <span style={{ width: 18, height: 18, borderRadius: "50%", background: p.primary, border: "2px solid rgba(255,255,255,.2)" }} />
                        <span style={{ width: 18, height: 18, borderRadius: "50%", background: p.accent, border: "2px solid rgba(255,255,255,.2)" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: active ? "#818cf8" : "#fff" }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: "var(--ps-muted)" }}>{p.desc}</div>
                      </div>
                    </div>
                    {active ? <Check size={16} style={{ color: "#818cf8", flexShrink: 0 }} /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Custom Primary & Secondary Color Pickers */}
          <div style={{ background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line-strong)", borderRadius: 14, padding: "16px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Palette size={16} style={{ color: "var(--ps-primary)" }} /> Theme Colors
            </div>

            {/* Primary Color */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Primary Brand Color</span>
                <span style={{ fontSize: 11, color: "var(--ps-muted)", fontFamily: "monospace" }}>{brand.primary || "#6366F1"}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="color"
                  value={brand.primary || "#6366F1"}
                  onChange={(e) => patchBrand({ primary: e.target.value })}
                  style={{ width: 44, height: 36, padding: 0, border: "none", borderRadius: 8, cursor: "pointer", background: "transparent" }}
                />
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1 }}>
                  {PRIMARY_SWATCHES.map(([hex, label]) => (
                    <button
                      key={hex}
                      type="button"
                      title={label}
                      onClick={() => patchBrand({ primary: hex })}
                      style={{ width: 22, height: 22, borderRadius: "50%", background: hex, border: brand.primary === hex ? "2px solid #fff" : "1px solid rgba(255,255,255,.2)", cursor: "pointer" }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Secondary / Accent Color */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Secondary / Accent Gold</span>
                <span style={{ fontSize: 11, color: "var(--ps-muted)", fontFamily: "monospace" }}>{brand.accent || "#CDA45E"}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="color"
                  value={brand.accent || "#CDA45E"}
                  onChange={(e) => patchBrand({ accent: e.target.value })}
                  style={{ width: 44, height: 36, padding: 0, border: "none", borderRadius: 8, cursor: "pointer", background: "transparent" }}
                />
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1 }}>
                  {ACCENT_SWATCHES.map(([hex, label]) => (
                    <button
                      key={hex}
                      type="button"
                      title={label}
                      onClick={() => patchBrand({ accent: hex })}
                      style={{ width: 22, height: 22, borderRadius: "50%", background: hex, border: brand.accent === hex ? "2px solid #fff" : "1px solid rgba(255,255,255,.2)", cursor: "pointer" }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Brand Identity & Media */}
          <div style={{ background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line-strong)", borderRadius: 14, padding: "16px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <ImagePlus size={16} style={{ color: "var(--ps-primary)" }} /> Brand Identity & Logo
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", display: "block", marginBottom: 4 }}>Brand / Project Name</label>
                <input
                  className="ps-input"
                  value={brand.name || ""}
                  placeholder="e.g. Prestige Green Park"
                  onChange={(e) => patchBrand({ name: e.target.value })}
                  style={{ width: "100%", fontSize: 12.5, background: "var(--ps-bg)", color: "#fff" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", display: "block", marginBottom: 4 }}>Tagline / Catchphrase</label>
                <input
                  className="ps-input"
                  value={brand.tagline || ""}
                  placeholder="e.g. Ultra Luxury Living in South Bangalore"
                  onChange={(e) => patchBrand({ tagline: e.target.value })}
                  style={{ width: "100%", fontSize: 12.5, background: "var(--ps-bg)", color: "#fff" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", display: "block", marginBottom: 4 }}>Brand Logo</label>
                <MediaPicker
                  kind="image"
                  label="Upload or select Brand Logo"
                  value={brand.logo || ""}
                  onChange={(v) => patchBrand({ logo: v })}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Widget Design Style */}
          <div style={{ background: "var(--ps-panel-raised)", border: "1px solid var(--ps-line-strong)", borderRadius: 14, padding: "16px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <LayoutDashboard size={16} style={{ color: "var(--ps-primary)" }} /> Widget Design Style
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
              {LAYOUT_THEMES.map((t) => {
                const active = (brand.layoutTheme ?? "standard") === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => patchBrand({ layoutTheme: t.key })}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: active ? "2px solid var(--ps-primary)" : "1px solid var(--ps-line)",
                      background: active ? "rgba(99, 102, 241, 0.18)" : "var(--ps-bg)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.12s",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: active ? "#818cf8" : "#fff" }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: "var(--ps-muted)" }}>{t.tagline}</div>
                    </div>
                    {active ? <Check size={16} style={{ color: "#818cf8", flexShrink: 0 }} /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Live Specimen Canvas */}
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
          {/* Mockup Card */}
          <div
            style={{
              width: device === "desktop" ? "100%" : device === "tablet" ? 768 : 390,
              maxWidth: "100%",
              background: "#fff",
              borderRadius: device === "desktop" ? 18 : 28,
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 25px 70px rgba(0, 0, 0, 0.65)",
              overflow: "hidden",
              transition: "width 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Header Stage Bar */}
            <div
              style={{
                background: "#0f172a",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                padding: "12px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f87171" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#fbbf24" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#34d399" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginLeft: 8 }}>
                  Live Brand Preview & Widget System
                </span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#a5b4fc", background: "rgba(99,102,241,0.2)", padding: "3px 9px", borderRadius: 999 }}>
                {brand.layoutTheme || "standard"} theme
              </span>
            </div>

            {/* Specimen Content Sheet */}
            <div style={{ padding: device === "mobile" ? "30px 20px" : "48px 40px", display: "flex", flexDirection: "column", gap: 32 }}>
              {/* Brand Header Banner */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 24, borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {brand.logo ? (
                    <img src={brand.logo} alt={brand.name} style={{ height: 48, objectFit: "contain" }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${brand.primary || "#6366F1"}, ${brand.accent || "#CDA45E"})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900 }}>
                      {brand.name?.slice(0, 2).toUpperCase() || "EP"}
                    </div>
                  )}
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", margin: 0 }}>{brand.name || "Estate Pro Luxury Residences"}</h2>
                    <p style={{ fontSize: 12.5, color: "#64748b", margin: "3px 0 0" }}>{brand.tagline || "Super-premium residential enclave"}</p>
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    background: brand.primary || "#6366F1",
                    color: "#fff",
                    border: "none",
                    borderRadius: brand.layoutTheme === "premium" ? 14 : brand.layoutTheme === "modern" ? 4 : 8,
                    padding: "10px 20px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: `0 4px 14px ${brand.primary || "#6366F1"}40`,
                  }}
                >
                  Book Site Visit
                </button>
              </div>

              {/* Sample Widgets Grid */}
              <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : "1fr 1fr", gap: 20 }}>
                {/* Feature Card 1 */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: brand.layoutTheme === "premium" ? `1px solid ${brand.accent || "#CDA45E"}40` : "1px solid #e2e8f0",
                    borderRadius: brand.layoutTheme === "premium" ? 18 : brand.layoutTheme === "modern" ? 6 : 12,
                    padding: "24px",
                    boxShadow: brand.layoutTheme === "premium" ? "0 8px 30px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, color: brand.primary || "#6366F1" }}>
                    Primary Token
                  </span>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: "8px 0" }}>Infinity Clubhouse</h3>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>
                    World-class recreational hub featuring temperature-controlled pools, squash courts, and sky lounges.
                  </p>
                </div>

                {/* Feature Card 2 */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: brand.layoutTheme === "premium" ? `1px solid ${brand.accent || "#CDA45E"}40` : "1px solid #e2e8f0",
                    borderRadius: brand.layoutTheme === "premium" ? 18 : brand.layoutTheme === "modern" ? 6 : 12,
                    padding: "24px",
                    boxShadow: brand.layoutTheme === "premium" ? "0 8px 30px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, color: brand.accent || "#CDA45E" }}>
                    Accent Highlight
                  </span>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: "8px 0" }}>Gold Specification</h3>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>
                    Italian marble flooring, smart automated home access, and imported German sanitary fittings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
