"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as React from "react";
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { ArrowRight, CornerDownLeft, Search, SlidersHorizontal, LayoutGrid, Layers, ListOrdered } from "lucide-react";
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
import { buildDesignCss, effectiveTypography, ensureDesignSystem, loadFonts, loadGlobalSets, type GlobalStyleSet } from "@/lib/prestate/design-system";
import type { Resource } from "@/lib/prestate/store";
import {
  cloneWithFreshIds,
  dropColumnOn,
  duplicateSection,
  findSection,
  insertChild,
  isDescendant,
  isStructural,
  newSectionId,
  patchSection,
  placeColumn,
  removeSection,
  reorderSection,
  toggleSectionFlag,
} from "@/lib/prestate/tree";
import { ensureConfig } from "@/lib/prestate/site-config";
import {
  loadSectionTemplates,
  migrateSections,
  saveSectionTemplates,
  type SavedSectionTemplate,
} from "@/lib/prestate/persist";
import { SAVED_WIDGET_PREFIX, savedWidgetStorageId, WidgetsPanel } from "./widgets-panel";
import { Canvas } from "./canvas";
import { SettingsPanel } from "./settings-panel";
import { SectionsNavigator } from "./sections-navigator";

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
    // Migrate legacy widget ids (merged library) so old pages keep editing.
    return migrateSections(JSON.parse(JSON.stringify(page.sections)) as SectionInstance[]);
  }
  return page.pageType === "thank-you" ? buildThankYouSections() : buildTemplateSections(page.template);
}

// Flatten every section id (including nested children) in render order so the
// sortable context spans the whole tree, not just the top level.
function collectSectionIds(list: SectionInstance[]): string[] {
  const out: string[] = [];
  const walk = (arr?: SectionInstance[]) => {
    for (const s of arr ?? []) {
      out.push(s.id);
      walk(s.children);
    }
  };
  walk(list);
  return out;
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
  resource = "template",
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
  /** Which typography-sets endpoint to fetch from — org vs platform sets. */
  resource?: Resource;
}) {
  // Global typography sets are server-persisted now — fetched once here
  // (not inside effectiveTypography, which must stay synchronous for the
  // canvas CSS useMemo below) and passed in. Empty while loading is fine:
  // the canvas just renders with template-scoped typography until this
  // resolves, same as any other async-data gap elsewhere in the builder.
  const [globalSets, setGlobalSets] = useState<GlobalStyleSet[]>([]);
  useEffect(() => {
    let cancelled = false;
    loadGlobalSets(resource).then((sets) => {
      if (!cancelled) setGlobalSets(sets);
    });
    return () => {
      cancelled = true;
    };
  }, [resource]);

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
  const [savedTemplates, setSavedTemplates] = useState<SavedSectionTemplate[]>(() => loadSectionTemplates());
  const [leftTab, setLeftTab] = useState<"widgets" | "layers">("layers");
  const [pendingInsertIndex, setPendingInsertIndex] = useState<number | null>(null);

  // Design system: typography tokens + uploaded fonts → stylesheet for canvas.
  const design = useMemo<{ css: string; bundle: DesignBundle }>(() => {
    const cfg = ensureConfig(page);
    void ensureDesignSystem(cfg); // normalises stored state
    const { typography } = effectiveTypography(cfg, globalSets);
    const fonts = loadFonts();
    return {
      css: buildDesignCss({ scopeClass: "ps-typo-scope", typography, fonts }),
      bundle: { tokens: typography, fonts },
    };
  }, [page, globalSets]);

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

  // Refs for flushing pending autosaves at any time (page switch, tab close).
  const sectionsRef = useRef(sections);
  const persistTimer = useRef<number | null>(null);
  const onPersistRef = useRef(onPersist);

  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);
  useEffect(() => {
    onPersistRef.current = onPersist;
  }, [onPersist]);

  useEffect(() => {
    // Switching pages: flush any pending autosave for the outgoing page first.
    if (persistTimer.current) {
      window.clearTimeout(persistTimer.current);
      persistTimer.current = null;
      onPersistRef.current(sectionsRef.current);
    }
    setState({
      sections: seedSections(page),
      history: [],
      future: [],
      selectedId: null,
    });
  }, [page.id]);

  useEffect(() => () => {
    if (persistTimer.current) window.clearTimeout(persistTimer.current);
  }, []);

  // Close/refresh mid-edit: flush synchronously so nothing is ever lost.
  useEffect(() => {
    const flush = () => {
      if (persistTimer.current && onPersistRef.current) {
        window.clearTimeout(persistTimer.current);
        persistTimer.current = null;
        onPersistRef.current(sectionsRef.current);
      }
    };
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, []);

  const mutate = useCallback((patch: (prev: SectionInstance[]) => SectionInstance[]) => {
    setState((prev) => {
      const nextSections = patch(prev.sections);
      const flush = () => {
        persistTimer.current = null;
        onPersistRef.current(nextSections);
      };
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
      persistTimer.current = window.setTimeout(flush, 350);
      return {
        sections: nextSections,
        history: [...prev.history.slice(-49), prev.sections],
        future: [],
        selectedId: prev.selectedId,
      };
    });
  }, []);

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
      // Legacy pseudo-ids from older "save as template" buttons — select the
      // real section instead of showing a dead toast.
      const realId = id.startsWith("__template_") ? id.slice("__template_".length) : id;
      setState((prev) => ({ ...prev, selectedId: realId }));
      if (!dockInspector) setInspectorOpen(true);
    },
    [dockInspector],
  );

  useEffect(() => {
    apiRef.current = { undo, redo, save: saveDraft, preview: openPreview, publish, unpublish };
  }, [apiRef, undo, redo, saveDraft, openPreview, publish, unpublish]);

  useEffect(() => {
    onCapabilities({ canUndo: history.length > 0, canRedo: future.length > 0 });
  }, [history.length, future.length, onCapabilities]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setState((prev) => ({ ...prev, selectedId: null }));
        return;
      }
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
      } else if (k === "b") {
        e.preventDefault();
        setWidgetsOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, saveDraft]);

  const addWidget = useCallback(
    (widgetId: string) => {
      // If inserted via Layers → Add between, honour the pending index first.
      if (pendingInsertIndex != null) {
        const idx = pendingInsertIndex;
        setPendingInsertIndex(null);
        if (widgetId.startsWith(SAVED_WIDGET_PREFIX)) {
          const tpl = loadSectionTemplates().find((t) => t.id === savedWidgetStorageId(widgetId));
          if (!tpl) return;
          const node = cloneWithFreshIds(tpl.data);
          mutate((prev) => insertChild(prev, null, node, idx));
          setTimeout(() => setState((prev) => ({ ...prev, selectedId: node.id })), 40);
          return;
        }
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
        mutate((prev) => insertChild(prev, null, section, idx));
        setTimeout(() => setState((prev) => ({ ...prev, selectedId: section.id })), 40);
        return;
      }

      if (widgetId.startsWith(SAVED_WIDGET_PREFIX)) {
        const tpl = loadSectionTemplates().find((t) => t.id === savedWidgetStorageId(widgetId));
        if (!tpl) return;
        const node = cloneWithFreshIds(tpl.data);
        mutate((prev) => {
          if (selected && isStructural(selected.type)) return insertChild(prev, selected.id, node);
          if (selectedId) {
            const ref = findSection(prev, selectedId);
            if (ref) return insertChild(prev, ref.parentId, node, ref.index + 1);
          }
          return insertChild(prev, null, node);
        });
        setTimeout(() => setState((prev) => ({ ...prev, selectedId: node.id })), 40);
        return;
      }
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
    [mutate, selected, selectedId, pendingInsertIndex],
  );

  // ---- Navigator actions: Page → Sections → Widgets → Items ----
  const handleReorder = useCallback((fromId: string, toId: string, after: boolean) => {
    mutate((prev) => reorderSection(prev, fromId, toId, after) ?? prev);
  }, [mutate]);

  const handleDuplicate = useCallback((id: string) => {
    mutate((prev) => duplicateSection(prev, id).list);
    // Select the copy right after it is inserted
    setTimeout(() => setState((prev) => {
      const ref = findSection(prev.sections, id);
      if (!ref) return prev;
      const sibling = prev.sections[ref.index + 1];
      return sibling ? { ...prev, selectedId: sibling.id } : prev;
    }), 40);
  }, [mutate]);

  const handleDelete = useCallback((id: string) => {
    mutate((prev) => removeSection(prev, id).list);
    setState((prev) => (prev.selectedId === id ? { ...prev, selectedId: null } : prev));
  }, [mutate]);

  const handleToggleHidden = useCallback((id: string) => {
    mutate((prev) => toggleSectionFlag(prev, id, "hidden"));
  }, [mutate]);

  const handleMoveUp = useCallback((id: string) => {
    mutate((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx <= 0) return prev;
      return reorderSection(prev, id, prev[idx - 1].id, false) ?? prev;
    });
  }, [mutate]);

  const handleMoveDown = useCallback((id: string) => {
    mutate((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      return reorderSection(prev, id, prev[idx + 1].id, true) ?? prev;
    });
  }, [mutate]);

  const handleAddAt = useCallback((index: number) => {
    setPendingInsertIndex(index);
    setQuickOpen(true);
    // Also ensure layers tab is visible so the user sees where it lands
    setLeftTab("layers");
  }, []);

  const resolveWidget = useCallback((id: string): SectionInstance | null => {
    if (!id.startsWith(SAVED_WIDGET_PREFIX)) return null;
    const tpl = loadSectionTemplates().find((t) => t.id === savedWidgetStorageId(id));
    return tpl ? cloneWithFreshIds(tpl.data) : null;
  }, []);

  // ---- @dnd-kit drag & drop orchestration ----
  const allIds = useMemo(() => collectSectionIds(state.sections), [state.sections]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const insertWidgetAt = useCallback(
    (widgetId: string, index: number) => {
      mutate((prev) => {
        const def = WIDGETS.find((w) => w.id === widgetId);
        const copy = def ? def.make() : resolveWidget(widgetId);
        if (!copy) return prev;
        const node = { ...copy, id: newSectionId() };
        const next = insertChild(prev, null, node, index);
        setTimeout(() => handleSelect(node.id), 30);
        return next;
      });
    },
    [mutate, resolveWidget, handleSelect],
  );

  const nestWidget = useCallback(
    (widgetId: string, containerId: string) => {
      mutate((prev) => {
        if (widgetId === "column") {
          const placed = dropColumnOn(prev, containerId, true);
          setTimeout(() => handleSelect(placed.selectId), 30);
          return placed.list;
        }
        const def = WIDGETS.find((w) => w.id === widgetId);
        const copy = def ? def.make() : resolveWidget(widgetId);
        if (!copy) return prev;
        const node = { ...copy, id: newSectionId() };
        const next = insertChild(prev, containerId, node);
        setTimeout(() => handleSelect(node.id), 30);
        return next;
      });
    },
    [mutate, resolveWidget, handleSelect],
  );

  const moveSectionToStrip = useCallback(
    (fromId: string, index: number) => {
      mutate((prev) => {
        const idx = prev.findIndex((s) => s.id === fromId);
        if (idx < 0) return prev;
        const { list, removed } = removeSection(prev, fromId);
        if (!removed) return prev;
        const target = index > idx ? index - 1 : index;
        return insertChild(list, null, removed, target);
      });
    },
    [mutate],
  );

  const nestSection = useCallback(
    (fromId: string, containerId: string) => {
      mutate((prev) => {
        if (isDescendant(prev, containerId, fromId)) return prev;
        const { list, removed } = removeSection(prev, fromId);
        if (!removed) return prev;
        return insertChild(list, containerId, removed);
      });
    },
    [mutate],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      const aType = active.data.current?.type;
      const oType = over.data.current?.type;
      if (aType === "widget") {
        const widgetId = active.data.current?.widgetId as string;
        if (oType === "container") {
          nestWidget(widgetId, over.data.current?.id as string);
          return;
        }
        if (oType === "strip") {
          insertWidgetAt(widgetId, over.data.current?.index as number);
          return;
        }
        if (oType === "section") {
          const ref = findSection(state.sections, over.id as string);
          insertWidgetAt(widgetId, ref ? ref.index + 1 : state.sections.length);
          return;
        }
        return;
      }
      if (aType === "section") {
        const fromId = active.id as string;
        if (fromId === over.id) return;
        if (oType === "container") {
          nestSection(fromId, over.data.current?.id as string);
          return;
        }
        if (oType === "strip") {
          moveSectionToStrip(fromId, over.data.current?.index as number);
          return;
        }
        if (oType === "section") {
          handleReorder(fromId, over.id as string, true);
          return;
        }
      }
    },
    [state.sections, nestWidget, insertWidgetAt, nestSection, moveSectionToStrip, handleReorder],
  );

  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current;
      if (data?.type === "widget") {
        const wid = data.widgetId as string;
        const def = WIDGETS.find((w) => w.id === wid);
        setActiveLabel(def?.label ?? (wid.startsWith(SAVED_WIDGET_PREFIX) ? "Saved template" : wid));
      } else if (data?.type === "section") {
        const ref = findSection(state.sections, event.active.id as string);
        setActiveLabel(ref?.node.label ?? "Section");
      } else {
        setActiveLabel(null);
      }
    },
    [state.sections],
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      handleDragEnd(event);
      setActiveLabel(null);
    },
    [handleDragEnd],
  );

  // Toolbar "Save as template" → store the section for reuse across pages.
  const saveSectionTemplate = useCallback(
    (node: SectionInstance) => {
      const entry: SavedSectionTemplate = {
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        name: node.label || node.type,
        type: node.type,
        savedAt: new Date().toISOString(),
        data: JSON.parse(JSON.stringify(node)) as SectionInstance,
      };
      setSavedTemplates((prev) => {
        const next = [entry, ...prev];
        saveSectionTemplates(next);
        return next;
      });
      onToast(`“${entry.name}” saved to Widgets → Saved`);
    },
    [onToast],
  );

  const deleteSectionTemplate = useCallback((id: string) => {
    setSavedTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveSectionTemplates(next);
      return next;
    });
  }, []);

  // Canvas drag-drop of a saved template resolves through localStorage.
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
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragStart={handleDragStart} onDragEnd={onDragEnd}>
      <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
        <div style={{ display: "flex", height: "100%", minHeight: 0, overflow: "hidden", position: "relative" }}>
      {dockWidgets || widgetsOpen ? (
        <>
          {!dockWidgets ? <button type="button" className="ps-drawer-backdrop" aria-label="Close widgets" onClick={() => setWidgetsOpen(false)} /> : null}
          <div className={dockWidgets ? "ps-sidebar-col" : "ps-drawer-left"} style={{ width: dockWidgets ? (widgetsOpen ? 296 : 48) : 296, flexShrink: 0, transition: dockWidgets ? "width .18s ease" : undefined, zIndex: dockWidgets ? 1 : 420, display: "flex", flexDirection: "column" }}>
            {dockWidgets && widgetsOpen ? (
              <div style={{ display: "flex", gap: 4, padding: "8px 8px 0", flexShrink: 0, borderBottom: "1px solid var(--ps-line)" }}>
                <button
                  type="button"
                  onClick={() => setLeftTab("layers")}
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 6px", borderRadius: 8, border: "none", background: leftTab === "layers" ? "var(--ps-primary)" : "var(--ps-bg)", color: leftTab === "layers" ? "#fff" : "var(--ps-muted)", fontSize: 11.5, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", cursor: "pointer" }}
                >
                  <ListOrdered size={13} /> Layers
                </button>
                <button
                  type="button"
                  onClick={() => setLeftTab("widgets")}
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 6px", borderRadius: 8, border: "none", background: leftTab === "widgets" ? "var(--ps-primary)" : "var(--ps-bg)", color: leftTab === "widgets" ? "#fff" : "var(--ps-muted)", fontSize: 11.5, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", cursor: "pointer" }}
                >
                  <LayoutGrid size={13} /> Widgets
                </button>
                <button
                  type="button"
                  onClick={() => setWidgetsOpen((v) => !v)}
                  title="Collapse"
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--ps-line)", background: "var(--ps-bg)", color: "var(--ps-muted)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                >
                  <Layers size={14} />
                </button>
              </div>
            ) : null}
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {dockWidgets && !widgetsOpen ? (
                <WidgetsPanel
                  open={false}
                  onToggle={() => setWidgetsOpen((v) => !v)}
                  onAddWidget={addWidget}
                  templates={savedTemplates}
                  onDeleteTemplate={deleteSectionTemplate}
                />
              ) : leftTab === "layers" ? (
                <SectionsNavigator
                  sections={sections}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                  onReorder={handleReorder}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onAddAt={handleAddAt}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  onToggleHidden={handleToggleHidden}
                />
              ) : (
                <WidgetsPanel
                  open={true}
                  onToggle={() => setWidgetsOpen((v) => !v)}
                  onAddWidget={addWidget}
                  templates={savedTemplates}
                  onDeleteTemplate={deleteSectionTemplate}
                />
              )}
            </div>
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
          layoutTheme: ensureConfig(page).brand.layoutTheme,
        }}
        form={ensureConfig(page).form}
        chrome={{
          header: ensureConfig(page).header,
          footer: ensureConfig(page).footer,
          brand: ensureConfig(page).brand,
        }}
        pageId={page.id}
        onSaveSectionTemplate={saveSectionTemplate}
        onAddAt={handleAddAt}
      />

      {dockInspector || inspectorOpen ? (
        <>
          {!dockInspector ? <button type="button" className="ps-drawer-backdrop" aria-label="Close settings" onClick={() => setInspectorOpen(false)} /> : null}
          <div className={dockInspector ? "ps-sidebar-col" : "ps-drawer-top"} style={{ zIndex: dockInspector ? 1 : 430 }}>
            <SettingsPanel section={selected} device={device} setDevice={setDevice} onChange={patchSelected} typographyTokens={design.bundle.tokens} page={page} onPatchConfig={onPatchConfig} />
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

      {quickOpen ? <QuickAdd onClose={() => { setQuickOpen(false); setPendingInsertIndex(null); }} onInsert={addWidget} /> : null}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeLabel ? (
          <div
            style={{
              padding: "8px 14px",
              background: "var(--ps-primary)",
              color: "#fff",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 800,
              boxShadow: "0 10px 30px rgba(0,0,0,.3)",
              whiteSpace: "nowrap",
            }}
          >
            {activeLabel}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
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
  const results = WIDGETS.filter((w) => !w.hidden).filter(
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
