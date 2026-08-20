"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  Building2,
  Clock,
  Copy,
  Crown,
  Eye,
  FileEdit,
  FileText,
  Globe,
  Home,
  Inbox,
  Landmark,
  LayoutGrid,
  PauseCircle,
  PenLine,
  Plus,
  RefreshCcw,
  Rocket,
  Search,
  SquarePen,
  Trash2,
  TreePine,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Reveal } from "@/components/superadmin/reveal";
import type { LpPage, LpPageCategory, LpPageStatus } from "@/lib/lp-types";

type PageRow = LpPage & { leadCount?: number };

const CATEGORY_LABELS: Record<LpPageCategory, string> = {
  property_project: "Project",
  residential: "Residential",
  luxury: "Luxury",
  commercial: "Commercial",
  apartments: "Apartments",
  villas: "Villas",
  plots: "Plots",
  campaign: "Campaign",
};

const CATEGORY_ICON: Record<LpPageCategory, React.ComponentType<{ size?: number | string; color?: string }>> = {
  property_project: Building2,
  residential: Home,
  luxury: Crown,
  commercial: Landmark,
  apartments: Building2,
  villas: TreePine,
  plots: Landmark,
  campaign: Rocket,
};

const STATUS_STYLE: Record<LpPageStatus, { bg: string; color: string; dot: string }> = {
  draft:     { bg: "#fef9c3", color: "#a16207", dot: "#f59e0b" },
  published: { bg: "#dcfce7", color: "#15803d", dot: "#16a34a" },
  archived:  { bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" },
};

const CATEGORY_GRAD: Record<LpPageCategory, string> = {
  property_project: "linear-gradient(135deg,#4f46e5,#6366f1 55%,#0ea5e9)",
  residential:      "linear-gradient(135deg,#0d9488,#16a34a 60%,#a3e635)",
  luxury:           "linear-gradient(135deg,#1e1b4b,#4338ca 55%,#7c3aed)",
  commercial:       "linear-gradient(135deg,#374151,#6b7280 55%,#9ca3af)",
  apartments:       "linear-gradient(135deg,#0ea5e9,#4f46e5 60%,#1e3a8a)",
  villas:           "linear-gradient(135deg,#d97706,#f59e0b 55%,#fcd34d)",
  plots:            "linear-gradient(135deg,#15803d,#16a34a 60%,#4ade80)",
  campaign:         "linear-gradient(135deg,#7c3aed,#db2777 60%,#f59e0b)",
};

export default function LandingPagesPage() {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LpPageStatus>("all");

const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createCategory, setCreateCategory] = useState<LpPageCategory>("residential");
  const [createDesc, setCreateDesc] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PageRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await apiFetch<{ data: PageRow[] } | PageRow[]>("/admin/landing-pages", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const list = Array.isArray(res) ? res : res.data;
      setPages(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(
    () =>
      pages.filter(
        (p) =>
          (statusFilter === "all" || p.status === statusFilter) &&
          (search.trim() === "" ||
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.slug.toLowerCase().includes(search.toLowerCase())),
      ),
    [pages, search, statusFilter],
  );

  async function createPage() {
    if (!createName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await apiFetch<LpPage>("/admin/landing-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken as string}` },
        body: JSON.stringify({ name: createName.trim(), category: createCategory, description: createDesc.trim() || undefined }),
      });
      setShowCreate(false);
      setCreateName("");
      setCreateDesc("");
      setCreateCategory("residential");
      if (created.id) {
        router.push(`/superadmin/landing-pages/${created.id}/builder`);
      } else {
        await load();
      }
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Failed to create page");
    } finally {
      setCreating(false);
    }
  }

  async function setStatus(page: PageRow, status: LpPageStatus) {
    try {
      await apiFetch(`/admin/landing-pages/${page.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken as string}` },
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err) { console.error(err); }
  }

async function duplicate(page: PageRow) {
    try {
      await apiFetch(`/admin/landing-pages/${page.id}/duplicate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken as string}` },
      });
      await load();
    } catch (err) { console.error(err); }
  }

  async function removePage() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiFetch(`/admin/landing-pages/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken as string}` },
      });
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Failed to delete page");
    } finally {
      setDeleting(false);
    }
  }

  const stats = {
    total: pages.length,
    published: pages.filter((p) => p.status === "published").length,
    draft: pages.filter((p) => p.status === "draft").length,
  };

  return (
    <>
<div className="page-head reveal in">
        <div>
          <div className="eyebrow"><LayoutGrid size={12} /> Product</div>
          <h1>Landing Pages</h1>
          <div className="sub">
            Build, publish, and manage real estate landing pages for projects, campaigns, and listings.
          </div>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => void load()}><RefreshCcw size={14} /> Refresh</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Create Landing Page
          </button>
        </div>
      </div>

      <Reveal delay={1}>
<div className="grid g3" style={{ marginBottom: 20 }}>
          {[
            { label: "Total Pages", val: stats.total, ic: FileText, cls: "ic-indigo" },
            { label: "Published", val: stats.published, ic: Rocket, cls: "ic-green" },
            { label: "Drafts", val: stats.draft, ic: FileEdit, cls: "ic-amber" },
          ].map((s) => (
            <div key={s.label} className="stat">
              <div className="top">
                <span className="label">{s.label}</span>
                <span className={`ic ${s.cls}`}><s.ic size={16} /></span>
              </div>
              <div className="value">{s.val}</div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={2}>
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
<div style={{ position: "relative", flex: "1 1 240px", maxWidth: 320 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--faint)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or slug…"
              className="inp"
              style={{ paddingLeft: 32, width: "100%" }}
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="inp" style={{ width: 160 }}>
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </Reveal>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>Loading landing pages…</div>
      ) : filtered.length === 0 ? (
        <Reveal delay={3}>
<div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--faint)" }}><LayoutGrid size={40} /></div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
              {search || statusFilter !== "all" ? "No pages match your filters" : "No landing pages yet"}
            </div>
            <div className="muted" style={{ marginBottom: 20 }}>
              {search || statusFilter !== "all" ? "Try clearing the search or filter." : "Create your first real estate landing page to get started."}
            </div>
            {!search && statusFilter === "all" ? (
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Landing Page</button>
            ) : null}
          </div>
        </Reveal>
      ) : (
        <div className="grid g3">
          {filtered.map((page, i) => (
<LandingPageCard
              key={page.id}
              page={page}
              delay={i + 3}
              onDuplicate={() => void duplicate(page)}
              onSetStatus={(s) => void setStatus(page, s)}
              onDelete={() => setDeleteTarget(page)}
            />
          ))}
        </div>
      )}

      {showCreate ? (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 20 }}
          onClick={() => setShowCreate(false)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: 32, width: 480, maxWidth: "100%", boxShadow: "0 24px 80px rgba(15,23,42,.2)" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>Create a landing page</h2>
            <p style={{ margin: "0 0 20px", color: "var(--muted)", fontSize: 13.5 }}>
              Build a drag-and-drop real estate page for a project, campaign or listing.
            </p>

            <div className="field">
              <label>Page name</label>
              <input autoFocus className="inp" value={createName} onChange={(e) => setCreateName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && createName.trim()) void createPage(); }} placeholder="e.g. Lakeside Villas – Phase 2 Launch" />
            </div>
            <div className="field">
              <label>Category</label>
              <select className="inp" value={createCategory} onChange={(e) => setCreateCategory(e.target.value as LpPageCategory)}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Description <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span></label>
              <input className="inp" value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} placeholder="Short description for internal reference" />
            </div>

            {createError ? (
              <div style={{ color: "var(--rose)", fontSize: 13, marginTop: 12, background: "var(--rose-050)", padding: "8px 12px", borderRadius: 8 }}>{createError}</div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
              <button className="btn btn-ghost" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" type="button" onClick={() => void createPage()} disabled={creating || !createName.trim()}>
                {creating ? "Creating…" : "Create & Open Builder →"}
              </button>
            </div>
          </div>
        </div>
) : null}

      {deleteTarget ? (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 20 }}
          onClick={() => { if (!deleting) setDeleteTarget(null); }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: 32, width: 440, maxWidth: "100%", boxShadow: "0 24px 80px rgba(15,23,42,.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ width: 42, height: 42, borderRadius: 12, background: "var(--rose-050)", color: "var(--rose)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Trash2 size={19} />
              </span>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>Delete landing page?</h2>
            </div>
            <p style={{ margin: "0 0 6px", color: "var(--ink-2)", fontSize: 13.5, lineHeight: 1.6 }}>
              <strong>"{deleteTarget.name}"</strong> will be permanently deleted.
            </p>
            {deleteTarget.leadCount != null && deleteTarget.leadCount > 0 ? (
              <p style={{ margin: "0 0 6px", color: "var(--rose)", fontSize: 13, fontWeight: 600 }}>
                This page has {deleteTarget.leadCount} lead{deleteTarget.leadCount !== 1 ? "s" : ""} — they will be deleted too.
              </p>
            ) : null}
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
              This action cannot be undone.
            </p>

            {deleteError ? (
              <div style={{ color: "var(--rose)", fontSize: 13, marginTop: 12, background: "var(--rose-050)", padding: "8px 12px", borderRadius: 8 }}>{deleteError}</div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
              <button className="btn btn-ghost" type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button className="btn btn-danger" type="button" onClick={() => void removePage()} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete page"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function LandingPageCard({
  page,
  delay,
  onDuplicate,
  onSetStatus,
  onDelete,
}: {
  page: PageRow;
  delay: number;
  onDuplicate: () => void;
  onSetStatus: (s: LpPageStatus) => void;
  onDelete: () => void;
}) {
  const st = STATUS_STYLE[page.status];
  const cat = page.category as LpPageCategory;
  const CategoryIcon = CATEGORY_ICON[cat] ?? Rocket;
  const grad = page.thumbnail ? undefined : CATEGORY_GRAD[cat] ?? CATEGORY_GRAD.campaign;
  const domainVal = (page.domain as Record<string, string> | null)?.customDomain ?? (page.domain as Record<string, string> | null)?.subdomain ?? null;

  return (
    <Reveal delay={delay}>
      <div className="card hover" style={{ padding: 0, display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Cover */}
        <Link
          href={`/superadmin/landing-pages/${page.id}/builder`}
          style={{
            display: "block",
            height: 168,
            background: page.thumbnail ? `url(${page.thumbnail}) center/cover` : grad,
            position: "relative",
            flexShrink: 0,
            textDecoration: "none",
            borderRadius: "18px 18px 0 0",
            overflow: "hidden",
          }}
        >
          <span style={{ position: "absolute", top: 10, left: 10, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color, padding: "3px 10px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 5, boxShadow: "0 1px 4px rgba(14,21,37,.12)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot, display: "inline-block" }} />
            {page.status.charAt(0).toUpperCase() + page.status.slice(1)}
          </span>
          <span style={{ position: "absolute", top: 10, right: 10, fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.2)", color: "#fff", padding: "3px 10px", borderRadius: 999, backdropFilter: "blur(4px)", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <CategoryIcon size={11} /> {CATEGORY_LABELS[cat] ?? page.category}
          </span>
          {page.leadCount != null ? (
            <span style={{ position: "absolute", bottom: 10, left: 10, fontSize: 11, fontWeight: 600, background: "rgba(15,23,42,.55)", color: "#fff", padding: "3px 10px", borderRadius: 999, backdropFilter: "blur(4px)", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Inbox size={11} /> {page.leadCount} lead{page.leadCount !== 1 ? "s" : ""}
            </span>
          ) : null}
          <span style={{ position: "absolute", bottom: 10, right: 10, fontSize: 11, fontWeight: 500, background: "rgba(15,23,42,.55)", color: "#fff", padding: "3px 10px", borderRadius: 999, backdropFilter: "blur(4px)", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Clock size={11} /> {formatRelative(page.updatedAt)}
          </span>
        </Link>

        {/* Body */}
        <div className="card-b" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 18px 18px" }}>
          <Link href={`/superadmin/landing-pages/${page.id}/builder`} style={{ textDecoration: "none" }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--ink)", lineHeight: 1.3 }}>{page.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, fontFamily: "var(--font-mono), monospace" }}>/{page.slug}</div>
          </Link>

          {domainVal ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "14px 0 16px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: "var(--ink-2)", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 8, padding: "4px 9px" }}>
                <Globe size={12} style={{ color: "var(--muted)" }} /> {domainVal}
              </span>
            </div>
          ) : (
            <div style={{ margin: "12px 0" }} />
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, marginTop: "auto", alignItems: "center" }}>
            <Link href={`/superadmin/landing-pages/${page.id}/builder`} className="btn btn-soft btn-sm" style={{ flex: 1, justifyContent: "center", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <SquarePen size={13} /> Edit
            </Link>
            {page.status === "published" ? (
              <a href={`/lp/${page.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: "center", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Eye size={13} /> View
              </a>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: "center", color: "var(--green)", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => onSetStatus("published")}>
                <Rocket size={13} /> Publish
              </button>
            )}

            <div style={{ display: "flex", gap: 4, alignItems: "center", marginLeft: 2 }}>
              <button type="button" className="btn btn-ghost btn-sm" title="Duplicate" onClick={onDuplicate} style={{ padding: "5px 8px", display: "inline-flex", alignItems: "center" }}>
                <Copy size={14} />
              </button>
              {page.status === "published" ? (
                <button type="button" className="btn btn-ghost btn-sm" title="Unpublish" onClick={() => onSetStatus("draft")} style={{ padding: "5px 8px", display: "inline-flex", alignItems: "center" }}>
                  <PauseCircle size={14} />
                </button>
              ) : null}
              {page.status !== "archived" ? (
                <button type="button" className="btn btn-ghost btn-sm" title="Archive" onClick={() => onSetStatus("archived")} style={{ padding: "5px 8px", display: "inline-flex", alignItems: "center" }}>
                  <Archive size={14} />
                </button>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" title="Restore" onClick={() => onSetStatus("draft")} style={{ padding: "5px 8px", display: "inline-flex", alignItems: "center" }}>
                  <RefreshCcw size={14} />
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm" title="Delete" onClick={onDelete} style={{ padding: "5px 8px", display: "inline-flex", alignItems: "center", color: "var(--rose)" }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
