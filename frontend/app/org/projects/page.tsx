"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Icon } from "@/components/icons";
import "@/app/admin-console/superadmin.css";
import "./projects.css";
import type {
  ProjectListRow,
  ProjectsListResponse,
  ProjectStatus,
} from "@/lib/types";

const LIMIT = 20;

const STATUS_TABS = ["All", "Active", "Inactive"] as const;
const STATUS_FOR_TAB: (ProjectStatus | undefined)[] = [
  undefined,
  "active",
  "inactive",
];

function compactRupees(value: number | null): string {
  if (value == null) return "—";
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(2).replace(/\.?0+$/, "")} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function priceRange(row: ProjectListRow): string {
  if (row.priceMin == null && row.priceMax == null) return "—";
  if (row.priceMin != null && row.priceMax != null) {
    return `${compactRupees(row.priceMin)} – ${compactRupees(row.priceMax)}`;
  }
  return compactRupees(row.priceMin ?? row.priceMax);
}

function managerInitials(name: string | null | undefined): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const COVER_GRADIENTS = [
  "linear-gradient(135deg, #5eead4, #0d9488)",
  "linear-gradient(135deg, #c7d2fe, #818cf8)",
  "linear-gradient(135deg, #fbbf24, #f97316)",
  "linear-gradient(135deg, #f0abfc, #a855f7)",
  "linear-gradient(135deg, #fda4af, #e11d48)",
];

function getCoverGradient(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return COVER_GRADIENTS[Math.abs(hash) % COVER_GRADIENTS.length];
}

export default function OrgProjectsPage() {
  const { accessToken } = useAuth();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tabIndex, setTabIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"grid" | "list">("grid");

  const [result, setResult] = useState<ProjectsListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [counts, setCounts] = useState<{
    total: number;
    active: number;
    inactive: number;
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!accessToken) return;
    const headers = { Authorization: `Bearer ${accessToken}` };
    Promise.all([
      apiFetch<ProjectsListResponse>("/org/projects?limit=1", { headers }),
      apiFetch<ProjectsListResponse>("/org/projects?limit=1&status=active", { headers }),
      apiFetch<ProjectsListResponse>("/org/projects?limit=1&status=inactive", { headers }),
    ])
      .then(([all, active, inactive]) =>
        setCounts({ total: all.total, active: active.total, inactive: inactive.total })
      )
      .catch(() => setCounts(null));
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (search) params.set("search", search);
    const status = STATUS_FOR_TAB[tabIndex];
    if (status) params.set("status", status);

    apiFetch<ProjectsListResponse>(`/org/projects?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(setResult)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load projects."))
      .finally(() => setLoading(false));
  }, [accessToken, page, search, tabIndex]);

  const rows = result?.data ?? [];
  const total = result?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to = Math.min(page * LIMIT, total);
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const isFiltered = Boolean(search || STATUS_FOR_TAB[tabIndex]);

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Icon name="building" size={14} /> Sales</div>
          <h1>Projects</h1>
          <div className="sub">Manage every development — inventory, availability, pricing, ad spend and leads. Built for developers, brokers &amp; channel partners.</div>
        </div>
        <div className="actions">
          <Link href="/org/projects/add-new-project" className="btn btn-primary">＋ New project</Link>
        </div>
      </div>

      <div className="psub reveal in" data-delay="1">
        <Link href="/org/projects" className="active">All Projects</Link>
        <Link href="/org/projects/all-units">All Units</Link>
      </div>

      <div className="grid g4 reveal in" data-delay="1" style={{ marginBottom: 20 }}>
        <Reveal delay={1}>
          <div className="stat">
            <div className="top">
              <span className="label">Active projects</span>
              <span className="ic ic-indigo"><Icon name="building" size={16} /></span>
            </div>
            <div className="value"><CountUp value={counts?.active ?? 0} /></div>
            <div className="delta up">currently selling</div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="stat">
            <div className="top">
              <span className="label">Total projects</span>
              <span className="ic ic-sky"><Icon name="building" size={16} /></span>
            </div>
            <div className="value"><CountUp value={counts?.total ?? 0} /></div>
            <div className="delta">across all statuses</div>
          </div>
        </Reveal>
        <Reveal delay={3}>
          <div className="stat">
            <div className="top">
              <span className="label">Inactive</span>
              <span className="ic ic-amber"><Icon name="billing" size={16} /></span>
            </div>
            <div className="value"><CountUp value={counts?.inactive ?? 0} /></div>
            <div className="delta">paused or sold out</div>
          </div>
        </Reveal>
        <Reveal delay={4}>
          <div className="stat">
            <div className="top">
              <span className="label">Unit types</span>
              <span className="ic ic-violet"><Icon name="document" size={16} /></span>
            </div>
            <div className="value"><CountUp value={rows.reduce((s, r) => s + r.unitTypeCount, 0)} /></div>
            <div className="delta">configurations</div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={1}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
          <div className="tb-search" style={{ flex: 1, minWidth: 220, maxWidth: 340, position: "static", margin: 0 }}>
            <span className="si"><Icon name="search" size={14} /></span>
            <input className="inp" style={{ paddingLeft: 40 }} placeholder="Search projects…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <div className="seg">
            {STATUS_TABS.map((t, i) => (
              <span key={t} className={tabIndex === i ? "on" : ""} onClick={() => { setTabIndex(i); setPage(1); }}>{t}</span>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div className="view-toggle">
            <span className={view === "grid" ? "on" : ""} onClick={() => setView("grid")}>▦ Grid</span>
            <span className={view === "list" ? "on" : ""} onClick={() => setView("list")}>☰ List</span>
          </div>
        </div>
      </Reveal>

      {view === "grid" ? (
        <Reveal delay={2}>
          <div className="pgrid">
            {loadError ? (
              <div className="card"><div className="card-b"><p className="muted">{loadError}</p></div></div>
            ) : loading ? (
              <div className="card"><div className="card-b"><p className="muted">Loading projects…</p></div></div>
            ) : rows.length === 0 ? (
              <div className="card"><div className="card-b"><p className="muted">{isFiltered ? "No projects match this filter." : "No projects yet — create one to get started."}</p></div></div>
            ) : (
              rows.map((p) => (
                <Link key={p.id} href={`/org/projects/${p.id}`} className="pcard" style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="cover" style={{ background: getCoverGradient(p.id), display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.9)", fontSize: 34 }}>
                    <span>🏗️</span>
                    <span className="tag">{[p.location, p.reraId].filter(Boolean).join(" · ") || "Project"}</span>
                    <span className="st">
                      <span className={`badge ${p.status === "active" ? "b-green" : "b-gray"}`}>{p.status === "active" ? "Active" : "Inactive"}</span>
                    </span>
                  </div>
                  <div className="pb">
                    <div>
                      <h3>{p.name}</h3>
                      <div className="loc">📍 {[p.location, p.reraId].filter(Boolean).join(" · ") || "—"}</div>
                    </div>
                    <div className="pmeta">
                      <div><span className="k">Starting</span><b>{compactRupees(p.priceMin)}</b></div>
                      <div><span className="k">Unit types</span><b>{p.unitTypeCount}</b></div>
                      <div><span className="k">Manager</span><b><span className="u"><span className="av" style={{ width: 20, height: 20, fontSize: 9 }}>{managerInitials(p.manager?.name)}</span></span></b></div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span className="btn btn-soft btn-sm">Open</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Reveal>
      ) : (
        <Reveal delay={2}>
          <div className="card">
            <div className="card-h">
              <span className="t">All projects</span>
              <span className="x muted">{loading ? "Loading…" : `Showing ${from}–${to} of ${total}`}</span>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Manager</th>
                    <th>Status</th>
                    <th>Price range</th>
                    <th>Unit types</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loadError ? (
                    <tr><td colSpan={6} className="muted">{loadError}</td></tr>
                  ) : !loading && rows.length === 0 ? (
                    <tr><td colSpan={6} className="muted">{isFiltered ? "No projects match this filter." : "No projects yet."}</td></tr>
                  ) : (
                    rows.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link href={`/org/projects/${p.id}`} style={{ fontWeight: 600, color: "var(--brand)" }}>{p.name}</Link>
                          <div className="sm muted">{[p.location, p.reraId ? `RERA ${p.reraId}` : null].filter(Boolean).join(" · ") || "—"}</div>
                        </td>
                        <td>
                          <div className="u">
                            <span className="av">{managerInitials(p.manager?.name)}</span>
                            <span className="nm">{p.manager?.name ?? "Unassigned"}</span>
                          </div>
                        </td>
                        <td>
                          {p.status === "active" ? (
                            <span className="badge b-green">Active</span>
                          ) : (
                            <span className="badge b-gray">Inactive</span>
                          )}
                        </td>
                        <td>{priceRange(p)}</td>
                        <td>{p.unitTypeCount}</td>
                        <td><Link href={`/org/projects/${p.id}`} className="btn btn-ghost btn-sm">Open</Link></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 ? (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 18px" }}>
                <button className="btn btn-ghost btn-sm" type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</button>
                <span className="muted" style={{ fontSize: 12.5, alignSelf: "center" }}>Page {page} of {totalPages}</span>
                <button className="btn btn-ghost btn-sm" type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next →</button>
              </div>
            ) : null}
          </div>
        </Reveal>
      )}
    </>
  );
}
