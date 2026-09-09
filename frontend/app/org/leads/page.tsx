"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Icon } from "@/components/icons";
import { LeadsPageHead } from "@/components/org/crm-tabs";
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
import { LeadStatusSelect } from "@/components/org/lead-status-select";
import { LEAD_STAGE_ORDER, StageBadge, useLeadStages } from "@/lib/lead-stages";

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const leadName = leadDisplayName;
const leadPhone = leadDisplayPhone;

function sourceBadgeClass(source: string | null): string {
  switch (source) {
    case "Meta":
      return "b-indigo";
    case "Google":
      return "b-sky";
    case "WhatsApp":
      return "b-green";
    case "Landing":
    default:
      return "b-amber";
  }
}

export default function OrgLeadsPage() {
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
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);

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

  return (
    <>
      <LeadsPageHead
        active="lead-center"
        actions={
          admin || canAdd ? (
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}>＋ Add lead</button>
          ) : undefined
        }
      />
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

      <Reveal delay={1}>
        <div style={{ marginBottom: 20 }}>
          <div className="seg-wrap">
            <div className="seg">
              <button 
                className={statusFilter === "" ? "on" : ""} 
                onClick={() => setStatusFilter("")}
              >
                All Leads
              </button>
              <button 
                className={statusFilter === "follow_up" ? "on" : ""} 
                onClick={() => setStatusFilter("follow_up")}
              >
                Follow Ups
              </button>
              <button 
                className={statusFilter === "site_visit" ? "on" : ""} 
                onClick={() => setStatusFilter("site_visit")}
              >
                Site Visits
              </button>
              <button 
                className={statusFilter === "won" ? "on" : ""} 
                onClick={() => setStatusFilter("won")}
              >
                Closures
              </button>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="grid g4" style={{ marginBottom: 20 }}>
        <Reveal delay={1}>
          <div className="stat">
            <div className="top"><span className="label">Total leads</span><span className="ic ic-indigo"><Icon name="download" size={16} /></span></div>
            <div className="value"><CountUp value={stats.total} /></div>
            <div className="delta">{admin ? "All across projects" : "Assigned to you"}</div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="stat">
            <div className="top"><span className="label">Unassigned</span><span className="ic ic-rose"><Icon name="alert" size={16} /></span></div>
            <div className="value"><CountUp value={stats.unassigned} /></div>
            <div className="delta">Awaiting routing</div>
          </div>
        </Reveal>
        <Reveal delay={3}>
          <div className="stat">
            <div className="top"><span className="label">New</span><span className="ic ic-amber"><Icon name="bell" size={16} /></span></div>
            <div className="value"><CountUp value={stats.new} /></div>
            <div className="delta">Not yet contacted</div>
          </div>
        </Reveal>
        <Reveal delay={4}>
          <div className="stat">
            <div className="top"><span className="label">Won</span><span className="ic ic-green"><Icon name="star" size={16} /></span></div>
            <div className="value"><CountUp value={stats.won} /></div>
            <div className="delta">Closed deals</div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={2}>
        <div className="card">
          <div className="card-h" style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <div className="tb-search" style={{ maxWidth: 320, position: "static", margin: 0 }}>
              <span className="si"><Icon name="search" size={14} /></span>
              <input
                placeholder="Search by name or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <select
                className="inp"
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
                  className="inp"
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
            <div className="tbl-wrap">
              {listTotal > leads.length ? (
                <div className="help" style={{ padding: "10px 16px 0" }}>
                  Showing {leads.length} of {listTotal} leads
                </div>
              ) : null}
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Source</th>
                    <th>Assigned To</th>
                    <th>Status</th>
                    {canAssign ? <th>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => {
                    const name = leadName(lead);
                    const phone = leadPhone(lead);
                    return (
                      <tr key={lead.id}>
                        <td>
                          <span className="u">
                            <span className={`av ${phone ? "a2" : ""}`}>{initialsFor(name)}</span>
                            <span>
                              <Link className="nm" href={`/org/leads/${lead.id}`}>{name}</Link>
                              {phone ? <br /> : null}
                              {phone ? <span className="sm">{phone}</span> : null}
                            </span>
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${sourceBadgeClass(lead.source)}`}>
                            {leadDisplaySource(lead)}
                          </span>
                        </td>
                        <td>
                          {lead.assignedTo ? (
                            <span className="u">
                              <span className="av a3">{initialsFor(lead.assignedTo.name)}</span>
                              <span className="nm">{lead.assignedTo.name}</span>
                            </span>
                          ) : (
                            <span className="muted">Unassigned</span>
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
                              className="inp"
                              style={{ width: "auto" }}
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Reveal>
    </>
  );
}