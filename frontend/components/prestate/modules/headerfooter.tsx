"use client";

import { useState } from "react";
import { ChevronDown, Globe, Menu, Phone, Plus, Save, Trash2 } from "lucide-react";
import type { LandingPageData, SiteConfig } from "@/lib/prestate/types";
import { ensureConfig, siteThemeStyle } from "@/lib/prestate/site-config";
import { ModuleHeader, SiteScopeBar } from "./shared";
import { FieldRow, TextField, Toggle, Btn, Collapse } from "@/components/prestate/ui";
import { PrestateMark } from "@/components/prestate/topnav";

export function HeaderFooterModule({
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
  const { header, footer, brand } = cfg;
  const patchHeader = (partial: Partial<SiteConfig["header"]>) => onPatch((c) => ({ ...c, header: { ...c.header, ...partial } }));
  const patchFooter = (partial: Partial<SiteConfig["footer"]>) => onPatch((c) => ({ ...c, footer: { ...c.footer, ...partial } }));
  const menu = header.menu;
  const [editing, setEditing] = useState<"header" | "footer">("header");
  const lightText = header.transparent || header.variant === "dark";
  const barBg = header.transparent
    ? "linear-gradient(180deg, rgba(17,24,39,.7), rgba(17,24,39,.2))"
    : header.variant === "dark"
      ? "#0b1020"
      : header.variant === "glass"
        ? "rgba(255,255,255,.82)"
        : "#fff";

  return (
    <div style={{ overflowY: "auto", height: "100%", ...siteThemeStyle(brand) }}>
      <ModuleHeader
        title="Header & Footer"
        description={`Header and footer for “${site.name}”. Menu, style and copyright appear on this template’s builder and local preview.`}
        actions={<Btn variant="primary" icon={<Save size={14} />} onClick={() => onToast(`Header & footer saved for ${site.name}`)}>Save</Btn>}
      />
      <SiteScopeBar pages={pages} activeId={site.id} />

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

      <div className="ps-brand-grid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, padding: "0 28px 48px", alignItems: "start" }}>
        <div>
          <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--ps-line)", background: "#f3f4f9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#e9ebf2", fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", fontFamily: "monospace" }}>
              <Globe size={12} /> {site.domain || `/${site.slug}`}
            </div>
            <div style={{ background: "var(--ps-panel-raised)", minHeight: 420, display: "flex", flexDirection: "column" }}>
              {header.showTopbar && brand.phone ? (
                <div style={{ background: brand.primary, color: "#fff", fontSize: 11, fontWeight: 700, padding: "6px 16px", display: "flex", justifyContent: "center", gap: 12 }}>
                  <span>{brand.phone}</span>
                  {brand.email ? <span>{brand.email}</span> : null}
                </div>
              ) : null}
              <div
                style={{
                  borderBottom: header.transparent ? "none" : "1px solid #eef0f5",
                  background: barBg,
                  backdropFilter: header.variant === "glass" ? "blur(10px)" : undefined,
                  padding: "0 22px",
                  minHeight: 62,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: lightText ? "#fff" : "#111827",
                }}
              >
                {brand.logo ? (
                  <img src={brand.logo} alt="" style={{ width: 24, height: 24, borderRadius: 7, objectFit: "cover" }} />
                ) : (
                  <PrestateMark size={24} color={lightText ? "#fff" : brand.primary} />
                )}
                <span style={{ fontSize: 14.5, fontWeight: 800 }}>{brand.name}</span>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14, fontSize: 12.5, fontWeight: 700, opacity: 0.9, flexWrap: "wrap" }}>
                  {menu.map((m) => (
                    <span key={m} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{m} <ChevronDown size={12} /></span>
                  ))}
                </div>
                <span style={{ padding: "9px 16px", borderRadius: 9, background: `linear-gradient(135deg, ${brand.accent}, ${brand.primary})`, color: "#fff", fontSize: 12, fontWeight: 800, marginLeft: 8, whiteSpace: "nowrap" }}>{header.cta}</span>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(148,163,184,.35)" }}><Menu size={14} /></span>
              </div>

              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, flexDirection: "column", gap: 6, background: "linear-gradient(180deg, #eef2ff, #f8fafc)" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ps-muted)" }}>
                  {header.sticky ? "Sticky" : "Static"} header · {header.transparent ? "Transparent over hero" : header.variant} style
                </span>
              </div>

              <div style={{ background: "#0b1020", color: "#fff", padding: "28px 22px" }}>
                <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                  <div style={{ flex: 1.4, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      {brand.logo ? <img src={brand.logo} alt="" style={{ width: 22, height: 22, borderRadius: 6, objectFit: "cover" }} /> : <PrestateMark size={22} color="#fff" />}
                      <span style={{ fontSize: 14.5, fontWeight: 800 }}>{brand.name}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7, maxWidth: 280 }}>{brand.tagline}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 130 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, color: brand.accent, marginBottom: 10 }}>Links</div>
                    {menu.map((i) => (
                      <div key={i} style={{ fontSize: 12, color: "#94a3b8", padding: "3px 0" }}>{i}</div>
                    ))}
                  </div>
                  <div style={{ flex: 1, minWidth: 130 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, color: brand.accent, marginBottom: 10 }}>Contact</div>
                    {brand.phone ? <div style={{ fontSize: 12, color: "#94a3b8", padding: "3px 0" }}>{brand.phone}</div> : null}
                    {brand.email ? <div style={{ fontSize: 12, color: "#94a3b8", padding: "3px 0" }}>{brand.email}</div> : null}
                  </div>
                </div>
                <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", marginTop: 22, paddingTop: 14, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", fontSize: 11, color: "#64748b" }}>
                  <span>{footer.copyright}</span>
                  {footer.rera ? <span>RERA: {footer.rera}</span> : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {editing === "header" ? (
            <>
              <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)", padding: "12px 0 6px" }}>Menu links</div>
                {menu.map((m, i) => (
                  <div key={`${i}-${m}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
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
                    <button type="button" onClick={() => patchHeader({ menu: menu.filter((_, idx) => idx !== i) })} style={{ background: "none", border: "none", color: "var(--ps-muted)", cursor: "pointer", display: "inline-flex" }}>
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
                    <Toggle on={header.sticky} onChange={(v) => patchHeader({ sticky: v })} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>Transparent over hero</span>
                    <Toggle on={header.transparent} onChange={(v) => patchHeader({ transparent: v })} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>Show top bar</span>
                    <Toggle on={header.showTopbar} onChange={(v) => patchHeader({ showTopbar: v })} />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Style</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(["light", "dark", "glass"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => patchHeader({ variant: v, transparent: false })}
                          style={{ flex: 1, padding: "8px", borderRadius: 9, border: header.variant === v && !header.transparent ? "1.5px solid var(--ps-primary)" : "1px solid var(--ps-line-strong)", background: header.variant === v && !header.transparent ? "var(--ps-primary-soft)" : "#fff", color: "var(--ps-slate)", fontSize: 12, fontWeight: 700, textTransform: "capitalize", cursor: "pointer" }}
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
                    <TextField value={header.cta} onChange={(v) => patchHeader({ cta: v })} />
                  </FieldRow>
                  <FieldRow label="Button link">
                    <TextField value={header.ctaLink} onChange={(v) => patchHeader({ ctaLink: v })} placeholder="#lead-form" />
                  </FieldRow>
                </Collapse>
              </div>

              <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
                <Collapse title="Floating icons" icon={<Phone size={14} />} defaultOpen>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>Show floating icons</span>
                    <Toggle on={header.floatEnabled ?? true} onChange={(v) => patchHeader({ floatEnabled: v })} />
                  </div>
                  <p style={{ fontSize: 12, color: "var(--ps-muted)", lineHeight: 1.55, margin: "0 0 8px" }}>
                    WhatsApp, Call, Enquire and Email stay pinned on the page. Numbers come from Brand Center and Forms.
                  </p>
                  {(
                    [
                      ["floatWhatsapp", "WhatsApp"],
                      ["floatCall", "Call"],
                      ["floatEnquire", "Enquire"],
                      ["floatEmail", "Email"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ps-slate)" }}>{label}</span>
                      <Toggle on={header[key] ?? true} onChange={(v) => patchHeader({ [key]: v })} />
                    </div>
                  ))}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Side</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(["right", "left"] as const).map((side) => (
                        <button
                          key={side}
                          type="button"
                          onClick={() => patchHeader({ floatSide: side })}
                          style={{ flex: 1, padding: "8px", borderRadius: 9, border: (header.floatSide ?? "right") === side ? "1.5px solid var(--ps-primary)" : "1px solid var(--ps-line-strong)", background: (header.floatSide ?? "right") === side ? "var(--ps-primary-soft)" : "#fff", color: "var(--ps-slate)", fontSize: 12, fontWeight: 700, textTransform: "capitalize", cursor: "pointer" }}
                        >
                          {side}
                        </button>
                      ))}
                    </div>
                  </div>
                </Collapse>
              </div>
            </>
          ) : (
            <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
              <Collapse title="Footer settings" icon={<Globe size={14} />} defaultOpen>
                <FieldRow label="RERA number">
                  <TextField value={footer.rera} onChange={(v) => patchFooter({ rera: v })} placeholder="PRM/KA/RERA/…" />
                </FieldRow>
                <FieldRow label="Copyright text">
                  <TextField value={footer.copyright} onChange={(v) => patchFooter({ copyright: v })} />
                </FieldRow>
                <p style={{ fontSize: 12, color: "var(--ps-muted)", lineHeight: 1.55, margin: "8px 0 0" }}>
                  Footer links match the header menu. Brand name, phone, email and socials come from Brand Center.
                </p>
              </Collapse>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
