"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Icon } from "@/components/icons";
import { ProjectPageHead } from "@/components/org/project-tabs";
import { assignCrmLead, getCrmAssignableUsers, getCrmLeads } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { CrmLead, CrmLeadStatus } from "@/lib/types";
import "@/app/org/org.css";

const STATUS_BADGE: Record<CrmLeadStatus, string> = {
  new: "b-gray",
  contacted: "b-sky",
  follow_up: "b-amber",
  site_visit: "b-indigo",
  negotiation: "b-violet",
  won: "b-green",
  lost: "b-rose",
};

const STATUS_LABEL: Record<CrmLeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  follow_up: "Follow-up",
  site_visit: "Site Visit",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

const ALL_STATUSES = Object.keys(STATUS_LABEL) as CrmLeadStatus[];

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function leadName(lead: CrmLead): string {
  const full =
    typeof lead.data?.fullName === "string"
      ? lead.data.fullName
      : typeof lead.data?.name === "string"
        ? lead.data.name
        : null;
  return full || lead.formName || "Unnamed lead";
}

function leadPhone(lead: CrmLead): string {
  const phone =
    typeof lead.data?.phone === "string"
      ? lead.data.phone
      : typeof lead.data?.phoneNumber === "string"
        ? lead.data.phoneNumber
        : null;
  return phone || "";
}

function sourceBadgeClass(source: string | null): string {
  switch (source) {
    case "Meta": return "b-indigo";
    case "Google": return "b-sky";
    case "WhatsApp": return "b-green";
    default: return "b-amber";
  }
}

export default function OrgProjectLeadsPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? "";
  const { isOrgAdmin, hasPermission } = useAuth();
  const canAssign = isOrgAdmin() || hasPermission("crm", "edit");
  const canAdd = isOrgAdmin() || hasPermission("crm", "add");
  const [leads, setLeads] = useState<CrmLead[] | null>(null);
  const [assignable, setAssignable] = useState<{ id: string; name: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setError(null);
    try {
      const res = await getCrmLeads({ projectId });
      setLeads(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leads.");
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let cancelled = false;
    if (canAssign) {
      getCrmAssignableUsers()
        .then((res) => { if (!cancelled) setAssignable(res.data); })
        .catch(() => { if (!cancelled) setAssignable([]); });
    }
    return () => { cancelled = true; };
  }, [canAssign]);

  const stats = useMemo(() => {
    const current = leads ?? [];
    return {
      total: current.length,
      new: current.filter((l) => l.status === "new").length,
      siteVisits: current.filter((l) => l.status === "site_visit").length,
      won: current.filter((l) => l.status === "won").length,
    };
  }, [leads]);

  const handleAssign = useCallback(async (lead: CrmLead, assignedToId: string | null, status?: CrmLeadStatus) => {
    if (!canAssign || savingId) return;
    setSavingId(lead.id);
    setError(null);
    try {
      const result = await assignCrmLead(lead.id, { assignedToId, status });
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
    } finally {
      setSavingId(null);
    }
  }, [canAssign, savingId]);

  const assigneeOptions = useMemo(
    () => assignable?.map((a) => ({ id: a.id, name: a.name })) ?? [],
    [assignable],
  );

  return (
    <>
      <ProjectPageHead active="leads" actions={canAdd ? <button className="btn btn-primary">＋ Add lead</button> : undefined} />
      <Reveal delay={1}>
        <div className="mb-20">
          <div className="seg-wrap"><div className="seg">
            <button className="active">All Leads</button>
            <button>Follow Ups</button>
            <button>Site Visits</button>
            <button>Closures</button>
          </div></div>
        </div>
      </Reveal>
      <div className="grid g4 mb-20">
        <Reveal delay={1}><div className="stat"><div className="top"><span className="label">Total leads</span><span className="ic ic-indigo"><Icon name="download" size={16} /></span></div><div className="value"><CountUp value={stats.total} /></div><div className="delta">In this project</div></div></Reveal>
        <Reveal delay={2}><div className="stat"><div className="top"><span className="label">New</span><span className="ic ic-sky"><Icon name="bell" size={16} /></span></div><div className="value"><CountUp value={stats.new} /></div><div className="delta">Awaiting first touch</div></div></Reveal>
        <Reveal delay={3}><div className="stat"><div className="top"><span className="label">Site visits</span><span className="ic ic-amber"><Icon name="calendar" size={16} /></span></div><div className="value"><CountUp value={stats.siteVisits} /></div><div className="delta">Scheduled</div></div></Reveal>
        <Reveal delay={4}><div className="stat"><div className="top"><span className="label">Won</span><span className="ic ic-green"><Icon name="star" size={16} /></span></div><div className="value"><CountUp value={stats.won} /></div><div className="delta">Closed deals</div></div></Reveal>
      </div>
      <Reveal delay={2}>
        <div className="card">
          <div className="card-h">
            <div className="tb-search" style={{ maxWidth: 320, position: "static", margin: 0 }}><span className="si"><Icon name="search" size={14} /></span><input placeholder="Search by name or phone…" /></div>
            <div className="row gap-8 wrap">
              <select className="inp w-auto" defaultValue="All Statuses"><option>All Statuses</option>{ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
            </div>
          </div>
          {error ? (
            <div className="empty" style={{ padding: 40, textAlign: "center" }}><div className="muted">{error}</div><button className="btn btn-ghost" onClick={load} style={{ marginTop: 12 }}><Icon name="refresh" size={14} /> Retry</button></div>
          ) : leads === null ? (
            <div className="empty" style={{ padding: 40, textAlign: "center" }}><span className="muted">Loading leads…</span></div>
          ) : leads.length === 0 ? (
            <div className="empty" style={{ padding: 40, textAlign: "center" }}><span className="muted">No leads yet for this project. Publish a landing page form to start capturing them.</span></div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Lead</th><th>Source</th><th>Assigned To</th><th>Status</th>{canAssign ? <th>Actions</th> : null}</tr></thead>
                <tbody>{leads.map((lead) => {
                  const name = leadName(lead);
                  const phone = leadPhone(lead);
                  return (
                    <tr key={lead.id}>
                      <td><span className="u"><span className={`av ${phone ? "a2" : ""}`}>{initialsFor(name)}</span><span><Link className="nm" href={`/org/leads/${lead.id}`}>{name}</Link>{phone ? <br /> : null}{phone ? <span className="sm">{phone}</span> : null}</span></span></td>
                      <td><span className={`badge ${sourceBadgeClass(lead.source)}`}>{lead.source ?? "website"}</span></td>
                      <td>{lead.assignedTo ? <span className="u"><span className="av a3">{initialsFor(lead.assignedTo.name)}</span><span className="nm">{lead.assignedTo.name}</span></span> : <span className="muted">Unassigned</span>}</td>
                      <td>{canAssign ? <select className="inp" style={{ width: "auto" }} value={lead.status} disabled={savingId === lead.id} onChange={(e) => handleAssign(lead, lead.assignedTo?.id ?? null, e.target.value as CrmLeadStatus)}>{ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select> : <span className={`badge ${STATUS_BADGE[lead.status]}`}>{STATUS_LABEL[lead.status]}</span>}</td>
                      {canAssign ? <td><select className="inp" style={{ width: "auto" }} value={lead.assignedTo?.id ?? ""} disabled={savingId === lead.id} onChange={(e) => handleAssign(lead, e.target.value || null)}><option value="">Unassigned</option>{assigneeOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></td> : null}
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          )}
        </div>
      </Reveal>
    </>
  );
}
