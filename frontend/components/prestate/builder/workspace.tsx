"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as React from "react";
import { ArrowRight, CornerDownLeft, Search, SlidersHorizontal, LayoutGrid } from "lucide-react";
import type { Device, FooterDesignId, HeaderDesignId, LandingPageData, MenuLink, SectionInstance, SectionStyle, SiteConfig } from "@/lib/prestate/types";
import {
  CHROME_FOOTER_ID,
  CHROME_HEADER_ID,
  defaultFooterSettings,
  defaultFooterStyle,
  defaultHeaderSettings,
  defaultHeaderStyle,
  labelsFromLinks,
} from "@/lib/prestate/chrome-presets";
import { buildTemplateSections, WIDGETS } from "@/lib/prestate/data";
import { buildThankYouSections } from "@/lib/prestate/page-templates";
import type { DesignBundle } from "./canvas";
import { buildDesignCss, effectiveTypography, ensureDesignSystem, loadFonts } from "@/lib/prestate/design-system";
import { findSection, insertChild, isStructural, patchSection, placeColumn } from "@/lib/prestate/tree";
import { ensureConfig } from "@/lib/prestate/site-config";
import { WidgetsPanel } from "./widgets-panel";
import { Canvas } from "./canvas";
import { SettingsPanel } from "./settings-panel";

export interface BuilderApi {
  undo: () => void;
  redo: () => void;
  save: () => void;
  preview: () => void;
  publish: () => void;
  unpublish: () => void;
}

interface EditorState {
  sections: SectionInstance[];
  history: SectionInstance[][];
  future: SectionInstance[][];
  selectedId: string | null;
}

function seedSections(page: LandingPageData): SectionInstance[] {
  if (page.sections.length > 0) {
    return JSON.parse(JSON.stringify(page.sections)) as SectionInstance[];
  }
  return page.pageType === "thank-you" ? buildThankYouSections() : buildTemplateSections(page.template);
}

export function BuilderWorkspace({
  page,
  device,
  setDevice,
  apiRef,
  onCapabilities,
  onToast,
  onPersist,
  onPatchConfig,
  onOpenLocalPreview,
}: {
  page: LandingPageData;
  device: Device;
  setDevice: (d: Device) => void;
  apiRef: React.MutableRefObject<BuilderApi | null>;
  onCapabilities: (c: { canUndo: boolean; canRedo: boolean }) => void;
  onToast: (msg: string) => void;
  onPersist: (sections: SectionInstance[], status?: LandingPageData["status"]) => void;
  onPatchConfig: (recipe: (c: SiteConfig) => SiteConfig) => void;
  onOpenLocalPreview: () => void;
}) {
  const [state, setState] = useState<EditorState>(() => ({
    sections: seedSections(page),
    history: [],
    future: [],
    selectedId: "sticky-cta",
  }));
  const [widgetsOpen, setWidgetsOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [quickOpen, setQuickOpen] = useState(false);
  const [vp, setVp] = useState(1400);

  // Design system: typography tokens + uploaded fonts → stylesheet for canvas.
  const design = useMemo<{ css: string; bundle: DesignBundle }>(() => {
    const cfg = ensureConfig(page);
    void ensureDesignSystem(cfg); // normalises stored state
    const { typography } = effectiveTypography(cfg);
    const fonts = loadFonts();
    return {
      css: buildDesignCss({ scopeClass: "ps-typo-scope", typography, fonts }),
      bundle: { tokens: typography, fonts },
    };
  }, [page]);

  const { sections, history, future, selectedId } = state;

  const chromeSection: SectionInstance | null = (() => {
    if (selectedId === CHROME_HEADER_ID) {
      const cfg = ensureConfig(page);
      return {
        id: CHROME_HEADER_ID,
        type: "header",
        label: "Header",
        icon: "PanelsTopLeft",
        hidden: false,
        settings: {
          design: cfg.header.design,
          ...(Array.isArray(cfg.header.menuLinks) ? { menuLinks: cfg.header.menuLinks } : {}),
          ...(cfg.header.settings ?? {}),
        },
        style: cfg.header.style ?? { colors: {}, typography: {}, spacing: {}, layout: {}, responsive: {} },
      };
    }
    if (selectedId === CHROME_FOOTER_ID) {
      const cfg = ensureConfig(page);
      return {
        id: CHROME_FOOTER_ID,
        type: "footer",
        label: "Footer",
        icon: "PanelBottom",
        hidden: false,
        settings: {
          design: cfg.footer.design,
          ...(cfg.footer.settings ?? {}),
        },
        style: cfg.footer.style ?? { colors: {}, typography: {}, spacing: {}, layout: {}, responsive: {} },
      };
    }
    return null;
  })();

  const selected = chromeSection ?? (selectedId ? findSection(sections, selectedId)?.node ?? null : null);
  const dockWidgets = vp >= 900;
  const dockInspector = vp >= 1180;

  useEffect(() => {
    const sync = () => setVp(window.innerWidth);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    const w = window.innerWidth;
    if (w < 900) setWidgetsOpen(false);
    if (w < 1180) setInspectorOpen(false);
  }, []);

  useEffect(() => {
    setState({
      sections: seedSections(page),
      history: [],
      future: [],
      selectedId: null,
    });
  }, [page.id]);

  const persistTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (persistTimer.current) window.clearTimeout(persistTimer.current);
  }, []);

  const mutate = useCallback((patch: (prev: SectionInstance[]) => SectionInstance[]) => {
    setState((prev) => {
      const sections = patch(prev.sections);
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
      persistTimer.current = window.setTimeout(() => onPersist(sections), 350);
      return {
        sections,
        history: [...prev.history.slice(-49), prev.sections],
        future: [],
        selectedId: prev.selectedId,
      };
    });
  }, [onPersist]);

  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.history.length === 0) return prev;
      const last = prev.history[prev.history.length - 1];
      return {
        sections: last,
        history: prev.history.slice(0, -1),
        future: [prev.sections, ...prev.future].slice(0, 50),
        selectedId: null,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      return {
        sections: next,
        history: [...prev.history, prev.sections],
        future: prev.future.slice(1),
        selectedId: null,
      };
    });
  }, []);

  const saveDraft = useCallback(() => {
    onPersist(sections);
    onToast("Draft saved · all sections synced to workspace");
  }, [onToast, onPersist, sections]);

  const openPreview = useCallback(() => {
    onPersist(sections);
    onToast(page.domain ? `Opening local preview · assigned to ${page.domain}` : "Opening local preview — assign a domain from Pages");
    onOpenLocalPreview();
  }, [onPersist, sections, onOpenLocalPreview, onToast, page.domain]);

  const publish = useCallback(() => {
    onPersist(sections, "published");
    onToast(page.domain ? `Published · local preview + ${page.domain}` : "Published · open Preview for the local URL, then assign a domain");
  }, [onToast, onPersist, sections, page.domain]);

  const unpublish = useCallback(() => {
    onPersist(sections, "unpublished");
    onToast("Unpublished — page is no longer live");
  }, [onToast, onPersist, sections]);

  const handleSelect = useCallback(
    (id: string) => {
      if (id.startsWith("__template_")) {
        setState((prev) => ({ ...prev, selectedId: id.slice("__template_".length) }));
        onToast("Section saved as a reusable template");
        return;
      }
      setState((prev) => ({ ...prev, selectedId: id }));
      if (!dockInspector) setInspectorOpen(true);
    },
    [onToast, dockInspector],
  );

  useEffect(() => {
    apiRef.current = { undo, redo, save: saveDraft, preview: openPreview, publish, unpublish };
  }, [apiRef, undo, redo, saveDraft, openPreview, publish, unpublish]);

  useEffect(() => {
    onCapabilities({ canUndo: history.length > 0, canRedo: future.length > 0 });
  }, [history.length, future.length, onCapabilities]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (k === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (k === "s") {
        e.preventDefault();
        saveDraft();
      } else if (k === "k") {
        e.preventDefault();
        setQuickOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, saveDraft]);

  const addWidget = useCallback(
    (widgetId: string) => {
      const def = WIDGETS.find((w) => w.id === widgetId);
      if (!def) return;
      if (widgetId === "column") {
        let selectId = "";
        mutate((prev) => {
          const placed = placeColumn(prev, selectedId);
          selectId = placed.selectId;
          return placed.list;
        });
        setTimeout(() => setState((prev) => ({ ...prev, selectedId: selectId })), 40);
        return;
      }
      const section = def.make();
      mutate((prev) => {
        if (selected && isStructural(selected.type)) return insertChild(prev, selected.id, section);
        if (selectedId) {
          const ref = findSection(prev, selectedId);
          if (ref) return insertChild(prev, ref.parentId, section, ref.index + 1);
        }
        return insertChild(prev, null, section);
      });
      setTimeout(() => setState((prev) => ({ ...prev, selectedId: section.id })), 40);
    },
    [mutate, selected, selectedId],
  );

  const patchSelected = useCallback(
    (patch: Partial<SectionInstance>) => {
      if (!selectedId) return;
      const isHeader = selectedId === CHROME_HEADER_ID;
      const isFooter = selectedId === CHROME_FOOTER_ID;
      if ((isHeader || isFooter) && onPatchConfig) {
        onPatchConfig((c) => {
          if (isHeader) {
            const next: SiteConfig["header"] = { ...c.header };
            if (patch.style) next.style = { ...(next.style ?? {}), ...patch.style } as SectionStyle;
            if (patch.settings) {
              const { menuLinks, design, ...rest } = patch.settings as Record<string, unknown>;
              const designChanged = typeof design === "string" && design !== next.design;
              if (designChanged) {
                next.design = design as HeaderDesignId;
                next.settings = defaultHeaderSettings(next.design);
                next.style = defaultHeaderStyle(next.design);
              } else {
                next.settings = { ...(next.settings ?? {}), ...rest };
              }
              if (Array.isArray(menuLinks)) {
                next.menuLinks = menuLinks as MenuLink[];
                next.menu = labelsFromLinks(next.menuLinks);
              }
            }
            return { ...c, header: next };
          }
          const nextF: SiteConfig["footer"] = { ...c.footer };
          if (patch.style) nextF.style = { ...(nextF.style ?? {}), ...patch.style } as SectionStyle;
          if (patch.settings) {
            const { design, ...rest } = patch.settings as Record<string, unknown>;
            const designChanged = typeof design === "string" && design !== nextF.design;
            if (designChanged) {
              nextF.design = design as FooterDesignId;
              nextF.settings = defaultFooterSettings(nextF.design);
              nextF.style = defaultFooterStyle(nextF.design);
            } else {
              nextF.settings = { ...(nextF.settings ?? {}), ...rest };
            }
          }
          return { ...c, footer: nextF };
        });
        return;
      }
      mutate((prev) => patchSection(prev, selectedId, patch));
    },
    [mutate, selectedId, onPatchConfig],
  );

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0, overflow: "hidden", position: "relative" }}>
      {dockWidgets || widgetsOpen ? (
        <>
          {!dockWidgets ? <button type="button" className="ps-drawer-backdrop" aria-label="Close widgets" onClick={() => setWidgetsOpen(false)} /> : null}
          <div className={dockWidgets ? "ps-sidebar-col" : "ps-drawer-left"} style={{ width: dockWidgets ? (widgetsOpen ? 296 : 48) : 296, flexShrink: 0, transition: dockWidgets ? "width .18s ease" : undefined, zIndex: dockWidgets ? 1 : 420 }}>
            <WidgetsPanel open={dockWidgets ? widgetsOpen : true} onToggle={() => setWidgetsOpen((v) => !v)} onAddWidget={addWidget} />
          </div>
        </>
      ) : null}

      <Canvas
        sections={sections}
        selectedId={selectedId}
        device={device}
        onSelect={handleSelect}
        onMutate={mutate}
        design={design}
        theme={{
          primary: ensureConfig(page).brand.primary,
          accent: ensureConfig(page).brand.accent,
          font: ensureConfig(page).brand.bodyFont,
          headingFont: ensureConfig(page).brand.headingFont,
          name: ensureConfig(page).brand.name,
          phone: ensureConfig(page).brand.phone,
          logo: ensureConfig(page).brand.logo,
        }}
        form={ensureConfig(page).form}
        chrome={{
          header: ensureConfig(page).header,
          footer: ensureConfig(page).footer,
          brand: ensureConfig(page).brand,
        }}
        pageId={page.id}
      />

      {dockInspector || inspectorOpen ? (
        <>
          {!dockInspector ? <button type="button" className="ps-drawer-backdrop" aria-label="Close settings" onClick={() => setInspectorOpen(false)} /> : null}
          <div className={dockInspector ? "ps-sidebar-col" : "ps-drawer-right"} style={{ zIndex: dockInspector ? 1 : 430 }}>
            <SettingsPanel section={selected} device={device} setDevice={setDevice} onChange={patchSelected} typographyTokens={design.bundle.tokens} />
          </div>
        </>
      ) : null}

      <div className="ps-builder-fabs">
        {!dockWidgets ? (
          <button type="button" className="ps-fab" onClick={() => setWidgetsOpen((v) => !v)} title="Widgets">
            <LayoutGrid size={16} /> Widgets
          </button>
        ) : null}
        <button type="button" className="ps-fab" onClick={() => setQuickOpen(true)} title="Quick Add (Ctrl+K)">
          <Search size={15} /> Quick Add
          <kbd style={{ fontSize: 10, fontWeight: 800, opacity: 0.7 }}>Ctrl K</kbd>
        </button>
        {!dockInspector ? (
          <button type="button" className="ps-fab" onClick={() => setInspectorOpen((v) => !v)} title="Settings">
            <SlidersHorizontal size={16} /> Settings
          </button>
        ) : null}
      </div>

      {quickOpen ? <QuickAdd onClose={() => setQuickOpen(false)} onInsert={addWidget} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Add — Ctrl/Cmd+K palette. Type "form", "heading", "image"… and insert
// the widget at the current selection without leaving the keyboard.
// ---------------------------------------------------------------------------

function QuickAdd({
  onClose,
  onInsert,
}: {
  onClose: () => void;
  onInsert: (widgetId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const q = query.trim().toLowerCase();
  const results = WIDGETS.filter(
    (w) => !q || w.label.toLowerCase().includes(q) || w.desc.toLowerCase().includes(q) || w.group.toLowerCase().includes(q) || w.category.toLowerCase().includes(q),
  ).slice(0, 12);
  const safeActive = Math.min(active, Math.max(0, results.length - 1));

  const insert = (id: string) => {
    onInsert(id);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1600, background: "rgba(8,10,20,.55)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh", padding: "12vh 16px 16px" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((v) => Math.min(v + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((v) => Math.max(0, v - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const pick = results[safeActive];
            if (pick) insert(pick.id);
          } else if (e.key === "Escape") {
            onClose();
          }
        }}
        role="dialog"
        aria-label="Quick add widget"
        style={{ width: 560, maxWidth: "100%", background: "var(--ps-panel)", border: "1px solid var(--ps-line)", borderRadius: 16, boxShadow: "0 40px 90px rgba(8,10,20,.45)", overflow: "hidden" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "13px 16px", borderBottom: "1px solid var(--ps-line)" }}>
          <Search size={16} style={{ color: "var(--ps-muted)", flexShrink: 0 }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder='Type a widget… try "form", "heading", "image"'
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: "var(--ps-ink)", fontSize: 14.5, fontWeight: 600 }}
          />
          <kbd style={{ fontSize: 10, fontWeight: 800, background: "var(--ps-bg)", border: "1px solid var(--ps-line-strong)", borderRadius: 6, padding: "2px 6px", color: "var(--ps-muted)" }}>ESC</kbd>
        </div>
        <div style={{ maxHeight: 340, overflowY: "auto", padding: 8 }}>
          {results.length === 0 ? (
            <div style={{ padding: "22px 12px", textAlign: "center", color: "var(--ps-muted)", fontSize: 13 }}>No widgets match “{query}”.</div>
          ) : null}
          {results.map((w, i) => {
            const Icon = w.icon;
            return (
              <button
                key={w.id}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => insert(w.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  textAlign: "left",
                  padding: "9px 11px",
                  borderRadius: 10,
                  border: i === safeActive ? "1.5px solid var(--ps-primary)" : "1px solid transparent",
                  background: i === safeActive ? "var(--ps-primary-mist)" : "transparent",
                  cursor: "pointer",
                }}
              >
                <span style={{ width: 30, height: 30, borderRadius: 9, background: i === safeActive ? "var(--ps-primary-soft)" : "var(--ps-bg)", color: i === safeActive ? "var(--ps-primary)" : "var(--ps-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={15} />
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--ps-ink)" }}>{w.label}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--ps-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.category} · {w.desc}</span>
                </span>
                {i === safeActive ? <CornerDownLeft size={13} style={{ color: "var(--ps-primary)", flexShrink: 0 }} /> : <ArrowRight size={0} />}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center", padding: "9px 16px", borderTop: "1px solid var(--ps-line)", fontSize: 11, color: "var(--ps-muted)" }}>
          <span><strong>↑↓</strong> navigate</span>
          <span><strong>Enter</strong> insert at selection</span>
          <span style={{ marginLeft: "auto", fontWeight: 700, color: "var(--ps-primary)" }}>{results.length} widgets</span>
        </div>
      </div>
    </div>
  );
}
