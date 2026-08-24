"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, LayoutTemplate, Plus, Search, X } from "lucide-react";
import { CountUp } from "@/components/superadmin/count-up";
import { Reveal } from "@/components/superadmin/reveal";
import { Seg } from "@/components/superadmin/seg";
import { SceneImage } from "@/components/prestate/art";
import {
  buildTemplateRows,
  deriveStats,
  matchesFilter,
  TEMPLATE_FILTERS,
  type TemplateFilter,
  type TemplateRow,
} from "@/components/superadmin/templates/shared";
import { TemplateCard } from "@/components/superadmin/templates/template-card";
import { BLANK_TEMPLATE, TEMPLATES, buildTemplateSections } from "@/lib/prestate/data";
import { createTemplate, deleteTemplate, duplicateTemplate, loadTemplates, resetTemplate, saveTemplate } from "@/lib/prestate/persist";
import { builderPath, localPreviewPath } from "@/lib/prestate/paths";
import { defaultSiteConfig, seedConfigFor } from "@/lib/prestate/site-config";
import { inferDesignId } from "@/lib/prestate/page-templates";
import type { LandingPageData, TemplateData } from "@/lib/prestate/types";
import { Icon } from "@/components/icons";

function goToBuilder(pageId: string) {
  window.location.assign(builderPath(pageId));
}

export default function SuperAdminTemplatesPage() {
  const [pages, setPages] = useState<LandingPageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [filterIndex, setFilterIndex] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [designId, setDesignId] = useState("tpl-blank");
  const [newName, setNewName] = useState("");
  const [deleteFor, setDeleteFor] = useState<TemplateRow | null>(null);

  useEffect(() => {
    // Hydrate from the server after mount.
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    loadTemplates()
      .then(setPages)
      .finally(() => setLoading(false));
  }, []);

  // Debounce free-text search.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const notify = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const openBuilder = useCallback((pageId: string) => {
    goToBuilder(pageId);
  }, []);

  const createFromDesign = useCallback(
    async (template: TemplateData, name?: string) => {
      const label = name?.trim() || (template.id === "tpl-blank" ? "Untitled template" : `${template.name} — New`);
      const slug =
        label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "new-template";
      const created = await createTemplate({
        name: label,
        slug,
        designId: template.id,
        template: template.name,
        kind: "custom",
        thumbnail: template.thumbnail,
        sections: buildTemplateSections(template.id),
        config: defaultSiteConfig({ name: label, slug, primary: template.accent, accent: "#CDA45E" }),
      });
      setPages((prev) => [created, ...prev]);
      goToBuilder(created.id);
    },
    [],
  );

  const openPreset = useCallback(
    async (design: string) => {
      const existing =
        pages.find((p) => (p.kind ?? "custom") === "preset" && p.designId === design) ??
        pages.find((p) => p.designId === design);
      if (existing) {
        openBuilder(existing.id);
        return;
      }
      const template = TEMPLATES.find((t) => t.id === design);
      if (!template) return;
      const slug = template.id.replace(/^tpl-/, "");
      const sections = buildTemplateSections(template.id);
      const config = seedConfigFor({
        id: "",
        name: template.name,
        slug,
        status: "draft",
        template: template.name,
        domain: "",
        views: "—",
        conversions: "—",
        updated: "",
        thumbnail: template.thumbnail,
        sections,
        kind: "preset",
        designId: template.id,
      });
      const created = await createTemplate({
        name: template.name,
        slug,
        designId: template.id,
        template: template.name,
        kind: "preset",
        thumbnail: template.thumbnail,
        sections,
        config,
      });
      setPages((prev) => [created, ...prev]);
      goToBuilder(created.id);
    },
    [pages, openBuilder],
  );

  const preview = useCallback(
    (pageId: string) => {
      const page = pages.find((p) => p.id === pageId);
      if (page) window.open(localPreviewPath(page), "_blank", "noopener,noreferrer");
    },
    [pages],
  );

  const duplicate = useCallback(
    async (pageId: string) => {
      const copy = await duplicateTemplate(pageId);
      setPages((prev) => [copy, ...prev]);
      notify("Template duplicated");
    },
    [notify],
  );

  const remove = useCallback(
    async (row: TemplateRow) => {
      const pageId = row.pageId;
      if (!pageId) return;
      if (row.kind === "preset") {
        const design = row.designId ?? inferDesignId(row.name);
        const updated = await resetTemplate(pageId, {
          sections: buildTemplateSections(design),
          config: seedConfigFor({
            id: pageId,
            name: row.name,
            slug: "",
            status: "draft",
            template: row.name,
            domain: "",
            views: "—",
            conversions: "—",
            updated: "",
            thumbnail: "",
            sections: [],
            designId: design,
            kind: "preset",
          }),
        });
        setPages((prev) => prev.map((p) => (p.id === pageId ? updated : p)));
        notify("Predefined template reset");
        return;
      }
      await deleteTemplate(pageId);
      setPages((prev) => prev.filter((p) => p.id !== pageId));
      notify("Template deleted");
    },
    [notify],
  );

  const setStatus = useCallback(
    async (pageId: string, status: LandingPageData["status"]) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;
      const updated = await saveTemplate({ ...page, status });
      setPages((prev) => prev.map((p) => (p.id === pageId ? updated : p)));
      notify(status === "published" ? "Published" : "Unpublished");
    },
    [pages, notify],
  );

  const rows = useMemo(() => buildTemplateRows(pages), [pages]);
  const stats = useMemo(() => deriveStats(rows), [rows]);
  const filter: TemplateFilter = TEMPLATE_FILTERS[filterIndex] ?? "All";
  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          matchesFilter(r, filter) &&
          (!search ||
            r.name.toLowerCase().includes(search) ||
            r.source.toLowerCase().includes(search) ||
            r.description.toLowerCase().includes(search)),
      ),
    [rows, filter, search],
  );

  const bases: TemplateData[] = [BLANK_TEMPLATE, ...TEMPLATES];
  const selectedBase = bases.find((t) => t.id === designId) ?? BLANK_TEMPLATE;

  const submitCreate = () => {
    createFromDesign(selectedBase, newName.trim());
    setCreateOpen(false);
    setNewName("");
    setDesignId("tpl-blank");
  };

  const STAT_TILES = [
    { label: "Total templates", value: stats.total, ic: "ic-indigo", emoji: "<Icon name="puzzle" size={14} />" },
    { label: "Predefined", value: stats.predefined, ic: "ic-violet", emoji: "" },
    { label: "Custom", value: stats.custom, ic: "ic-sky", emoji: "<Icon name="sparkles" size={14} />" },
    { label: "Published", value: stats.published, ic: "ic-green", emoji: "<Icon name="sparkles" size={14} />" },
  ];

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">
            <LayoutTemplate size={13} /> Product
          </div>
          <h1>Template Management</h1>
          <div className="sub">
            Create, preview and manage every landing-page template. Each template keeps its own design, brand, SEO,
            domain and tracking — open one to edit it in the Prestate builder.
          </div>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> Create template
          </button>
        </div>
      </div>

      {/* Stat tiles */}
      <Reveal delay={1} className="grid g4" >
        {STAT_TILES.map((s) => (
          <div key={s.label} className="stat">
            <div className="top">
              <span className="label">{s.label}</span>
              <span className={`ic ${s.ic}`}>{s.emoji}</span>
            </div>
            <div className="value">
              <CountUp value={s.value} />
            </div>
          </div>
        ))}
      </Reveal>

      {/* Toolbar */}
      <Reveal delay={2}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", margin: "18px 0" }}>
          <Seg options={[...TEMPLATE_FILTERS]} value={filterIndex} onChange={setFilterIndex} />
          <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 340 }}>
            <input
              className="inp"
              placeholder="Search templates…"
              style={{ paddingLeft: 38 }}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Search
              size={16}
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--faint)" }}
            />
          </div>
          <span className="muted" style={{ fontSize: 12.5, marginLeft: "auto" }}>
            {visible.length} template{visible.length !== 1 ? "s" : ""}
          </span>
        </div>
      </Reveal>

      {/* Grid / empty state */}
      {visible.length === 0 ? (
        <Reveal delay={3}>
          <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--faint)" }}>
              <LayoutTemplate size={40} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No templates match this filter</div>
            <div className="muted" style={{ fontSize: 13.5, marginBottom: 18 }}>
              Try a different filter or create a new template to get started.
            </div>
            <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> Create template
            </button>
          </div>
        </Reveal>
      ) : (
        <div className="grid g3">
          {visible.map((row, i) => (
            <TemplateCard
              key={row.key}
              row={row}
              delay={i % 6}
              onEdit={() => (row.kind === "preset" ? openPreset(row.designId) : row.pageId && openBuilder(row.pageId))}
              onPreview={() => (row.pageId ? preview(row.pageId) : openPreset(row.designId))}
              onDuplicate={row.pageId ? () => duplicate(row.pageId as string) : undefined}
              onPublish={row.pageId ? () => setStatus(row.pageId as string, "published") : undefined}
              onUnpublish={row.pageId ? () => setStatus(row.pageId as string, "unpublished") : undefined}
              onRemove={row.pageId ? () => setDeleteFor(row) : undefined}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {createOpen ? (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 20 }}
          onClick={() => setCreateOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 20, padding: 32, width: 720, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(15,23,42,.2)" }}
          >
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>Create a template</h2>
            <p style={{ margin: "0 0 20px", color: "var(--muted)", fontSize: 13.5 }}>
              Start from a blank canvas or copy a predefined design. The new template is fully independent.
            </p>

            <div className="field">
              <label>Template name</label>
              <input
                autoFocus
                className="inp"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitCreate();
                }}
                placeholder="e.g. Harbor Lights — Custom"
              />
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label>Start from</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                {bases.map((t) => {
                  const active = designId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDesignId(t.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: 12,
                        borderRadius: 12,
                        border: active ? "2px solid var(--brand)" : "1px solid var(--line-2)",
                        background: active ? "var(--brand-050)" : "var(--surface)",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          width: 56,
                          height: 40,
                          borderRadius: 8,
                          overflow: "hidden",
                          background: t.accent2,
                          flexShrink: 0,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                        }}
                      >
                        {t.id === "tpl-blank" ? <Plus size={18} /> : <SceneImage art={t.thumbnail} />}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{t.name}</span>
                        <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)", marginTop: 2, lineHeight: 1.35, maxHeight: 32, overflow: "hidden" }}>
                          {t.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
              <button className="btn btn-ghost" type="button" onClick={() => setCreateOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" type="button" onClick={submitCreate}>
                Create &amp; open builder →
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete / reset modal */}
      {deleteFor ? (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 20 }}
          onClick={() => setDeleteFor(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 20, padding: 32, width: 440, maxWidth: "100%", boxShadow: "0 24px 80px rgba(15,23,42,.2)" }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>
              {deleteFor.kind === "preset" ? "Reset predefined template?" : "Delete template?"}
            </h2>
            <p style={{ margin: 0, color: "var(--ink-2)", fontSize: 13.5, lineHeight: 1.6 }}>
              {deleteFor.kind === "preset" ? (
                <>
                  Reset <strong>{deleteFor.name}</strong> to its original design? Edits on this template are removed.
                  Other templates are not affected.
                </>
              ) : (
                <>
                  <strong>{deleteFor.name}</strong> will be permanently deleted. Other templates keep their own design
                  and settings. This cannot be undone.
                </>
              )}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
              <button className="btn btn-ghost" type="button" onClick={() => setDeleteFor(null)}>
                Cancel
              </button>
              <button
                className={deleteFor.kind === "preset" ? "btn btn-primary" : "btn btn-danger"}
                type="button"
                onClick={() => {
                  remove(deleteFor);
                  setDeleteFor(null);
                }}
              >
                {deleteFor.kind === "preset" ? "Reset template" : "Delete template"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Toast */}
      {toast ? (
        <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 500 }}>
          <div
            className="card"
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", boxShadow: "var(--sh-lg)" }}
          >
            <CheckCircle2 size={16} style={{ color: "var(--green)", flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{toast}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "inline-flex" }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}