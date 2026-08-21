"use client";

import { useMemo, useState } from "react";
import type * as React from "react";
import {
  ArrowUpRight,
  BarChart3,
  Copy,
  Eye,
  FilePlus2,
  Globe,
  History,
  LayoutTemplate,
  Rocket,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { TEMPLATES, uid, buildTemplateSections } from "@/lib/prestate/data";
import { localPreviewPath } from "@/lib/prestate/paths";
import type { LandingPageData } from "@/lib/prestate/types";
import { ModuleHeader, StatCard, StatusBadge, Table, RowMenu, Pills, PrimaryAction } from "./shared";
import { Modal, TextField, Btn, Chip } from "@/components/prestate/ui";
import { SceneImage } from "@/components/prestate/art";

const THUMB: Record<string, string> = {
  hero: "hero",
  villa: "villa",
  plots: "plots",
  rental: "rental",
  agent: "agent",
  expo: "expo",
  commercial: "commercial",
  tour: "tour",
};

export function PagesModule({
  pages,
  onToast,
  onOpenBuilder,
  onPreview,
  onAssignDomain,
  onDuplicate,
  onDelete,
  onPublish,
  onUnpublish,
  onCreate,
}: {
  pages: LandingPageData[];
  onToast: (m: string) => void;
  onOpenBuilder: (pageId: string) => void;
  onPreview: (pageId: string) => void;
  onAssignDomain: (pageId: string, domain: string) => void;
  onDuplicate: (pageId: string) => void;
  onDelete: (pageId: string) => void;
  onPublish: (pageId: string) => void;
  onUnpublish: (pageId: string) => void;
  onCreate: (page: LandingPageData) => void;
}) {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTpl, setSelectedTpl] = useState<string | null>(null);
  const [pageName, setPageName] = useState("");
  const [historyFor, setHistoryFor] = useState<LandingPageData | null>(null);
  const [deleteFor, setDeleteFor] = useState<LandingPageData | null>(null);
  const [domainFor, setDomainFor] = useState<LandingPageData | null>(null);
  const [domainValue, setDomainValue] = useState("");

  const filtered = useMemo(
    () =>
      pages.filter((p) => {
        const okFilter = filter === "All" || p.status === filter.toLowerCase();
        const q = query.trim().toLowerCase();
        const okQuery = !q || p.name.toLowerCase().includes(q) || p.domain.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
        return okFilter && okQuery;
      }),
    [pages, filter, query],
  );

  const published = pages.filter((p) => p.status === "published").length;

  const createPage = () => {
    const tpl = TEMPLATES.find((t) => t.id === selectedTpl);
    if (!tpl) return;
    const name = pageName.trim() || `${tpl.name} — New page`;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
    onCreate({
      id: uid("p"),
      name,
      slug: slug || "new-page",
      status: "draft",
      template: tpl.name,
      domain: "",
      views: "—",
      conversions: "—",
      updated: "Just now",
      thumbnail: tpl.thumbnail,
      sections: buildTemplateSections(tpl.id),
    });
    setCreateOpen(false);
    setPageName("");
    setSelectedTpl(null);
  };

  const menuFor = (p: LandingPageData) => [
    { label: "Edit in builder", onClick: () => onOpenBuilder(p.id) },
    { label: "Local preview", onClick: () => onPreview(p.id) },
    { label: "Assign domain", onClick: () => { setDomainFor(p); setDomainValue(p.domain); } },
    { label: "Duplicate", onClick: () => onDuplicate(p.id) },
    { label: "Publish", onClick: () => onPublish(p.id), hidden: p.status === "published" },
    { label: "Unpublish", onClick: () => onUnpublish(p.id), hidden: p.status !== "published" },
    { label: "Version history", onClick: () => setHistoryFor(p) },
    { label: "Delete", onClick: () => setDeleteFor(p), danger: true },
  ];

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <ModuleHeader
        title="Landing Pages"
        description="Preview opens a local URL (/p/your-slug). Assign any hostname (e.g. auroraresidences.com) to map that same page at /p/host/auroraresidences.com."
        actions={<PrimaryAction label="New Landing Page" icon={<FilePlus2 size={15} />} onClick={() => setCreateOpen(true)} />}
      />

      <div className="ps-stats-grid">
        <StatCard label="Total pages" value={String(pages.length)} delta="+3 this month" icon={<LayoutTemplate size={20} />} />
        <StatCard label="Published" value={String(published)} icon={<Rocket size={20} />} tone="success" />
        <StatCard label="Total views" value="128.4K" delta="+18%" icon={<BarChart3 size={20} />} tone="secondary" />
        <StatCard label="Avg. conversion" value="12.6%" delta="+1.2%" icon={<Sparkles size={20} />} tone="primary" />
      </div>

      <div className="ps-toolbar">
        <Pills options={["All", "Published", "Draft", "Scheduled", "Password", "Unpublished"]} value={filter} onChange={setFilter} />
        <div className="ps-search">
          <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--ps-muted)", pointerEvents: "none" }} />
          <input className="ps-input" placeholder="Search pages or domains…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>
      </div>

      <div className="ps-module-pad">
        <div className="ps-pages-table">
          <Table
            head={["Page", "Status", "Template", "Domain", "Views", "Conv.", "Updated", ""]}
            rows={filtered.map((p) => ({
              onClick: () => onOpenBuilder(p.id),
              cells: [
                <div key="n" style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <span style={{ width: 46, height: 34, borderRadius: 8, overflow: "hidden", flexShrink: 0, border: "1px solid var(--ps-line)" }}>
                    <SceneImage art={THUMB[p.thumbnail] ?? "hero"} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ps-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ps-muted)" }}>/{p.slug}</div>
                  </div>
                </div>,
                <div key="s">
                  <StatusBadge status={p.status} />
                </div>,
                <span key="t" style={{ fontSize: 12.5, color: "var(--ps-slate)", fontWeight: 600 }}>{p.template}</span>,
                <div key="d" style={{ minWidth: 140 }}>
                  <div style={{ fontSize: 12, color: p.domain ? "var(--ps-primary)" : "var(--ps-muted)", fontWeight: 700, fontFamily: "monospace" }}>
                    {p.domain || "Assign domain"}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--ps-muted)", fontFamily: "monospace" }}>{localPreviewPath(p)}</div>
                </div>,
                <span key="v" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-slate)" }}>{p.views}</span>,
                <span key="c" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-success)" }}>{p.conversions}</span>,
                <span key="u" style={{ fontSize: 12, color: "var(--ps-muted)" }}>{p.updated}</span>,
                <div key="m" style={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
                  <ActionIcon title="Open in builder" onClick={() => onOpenBuilder(p.id)}><ArrowUpRight size={15} /></ActionIcon>
                  <ActionIcon title="Local preview" onClick={() => onPreview(p.id)}><Eye size={15} /></ActionIcon>
                  <ActionIcon title="Assign domain" onClick={() => { setDomainFor(p); setDomainValue(p.domain); }}><Globe size={15} /></ActionIcon>
                  <ActionIcon title="Duplicate" onClick={() => onDuplicate(p.id)}><Copy size={15} /></ActionIcon>
                  <ActionIcon title="Version history" onClick={() => setHistoryFor(p)}><History size={15} /></ActionIcon>
                  <RowMenu items={menuFor(p)} />
                </div>,
              ],
            }))}
            rowKey={(i) => filtered[i]?.id ?? String(i)}
          />
        </div>

        <div className="ps-pages-cards">
          {filtered.length === 0 ? (
            <div className="ps-card" style={{ padding: 28, textAlign: "center", color: "var(--ps-muted)" }}>No pages match this filter.</div>
          ) : (
            filtered.map((p) => (
              <div key={p.id} className="ps-card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <button type="button" onClick={() => onOpenBuilder(p.id)} style={{ display: "flex", gap: 12, alignItems: "center", background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", color: "inherit" }}>
                  <span style={{ width: 72, height: 52, borderRadius: 10, overflow: "hidden", flexShrink: 0, border: "1px solid var(--ps-line)" }}>
                    <SceneImage art={THUMB[p.thumbnail] ?? "hero"} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ps-ink)" }}>{p.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ps-muted)", marginTop: 2 }}>
                      {localPreviewPath(p)}{p.domain ? ` · ${p.domain}` : " · no domain"}
                    </div>
                    <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <StatusBadge status={p.status} />
                      <span style={{ fontSize: 11.5, color: "var(--ps-slate)" }}>{p.template}</span>
                    </div>
                  </div>
                </button>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Btn size="sm" variant="primary" onClick={() => onOpenBuilder(p.id)}>Edit</Btn>
                  <Btn size="sm" variant="outline" onClick={() => onPreview(p.id)}>Preview</Btn>
                  <Btn size="sm" variant="outline" onClick={() => { setDomainFor(p); setDomainValue(p.domain); }}>Domain</Btn>
                  <Btn size="sm" variant="outline" onClick={() => onDuplicate(p.id)}>Duplicate</Btn>
                  {p.status === "published" ? (
                    <Btn size="sm" variant="outline" onClick={() => onUnpublish(p.id)}>Unpublish</Btn>
                  ) : (
                    <Btn size="sm" variant="secondary" onClick={() => onPublish(p.id)}>Publish</Btn>
                  )}
                  <Btn size="sm" variant="danger" onClick={() => setDeleteFor(p)} icon={<Trash2 size={13} />}>Delete</Btn>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create a new landing page" width={680}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ps-slate)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Page name</div>
          <TextField value={pageName} onChange={setPageName} placeholder="e.g. New Launch — Royal Heights" />
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ps-slate)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>Start from a template</div>
        <div className="ps-tpl-pick">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTpl(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 12,
                borderRadius: 12,
                border: selectedTpl === t.id ? "2px solid var(--ps-primary)" : "1px solid var(--ps-line)",
                background: selectedTpl === t.id ? "var(--ps-primary-mist)" : "var(--ps-panel-raised)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ width: 44, height: 32, borderRadius: 8, overflow: "hidden", background: t.accent2, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
                <SceneImage art={t.thumbnail} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-ink)" }}>{t.name}</div>
                <div style={{ fontSize: 11, color: "var(--ps-muted)", marginTop: 1 }}>{t.category} · fully editable in builder</div>
              </div>
            </button>
          ))}
        </div>
        <div className="ps-modal-actions">
          <Btn variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={createPage} disabled={!selectedTpl}>
            <Sparkles size={14} /> Create & open builder
          </Btn>
        </div>
      </Modal>

      <Modal open={!!historyFor} onClose={() => setHistoryFor(null)} title={historyFor ? `Version history — ${historyFor.name}` : ""} width={600}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {VERSIONS.map((v, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", border: "1px solid var(--ps-line)", borderRadius: 12, background: i === 0 ? "var(--ps-primary-mist)" : "var(--ps-panel-raised)", flexWrap: "wrap" }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: i === 0 ? "var(--ps-primary)" : "rgba(255,255,255,.06)", color: i === 0 ? "#fff" : "var(--ps-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {v.icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ps-ink)" }}>{v.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--ps-muted)", marginTop: 1 }}>{v.time} · {v.user}</div>
              </div>
              {i === 0 ? <Chip tone="primary">Current</Chip> : null}
              <Btn variant="ghost" size="sm" onClick={() => { onToast("Restored to this version"); setHistoryFor(null); }}>Restore</Btn>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={!!domainFor}
        onClose={() => setDomainFor(null)}
        title={domainFor ? `Assign domain — ${domainFor.name}` : ""}
        width={480}
      >
        <p style={{ fontSize: 13, color: "var(--ps-slate)", lineHeight: 1.6, margin: "0 0 14px" }}>
          This maps a hostname onto the local preview. The page stays at{" "}
          <strong style={{ color: "var(--ps-ink)", fontFamily: "monospace" }}>{domainFor ? localPreviewPath(domainFor) : ""}</strong>
          {" "}and also at <strong style={{ color: "var(--ps-ink)", fontFamily: "monospace" }}>/p/host/yourdomain.com</strong>.
        </p>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ps-slate)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Domain</div>
        <TextField value={domainValue} onChange={setDomainValue} placeholder="auroraresidences.com" />
        <div className="ps-modal-actions">
          <Btn variant="outline" onClick={() => setDomainFor(null)}>Cancel</Btn>
          <Btn
            variant="primary"
            onClick={() => {
              if (domainFor) onAssignDomain(domainFor.id, domainValue);
              setDomainFor(null);
            }}
            disabled={!domainValue.trim()}
          >
            Assign domain
          </Btn>
        </div>
      </Modal>

      <Modal open={!!deleteFor} onClose={() => setDeleteFor(null)} title="Delete landing page" width={440}>
        <p style={{ fontSize: 13.5, color: "var(--ps-slate)", lineHeight: 1.6, margin: 0 }}>
          Delete <strong style={{ color: "var(--ps-ink)" }}>{deleteFor?.name}</strong>? This cannot be undone. Published URLs will stop resolving.
        </p>
        <div className="ps-modal-actions">
          <Btn variant="outline" onClick={() => setDeleteFor(null)}>Cancel</Btn>
          <Btn
            variant="danger"
            onClick={() => {
              if (deleteFor) onDelete(deleteFor.id);
              setDeleteFor(null);
            }}
          >
            Delete page
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

function ActionIcon({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title: string }) {
  return (
    <button type="button" title={title} onClick={(e) => { e.stopPropagation(); onClick?.(); }} style={{ background: "none", border: "none", color: "var(--ps-muted)", cursor: "pointer", padding: 6, borderRadius: 7, display: "inline-flex" }}>
      {children}
    </button>
  );
}

const VERSIONS = [
  { name: "Latest — added CTA banner + countdown", time: "Today, 10:42 AM", user: "Aarav R.", icon: <Sparkles size={16} /> },
  { name: "Published — live to luxury.clientdomain.com", time: "Yesterday, 6:15 PM", user: "Aarav R.", icon: <Rocket size={16} /> },
  { name: "Refreshed pricing & floor plan data", time: "Yesterday, 4:02 PM", user: "Priya M.", icon: <BarChart3 size={16} /> },
  { name: "Duplicated from 'Luxury Apartments' template", time: "Aug 18, 11:20 AM", user: "System", icon: <Copy size={16} /> },
  { name: "Created page", time: "Aug 18, 11:18 AM", user: "Aarav R.", icon: <FilePlus2 size={16} /> },
];
