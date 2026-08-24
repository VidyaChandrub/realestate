"use client";

import { useMemo, useState } from "react";
import type * as React from "react";import { Copy, Globe, Trash2, Type as TypeIcon, Upload } from "lucide-react";
import type { LandingPageData, SiteConfig } from "@/lib/prestate/types";
import type {
  FontDef,
  GlobalStyleSet,
  TemplateTypography,
  TypeKey,
  TypeToken,
} from "@/lib/prestate/design-system";
import {
  defaultTypography,
  effectiveTypography,
  ensureDesignSystem,
  fontOptions,
  loadFonts,
  loadGlobalSets,
  saveFonts,
  saveGlobalSets,
} from "@/lib/prestate/design-system";
import { uid } from "@/lib/prestate/data";
import { ensureConfig } from "@/lib/prestate/site-config";
import { ModuleHeader, SiteScopeBar } from "./shared";
import { Btn, Chip, Collapse, ColorField, FieldRow, LengthInput, SelectField, SliderField, TabBar, TextField, Toggle } from "@/components/prestate/ui";
import { Icon } from "@/components/icons";

const TYPE_META: { key: TypeKey; label: string; hint: string; isParagraph?: boolean }[] = [
  { key: "h1", label: "H1", hint: "Hero / page titles" },
  { key: "h2", label: "H2", hint: "Section headings" },
  { key: "h3", label: "H3", hint: "Sub-headings" },
  { key: "h4", label: "H4", hint: "Card titles" },
  { key: "h5", label: "H5", hint: "Minor headings" },
  { key: "h6", label: "H6", hint: "Eyebrows / labels" },
  { key: "p", label: "Paragraph (P)", hint: "Body copy & rich text", isParagraph: true },
];

type Breakpoint = "desktop" | "tablet" | "mobile";

export function TypographyModule({
  site,
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
  const eff = effectiveTypography(cfg);
  const [deviceTab, setDeviceTab] = useState<Breakpoint>("desktop");
  const [fontsVersion, setFontsVersion] = useState(0);
  const fonts = useMemo(() => {
    void fontsVersion;
    return loadFonts();
  }, [fontsVersion]);
  const [globalSets, setGlobalSets] = useState<GlobalStyleSet[]>(() => loadGlobalSets());

  const isGlobal = eff.isGlobal && !!eff.set;

  /** Persist typography — to the shared global set or this template's config. */
  const writeTypography = (next: TemplateTypography) => {
    if (isGlobal && eff.set) {
      const sets = loadGlobalSets().map((s) => (s.id === eff.set?.id ? { ...s, typography: next, updated: "Just now" } : s));
      saveGlobalSets(sets);
      setGlobalSets(sets);
      onPatch((c) => ({ ...c }));
      onToast(`Saved to global set “${eff.set.name}” — all linked templates update`);
      return;
    }
    onPatch((c) => ({ ...c, designSystem: { ...ensureDesignSystem(c), scope: c.designSystem?.scope === "global" ? "global" : "template", globalSetId: c.designSystem?.globalSetId, typography: next } }));
  };

  const bump = () => onPatch((c) => ({ ...c }));

  const switchScope = (scope: "template" | "global") => {
    if (scope === eff.state.scope) return;
    let sets = loadGlobalSets();
    let gid: string | undefined = eff.state.globalSetId;
    if (scope === "global") {
      if (!gid || !sets.some((s) => s.id === gid)) {
        if (!sets.length) {
          const fresh: GlobalStyleSet = { id: uid("gset"), name: "Shared Set 1", typography: defaultTypography(), updated: "Just now" };
          sets = [fresh];
          saveGlobalSets(sets);
          setGlobalSets(sets);
        }
        gid = sets[0].id;
      }
    }
    onPatch((c) => ({ ...c, designSystem: { ...ensureDesignSystem(c), scope, globalSetId: gid } }));
    onToast(scope === "global" ? "Now editing the shared global set" : "Now editing template-specific typography");
  };

  const createGlobalSetFromTemplate = () => {
    const sets = loadGlobalSets();
    const fresh: GlobalStyleSet = { id: uid("gset"), name: `Shared Set ${sets.length + 1}`, typography: eff.typography, updated: "Just now" };
    const next = [...sets, fresh];
    saveGlobalSets(next);
    setGlobalSets(next);
    onPatch((c) => ({ ...c, designSystem: { ...ensureDesignSystem(c), scope: "global", globalSetId: fresh.id } }));
    onToast(`Created “${fresh.name}” from this template's typography`);
  };

  // ------------------------------ Font manager ------------------------------

  const addFontFiles = async (list: FileList | null) => {
    for (const file of Array.from(list ?? [])) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const format: FontDef["format"] | null =
        ext === "woff2" ? "woff2" : ext === "woff" ? "woff" : ext === "ttf" ? "truetype" : ext === "otf" ? "opentype" : null;
      if (!format) {
        onToast(`${file.name} — use WOFF, WOFF2, TTF or OTF`);
        continue;
      }
      if (file.size > 1_500_000) {
        onToast(`${file.name} is over 1.5 MB — try a subsetted WOFF2`);
        continue;
      }
      const src = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
      });
      if (!src) {
        onToast(`Could not read ${file.name}`);
        continue;
      }
      const family = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim() || "Custom Font";
      const next = [...loadFonts(), { id: uid("font"), family, src, format, weight: 400, enabled: true }];
      saveFonts(next);
      bump();
      onToast(`Uploaded “${family}” — available in every font dropdown`);
    }
    setFontsVersion((v) => v + 1);
  };

  const patchFont = (id: string, patch: Partial<FontDef>) => {
    saveFonts(loadFonts().map((f) => (f.id === id ? { ...f, ...patch } : f)));
    setFontsVersion((v) => v + 1);
    bump();
  };

  const deleteFont = (id: string) => {
    saveFonts(loadFonts().filter((f) => f.id !== id));
    setFontsVersion((v) => v + 1);
    bump();
    onToast("Font removed");
  };

  const opts = fontOptions(fonts);

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <ModuleHeader
        title="Typography & Custom Fonts"
        description={`Design-system tokens for H1–P. ${isGlobal ? `Editing the shared set “${eff.set?.name}” — every template using it updates together.` : "Editing template-specific typography — other templates are unaffected."}`}
        actions={
          !isGlobal && eff.state.scope === "template" ? (
            <Btn variant="outline" icon={<Copy size={14} />} onClick={createGlobalSetFromTemplate}>Save as global set</Btn>
          ) : null
        }
      />
      <SiteScopeBar pages={[site]} activeId={site.id} />

      {/* Scope selector */}
      <div style={{ padding: "0 28px 16px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: "var(--ps-bg)", borderRadius: 10, padding: 3, border: "1px solid var(--ps-line)" }}>
          {(
            [
              { key: "template", label: "Template-specific", icon: <TypeIcon size={13} /> },
              { key: "global", label: "Global / shared", icon: <Globe size={13} /> },
            ] as const
          ).map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => switchScope(s.key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 12.5,
                fontWeight: 700,
                background: eff.state.scope === s.key ? "var(--ps-panel-raised)" : "transparent",
                color: eff.state.scope === s.key ? "var(--ps-primary)" : "var(--ps-muted)",
                boxShadow: eff.state.scope === s.key ? "0 1px 4px rgba(17,24,39,.25)" : "none",
              }}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
        {eff.state.scope === "global" ? (
          <>
            <div style={{ width: 240 }}>
              <SelectField
                value={eff.state.globalSetId ?? ""}
                onChange={(id) => onPatch((c) => ({ ...c, designSystem: { ...ensureDesignSystem(c), scope: "global", globalSetId: id || undefined } }))}
                options={globalSets.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Choose a set"
              />
            </div>
            <Chip tone="primary">{globalSets.length} shared set{globalSets.length === 1 ? "" : "s"}</Chip>
          </>
        ) : (
          <span style={{ fontSize: 12, color: "var(--ps-muted)" }}>Changes apply only to “{cfg.brand.name}”.</span>
        )}
      </div>

      {/* Type scale editor */}
      <div style={{ padding: "0 28px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ maxWidth: 420 }}>
          <TabBar
            tabs={[
              { key: "desktop", label: "🖥 Desktop" },
              { key: "tablet", label: "<Icon name="phone" size={14} /> Tablet" },
              { key: "mobile", label: "<Icon name="phone" size={14} /> Mobile" },
            ]}
            active={deviceTab}
            onChange={(k) => setDeviceTab(k as Breakpoint)}
          />
        </div>

        {TYPE_META.map(({ key, label, hint }) => {
          const resp = eff.typography[key];
          const bpToken: TypeToken = deviceTab === "desktop" ? resp.desktop : ((resp[deviceTab] ?? {}) as TypeToken);
          const sizePreview = typeof resp.desktop.fontSize === "number" ? `${resp.desktop.fontSize}px` : String(resp.desktop.fontSize ?? "—");
          const setToken = (patch: Partial<TypeToken> & { paragraphSpacing?: number | string }) => {
            const next: TemplateTypography = JSON.parse(JSON.stringify(eff.typography));
            next[key][deviceTab] = { ...(next[key][deviceTab] ?? {}), ...patch } as TypeToken;
            writeTypography(next);
          };
          return (
            <div key={key} style={{ border: "1px solid var(--ps-line)", borderRadius: 14, background: "var(--ps-panel-raised)", padding: "14px 18px 6px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: deviceTab === "desktop" ? sizeFontSize(key) : undefined, fontWeight: 800, letterSpacing: -0.3 }}>
                  {String(bpToken.textTransform === "uppercase" ? label.toUpperCase() : label)}
                  {!bpToken.textTransform || bpToken.textTransform === "none" ? "" : ""}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--ps-muted)" }}>{hint}</span>
                <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6 }}>
                  {deviceTab !== "desktop" ? <Chip tone="info">{deviceTab}</Chip> : <Chip tone="primary">Desktop</Chip>}
                  <Chip>{sizePreview}</Chip>
                </span>
              </div>
              <div className="ps-typo-grid">
                <FieldRow label="Font family">
                  <SelectField value={bpToken.fontFamily ?? ""} onChange={(v) => setToken({ fontFamily: v || undefined })} options={[{ value: "", label: "Inherit theme" }, ...opts]} />
                </FieldRow>
                <FieldRow label="Font size" hint="px, rem or % — e.g. 3rem">
                  <LengthInput value={bpToken.fontSize ?? ""} onChange={(v) => setToken({ fontSize: v === "" ? undefined : v })} min={8} max={140} />
                </FieldRow>
                <FieldRow label="Weight">
                  <SliderField value={Number(bpToken.fontWeight ?? 400)} onChange={(v) => setToken({ fontWeight: v })} min={300} max={900} step={100} />
                </FieldRow>
                <FieldRow label="Line height">
                  <SliderField value={Number(bpToken.lineHeight ?? 1.15)} onChange={(v) => setToken({ lineHeight: v })} min={0.9} max={2.4} step={0.05} />
                </FieldRow>
                <FieldRow label="Letter spacing">
                  <SliderField value={Number(bpToken.letterSpacing ?? 0)} onChange={(v) => setToken({ letterSpacing: v })} min={-3} max={8} step={0.5} />
                </FieldRow>
                <FieldRow label="Text transform">
                  <SelectField
                    value={bpToken.textTransform ?? "none"}
                    onChange={(v) => setToken({ textTransform: v })}
                    options={[
                      { value: "none", label: "None" },
                      { value: "uppercase", label: "Uppercase" },
                      { value: "capitalize", label: "Capitalize" },
                      { value: "lowercase", label: "Lowercase" },
                    ]}
                  />
                </FieldRow>
                <FieldRow label="Text colour">
                  <ColorField value={bpToken.textColor ?? ""} onChange={(v) => setToken({ textColor: v })} />
                </FieldRow>
                {key === "p" ? (
                  <FieldRow label="Paragraph spacing">
                    <LengthInput value={(bpToken as TypeToken & { paragraphSpacing?: number | string }).paragraphSpacing ?? ""} onChange={(v) => setToken({ paragraphSpacing: v === "" ? undefined : v })} min={0} max={64} />
                  </FieldRow>
                ) : null}
              </div>
              {/* Live preview line */}
              <div style={{ borderTop: "1px dashed var(--ps-line)", margin: "4px -18px 0", padding: "12px 18px 14px", color: bpToken.textColor || "inherit" }}>
                <span
                  style={{
                    fontFamily: bpToken.fontFamily || "inherit",
                    fontSize: typeof bpToken.fontSize === "number" ? Math.min(34, bpToken.fontSize) : 22,
                    fontWeight: Number(bpToken.fontWeight ?? (key === "p" ? 400 : 800)),
                    lineHeight: Number(bpToken.lineHeight ?? 1.2),
                    letterSpacing: Number(bpToken.letterSpacing ?? 0),
                    textTransform: bpToken.textTransform || "none",
                  }}
                >
                  {key === "p"
                    ? "Premium 3 & 4 BHK residences with resort amenities."
                    : "Where the Skyline Becomes Your Address"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Font manager */}
      <div style={{ padding: "0 28px 56px" }}>
        <Collapse title={<span>Custom Font Manager ({fonts.length})</span>} icon={<Upload size={14} />} defaultOpen>
          <p style={{ fontSize: 12.5, color: "var(--ps-slate)", lineHeight: 1.65, margin: "0 0 12px" }}>
            Upload WOFF, WOFF2, TTF or OTF files (max 1.5 MB each). Uploaded fonts appear in every Font Family dropdown — headings, body, the Text Editor and header/footer chrome — and load automatically on published pages via deduped @font-face rules.
          </p>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 14px",
              borderRadius: 10,
              border: "1px dashed var(--ps-primary)",
              background: "var(--ps-primary-mist)",
              color: "var(--ps-primary)",
              fontSize: 12.5,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            <Upload size={14} /> Upload font files
            <input
              type="file"
              accept=".woff,.woff2,.ttf,.otf"
              multiple
              hidden
              onChange={(e) => {
                void addFontFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {fonts.length === 0 ? (
              <div style={{ padding: 18, textAlign: "center", color: "var(--ps-muted)", fontSize: 12.5, border: "1px dashed var(--ps-line)", borderRadius: 10 }}>No custom fonts yet.</div>
            ) : null}
            {fonts.map((f) => (
              <div key={f.id} style={{ display: "grid", gridTemplateColumns: "64px minmax(140px,1fr) 120px auto auto auto", gap: 10, alignItems: "center", border: "1px solid var(--ps-line)", borderRadius: 11, padding: "9px 12px", opacity: f.enabled === false ? 0.5 : 1 }}>
                <span style={{ height: 44, borderRadius: 9, background: "var(--ps-bg)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 800, fontFamily: `"${f.family}"` }}>
                  Ag
                </span>
                <TextField value={f.family} onChange={(v) => patchFont(f.id, { family: v })} placeholder="Font name" />
                <SelectField
                  value={String(f.weight ?? 400)}
                  onChange={(v) => patchFont(f.id, { weight: Number(v) })}
                  options={[300, 400, 500, 600, 700, 800].map((w) => ({ value: String(w), label: String(w) }))}
                />
                <code style={{ fontSize: 10.5, color: "var(--ps-muted)" }}>.{f.format === "truetype" ? "ttf" : f.format === "opentype" ? "otf" : f.format}</code>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11.5, fontWeight: 600, color: "var(--ps-slate)" }}>
                  <Toggle on={f.enabled !== false} onChange={(v) => patchFont(f.id, { enabled: v })} size="sm" />
                  {f.enabled !== false ? "On" : "Off"}
                </span>
                <Btn variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => deleteFont(f.id)}>Delete</Btn>
              </div>
            ))}
          </div>
        </Collapse>
      </div>
    </div>
  );
}

function sizeFontSize(key: TypeKey): number {
  switch (key) {
    case "h1":
      return 26;
    case "h2":
      return 22;
    case "h3":
      return 19;
    default:
      return 17;
  }
}