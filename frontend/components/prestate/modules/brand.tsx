"use client";

import { useState } from "react";
import { Check, Download, LayoutDashboard, Palette, Save, Share2, Type } from "lucide-react";
import type { LandingPageData, SiteConfig } from "@/lib/prestate/types";
import type { LayoutTheme } from "@/lib/prestate/widget-theme";
import { ensureConfig, googleFontsHref, siteThemeStyle } from "@/lib/prestate/site-config";
import { ModuleHeader, SiteScopeBar } from "./shared";
import { ColorField, FieldRow, TextField, Toggle, Btn } from "@/components/prestate/ui";
import { PrestateMark } from "@/components/prestate/topnav";
import { MediaPicker } from "@/components/media-picker";

const PRIMARY_SWATCHES = [
  ["#6D5DFC", "Indigo"],
  ["#4338CA", "Deep Indigo"],
  ["#8B5CF6", "Violet"],
  ["#0F766E", "Teal"],
  ["#B45309", "Amber"],
  ["#C026D3", "Fuchsia"],
] as const;

const ACCENT_SWATCHES = [
  ["#CDA45E", "Gold"],
  ["#D4A017", "Mustard"],
  ["#1E3A5F", "Navy"],
  ["#111827", "Ink"],
  ["#10B981", "Emerald"],
  ["#EF4444", "Rose"],
] as const;

const FONTS = [
  { name: "Inter", spec: "Sans-serif · Geometric, SaaS-grade" },
  { name: "Playfair Display", spec: "Serif · Editorial, luxury" },
  { name: "DM Serif Display", spec: "Serif · High-contrast display" },
  { name: "Plus Jakarta Sans", spec: "Sans-serif · Warm modern" },
];

const LAYOUT_THEMES: {
  key: LayoutTheme;
  label: string;
  tagline: string;
  previewRadius: number;
  previewShadow: string;
  previewBorder: string;
  accentColor: string;
}[] = [
  {
    key: "standard",
    label: "Standard",
    tagline: "Clean · Professional · Balanced",
    previewRadius: 12,
    previewShadow: "0 2px 10px rgba(16,24,40,.08)",
    previewBorder: "1px solid rgba(16,24,40,.09)",
    accentColor: "#4f46e5",
  },
  {
    key: "premium",
    label: "Premium",
    tagline: "Elegant · Luxury · High-end",
    previewRadius: 18,
    previewShadow: "0 6px 24px rgba(16,10,4,.12)",
    previewBorder: "1px solid rgba(196,164,106,.22)",
    accentColor: "#b8893b",
  },
  {
    key: "modern",
    label: "Modern",
    tagline: "Minimal · Bold · Contemporary",
    previewRadius: 5,
    previewShadow: "none",
    previewBorder: "1.5px solid rgba(16,24,40,.18)",
    accentColor: "#4f46e5",
  },
];

function LayoutThemePicker({ value, onChange }: { value: LayoutTheme; onChange: (t: LayoutTheme) => void }) {
  return (
    <div className="ps-card" style={{ borderRadius: 16, padding: "6px 20px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0 10px", fontSize: 13, fontWeight: 800, color: "var(--ps-ink)" }}>
        <LayoutDashboard size={15} /> Widget Layout Style
      </div>
      <p style={{ fontSize: 12, color: "var(--ps-muted)", lineHeight: 1.55, margin: "0 0 14px" }}>
        Sets the visual design style for all real estate widgets — radii, shadows, spacing and card style — without changing any content or functionality.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
        {LAYOUT_THEMES.map((t) => {
          const active = value === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 0,
                padding: 0,
                borderRadius: 12,
                border: active ? "2px solid var(--ps-primary)" : "1px solid var(--ps-line-strong)",
                background: active ? "var(--ps-primary-mist)" : "var(--ps-bg)",
                cursor: "pointer",
                overflow: "hidden",
                transition: "border-color .15s",
              }}
            >
              {/* Mini widget preview */}
              <div style={{ padding: "12px 12px 8px", background: active ? "rgba(79,70,229,.04)" : "var(--ps-panel-raised)", width: "100%" }}>
                {/* Mock card */}
                <div style={{
                  background: "#ffffff",
                  borderRadius: t.previewRadius,
                  boxShadow: t.previewShadow,
                  border: t.previewBorder,
                  padding: "8px 10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                }}>
                  <div style={{ height: 5, borderRadius: 999, background: t.accentColor, width: "60%" }} />
                  <div style={{ height: 4, borderRadius: 999, background: "rgba(15,23,42,.10)", width: "90%" }} />
                  <div style={{ height: 4, borderRadius: 999, background: "rgba(15,23,42,.06)", width: "75%" }} />
                  <div style={{ marginTop: 4, height: 18, borderRadius: t.key === "modern" ? 3 : t.key === "premium" ? 10 : 6, background: t.accentColor, width: "70%", opacity: 0.9 }} />
                </div>
              </div>
              {/* Label row */}
              <div style={{ padding: "7px 12px 9px", textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: active ? "var(--ps-primary)" : "var(--ps-ink)" }}>{t.label}</span>
                  {active ? <Check size={12} style={{ color: "var(--ps-primary)", flexShrink: 0 }} /> : null}
                </div>
                <div style={{ fontSize: 10, color: "var(--ps-muted)", marginTop: 1, lineHeight: 1.3 }}>{t.tagline}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
  const [darkMode, setDarkMode] = useState(false);

  const patchBrand = (partial: Partial<SiteConfig["brand"]>) =>
    onPatch((c) => ({ ...c, brand: { ...c.brand, ...partial } }));

  const saveBrand = () => {
    onPatch((c) => ({ ...c, brand: { ...c.brand } }));
    onToast(`Brand saved for ${site.name}`);
  };

  const shareKit = async () => {
    const css = `:root {\n  --brand-primary: ${brand.primary};\n  --brand-accent: ${brand.accent};\n  --brand-heading: ${brand.headingFont};\n  --brand-body: ${brand.bodyFont};\n}`;
    try {
      await navigator.clipboard.writeText(css);
      onToast("Brand CSS copied");
    } catch {
      onToast("Could not copy brand kit");
    }
  };

  const downloadLogo = () => {
    if (!brand.logo) {
      onToast("Upload a logo first");
      return;
    }
    const a = document.createElement("a");
    a.href = brand.logo;
    a.download = `${brand.name.replace(/\s+/g, "-").toLowerCase() || "logo"}.png`;
    a.click();
  };

  const ink = darkMode ? "#f8fafc" : "#111827";
  const muted = darkMode ? "#94a3b8" : "#64748B";
  const panel = darkMode ? "#111827" : "#ffffff";
  const line = darkMode ? "#1f2937" : "#eef0f5";

  return (
    <div style={{ overflowY: "auto", height: "100%", ...siteThemeStyle(brand) }}>
      <link rel="stylesheet" href={googleFontsHref(brand.headingFont, brand.bodyFont)} />
      <ModuleHeader
        title="Brand Center"
        description={`Colors, logo, fonts and social for “${site.name}”. Changes apply to this template’s builder and local preview.`}
        actions={
          <div style={{ display: "flex", gap: 9 }}>
            <Btn variant="outline" icon={<Share2 size={14} />} onClick={() => void shareKit()}>Share kit</Btn>
            <Btn variant="primary" icon={<Save size={14} />} onClick={saveBrand}>Save brand</Btn>
          </div>
        }
      />
      <SiteScopeBar pages={pages} activeId={site.id} />

      <div className="ps-brand-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, padding: "0 28px 40px", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ps-card" style={{ borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ps-line)", fontSize: 12.5, fontWeight: 800, color: "var(--ps-slate)", display: "flex", alignItems: "center", gap: 8 }}>
              <Palette size={15} /> Live brand preview
              <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700 }}>
                Dark
                <Toggle on={darkMode} onChange={setDarkMode} />
              </span>
            </div>
            <div style={{ padding: 22, background: darkMode ? "#0b1020" : "#f6f7fb" }}>
              <div style={{ borderRadius: 14, overflow: "hidden", background: panel, boxShadow: "0 14px 40px rgba(17,24,39,.12)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: `1px solid ${line}` }}>
                  {brand.logo ? (
                    <img src={brand.logo} alt="" style={{ width: 26, height: 26, borderRadius: 7, objectFit: "cover" }} />
                  ) : (
                    <PrestateMark size={26} color={brand.primary} />
                  )}
                  <span style={{ fontSize: 14, fontWeight: 800, color: ink, fontFamily: `${brand.headingFont}, Georgia, serif` }}>{brand.name}</span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 14, fontSize: 11, fontWeight: 700, color: muted }}>
                    {["Amenities", "Floor Plans", "Pricing", "Contact"].map((l) => <span key={l}>{l}</span>)}
                  </div>
                </div>
                <div style={{ padding: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: brand.accent }}>{brand.tagline}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: ink, lineHeight: 1.15, margin: "8px 0 6px", fontFamily: `${brand.headingFont}, Georgia, serif` }}>
                    Built around <span style={{ color: brand.primary }}>your brand.</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: muted, maxWidth: 380, lineHeight: 1.6, fontFamily: `${brand.bodyFont}, Inter, sans-serif` }}>
                    {brand.email} · {brand.phone}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    <span style={{ padding: "10px 18px", borderRadius: 10, background: brand.accentButtons ? brand.accent : brand.primary, color: "#fff", fontSize: 12, fontWeight: 800 }}>Book a site visit</span>
                    <span style={{ padding: "10px 18px", borderRadius: 10, border: `1.5px solid ${brand.primary}`, color: brand.primary, fontSize: 12, fontWeight: 800 }}>Download brochure</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="ps-card" style={{ borderRadius: 16, padding: "16px 20px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)", marginBottom: 12 }}>Colors</div>
            <FieldRow label="Primary">
              <ColorField value={brand.primary} onChange={(v) => patchBrand({ primary: v })} />
            </FieldRow>
            <FieldRow label="Accent">
              <ColorField value={brand.accent} onChange={(v) => patchBrand({ accent: v })} />
            </FieldRow>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ps-slate)", textTransform: "uppercase", letterSpacing: 0.5, margin: "12px 0 8px" }}>Primary swatches</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {PRIMARY_SWATCHES.map(([hex, name]) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => patchBrand({ primary: hex })}
                  style={{ border: "none", background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: 4 }}
                >
                  <span style={{ position: "relative", width: 44, height: 44, borderRadius: 12, background: hex, boxShadow: "0 4px 12px rgba(17,24,39,.18)" }}>
                    {hex.toLowerCase() === brand.primary.toLowerCase() ? (
                      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Check size={18} /></span>
                    ) : null}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ps-muted)" }}>{name}</span>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ps-slate)", textTransform: "uppercase", letterSpacing: 0.5, margin: "14px 0 8px" }}>Accent swatches</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {ACCENT_SWATCHES.map(([hex, name]) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => patchBrand({ accent: hex })}
                  style={{ border: "none", background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: 4 }}
                >
                  <span style={{ position: "relative", width: 44, height: 44, borderRadius: 12, background: hex, boxShadow: "0 4px 12px rgba(17,24,39,.18)" }}>
                    {hex.toLowerCase() === brand.accent.toLowerCase() ? (
                      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Check size={18} /></span>
                    ) : null}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ps-muted)" }}>{name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ps-card" style={{ borderRadius: 16, padding: "6px 20px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)", padding: "12px 0 6px" }}>Logo</div>
            <MediaPicker kind="image" label="Logo — upload or URL" value={brand.logo} onChange={(v) => patchBrand({ logo: v })} />
            <div style={{ display: "flex", justifyContent: "flex-end", margin: "4px 0 10px" }}>
              <Btn variant="ghost" size="sm" icon={<Download size={12} />} onClick={downloadLogo}>Download</Btn>
            </div>
            <FieldRow label="Brand name">
              <TextField value={brand.name} onChange={(v) => patchBrand({ name: v })} />
            </FieldRow>
            <FieldRow label="Tagline">
              <TextField value={brand.tagline} onChange={(v) => patchBrand({ tagline: v })} />
            </FieldRow>
            <FieldRow label="Support email">
              <TextField value={brand.email} onChange={(v) => patchBrand({ email: v })} />
            </FieldRow>
            <FieldRow label="Phone">
              <TextField value={brand.phone} onChange={(v) => patchBrand({ phone: v })} />
            </FieldRow>
            <FieldRow label="Images & media notes">
              <textarea className="ps-input" value={cfg.media.notes} onChange={(e) => onPatch((c) => ({ ...c, media: { notes: e.target.value } }))} style={{ minHeight: 64 }} placeholder="Hero, gallery, brochure notes for this template" />
            </FieldRow>
          </div>

          <div className="ps-card" style={{ borderRadius: 16, padding: "6px 20px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0 6px", fontSize: 13, fontWeight: 800, color: "var(--ps-ink)" }}>
              <Type size={15} /> Typography
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {FONTS.map((f) => (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => patchBrand({ headingFont: f.name, bodyFont: f.name === "Playfair Display" || f.name === "DM Serif Display" ? "Inter" : f.name })}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: 11, border: brand.headingFont === f.name ? "1.5px solid var(--ps-primary)" : "1px solid var(--ps-line)", background: brand.headingFont === f.name ? "var(--ps-primary-mist)" : "#fff", cursor: "pointer", textAlign: "left" }}
                >
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ps-ink)", width: 130, flexShrink: 0, fontFamily: `${f.name}, system-ui, sans-serif` }}>{f.name}</span>
                  <span style={{ fontSize: 11, color: "var(--ps-muted)", flex: 1 }}>{f.spec}</span>
                  {brand.headingFont === f.name ? <span style={{ width: 18, height: 18, borderRadius: 999, background: "var(--ps-primary)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Check size={11} /></span> : null}
                </button>
              ))}
            </div>
          </div>

          {/* Layout Style picker */}
          <LayoutThemePicker
            value={brand.layoutTheme ?? "standard"}
            onChange={(t) => patchBrand({ layoutTheme: t as SiteConfig["brand"]["layoutTheme"] })}
          />

          <div className="ps-card" style={{ borderRadius: 16, padding: "6px 20px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)", padding: "12px 0 4px" }}>Social & sharing</div>
            {[
              { key: "facebook" as const, label: "Facebook" },
              { key: "instagram" as const, label: "Instagram" },
              { key: "twitter" as const, label: "Twitter / X" },
              { key: "youtube" as const, label: "YouTube" },
              { key: "linkedin" as const, label: "LinkedIn" },
            ].map((s) => (
              <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 0", borderBottom: "1px solid var(--ps-line)" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-slate)", width: 84 }}>{s.label}</span>
                <input className="ps-input" value={brand[s.key]} onChange={(e) => patchBrand({ [s.key]: e.target.value })} style={{ flex: 1, height: 30 }} placeholder="https://" />
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0 4px" }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>Accent buttons on pages</span>
              <Toggle on={brand.accentButtons} onChange={(v) => patchBrand({ accentButtons: v })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
