"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  GripVertical,
  Home,
  Plus,
  Puzzle,
  Redo2,
  Rocket,
  Save,
  Undo2,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Device, LpDocument, LpPage, LpSectionTemplate } from "@/lib/lp-types";
import type { Selection } from "@/lib/lp-edit";
import { addWidgetToRow, createRow, duplicateRow, rowFromTemplate, setRowSettings } from "@/lib/lp-edit";
import { WIDGET_MAP } from "@/lib/lp-widgets";
import { GENERIC_SECTIONS, RE_SECTIONS, type SectionDef } from "@/lib/lp-section-templates";
import { Icon } from "@/lib/lp-icon";
import { BuilderCanvas } from "./canvas";
import { SectionEditor } from "./section-editor";
import { SettingsPanel } from "./settings-panel";

const DEVICES: { key: Device; label: string; icon: string }[] = [
  { key: "desktop", label: "Desktop", icon: "monitor" },
  { key: "tablet", label: "Tablet", icon: "tablet" },
  { key: "mobile", label: "Mobile", icon: "smartphone" },
];

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function Builder({ page, accessToken }: { page: LpPage; accessToken: string }) {
  const router = useRouter();

  const [document, setDocument] = useState<LpDocument>(() =>
    page.document ?? { settings: {}, header: {}, footer: {}, rows: [] },
  );
  const [seo, setSeo] = useState(page.seo ?? {});
  const [tracking, setTracking] = useState(page.tracking ?? {});
  const [domain, setDomain] = useState(page.domain ?? {});
  const [selection, setSelection] = useState<Selection>({ kind: "page" });
  const [device, setDevice] = useState<Device>("desktop");

  const [history, setHistory] = useState<LpDocument[]>([]);
  const [future, setFuture] = useState<LpDocument[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [sections, setSections] = useState<LpSectionTemplate[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"sections" | "versions" | "preview" | "settings">("sections");
  const [showPicker, setShowPicker] = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRowId = useRef<string | null>(null);
  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  // Load reusable section templates.
  useEffect(() => {
    apiFetch<LpSectionTemplate[]>("/admin/landing-pages/section-templates", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(setSections)
      .catch(() => setSections([]));
  }, [accessToken]);

  // ---- document mutations (with history) ----
  const mutateDocument = useCallback(
    (next: LpDocument) => {
      setHistory((h) => [...h.slice(-49), document]);
      setFuture([]);
      setDocument(next);
      setDirty(true);
    },
    [document],
  );

  const patchDocument = useCallback(
    (next: LpDocument) => mutateDocument(next),
    [mutateDocument],
  );

  const mutateRows = useCallback(
    (rows: LpDocument["rows"]) => mutateDocument({ ...document, rows }),
    [mutateDocument, document],
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [document, ...f].slice(0, 50));
      setDocument(prev);
      setDirty(true);
      return h.slice(0, -1);
    });
  }, [document]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setHistory((h) => [...h, document]);
      setDocument(next);
      setDirty(true);
      return f.slice(1);
    });
  }, [document]);

  // ---- save ----
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await apiFetch(`/admin/landing-pages/${page.id}/document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ document, seo, tracking, domain }),
      });
      setDirty(false);
      setSavedAt(new Date().toISOString());
      showToast("Saved draft");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [page.id, accessToken, document, seo, tracking, domain, showToast]);

  const handlePublish = useCallback(async () => {
    setSaving(true);
    try {
      await apiFetch(`/admin/landing-pages/${page.id}/document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ document, seo, tracking, domain }),
      });
      await apiFetch(`/admin/landing-pages/${page.id}/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setDirty(false);
      showToast("Published — live at /lp/" + page.slug);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setSaving(false);
    }
  }, [page.id, page.slug, accessToken, document, seo, tracking, domain, showToast, router]);

  const handleUnpublish = useCallback(async () => {
    try {
      await apiFetch(`/admin/landing-pages/${page.id}/unpublish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      showToast("Unpublished");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unpublish failed");
    }
  }, [page.id, accessToken, showToast, router]);

  // Keyboard shortcuts: ctrl/cmd+Z, ctrl/cmd+shift+Z, ctrl/cmd+S.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.key.toLowerCase() === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo]);

  // ---- save reusable section ----
  const saveSelectedRowAsTemplate = useCallback(async () => {
    if (selection.kind !== "row") return;
    const row = document.rows.find((r) => r.id === selection.rowId);
    if (!row) return;
    const name = window.prompt("Section template name", "New Section");
    if (!name) return;
    try {
      await apiFetch("/admin/landing-pages/section-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name, category: "custom", document: { rows: [deepClone(row)] } }),
      });
      showToast("Section saved as reusable template");
      const updated = await apiFetch<LpSectionTemplate[]>("/admin/landing-pages/section-templates", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setSections(updated);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save section");
    }
  }, [selection, document.rows, accessToken, showToast]);

  const insertTemplateRow = useCallback(
    (template: LpSectionTemplate) => {
      const row = rowFromTemplate(template.document);
      mutateDocument({ ...document, rows: [...document.rows, row] });
      setSelection({ kind: "row", rowId: row.id });
    },
    [document, mutateDocument],
  );

  const addWidgetToSelectedRow = useCallback(
    (type: string) => {
      if (selection.kind !== "row") return;
      mutateRows(addWidgetToRow(document.rows, selection.rowId, type));
    },
    [selection, document.rows, mutateRows],
  );

  const selectedRow = selection.kind === "row" ? document.rows.find((r) => r.id === selection.rowId) : null;
  const selectedRowName = selectedRow
    ? selectedRow.settings?.name ||
      (WIDGET_MAP[selectedRow.columns?.[0]?.elements?.[0]?.type ?? ""]?.label ?? "Section")
    : "Section";

  const statusColor =
    page.status === "published" ? "#16a34a" : page.status === "archived" ? "#6b7280" : "#d97706";
  const statusBg =
    page.status === "published" ? "#dcfce7" : page.status === "archived" ? "#f1f5f9" : "#fef9c3";

  const deviceWidth =
    device === "desktop" ? "100%" : device === "tablet" ? "768px" : "375px";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#f1f5f9", fontFamily: "var(--font-inter), sans-serif", color: "#0f172a" }}>

      {/* ── Top bar ── */}
      <div style={{ height: 56, background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0, zIndex: 200 }}>
        <Link
          href="/superadmin/landing-pages"
          style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid #e2e8f0", color: "#64748b", textDecoration: "none", fontSize: 16, fontWeight: 700, flexShrink: 0 }}
        >
          <X size={16} />
        </Link>
        <div style={{ width: 1, height: 24, background: "#e2e8f0" }} />
        <div style={{ fontWeight: 700, fontSize: 14 }}>{page.name}</div>
        <span style={{ fontSize: 11, background: statusBg, color: statusColor, padding: "3px 10px", borderRadius: 999, textTransform: "capitalize", fontWeight: 600 }}>
          {page.status}
        </span>
        {dirty ? (
          <span style={{ fontSize: 12, color: "#f59e0b" }}>● Unsaved</span>
        ) : savedAt ? (
          <span style={{ fontSize: 12, color: "#94a3b8" }}>Saved {new Date(savedAt).toLocaleTimeString()}</span>
        ) : null}

        {/* Centre tabs */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ display: "flex", gap: 2, background: "#f1f5f9", borderRadius: 10, padding: 3 }}>
            {(["sections", "versions", "preview", "settings"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "6px 14px",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: activeTab === tab ? "#fff" : "transparent",
                  color: activeTab === tab ? "#0f172a" : "#64748b",
                  boxShadow: activeTab === tab ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  textTransform: "capitalize",
                }}
              >
                {tab === "sections" ? "Sections" : tab === "versions" ? "Versions" : tab === "preview" ? "Preview" : "Page Settings"}
              </button>
            ))}
          </div>
        </div>

        {/* Right actions */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" onClick={undo} disabled={history.length === 0} title="Undo (Ctrl+Z)" style={lightBtn(history.length === 0)}><Undo2 size={14} /></button>
          <button type="button" onClick={redo} disabled={future.length === 0} title="Redo (Ctrl+Shift+Z)" style={lightBtn(future.length === 0)}><Redo2 size={14} /></button>
          <a href={`/lp/${page.slug}`} target="_blank" rel="noreferrer" style={lightBtn(false)}><Eye size={14} /> Preview</a>
          <button type="button" onClick={() => void handleSave()} disabled={saving} style={lightBtn(saving)}>
            {saving ? "Saving…" : <><Save size={14} /> Save</>}
          </button>
          {page.status === "published" ? (
            <button type="button" onClick={() => void handleUnpublish()} style={{ ...lightBtn(false), background: "#fff1f2", color: "#e11d48", borderColor: "#fecdd3" }}>
              Unpublish
            </button>
          ) : null}
          <button type="button" onClick={() => void handlePublish()} disabled={saving} style={{ ...lightBtn(saving), background: "#4f46e5", color: "#fff", borderColor: "#4f46e5", fontWeight: 700 }}>
            {page.status === "published" ? "Update & Publish" : <><Rocket size={14} /> Publish</>}
          </button>
        </div>
      </div>

      {/* ── Sections tab ── */}
      {activeTab === "sections" ? (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Left panel — picker OR structure */}
          <div style={{ width: 300, flexShrink: 0, background: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {showPicker ? (
              /* ── Section type picker ── */
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
                  <button type="button" onClick={() => setShowPicker(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0, display: "inline-flex", alignItems: "center" }}><ChevronLeft size={18} /></button>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>Add a Section</span>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 24px" }}>

                  {/* Real Estate sections */}
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, color: "#4f46e5", marginBottom: 8, padding: "0 2px", display: "flex", alignItems: "center", gap: 5 }}><Home size={12} /> Real Estate</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                    {RE_SECTIONS.map((tpl) => (
                      <SectionCard
                        key={tpl.id}
                        tpl={tpl}
                        onAdd={(t) => {
                          const newRow = t.create();
                          newRow.settings = { ...newRow.settings, name: t.label };
                          mutateRows([...document.rows, newRow]);
                          setSelection({ kind: "row", rowId: newRow.id });
                          setShowPicker(false);
                        }}
                      />
                    ))}
                  </div>

                  {/* Generic sections */}
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, color: "#64748b", marginBottom: 8, padding: "0 2px", display: "flex", alignItems: "center", gap: 5 }}><FileText size={12} /> Generic</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                    {GENERIC_SECTIONS.map((tpl) => (
                      <SectionCard
                        key={tpl.id}
                        tpl={tpl}
                        onAdd={(t) => {
                          const newRow = t.create();
                          newRow.settings = { ...newRow.settings, name: t.label };
                          mutateRows([...document.rows, newRow]);
                          setSelection({ kind: "row", rowId: newRow.id });
                          setShowPicker(false);
                        }}
                      />
                    ))}
                  </div>

                  {/* Saved / API sections */}
                  {sections.length > 0 ? (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, color: "#64748b", marginBottom: 8, padding: "0 2px", display: "flex", alignItems: "center", gap: 5 }}><Puzzle size={12} /> Saved Sections</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {sections.map((sec) => (
                          <div
                            key={sec.id}
                            onClick={() => { insertTemplateRow(sec); setShowPicker(false); }}
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#4f46e5"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#e2e8f0"; }}
                          >
                            <Icon name="puzzle" size={14} />
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a" }}>{sec.name}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              </>
            ) : (
              /* ── Page structure ── */
              <>
                {/* Stats strip */}
                <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
                  {[
                    { label: "Total Sections", val: document.rows.length },
                    { label: "Enabled", val: document.rows.length },
                  ].map((s, i, arr) => (
                    <div key={s.label} style={{ flex: 1, padding: "12px 14px", borderRight: i < arr.length - 1 ? "1px solid #e2e8f0" : "none" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#94a3b8", marginBottom: 3 }}>{s.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{s.val}</div>
                    </div>
                  ))}
                </div>

                {/* Header */}
                <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Sections</div>
                      <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 1 }}>Select a section to edit · drag to reorder</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPicker(true)}
                    style={{ marginTop: 10, width: "100%", padding: "8px 14px", border: "2px dashed #c7d2fe", borderRadius: 10, background: "#eef2ff", color: "#4f46e5", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    + Add section
                  </button>
                </div>

                {/* Section list */}
                <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>

                  {/* Pinned: Header */}
                  <PinnedSectionRow
                    icon="panel-top"
                    label="Header"
                    sublabel="Navigation & logo"
                    selected={selection.kind === "header"}
                    enabled={document.header?.enabled !== false}
                    onSelect={() => setSelection({ kind: "header" })}
                    onToggle={() => mutateDocument({ ...document, header: { ...document.header, enabled: document.header?.enabled === false } })}
                  />

                  {document.rows.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 16px", color: "#94a3b8", fontSize: 13 }}>
                      <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}><Icon name="file-text" size={32} /></div>
                      No sections yet.<br />Click &quot;+ Add section&quot; to start.
                    </div>
                  ) : (
                    document.rows.map((row, idx) => {
                      const isSelected = selection.kind === "row" && selection.rowId === row.id;
                      const firstEl = row.columns?.[0]?.elements?.[0];
                      const sectionLabel =
                        row.settings?.name ||
                        (firstEl ? (WIDGET_MAP[firstEl.type]?.label ?? firstEl.type) : `Section ${idx + 1}`);
                      const typeSlug = firstEl?.type ?? "section";
                      const enabled = row.settings?.enabled !== false;

                      return (
                        <div
                          key={row.id}
                          draggable
                          onDragStart={(e) => {
                            dragRowId.current = row.id;
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const fromId = dragRowId.current;
                            if (!fromId || fromId === row.id) return;
                            const next = [...document.rows];
                            const fromIdx = next.findIndex((r) => r.id === fromId);
                            const toIdx = next.findIndex((r) => r.id === row.id);
                            const [moved] = next.splice(fromIdx, 1);
                            next.splice(toIdx, 0, moved);
                            mutateRows(next);
                            dragRowId.current = null;
                          }}
                          onClick={() => setSelection({ kind: "row", rowId: row.id })}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "9px 10px",
                            borderRadius: 10,
                            border: isSelected ? "2px solid #4f46e5" : "1px solid #e2e8f0",
                            background: isSelected ? "#eef2ff" : enabled ? "#fff" : "#f8fafc",
                            cursor: "pointer",
                            marginBottom: 6,
                            boxShadow: isSelected ? "0 0 0 3px rgba(79,70,229,0.1)" : "none",
                            opacity: enabled ? 1 : 0.55,
                          }}
                        >
                          {/* Drag handle */}
                          <span
                            style={{ color: "#cbd5e1", cursor: "grab", fontSize: 15, flexShrink: 0, lineHeight: 1, display: "inline-flex", alignItems: "center" }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <GripVertical size={15} />
                          </span>

                          {/* Label */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: isSelected ? "#4f46e5" : "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sectionLabel}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{typeSlug}</div>
                          </div>

                          {/* Enable/disable toggle */}
                          <button
                            type="button"
                            title={enabled ? "Disable section" : "Enable section"}
                            onClick={(e) => {
                              e.stopPropagation();
                              mutateRows(setRowSettings(document.rows, row.id, { enabled: !enabled }));
                            }}
                            style={{
                              width: 34,
                              height: 20,
                              borderRadius: 999,
                              border: "none",
                              background: enabled ? "#4f46e5" : "#e2e8f0",
                              position: "relative",
                              cursor: "pointer",
                              flexShrink: 0,
                              transition: "background 0.2s",
                            }}
                          >
                            <span style={{
                              position: "absolute",
                              top: 3,
                              left: enabled ? 17 : 3,
                              width: 14,
                              height: 14,
                              borderRadius: "50%",
                              background: "#fff",
                              transition: "left 0.2s",
                              boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                            }} />
                          </button>

                          {/* Duplicate */}
                          <button
                            type="button"
                            title="Duplicate"
                            onClick={(e) => {
                              e.stopPropagation();
                              const duped = duplicateRow(document.rows, row.id);
                              mutateRows(duped);
                            }}
                            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 13, padding: "0 2px", flexShrink: 0, lineHeight: 1, display: "inline-flex", alignItems: "center" }}
                          >
                            <Copy size={14} />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            title="Delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              mutateRows(document.rows.filter((r) => r.id !== row.id));
                              if (isSelected) setSelection({ kind: "page" });
                            }}
                            style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 13, padding: "0 2px", flexShrink: 0, lineHeight: 1, display: "inline-flex", alignItems: "center" }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })
                  )}

                  {/* Pinned: Footer */}
                  <PinnedSectionRow
                    icon="panel-bottom"
                    label="Footer"
                    sublabel="Links, contact & disclaimer"
                    selected={selection.kind === "footer"}
                    enabled={document.footer?.enabled !== false}
                    onSelect={() => setSelection({ kind: "footer" })}
                    onToggle={() => mutateDocument({ ...document, footer: { ...document.footer, enabled: document.footer?.enabled === false } })}
                  />

                </div>

                {/* Elements palette — add widgets to the selected section */}
                {selection.kind === "row" ? (
                  <WidgetPalette
                    sectionName={selectedRowName}
                    onAdd={addWidgetToSelectedRow}
                  />
                ) : null}
              </>
            )}
          </div>

          {/* Right — section settings */}
          <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", overflow: "hidden", minHeight: "100%", boxSizing: "border-box" }}>
              {selection.kind === "row" ? (
                <SectionEditor
                  row={document.rows.find((r) => r.id === selection.rowId) ?? document.rows[0]}
                  rows={document.rows}
                  rowId={selection.rowId}
                  onRowsChange={(nextRows) => patchDocument({ ...document, rows: nextRows })}
                  onSelectElement={(columnId, elementId) => setSelection({ kind: "element", rowId: selection.rowId, columnId, elementId })}
                />
              ) : selection.kind !== "page" ? (
                <SettingsPanel
                  document={document}
                  selection={selection}
                  patchDocument={patchDocument}
                  seo={seo}
                  setSeo={setSeo}
                  tracking={tracking}
                  setTracking={setTracking}
                  domain={domain}
                  setDomain={setDomain}
                />
              ) : (
                <div style={{ padding: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, textAlign: "center", color: "#94a3b8" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "#c7d2fe" }}><Icon name="settings" size={40} /></div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#334155", marginBottom: 6 }}>Page Settings</div>
                  <div style={{ fontSize: 12.5, maxWidth: 260 }}>
                    Configure global design, SEO, tracking and domain mapping from the <strong style={{ color: "#4f46e5" }}>Page Settings</strong> tab in the top bar.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Preview tab ── */}
      {activeTab === "preview" ? (
        <div style={{ flex: 1, overflow: "auto", background: "#e2e8f0" }}>
          {/* Device toggle bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "#fff", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 3, gap: 2 }}>
              {DEVICES.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDevice(d.key)}
                  style={{ padding: "6px 18px", border: "none", borderRadius: 8, background: device === d.key ? "#fff" : "transparent", color: device === d.key ? "#0f172a" : "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: device === d.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none", display: "inline-flex", alignItems: "center", gap: 5 }}
                >
                  <Icon name={d.icon} size={14} /> {d.label}
                </button>
              ))}
            </div>
            <a href={`/lp/${page.slug}`} target="_blank" rel="noreferrer" style={lightBtn(false)}>
              <ExternalLink size={14} /> Open live page
            </a>
          </div>
          {/* Non-editable preview canvas */}
          <div style={{ padding: 24 }}>
            <div style={{ maxWidth: device === "desktop" ? "100%" : deviceWidth, margin: "0 auto", background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 32px rgba(0,0,0,0.12)" }}>
              <BuilderCanvas
                document={document}
                device={device}
                selection={{ kind: "page" }}
                onSelect={() => {}}
                onMutate={() => {}}
                readOnly
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Versions tab ── */}
      {activeTab === "versions" ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", flexDirection: "column", gap: 10 }}>
          <Icon name="history" size={40} />
          <div style={{ fontSize: 15, fontWeight: 700, color: "#334155" }}>Version history</div>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>{history.length} undo step{history.length !== 1 ? "s" : ""} in memory — press Ctrl+Z to undo</div>
          {savedAt ? <div style={{ fontSize: 13, color: "#94a3b8" }}>Last saved: {new Date(savedAt).toLocaleTimeString()}</div> : null}
        </div>
      ) : null}

      {/* ── Page Settings tab ── */}
      {activeTab === "settings" ? (
        <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", padding: 24 }}>
          <div style={{ maxWidth: 840, margin: "0 auto", background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.05)", overflow: "hidden" }}>
            <SettingsPanel
              document={document}
              selection={{ kind: "page" }}
              patchDocument={patchDocument}
              seo={seo}
              setSeo={setSeo}
              tracking={tracking}
              setTracking={setTracking}
              domain={domain}
              setDomain={setDomain}
            />
          </div>
        </div>
      ) : null}

      {toast ? (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#fff", padding: "10px 20px", borderRadius: 10, zIndex: 300, fontSize: 13, boxShadow: "0 12px 30px rgba(0,0,0,0.25)" }}>
          {toast}
        </div>
      ) : null}
    </div>
  );
}

// Pinned header/footer row in the section list
function PinnedSectionRow({
  icon,
  label,
  sublabel,
  selected,
  enabled,
  onSelect,
  onToggle,
}: {
  icon: string;
  label: string;
  sublabel: string;
  selected: boolean;
  enabled: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 10px",
        borderRadius: 10,
        border: selected ? "2px solid #4f46e5" : "1px solid #e2e8f0",
        background: selected ? "#eef2ff" : enabled ? "#f8fafc" : "#f1f5f9",
        cursor: "pointer",
        marginBottom: 6,
        boxShadow: selected ? "0 0 0 3px rgba(79,70,229,0.1)" : "none",
        opacity: enabled ? 1 : 0.55,
      }}
    >
      <span style={{ display: "inline-flex", flexShrink: 0, color: "#94a3b8" }}><Icon name={icon} size={16} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: selected ? "#4f46e5" : "#0f172a" }}>{label}</div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{sublabel}</div>
      </div>
      {/* Enable/disable toggle */}
      <button
        type="button"
        title={enabled ? `Disable ${label}` : `Enable ${label}`}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        style={{
          width: 34, height: 20, borderRadius: 999, border: "none",
          background: enabled ? "#4f46e5" : "#e2e8f0",
          position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s",
        }}
      >
        <span style={{
          position: "absolute", top: 3, left: enabled ? 17 : 3,
          width: 14, height: 14, borderRadius: "50%", background: "#fff",
          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
        }} />
      </button>
    </div>
  );
}

function lightBtn(disabled: boolean) {  return {
    padding: "7px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    background: "#fff",
    color: disabled ? "#cbd5e1" : "#334155",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  } as const;
}

// ---------------------------------------------------------------------------
// Section type card (left panel picker)
// ---------------------------------------------------------------------------

function SectionCard({ tpl, onAdd }: { tpl: SectionDef; onAdd: (t: SectionDef) => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onAdd(tpl)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={tpl.description}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "14px 8px",
        borderRadius: 10,
        border: hover ? "2px solid #4f46e5" : "1px solid #e2e8f0",
        background: hover ? "#eef2ff" : "#fff",
        cursor: "pointer",
        textAlign: "center",
        transition: "border-color 0.15s, background 0.15s",
        width: "100%",
      }}
    >
      <Icon name={tpl.icon} size={22} />
      <span style={{ fontSize: 11.5, fontWeight: 600, color: hover ? "#4f46e5" : "#334155", lineHeight: 1.3 }}>{tpl.label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Elements palette (left panel) — add widgets to the selected section
// ---------------------------------------------------------------------------

function WidgetPalette({ sectionName, onAdd }: { sectionName: string; onAdd: (type: string) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ borderTop: "1px solid #e2e8f0", background: "#fafbff", flexShrink: 0, borderBottom: "1px solid #e2e8f0" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "none", border: "none", cursor: "pointer" }}
      >
        <span style={{ display: "inline-flex", color: "#4f46e5" }}><Plus size={15} /></span>
        <span style={{ flex: 1, textAlign: "left", fontSize: 12.5, fontWeight: 800, color: "#0f172a" }}>Elements</span>
        <span style={{ fontSize: 11, color: "#94a3b8", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          add to “{sectionName}”
        </span>
        <span style={{ display: "inline-flex", color: "#94a3b8", flexShrink: 0 }}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>
      {open ? (
        <div style={{ padding: "0 12px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, maxHeight: 220, overflowY: "auto" }}>
          {Object.values(WIDGET_MAP).map((w) => (
            <button
              key={w.type}
              type="button"
              onClick={() => onAdd(w.type)}
              title={w.description ?? w.label}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 9px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", textAlign: "left", overflow: "hidden" }}
            >
              <span style={{ color: "#6366f1", display: "inline-flex", flexShrink: 0 }}><Icon name={w.icon} size={14} /></span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

