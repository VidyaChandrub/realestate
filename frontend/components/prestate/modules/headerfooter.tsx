"use client";

import { useState } from "react";
import { Globe, ImagePlus, Link2, Menu, Monitor, Phone, Plus, Save, Smartphone, Tablet, Trash2 } from "lucide-react";
import type { Device, FooterDesignId, HeaderDesignId, LandingPageData, MenuLink, SiteConfig } from "@/lib/prestate/types";
import {
  FOOTER_DESIGNS,
  HEADER_DESIGNS,
  defaultFooterSettings,
  defaultFooterStyle,
  defaultHeaderSettings,
  defaultHeaderStyle,
} from "@/lib/prestate/chrome-presets";
import { ensureConfig, siteThemeStyle } from "@/lib/prestate/site-config";
import { ChromeFooter, ChromeHeader } from "@/components/prestate/builder/chrome-renderers";
import { ModuleHeader, SiteScopeBar } from "./shared";
import { FieldRow, TextField, Toggle, Btn, Collapse } from "@/components/prestate/ui";
import { MediaPicker } from "@/components/media-picker";

function slugHref(label: string): string {
  return `#${label.toLowerCase().replace(/\s+/g, "-")}`;
}

function DesignGrid({
  list,
  value,
  onChange,
}: {
  list: { id: string; name: string; desc: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, paddingTop: 4 }}>
      {list.map((d) => {
        const active = value === d.id;
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onChange(d.id)}
            title={d.desc}
            style={{
              textAlign: "left",
              padding: "12px 12px 11px",
              borderRadius: 12,
              border: active ? "1.5px solid var(--ps-primary)" : "1px solid var(--ps-line-strong)",
              background: active ? "var(--ps-primary-mist)" : "#fff",
              cursor: "pointer",
              boxShadow: active ? "0 6px 16px rgba(109,93,252,.14)" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: active ? "var(--ps-primary)" : "var(--ps-line-strong)", flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, fontWeight: 800, color: active ? "var(--ps-primary)" : "var(--ps-ink)" }}>{d.name}</span>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--ps-muted)", marginTop: 4, lineHeight: 1.45 }}>{d.desc}</div>
          </button>
        );
      })}
    </div>
  );
}

const DEVICES: { key: Device; icon: typeof Monitor; label: string }[] = [
  { key: "desktop", icon: Monitor, label: "Desktop" },
  { key: "tablet", icon: Tablet, label: "Tablet" },
  { key: "mobile", icon: Smartphone, label: "Mobile" },
];

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
  const patchHeaderSettings = (partial: Record<string, unknown>) =>
    patchHeader({ settings: { ...(header.settings ?? {}), ...partial } });
  const patchFooterSettings = (partial: Record<string, unknown>) =>
    patchFooter({ settings: { ...(footer.settings ?? {}), ...partial } });
  const [editing, setEditing] = useState<"header" | "footer">("header");
  const [device, setDevice] = useState<Device>("desktop");

  const links: MenuLink[] =
    Array.isArray(header.menuLinks) && header.menuLinks.length > 0
      ? header.menuLinks
      : (header.menu ?? []).map((label) => ({ label, href: slugHref(label) }));

  const setLinks = (next: MenuLink[]) => patchHeader({ menuLinks: next, menu: next.map((l) => l.label) });

  const setHeaderDesign = (id: string) =>
    onPatch((c) => ({
      ...c,
      header: {
        ...c.header,
        design: id as HeaderDesignId,
        settings: defaultHeaderSettings(id as HeaderDesignId),
        style: defaultHeaderStyle(id as HeaderDesignId),
      },
    }));

  const setFooterDesign = (id: string) =>
    onPatch((c) => ({
      ...c,
      footer: {
        ...c.footer,
        design: id as FooterDesignId,
        settings: defaultFooterSettings(id as FooterDesignId),
        style: defaultFooterStyle(id as FooterDesignId),
      },
    }));

  const footerSettings = footer.settings ?? {};
  const footerLinkList: MenuLink[] = Array.isArray(footerSettings.links) ? (footerSettings.links as MenuLink[]) : [];
  const copyrightValue = typeof footerSettings.copyrightText === "string" && footerSettings.copyrightText ? footerSettings.copyrightText : footer.copyright;
  const reraValue = typeof footerSettings.reraText === "string" && footerSettings.reraText ? footerSettings.reraText : footer.rera;
  const patchFooterText = (settingsKey: "copyrightText" | "reraText", rootKey: "copyright" | "rera", v: string) =>
    onPatch((c) => ({
      ...c,
      footer: {
        ...c.footer,
        settings: { ...(c.footer.settings ?? {}), [settingsKey]: v },
        [rootKey]: v,
      },
    }));

  return (
    <div style={{ overflowY: "auto", height: "100%", ...siteThemeStyle(brand) }}>
      <ModuleHeader
        title="Header & Footer"
        description={`Pick a reusable layout for “${site.name}”, edit its content here, then fine-tune styles by clicking the header or footer inside the builder canvas.`}
        actions={<Btn variant="primary" icon={<Save size={14} />} onClick={() => onToast(`Header & footer saved for ${site.name}`)}>Save</Btn>}
      />
      <SiteScopeBar pages={pages} activeId={site.id} />

      <div style={{ padding: "0 28px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#e9ebf2", fontSize: 11, fontWeight: 700, color: "var(--ps-muted)" }}>
              <Globe size={12} /> {site.domain || `/${site.slug}`}
              <span style={{ marginLeft: "auto", display: "inline-flex", gap: 4, background: "#fff", border: "1px solid var(--ps-line)", borderRadius: 8, padding: 3 }}>
                {DEVICES.map((dev) => (
                  <button
                    key={dev.key}
                    type="button"
                    title={dev.label}
                    onClick={() => setDevice(dev.key)}
                    style={{
                      width: 26,
                      height: 22,
                      border: "none",
                      borderRadius: 6,
                      background: device === dev.key ? "var(--ps-primary)" : "transparent",
                      color: device === dev.key ? "#fff" : "var(--ps-muted)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <dev.icon size={13} />
                  </button>
                ))}
              </span>
            </div>
            <div style={{ padding: 18, display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  width: device === "desktop" ? "100%" : device === "tablet" ? 620 : 348,
                  maxWidth: "100%",
                  background: "#fff",
                  borderRadius: device === "desktop" ? 12 : 18,
                  overflow: "hidden",
                  boxShadow: "0 18px 50px rgba(17,24,39,.16)",
                }}
              >
                <ChromeHeader header={header} brand={brand} device={device} live={false} />
                <div
                  style={{
                    minHeight: device === "mobile" ? 150 : 190,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 6,
                    background: "linear-gradient(180deg, #eef2ff, #f8fafc)",
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ps-muted)" }}>Page content</span>
                  <span style={{ fontSize: 10.5, color: "var(--ps-muted)", opacity: 0.7 }}>
                    {(HEADER_DESIGNS.find((d) => d.id === header.design)?.name ?? header.design)} · {(FOOTER_DESIGNS.find((d) => d.id === footer.design)?.name ?? footer.design)}
                  </span>
                </div>
                <ChromeFooter footer={footer} header={header} brand={brand} device={device} live={false} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {editing === "header" ? (
            <>
              <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)", padding: "12px 0 2px" }}>Layout design</div>
                <p style={{ fontSize: 11.5, color: "var(--ps-muted)", lineHeight: 1.5, margin: "2px 0 6px" }}>
                  Switching design resets its content knobs — each template keeps its own choice.
                </p>
                <DesignGrid list={HEADER_DESIGNS} value={header.design ?? "classic"} onChange={setHeaderDesign} />
              </div>

              <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
                <Collapse title="Logo & brand" icon={<ImagePlus size={14} />} defaultOpen>
                  <FieldRow label="Logo image">
                    <MediaPicker
                      kind="image"
                      label="Upload or paste a URL"
                      value={String((header.settings as Record<string, unknown>)?.logoUrl ?? "")}
                      onChange={(v) => patchHeaderSettings({ logoUrl: v })}
                    />
                  </FieldRow>
                  <p style={{ fontSize: 11.5, color: "var(--ps-muted)", lineHeight: 1.5, margin: "0 0 6px" }}>
                    Leave empty to fall back to the Brand Center logo. Size and radius are editable in the builder canvas.
                  </p>
                </Collapse>
              </div>

              <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)", padding: "12px 0 6px" }}>Menu links</div>
                {links.map((l, i) => (
                  <div key={`${i}-${l.label}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0" }}>
                    <input
                      className="ps-input"
                      value={l.label}
                      placeholder="Label"
                      onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                      style={{ flex: 1, minWidth: 0 }}
                    />
                    <input
                      className="ps-input"
                      value={l.href}
                      placeholder="#section"
                      onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))}
                      style={{ flex: 1, minWidth: 0, fontFamily: "monospace", fontSize: 11.5 }}
                    />
                    <button
                      type="button"
                      onClick={() => setLinks(links.filter((_, idx) => idx !== i))}
                      style={{ background: "none", border: "none", color: "var(--ps-muted)", cursor: "pointer", display: "inline-flex" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setLinks([...links, { label: "New link", href: "#" }])}
                  style={{ width: "100%", marginTop: 6, padding: "8px", borderRadius: 9, border: "1px dashed var(--ps-primary)", background: "var(--ps-primary-mist)", color: "var(--ps-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
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
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Base palette</div>
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

              <FloatingIconsCard header={header} patchHeader={patchHeader} />
            </>
          ) : (
            <>
              <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)", padding: "12px 0 2px" }}>Layout design</div>
                <p style={{ fontSize: 11.5, color: "var(--ps-muted)", lineHeight: 1.5, margin: "2px 0 6px" }}>
                  Switching design resets its content knobs — each template keeps its own choice.
                </p>
                <DesignGrid list={FOOTER_DESIGNS} value={footer.design ?? "columns"} onChange={setFooterDesign} />
              </div>

              <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
                <Collapse title="Logo & link lists" icon={<Link2 size={14} />} defaultOpen>
                  <FieldRow label="Footer logo">
                    <MediaPicker
                      kind="image"
                      label="Upload or paste a URL"
                      value={String(footerSettings.logoUrl ?? "")}
                      onChange={(v) => patchFooterSettings({ logoUrl: v })}
                    />
                  </FieldRow>
                  <p style={{ fontSize: 11.5, color: "var(--ps-muted)", lineHeight: 1.5, margin: "0 0 10px" }}>
                    Leave empty to reuse the Brand Center logo.
                  </p>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ps-muted)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Custom link list</div>
                  {footerLinkList.map((l, i) => (
                    <div key={`${i}-${l.label}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                      <input
                        className="ps-input"
                        value={l.label}
                        placeholder="Label"
                        onChange={(e) => patchFooterSettings({ links: footerLinkList.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                        style={{ flex: 1, minWidth: 0 }}
                      />
                      <input
                        className="ps-input"
                        value={l.href}
                        placeholder="#section"
                        onChange={(e) => patchFooterSettings({ links: footerLinkList.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)) })}
                        style={{ flex: 1, minWidth: 0, fontFamily: "monospace", fontSize: 11.5 }}
                      />
                      <button
                        type="button"
                        onClick={() => patchFooterSettings({ links: footerLinkList.filter((_, idx) => idx !== i) })}
                        style={{ background: "none", border: "none", color: "var(--ps-muted)", cursor: "pointer", display: "inline-flex" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => patchFooterSettings({ links: [...footerLinkList, { label: "New link", href: "#" }] })}
                    style={{ width: "100%", marginTop: 6, padding: "8px", borderRadius: 9, border: "1px dashed var(--ps-primary)", background: "var(--ps-primary-mist)", color: "var(--ps-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <Plus size={14} /> Add footer link
                  </button>
                  <p style={{ fontSize: 11.5, color: "var(--ps-muted)", lineHeight: 1.5, margin: "8px 0 0" }}>
                    When this list is empty the footer reuses the header menu links — fill it to give the footer its own navigation.
                  </p>
                </Collapse>
              </div>

              <div className="ps-card" style={{ borderRadius: 14, padding: "6px 20px 18px" }}>
                <Collapse title="Footer settings" icon={<Globe size={14} />} defaultOpen>
                  <FieldRow label="Copyright text">
                    <TextField value={copyrightValue} onChange={(v) => patchFooterText("copyrightText", "copyright", v)} />
                  </FieldRow>
                  <FieldRow label="RERA number">
                    <TextField value={reraValue} onChange={(v) => patchFooterText("reraText", "rera", v)} placeholder="PRM/KA/RERA/…" />
                  </FieldRow>
                  <p style={{ fontSize: 12, color: "var(--ps-muted)", lineHeight: 1.55, margin: "8px 0 0" }}>
                    Links match the header menu. Brand name, phone, email and socials come from Brand Center. Colors, fonts and spacing are editable by clicking the footer in the builder canvas.
                  </p>
                </Collapse>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FloatingIconsCard({
  header,
  patchHeader,
}: {
  header: SiteConfig["header"];
  patchHeader: (partial: Partial<SiteConfig["header"]>) => void;
}) {
  return (
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
  );
}
