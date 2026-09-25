"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Icon } from "@/components/icons";
import {
  assignCrmLead,
  getCrmAssignableUsers,
  getCrmLeads,
} from "@/lib/api";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import type { CrmLead, CrmLeadStatus } from "@/lib/types";
import { leadDisplayName, leadDisplayPhone, leadDisplaySource } from "@/lib/lead-display";
import { AddLeadModal } from "@/components/org/add-lead-modal";
import { ImportLeadsModal, downloadLeadImportSample } from "@/components/org/import-leads-modal";
import { LeadStatusSelect } from "@/components/org/lead-status-select";
import { LEAD_STAGE_ORDER, StageBadge, useLeadStages } from "@/lib/lead-stages";
import "@/app/org/org.css";

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const leadName = leadDisplayName;
const leadPhone = leadDisplayPhone;

export default function OrgLeadsPage() {
  const searchParams = useSearchParams();
  const { isOrgAdmin, hasPermission } = useAuth();
  const { label: stageLabel } = useLeadStages();
  const admin = Boolean(isOrgAdmin?.());
  const canAssign = admin || hasPermission("crm", "edit");
  const canAdd = admin || hasPermission("crm", "add");

  const [leads, setLeads] = useState<CrmLead[] | null>(null);
  const [listTotal, setListTotal] = useState(0);
  const [kpi, setKpi] = useState({
    total: 0,
    unassigned: 0,
    new: 0,
    won: 0,
  });
  const [assignable, setAssignable] = useState<
    { id: string; name: string }[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState(() => searchParams.get("assignedTo") ?? "");
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sampleBusy, setSampleBusy] = useState(false);

  async function downloadSample() {
    setSampleBusy(true);
    try {
      await downloadLeadImportSample();
    } finally {
      setSampleBusy(false);
    }
  }

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getCrmLeads({
        search: search || undefined,
        status: (statusFilter || undefined) as CrmLeadStatus | undefined,
        assignedToId: assigneeFilter || undefined,
      });
      setLeads(res.data);
      setListTotal(res.total);
      setKpi({
        total: res.stats?.total ?? res.total,
        unassigned: res.stats?.unassigned ?? res.data.filter((l) => !l.assignedTo).length,
        new: res.stats?.new ?? res.data.filter((l) => l.status === "new").length,
        won: res.stats?.won ?? res.data.filter((l) => l.status === "won").length,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load leads.",
      );
    }
  }, [search, statusFilter, assigneeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    if (canAssign) {
      getCrmAssignableUsers()
        .then((res) => {
          if (!cancelled) setAssignable(res.data);
        })
        .catch(() => {
          if (!cancelled) setAssignable([]);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [canAssign]);

  const stats = kpi;

  const handleAssign = useCallback(
    async (lead: CrmLead, assignedToId: string | null, status?: CrmLeadStatus, note?: string) => {
      if (!canAssign || savingId) return;
      setSavingId(lead.id);
      setError(null);
      try {
        const result = await assignCrmLead(lead.id, {
          assignedToId,
          status,
          note,
        });
        setLeads((prev) =>
          prev
            ? prev.map((l) =>
              l.id === lead.id
                ? { ...l, assignedTo: result.assignedTo, ...(status ? { status } : {}) }
                : l,
            )
            : prev,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update lead.");
        throw e;
      } finally {
        setSavingId(null);
      }
    },
    [canAssign, savingId],
  );

  const assigneeOptions = useMemo(
    () => assignable?.map((a) => ({ id: a.id, name: a.name })) ?? [],
    [assignable],
  );

  const allSelected = useMemo(() => {
    if (!leads || leads.length === 0) return false;
    return leads.every((l) => selectedLeads.has(l.id));
  }, [leads, selectedLeads]);

  function toggleSelectAll() {
    if (!leads) return;
    if (allSelected) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map((l) => l.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 40 }}>
      {/* Top Header matching Screenshot 1 */}
      <div className="lc-head">
        <div>
          <div className="lc-eyebrow">
            <Icon name="activity" size={13} />
            <span>SALES</span>
          </div>
          <h1 className="lc-title">Lead Center</h1>
          <p className="lc-sub">All leads across projects – captured, assigned and worked to close.</p>
        </div>

        {admin || canAdd ? (
          <div className="lc-head-actions">
            <button className="lc-btn-outline" type="button" onClick={() => void downloadSample()} disabled={sampleBusy}>
              <Icon name="download" size={14} /> {sampleBusy ? "Preparing…" : "Sample CSV"}
            </button>
            <button className="lc-btn-outline" type="button" onClick={() => setImportOpen(true)}>
              <Icon name="document" size={14} /> Import CSV
            </button>
            <button className="lc-btn-primary" type="button" onClick={() => setAddOpen(true)}>
              <Icon name="plus" size={14} /> Add lead
            </button>
          </div>
        ) : null}
      </div>

      {importOpen ? (
        <ImportLeadsModal
          open
          onClose={() => setImportOpen(false)}
          onImported={() => void load()}
        />
      ) : null}
      <AddLeadModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(lead) => {
          setLeads((prev) => (prev ? [lead, ...prev] : [lead]));
          setListTotal((n) => n + 1);
          setKpi((prev) => ({
            ...prev,
            total: prev.total + 1,
            unassigned: lead.assignedTo ? prev.unassigned : prev.unassigned + 1,
            new: lead.status === "new" ? prev.new + 1 : prev.new,
            won: lead.status === "won" ? prev.won + 1 : prev.won,
          }));
        }}
      />

      {/* Tabs Row matching Screenshot 1 */}
      <div className="lc-tabs-bar">
        <div className="lc-main-tab">Lead Center</div>
        <div className="lc-filter-pills">
          <button
            type="button"
            className={`lc-filter-pill ${statusFilter === "" ? "active" : ""}`}
            onClick={() => setStatusFilter("")}
          >
            All Leads
          </button>
          <button
            type="button"
            className={`lc-filter-pill ${statusFilter === "follow_up" ? "active" : ""}`}
            onClick={() => setStatusFilter("follow_up")}
          >
            Follow Ups
          </button>
          <button
            type="button"
            className={`lc-filter-pill ${statusFilter === "site_visit" ? "active" : ""}`}
            onClick={() => setStatusFilter("site_visit")}
          >
            Site Visits
          </button>
          <button
            type="button"
            className={`lc-filter-pill ${statusFilter === "won" ? "active" : ""}`}
            onClick={() => setStatusFilter("won")}
          >
            Closures
          </button>
        </div>
      </div>

      {/* 4 Stat Cards with Pastel Icons & Sparklines */}
      <div className="lc-kpi-grid">
        <Reveal delay={1}>
          <div className="lc-kpi-card">
            <div className="lc-kpi-card-top">
              <div className="lc-kpi-icon" style={{ background: "#eff6ff", color: "#3b82f6" }}>
                <Icon name="users" size={20} />
              </div>
              <div>
                <div className="lc-kpi-label">Total Leads</div>
                <div className="lc-kpi-val"><CountUp value={stats.total} /></div>
              </div>
            </div>
            <div className="lc-kpi-sub">{admin ? "All across projects" : "Assigned to you"}</div>
            <svg className="lc-sparkline" width="96" height="38" viewBox="0 0 96 38" fill="none">
              <defs>
                <linearGradient id="grad-blue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 26 C 24 32, 42 12, 65 22 C 78 27, 86 14, 96 10 L 96 38 L 0 38 Z" fill="url(#grad-blue)" />
              <path d="M0 26 C 24 32, 42 12, 65 22 C 78 27, 86 14, 96 10" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </Reveal>

        <Reveal delay={2}>
          <div className="lc-kpi-card">
            <div className="lc-kpi-card-top">
              <div className="lc-kpi-icon" style={{ background: "#fff7ed", color: "#ea580c" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              </div>
              <div>
                <div className="lc-kpi-label">Unassigned</div>
                <div className="lc-kpi-val"><CountUp value={stats.unassigned} /></div>
              </div>
            </div>
            <div className="lc-kpi-sub">Awaiting routing</div>
            <svg className="lc-sparkline" width="96" height="38" viewBox="0 0 96 38" fill="none">
              <defs>
                <linearGradient id="grad-orange" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 28 C 22 30, 45 18, 68 25 C 80 29, 88 16, 96 12 L 96 38 L 0 38 Z" fill="url(#grad-orange)" />
              <path d="M0 28 C 22 30, 45 18, 68 25 C 80 29, 88 16, 96 12" stroke="#fdba74" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </Reveal>

        <Reveal delay={3}>
          <div className="lc-kpi-card">
            <div className="lc-kpi-card-top">
              <div className="lc-kpi-icon" style={{ background: "#f5f3ff", color: "#8b5cf6" }}>
                <Icon name="document" size={20} />
              </div>
              <div>
                <div className="lc-kpi-label">New</div>
                <div className="lc-kpi-val"><CountUp value={stats.new} /></div>
              </div>
            </div>
            <div className="lc-kpi-sub">Not yet contacted</div>
            <svg className="lc-sparkline" width="96" height="38" viewBox="0 0 96 38" fill="none">
              <defs>
                <linearGradient id="grad-purple" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 30 C 26 34, 46 16, 68 24 C 82 28, 90 15, 96 11 L 96 38 L 0 38 Z" fill="url(#grad-purple)" />
              <path d="M0 30 C 26 34, 46 16, 68 24 C 82 28, 90 15, 96 11" stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </Reveal>

        <Reveal delay={4}>
          <div className="lc-kpi-card">
            <div className="lc-kpi-card-top">
              <div className="lc-kpi-icon" style={{ background: "#f0fdf4", color: "#22c55e" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2" />
                  <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
                  <path d="M4 3h16v6a8 8 0 0 1-16 0V3Z" />
                  <path d="M12 17v4" />
                  <path d="M8 21h8" />
                </svg>
              </div>
              <div>
                <div className="lc-kpi-label">Won</div>
                <div className="lc-kpi-val"><CountUp value={stats.won} /></div>
              </div>
            </div>
            <div className="lc-kpi-sub">Closed deals</div>
            <svg className="lc-sparkline" width="96" height="38" viewBox="0 0 96 38" fill="none">
              <defs>
                <linearGradient id="grad-green" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0 29 C 24 32, 46 20, 68 26 C 80 30, 88 18, 96 14 L 96 38 L 0 38 Z" fill="url(#grad-green)" />
              <path d="M0 29 C 24 32, 46 20, 68 26 C 80 30, 88 18, 96 14" stroke="#86efac" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </Reveal>
      </div>

      {/* Main Table Card matching Screenshot 1 */}
      <Reveal delay={2}>
        <div className="lc-card">
          <div className="lc-toolbar">
            <div className="lc-search-wrap">
              <Icon
                name="search"
                size={14}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  pointerEvents: "none",
                }}
              />
              <input
                className="lc-search-input"
                placeholder="Search by name or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="lc-toolbar-controls" style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "nowrap", flexShrink: 0 }}>
              <select
                className="lc-select-pill"
                style={{ width: "auto" }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                {LEAD_STAGE_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {stageLabel(s)}
                  </option>
                ))}
              </select>

              {canAssign && (
                <select
                  className="lc-select-pill"
                  style={{ width: "auto" }}
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                >
                  <option value="">All Assignees</option>
                  {assigneeOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}

              <button className="lc-icon-btn" type="button" title="Filter options">
                <Icon name="filter" size={15} />
              </button>

              <button className="lc-icon-btn" type="button" onClick={load} title="Refresh leads">
                <Icon name="refresh" size={15} />
              </button>
            </div>
          </div>

          {error ? (
            <div className="empty" style={{ padding: 40, textAlign: "center" }}>
              <div className="muted">{error}</div>
              <button className="btn btn-ghost" onClick={load} style={{ marginTop: 12 }}>
                <Icon name="refresh" size={14} /> Retry
              </button>
            </div>
          ) : leads === null ? (
            <div className="empty" style={{ padding: 40, textAlign: "center" }}>
              <span className="muted">Loading leads…</span>
            </div>
          ) : leads.length === 0 ? (
            <div className="empty" style={{ padding: 40, textAlign: "center" }}>
              <span className="muted">
                {admin
                  ? "No leads yet. Publish a landing page form to start capturing them."
                  : "No leads assigned to you yet."}
              </span>
            </div>
          ) : (
            <div className="lc-tbl-wrap">
              <table className="lc-tbl">
                <thead>
                  <tr>
                    <th style={{ width: 44, paddingLeft: 20 }}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        style={{ cursor: "pointer", width: 16, height: 16, accentColor: "#2563eb" }}
                      />
                    </th>
                    <th>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                        LEAD <span style={{ opacity: 0.4, fontSize: 11 }}>⇅</span>
                      </div>
                    </th>
                    <th>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                        SOURCE <span style={{ opacity: 0.4, fontSize: 11 }}>⇅</span>
                      </div>
                    </th>
                    <th>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                        ASSIGNED TO <span style={{ opacity: 0.4, fontSize: 11 }}>⇅</span>
                      </div>
                    </th>
                    <th>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                        STATUS <span style={{ opacity: 0.4, fontSize: 11 }}>⇅</span>
                      </div>
                    </th>
                    {canAssign ? (
                      <th>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                          ACTIONS <span style={{ opacity: 0.4, fontSize: 11 }}>⇅</span>
                        </div>
                      </th>
                    ) : null}
                    <th style={{ width: 44 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => {
                    const name = leadName(lead);
                    const phone = leadPhone(lead);
                    const isSelected = selectedLeads.has(lead.id);

                    return (
                      <tr key={lead.id} style={{ background: isSelected ? "#f8fafc" : undefined }}>
                        <td style={{ paddingLeft: 20 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(lead.id)}
                            style={{ cursor: "pointer", width: 16, height: 16, accentColor: "#2563eb" }}
                          />
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div className="lc-avatar-teal">
                              {initialsFor(name)}
                            </div>
                            <div>
                              <Link
                                href={`/org/leads/${lead.id}`}
                                style={{
                                  color: "#0f172a",
                                  fontWeight: 600,
                                  fontSize: 13.5,
                                  textDecoration: "none",
                                }}
                              >
                                {name}
                              </Link>
                              {phone ? (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    color: "#64748b",
                                    fontSize: 12.5,
                                    marginTop: 2,
                                  }}
                                >
                                  <span>{phone}</span>
                                  <a
                                    href={`tel:${phone}`}
                                    style={{ color: "#64748b", display: "inline-flex", alignItems: "center" }}
                                    title="Call lead"
                                  >
                                    <Icon name="phone" size={11} />
                                  </a>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="lc-badge-source">
                            {leadDisplaySource(lead)}
                          </span>
                        </td>
                        <td>
                          {lead.assignedTo ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div className="lc-avatar-orange">
                                {initialsFor(lead.assignedTo.name)}
                              </div>
                              <span style={{ fontWeight: 500, color: "#0f172a", fontSize: 13.5 }}>
                                {lead.assignedTo.name}
                              </span>
                            </div>
                          ) : lead.projectTeam?.count ? (
                            <span style={{ fontWeight: 500, color: "#64748b" }} title={lead.projectTeam.names.join(", ")}>
                              Project team
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          {canAssign ? (
                            <LeadStatusSelect
                              value={lead.status}
                              disabled={savingId === lead.id}
                              onConfirm={(status, note) =>
                                handleAssign(lead, lead.assignedTo?.id ?? null, status, note)
                              }
                            />
                          ) : (
                            <StageBadge status={lead.status} />
                          )}
                        </td>
                        {canAssign ? (
                          <td>
                            <select
                              className="lc-actions-select"
                              value={lead.assignedTo?.id ?? ""}
                              disabled={savingId === lead.id}
                              onChange={(e) =>
                                handleAssign(lead, e.target.value || null)
                              }
                            >
                              <option value="">Unassigned</option>
                              {assigneeOptions.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          </td>
                        ) : null}
                        <td>
                          <Link
                            href={`/org/leads/${lead.id}`}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#64748b",
                              cursor: "pointer",
                              padding: 6,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 6,
                            }}
                            title="View lead details"
                          >
                            <Icon name="dots" size={16} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Table Footer matching Screenshot 1 */}
              <div className="lc-footer">
                <div>
                  Showing {leads.length > 0 ? `1–${leads.length}` : "0"} of {listTotal || leads.length} leads
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button className="lc-page-btn" type="button" title="Previous page">
                    <Icon name="chevron-left" size={13} />
                  </button>
                  <button className="lc-page-btn active" type="button">
                    1
                  </button>
                  <button className="lc-page-btn" type="button" title="Next page">
                    <Icon name="chevron-right" size={13} />
                  </button>
                  <select
                    className="lc-select-pill"
                    style={{ height: 32, padding: "0 28px 0 10px", fontSize: 12.5 }}
                    defaultValue="10"
                  >
                    <option value="10">10 / page</option>
                    <option value="25">25 / page</option>
                    <option value="50">50 / page</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}