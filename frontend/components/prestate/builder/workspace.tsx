"use client";

import { useCallback, useEffect, useState } from "react";
import type * as React from "react";
import { SlidersHorizontal, LayoutGrid } from "lucide-react";
import type { Device, LandingPageData, SectionInstance } from "@/lib/prestate/types";
import { buildTemplateSections, WIDGETS } from "@/lib/prestate/data";
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
  return page.sections.length > 0
    ? (JSON.parse(JSON.stringify(page.sections)) as SectionInstance[])
    : buildTemplateSections(page.template);
}

export function BuilderWorkspace({
  page,
  device,
  setDevice,
  apiRef,
  onCapabilities,
  onToast,
  onPersist,
  onOpenLocalPreview,
}: {
  page: LandingPageData;
  device: Device;
  setDevice: (d: Device) => void;
  apiRef: React.MutableRefObject<BuilderApi | null>;
  onCapabilities: (c: { canUndo: boolean; canRedo: boolean }) => void;
  onToast: (msg: string) => void;
  onPersist: (sections: SectionInstance[], status?: LandingPageData["status"]) => void;
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
  const [vp, setVp] = useState(1400);

  const { sections, history, future, selectedId } = state;
  const selected = sections.find((s) => s.id === selectedId) ?? null;
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

  const mutate = useCallback((patch: (prev: SectionInstance[]) => SectionInstance[]) => {
    setState((prev) => ({
      sections: patch(prev.sections),
      history: [...prev.history.slice(-49), prev.sections],
      future: [],
      selectedId: prev.selectedId,
    }));
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
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, saveDraft]);

  const addWidget = useCallback(
    (widgetId: string) => {
      const def = WIDGETS.find((w) => w.id === widgetId);
      if (!def) return;
      const section = def.make();
      mutate((prev) => [...prev, section]);
      setTimeout(() => setState((prev) => ({ ...prev, selectedId: section.id })), 40);
    },
    [mutate],
  );

  const patchSelected = useCallback(
    (patch: Partial<SectionInstance>) => {
      if (!selectedId) return;
      mutate((prev) => prev.map((s) => (s.id === selectedId ? { ...s, ...patch } : s)));
    },
    [mutate, selectedId],
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
        theme={{
          primary: ensureConfig(page).brand.primary,
          accent: ensureConfig(page).brand.accent,
          font: ensureConfig(page).brand.bodyFont,
        }}
      />

      {dockInspector || inspectorOpen ? (
        <>
          {!dockInspector ? <button type="button" className="ps-drawer-backdrop" aria-label="Close settings" onClick={() => setInspectorOpen(false)} /> : null}
          <div className={dockInspector ? "ps-sidebar-col" : "ps-drawer-right"} style={{ zIndex: dockInspector ? 1 : 430 }}>
            <SettingsPanel section={selected} device={device} setDevice={setDevice} onChange={patchSelected} />
          </div>
        </>
      ) : null}

      <div className="ps-builder-fabs">
        {!dockWidgets ? (
          <button type="button" className="ps-fab" onClick={() => setWidgetsOpen((v) => !v)} title="Widgets">
            <LayoutGrid size={16} /> Widgets
          </button>
        ) : null}
        {!dockInspector ? (
          <button type="button" className="ps-fab" onClick={() => setInspectorOpen((v) => !v)} title="Settings">
            <SlidersHorizontal size={16} /> Settings
          </button>
        ) : null}
      </div>
    </div>
  );
}
