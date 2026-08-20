"use client";

import { useState } from "react";
import { Check, Download, Palette, Save, Share2, Type, Upload } from "lucide-react";
import type { LandingPageData, SiteConfig } from "@/lib/prestate/types";
import { ensureConfig } from "@/lib/prestate/site-config";
import { ModuleHeader, SiteScopeBar } from "./shared";
import { FieldRow, TextField, Toggle, Btn } from "@/components/prestate/ui";
import { PrestateMark } from "@/components/prestate/topnav";

const COLOR_GROUPS = [
  { label: "Primary brand", colors: [["#6D5DFC", "Indigo"], ["#4338CA", "Deep Indigo"], ["#8B5CF6", "Violet"]] },
  { label: "Neutrals", colors: [["#0F172A", "Ink"], ["#111827", "Graphite"], ["#334155", "Slate"], ["#64748B", "Muted"], ["#F8FAFC", "Paper"]] },
  { label: "Trust accents", colors: [["#10B981", "Success"], ["#F59E0B", "Warning"], ["#EF4444", "Danger"], ["#C6A15B", "Gold"]] },
];

const FONTS = [
  { name: "Inter", spec: "Sans-serif · Geometric, SaaS-grade" },
  { name: "Playfair Display", spec: "Serif · Editorial, luxury" },
  { name: "DM Serif Display", spec: "Serif · High-contrast display" },
  { name: "Plus Jakarta Sans", spec: "Sans-serif · Warm modern" },
];

export function BrandModule({
  site,
  pages,
  onSelectSite,
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
  const patchBrand = (partial: Partial<SiteConfig["brand"]>) =>
    onPatch((c) => ({ ...c, brand: { ...c.brand, ...partial } }));
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <ModuleHeader
        title="Brand Center"
        description={`Colors, logo, fonts and social for “${site.name}” only. Other templates keep their own brand kit.`}
        actions={
          <div style={{ display: "flex", gap: 9 }}>
            <Btn variant="outline" icon={<Share2 size={14} />}>Share kit</Btn>
            <Btn variant="primary" icon={<Save size={14} />} onClick={() => onToast(`Brand saved for ${site.name} only`)}>Save brand</Btn>
          </div>
        }
      />
      <SiteScopeBar pages={pages} activeId={site.id} onChange={onSelectSite} />

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, padding: "0 28px 40px", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Live preview */}
          <div className="ps-card" style={{ borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ps-line)", fontSize: 12.5, fontWeight: 800, color: "var(--ps-slate)", display: "flex", alignItems: "center", gap: 8 }}>
              <Palette size={15} /> Live brand preview
              <span style={{ marginLeft: "auto" }}><Toggle on={darkMode} onChange={setDarkMode} /></span>
            </div>
            <div style={{ padding: 22, background: darkMode ? "#0b1020" : "#f6f7fb" }}>
              {/* Mini page mock */}
              <div style={{ borderRadius: 14, overflow: "hidden", background: "var(--ps-panel-raised)", boxShadow: "0 14px 40px rgba(17,24,39,.12)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid #eef0f5" }}>
                  <PrestateMark size={26} color={brand.primary} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{brand.name}</span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 14, fontSize: 11, fontWeight: 700, color: "#64748B" }}>
                    {["Amenities", "Floor Plans", "Pricing", "Contact"].map((l) => <span key={l}>{l}</span>)}
                  </div>
                </div>
                <div style={{ padding: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: brand.accent }}>{brand.tagline}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#111827", lineHeight: 1.15, margin: "8px 0 6px", fontFamily: "var(--font-inter)" }}>
                    Where every morning <span style={{ color: brand.primary }}>feels like a holiday.</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "#64748B", maxWidth: 380, lineHeight: 1.6 }}>
                    Spacious 3 & 4 BHK residences in Bangalore with world-class amenities. RERA approved.
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    <span style={{ padding: "10px 18px", borderRadius: 10, background: brand.accentButtons ? brand.accent : brand.primary, color: "#fff", fontSize: 12, fontWeight: 800 }}>Book a site visit</span>
                    <span style={{ padding: "10px 18px", borderRadius: 10, border: `1.5px solid ${brand.primary}`, color: brand.primary, fontSize: 12, fontWeight: 800 }}>Download brochure</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="ps-card" style={{ borderRadius: 16, padding: "6px 20px 18px" }}>
            {COLOR_GROUPS.map((g) => (
              <div key={g.label} style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ps-slate)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{g.label}</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {g.colors.map(([hex, name]) => {
                    const isPrimary = hex === brand.primary;
                    const isAccent = hex === brand.accent;
                    return (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => {
                          if (g.label === "Primary brand") patchBrand({ primary: hex });
                          if (g.label === "Trust accents") patchBrand({ accent: hex });
                          if (g.label === "Neutrals") patchBrand({ primary: hex });
                          onToast(`Swatched ${name} on ${site.name} only`);
                        }}
                        style={{ border: "none", background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: 4 }}
                      >
                        <span style={{ position: "relative", width: 44, height: 44, borderRadius: 12, background: hex, boxShadow: "0 4px 12px rgba(17,24,39,.18)" }}>
                          {isPrimary || isAccent ? (
                            <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Check size={18} /></span>
                          ) : null}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ps-muted)", fontFamily: "monospace" }}>{hex}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — settings */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ps-card" style={{ borderRadius: 16, padding: "6px 20px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)", padding: "12px 0 6px" }}>Logo</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0" }}>
              <span style={{ width: 52, height: 52, borderRadius: 14, background: "var(--ps-grad-primary)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <PrestateMark size={26} color="#fff" />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ps-ink)" }}>{brand.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--ps-muted)" }}>PNG · SVG · 512×512 · 12 KB</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Btn variant="outline" size="sm" icon={<Upload size={12} />}>Replace</Btn>
                <Btn variant="ghost" size="sm" icon={<Download size={12} />}>Download</Btn>
              </div>
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
              <textarea className="ps-input" value={cfg.media.notes} onChange={(e) => onPatch((c) => ({ ...c, media: { notes: e.target.value } }))} style={{ minHeight: 64 }} placeholder="Hero, gallery, brochure paths for this template only" />
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
                  onClick={() => { patchBrand({ headingFont: f.name, bodyFont: f.name === "Playfair Display" || f.name === "DM Serif Display" ? "Inter" : f.name }); onToast(`Font set on ${site.name} only`); }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: 11, border: brand.headingFont === f.name ? "1.5px solid var(--ps-primary)" : "1px solid var(--ps-line)", background: brand.headingFont === f.name ? "var(--ps-primary-mist)" : "#fff", cursor: "pointer", textAlign: "left" }}
                >
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ps-ink)", width: 130, flexShrink: 0 }}>{f.name}</span>
                  <span style={{ fontSize: 11, color: "var(--ps-muted)", flex: 1 }}>{f.spec}</span>
                  {brand.headingFont === f.name ? <span style={{ width: 18, height: 18, borderRadius: 999, background: "var(--ps-primary)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Check size={11} /></span> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="ps-card" style={{ borderRadius: 16, padding: "6px 20px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)", padding: "12px 0 6px" }}>Social & sharing</div>
            {[
              { key: "facebook" as const, label: "Facebook" },
              { key: "instagram" as const, label: "Instagram" },
              { key: "twitter" as const, label: "Twitter / X" },
              { key: "youtube" as const, label: "YouTube" },
              { key: "linkedin" as const, label: "LinkedIn" },
            ].map((s) => (
              <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 0", borderBottom: "1px solid var(--ps-line)" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-slate)", width: 84 }}>{s.label}</span>
                <input className="ps-input" value={brand[s.key]} onChange={(e) => patchBrand({ [s.key]: e.target.value })} style={{ flex: 1, height: 30 }} />
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