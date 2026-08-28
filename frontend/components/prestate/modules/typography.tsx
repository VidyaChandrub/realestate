"use client";

import { useEffect, useMemo, useState } from "react";
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
  createGlobalSet,
  defaultTypography,
  deleteGlobalSet,
  effectiveTypography,
  ensureDesignSystem,
  fontOptions,
  loadFonts,
  loadGlobalSets,
  saveFonts,
  updateGlobalSet,
} from "@/lib/prestate/design-system";
import type { Resource } from "@/lib/prestate/store";
import { uid } from "@/lib/prestate/data";
import { ensureConfig } from "@/lib/prestate/site-config";
import { ModuleHeader, SiteScopeBar } from "./shared";
import { Btn, Chip, Collapse, ColorField, FieldRow, LengthInput, SelectField, SliderField, TabBar, TextField, Toggle } from "@/components/prestate/ui";
import { ConfirmModal } from "@/components/ui/confirm-modal";
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
  resource,
}: {
  site: LandingPageData;
  pages: LandingPageData[];
  onSelectSite: (id: string) => void;
  onPatch: (fn: (c: SiteConfig) => SiteConfig) => void;
  onToast: (m: string) => void;
  /** Which typography-sets endpoint this session hits — org sees platform +
   *  its own sets; Super Admin sees platform sets only, and can edit them
   *  (an org can't — platform sets render read-only there). */
  resource: Resource;
}) {
  const cfg = ensureConfig(site);
  const [deviceTab, setDeviceTab] = useState<Breakpoint>("desktop");
  const [fontsVersion, setFontsVersion] = useState(0);
  const fonts = useMemo(() => {
    void fontsVersion;
    return loadFonts();
  }, [fontsVersion]);

  // Global sets are server-persisted now — fetched once per session/resource,
  // not read synchronously the way localStorage was. See design-system.ts's
  // effectiveTypography for why it now takes this as a parameter instead of
  // loading it internally.
  const [globalSets, setGlobalSets] = useState<GlobalStyleSet[]>([]);
  const [globalSetsLoaded, setGlobalSetsLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadGlobalSets(resource)
      .then((sets) => {
        if (cancelled) return;
        setGlobalSets(sets);
        setGlobalSetsLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setGlobalSetsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [resource]);

  const eff = effectiveTypography(cfg, globalSets);
  const isGlobal = eff.isGlobal && !!eff.set;
  // An org session can view and apply a platform set, but never edit or
  // delete it — enforced here for the UI and again server-side (PATCH/DELETE
  // reject it regardless of what this renders).
  const isReadOnlySet = isGlobal && eff.set?.scope === "platform" && resource === "landing-page";

  /** Persist typography — to the shared global set or this template's config. */
  const writeTypography = (next: TemplateTypography) => {
    if (isGlobal && eff.set) {
      if (isReadOnlySet) return;
      const setId = eff.set.id;
      // Optimistic: reflect immediately so sliders/inputs feel instant; the
      // debounced PATCH (see updateGlobalSet) catches up in the background.
      setGlobalSets((prev) => prev.map((s) => (s.id === setId ? { ...s, typography: next } : s)));
      onPatch((c) => ({ ...c }));
      updateGlobalSet(resource, setId, { typography: next })
        .then((updated) => {
          setGlobalSets((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        })
        .catch((err) => onToast(err instanceof Error ? err.message : "Couldn't save the shared set"));
      return;
    }
    onPatch((c) => ({ ...c, designSystem: { ...ensureDesignSystem(c), scope: c.designSystem?.scope === "global" ? "global" : "template", globalSetId: c.designSystem?.globalSetId, typography: next } }));
  };

  const bump = () => onPatch((c) => ({ ...c }));

  const switchScope = async (scope: "template" | "global") => {
    if (scope === eff.state.scope) return;
    let gid: string | undefined = eff.state.globalSetId;
    if (scope === "global") {
      if (!gid || !globalSets.some((s) => s.id === gid)) {
        if (!globalSets.length) {
          try {
            const fresh = await createGlobalSet(resource, { name: "Shared Set 1", typography: defaultTypography() });
            setGlobalSets((prev) => [...prev, fresh]);
            gid = fresh.id;
          } catch (err) {
            onToast(err instanceof Error ? err.message : "Couldn't create a shared set");
            return;
          }
        } else {
          gid = globalSets[0].id;
        }
      }
    }
    onPatch((c) => ({ ...c, designSystem: { ...ensureDesignSystem(c), scope, globalSetId: gid } }));
    onToast(scope === "global" ? "Now editing the shared global set" : "Now editing template-specific typography");
  };

  const createGlobalSetFromTemplate = async () => {
    try {
      const fresh = await createGlobalSet(resource, { name: `Shared Set ${globalSets.length + 1}`, typography: eff.typography });
      setGlobalSets((prev) => [...prev, fresh]);
      onPatch((c) => ({ ...c, designSystem: { ...ensureDesignSystem(c), scope: "global", globalSetId: fresh.id } }));
      onToast(`Created “${fresh.name}” from this template's typography`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Couldn't create the shared set");
    }
  };

  const renameGlobalSet = async (set: GlobalStyleSet) => {
    const name = window.prompt("Rename shared set", set.name);
    if (!name || !name.trim() || name.trim() === set.name) return;
    try {
      const updated = await updateGlobalSet(resource, set.id, { name: name.trim() });
      setGlobalSets((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      onToast(`Renamed to “${updated.name}”`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Couldn't rename the set");
    }
  };

  const [deleteSet, setDeleteSet] = useState<GlobalStyleSet | null>(null);
  const [deletingSet, setDeletingSet] = useState(false);
  const confirmDeleteGlobalSet = async () => {
    const set = deleteSet;
    if (!set) return;
    setDeletingSet(true);
    try {
      await deleteGlobalSet(resource, set.id);
      setGlobalSets((prev) => prev.filter((s) => s.id !== set.id));
      if (eff.state.globalSetId === set.id) {
        onPatch((c) => ({ ...c, designSystem: { ...ensureDesignSystem(c), scope: "template" } }));
      }
      onToast(`Deleted “${set.name}”`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Couldn't delete the set");
    } finally {
      setDeletingSet(false);
      setDeleteSet(null);
    }
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
      <SiteScopeBar pages={[site]} activeId={site.id} label={resource === "landing-page" ? "Editing this page" : "Editing this template"} />

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
              disabled={s.key === "global" && !globalSetsLoaded}
              onClick={() => void switchScope(s.key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                border: "none",
                borderRadius: 8,
                cursor: s.key === "global" && !globalSetsLoaded ? "not-allowed" : "pointer",
                opacity: s.key === "global" && !globalSetsLoaded ? 0.5 : 1,
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
                options={globalSets.map((s) => ({ value: s.id, label: s.scope === "platform" ? `${s.name} (Platform)` : s.name }))}
                placeholder="Choose a set"
              />
            </div>
            <Chip tone="primary">{globalSets.length} shared set{globalSets.length === 1 ? "" : "s"}</Chip>
            {eff.set ? (
              isReadOnlySet ? (
                <Chip tone="info">Platform set — read-only</Chip>
              ) : (
                <>
                  <Btn variant="outline" size="sm" onClick={() => void renameGlobalSet(eff.set!)}>Rename</Btn>
                  <Btn variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => setDeleteSet(eff.set!)}>Delete</Btn>
                </>
              )
            ) : null}
          </>
        ) : (
          <span style={{ fontSize: 12, color: "var(--ps-muted)" }}>Changes apply only to “{cfg.brand.name}”.</span>
        )}
      </div>

      {isReadOnlySet ? (
        <div style={{ margin: "0 28px 16px", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--ps-line)", background: "var(--ps-panel-raised)", fontSize: 12.5, color: "var(--ps-muted)" }}>
          This is a platform set created by Super Admin — it&apos;s applied here but can&apos;t be edited or deleted from an organisation. Switch to template-specific typography, or create your own shared set, to make changes.
        </div>
      ) : null}

      {/* Type scale editor */}
      <div style={{ padding: "0 28px 20px", display: "flex", flexDirection: "column", gap: 12, opacity: isReadOnlySet ? 0.6 : 1, pointerEvents: isReadOnlySet ? "none" : "auto" }}>
        <div style={{ maxWidth: 420 }}>
          <TabBar
            tabs={[
              { key: "desktop", label: " Desktop" },
              { key: "tablet", label: <><Icon name="phone" size={14} /> Tablet</> },
              { key: "mobile", label: <><Icon name="phone" size={14} /> Mobile</> },
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
            <div key={key} style={{ border: "1px solid var(--ps-line)", borderRadius: 14, background: "var(--ps-panel-raised)", padding: "14px 18px 14px" }}>
              {/* Card header */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: deviceTab === "desktop" ? sizeFontSize(key) : undefined, fontWeight: 800, letterSpacing: -0.3 }}>
                  {String(bpToken.textTransform === "uppercase" ? label.toUpperCase() : label)}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--ps-muted)" }}>{hint}</span>
                <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6 }}>
                  {deviceTab !== "desktop" ? <Chip tone="info">{deviceTab}</Chip> : <Chip tone="primary">Desktop</Chip>}
                  <Chip>{sizePreview}</Chip>
                </span>
              </div>

              {/* Two-column body: fields left, live preview right */}
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                {/* Fields column */}
                <div style={{ flex: "1 1 0", minWidth: 0 }}>
                  {/* KNOWN ISSUE: `opts` includes uploaded custom fonts (fontOptions()
                      below), and picking one here writes its family NAME into this
                      token — but the font FILE stays in prestate.fonts.v1
                      (browser-local, see design-system.ts). A global/platform set
                      is now shared across users, while fonts aren't: anyone
                      without that exact font uploaded in their own browser gets
                      a silent fallback font, no error. Resolves once fonts move
                      to object storage (out of scope here) — tracked as a known
                      issue, not fixed in this pass. */}
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

                {/* Live preview column */}
                <div style={{
                  flex: "0 0 220px",
                  minWidth: 0,
                  alignSelf: "stretch",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderLeft: "1px dashed var(--ps-line)",
                  paddingLeft: 20,
                  color: bpToken.textColor || "inherit",
                }}>
                  <span
                    style={{
                      fontFamily: bpToken.fontFamily || "inherit",
                      fontSize: typeof bpToken.fontSize === "number" ? Math.min(34, bpToken.fontSize) : 22,
                      fontWeight: Number(bpToken.fontWeight ?? (key === "p" ? 400 : 800)),
                      lineHeight: Number(bpToken.lineHeight ?? 1.2),
                      letterSpacing: Number(bpToken.letterSpacing ?? 0),
                      textTransform: bpToken.textTransform || "none",
                      wordBreak: "break-word",
                    }}
                  >
                    {key === "p"
                      ? "Premium 3 & 4 BHK residences with resort amenities."
                      : "Where the Skyline Becomes Your Address"}
                  </span>
                </div>
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
      <ConfirmModal
        open={deleteSet !== null}
        title="Delete shared typography set?"
        message={
          deleteSet
            ? `Templates using “${deleteSet.name}” will fall back to their own template-specific typography.`
            : undefined
        }
        confirmLabel="Delete set"
        destructive
        busy={deletingSet}
        onConfirm={() => void confirmDeleteGlobalSet()}
        onClose={() => setDeleteSet(null)}
      />
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