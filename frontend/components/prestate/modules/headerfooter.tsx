"use client";

import { useState } from "react";
import { ChevronDown, Globe, Menu, Phone, Plus, Save, Trash2 } from "lucide-react";
import type { LandingPageData, SiteConfig } from "@/lib/prestate/types";
import { ensureConfig } from "@/lib/prestate/site-config";
import { ModuleHeader, SiteScopeBar } from "./shared";
import { FieldRow, TextField, Toggle, Btn, Collapse } from "@/components/prestate/ui";
import { PrestateMark } from "@/components/prestate/topnav";

export function HeaderFooterModule({
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
  const { header, footer, brand } = cfg;
  const patchHeader = (partial: Partial<SiteConfig["header"]>) => onPatch((c) => ({ ...c, header: { ...c.header, ...partial } }));
  const patchFooter = (partial: Partial<SiteConfig["footer"]>) => onPatch((c) => ({ ...c, footer: { ...c.footer, ...partial } }));
  const menu = header.menu;
  const sticky = header.sticky;
  const transparent = header.transparent;
  const showTopbar = header.showTopbar;
  const variant = header.variant;
  const cta = header.cta;
  const [editing, setEditing] = useState<"header" | "footer">("header");

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <ModuleHeader
        title="Header & Footer"
        description={`Header and footer for “${site.name}” only. Other templates keep their own chrome.`}
        actions={<Btn variant="primary" icon={<Save size={14} />} onClick={() => onToast(`Header & footer saved for ${site.name} only`)}>Save</Btn>}
      />
      <SiteScopeBar pages={pages} activeId={site.id} onChange={onSelectSite} />

      {/* Tabs */}
      <div style={{ padding: "0 28px 16px", display: "flex", gap: 8 }}>
        {(["header", "footer"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setEditing(v)}
            style={{ padding: "9px 18px", borderRadius: 999, border: "none", background: editing === v ? "var(--ps-grad-primary)" : "#fff", color: editing === v ? "#fff" : "var(--ps-slate)", fontSize: 12.5, fontWeight: 800, cursor: "pointer", boxShadow: editing === v ? "0 6px 16px rgba(109,93,252,.35)" : "0 1px 3px rgba(17,24,39,.1)" }}
          >
            {v === "header" ? "Header" : "Footer"}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, padding: "0 28px 48px", alignItems: "start" }}>
        {/* PREVIEW */}
        <div>
          <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--ps-line)", background: "#f3f4f9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#e9ebf2", fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", fontFamily: "monospace" }}>
              <Globe size={12} /> {site.domain || `/${site.slug}`} — this template
            </div>
            <div style={{ background: "var(--ps-panel-raised)", minHeight: 420, display: "flex", flexDirection: "column" }}>
              {/* Header preview */}
              <div
                style={{
                  position: "relative",
                  borderBottom: "1px solid #eef0f5",
                  background: editing === "header" ? (transparent ? "linear-gradient(180deg, rgba(17,24,39,.55), transparent)" : variant === "dark" ? "#0b1020" : variant === "glass" ? "rgba(255,255,255,.82)" : "#fff") : "#fff",
                  backdropFilter: variant === "glass" ? "blur(10px)" : undefined,
                  padding: "0 22px",
                  height: 62,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: transparent || variant === "dark" ? "#fff" : "#111827",
                }}
              >
                <PrestateMark size={24} color={transparent || variant === "dark" ? "#fff" : brand.primary} />
                <span style={{ fontSize: 14.5, fontWeight: 800 }}>{brand.name}</span>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 18, fontSize: 12.5, fontWeight: 700, color: "inherit", opacity: 0.85 }}>
                  {menu.map((m) => (
                    <span key={m} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{m} <ChevronDown size={12} /></span>
                  ))}
                  {showTopbar ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Phone size={12} /> +91 98765 43210</span> : null}
                </div>
                <span style={{ padding: "9px 16px", borderRadius: 9, background: "var(--ps-grad-primary)", color: "#fff", fontSize: 12, fontWeight: 800, marginLeft: 8 }}>{cta}</span>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, border: "1px solid #eef0f5", marginLeft: 2 }}><Menu size={14} /></span>
              </div>

              {/* Body placeholder */}
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 60, flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ps-muted)" }}>{editing === "header" ? "Header shown above — sticky on scroll" : "Footer shown below"}</span>
              </div>

              {/* Footer preview */}
              {editing === "footer" ? (
                <div style={{ background: "#0b1020", color: "#fff", padding: "28px 22px" }}>
                  <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
                    <div style={{ flex: 1.4, minWidth: 220 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <PrestateMark size={22} color="#fff" />
                        <span style={{ fontSize: 14.5, fontWeight: 800 }}>{brand.name}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7, maxWidth: 280 }}>
                        RERA No. PRM/KA/RERA/1251/446/PR/2026/1 · Luxury apartments in Sarjapur Road, Bangalore.
                      </div>
                    </div>
                    {[
                      ["Quick links", ["Amenities", "Floor plans", "Pricing", "Gallery"]],
                      ["Contact", ["+91 98765 43210", "hello@aurora.live", "Sarjapur Rd, Bangalore"]],
                      ["Legal", ["Privacy", "Terms", "Cancellation"]],
                    ].map(([t, items]) => (
                      <div key={t as string} style={{ flex: 1, minWidth: 130 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, color: "#c6a15b", marginBottom: 10 }}>{t as string}</div>
                        {(items as string[]).map((i) => (
                          <div key={i} style={{ fontSize: 12, color: "#94a3b8", padding: "3px 0" }}>{i}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", marginTop: 22, paddingTop: 14, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b" }}>
                    <span>© 2026 Aurora Group. Built with Prestate Builder.</span>
                    <span>Powered by Aurora Technology</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* SETTINGS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)", padding: "12px 0 6px" }}>Menu links</div>
            {menu.map((m, i) => (
              <div key={`${m}-${i}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                <input
                  className="ps-input"
                  value={m}
                  onChange={(e) => {
                    const next = [...menu];
                    next[i] = e.target.value;
                    patchHeader({ menu: next });
                  }}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => patchHeader({ menu: menu.filter((_, idx) => idx !== i) })}
                  style={{ background: "none", border: "none", color: "var(--ps-muted)", cursor: "pointer", display: "inline-flex" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => patchHeader({ menu: [...menu, "New link"] })} style={{ width: "100%", marginTop: 6, padding: "8px", borderRadius: 9, border: "1px dashed var(--ps-primary)", background: "var(--ps-primary-mist)", color: "var(--ps-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Plus size={14} /> Add link
            </button>
          </div>

          <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
            <Collapse title="Header behavior" icon={<Menu size={14} />} defaultOpen>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0" }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>Sticky on scroll</span>
                <Toggle on={sticky} onChange={(v) => patchHeader({ sticky: v })} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0" }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>Transparent over hero</span>
                <Toggle on={transparent} onChange={(v) => patchHeader({ transparent: v })} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0" }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>Show top bar</span>
                <Toggle on={showTopbar} onChange={(v) => patchHeader({ showTopbar: v })} />
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Style</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["light", "dark", "glass"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => patchHeader({ variant: v })}
                      style={{ flex: 1, padding: "8px", borderRadius: 9, border: variant === v ? "1.5px solid var(--ps-primary)" : "1px solid var(--ps-line-strong)", background: variant === v ? "var(--ps-primary-soft)" : "#fff", color: "var(--ps-slate)", fontSize: 12, fontWeight: 700, textTransform: "capitalize", cursor: "pointer" }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </Collapse>
          </div>

          <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
            <Collapse title="CTA button" icon={<Phone size={14} />} defaultOpen>
              <FieldRow label="Button label">
                <TextField value={cta} onChange={(v) => patchHeader({ cta: v })} />
              </FieldRow>
              <FieldRow label="Button link">
                <TextField value={header.ctaLink} onChange={(v) => patchHeader({ ctaLink: v })} />
              </FieldRow>
            </Collapse>
          </div>

          {editing === "footer" ? (
            <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
              <Collapse title="Footer settings" icon={<Globe size={14} />} defaultOpen>
                <FieldRow label="RERA number">
                  <TextField value={footer.rera} onChange={(v) => patchFooter({ rera: v })} />
                </FieldRow>
                <FieldRow label="Copyright text">
                  <TextField value={footer.copyright} onChange={(v) => patchFooter({ copyright: v })} />
                </FieldRow>
                <FieldRow label="Footer columns">
                  <TextField value="3" onChange={() => {}} />
                </FieldRow>
              </Collapse>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}