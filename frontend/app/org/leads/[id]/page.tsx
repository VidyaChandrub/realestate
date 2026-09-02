"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon, type IconName } from "@/components/icons";
import { LeadsPageHead } from "@/components/org/crm-tabs";
import { useAuth } from "@/lib/auth-context";
import { isOrgAdmin } from "@/lib/session";
import { addCrmLeadNote, assignCrmLead, getCrmLead, updateCrmLeadNextAction } from "@/lib/api";
import type { CrmLead, CrmLeadStatus } from "@/lib/types";

const statuses: CrmLeadStatus[] = ["new", "contacted", "follow_up", "site_visit", "negotiation", "won", "lost"];
const icons: Record<string, IconName> = { call_logged: "phone", whatsapp_sent: "mail", whatsapp_read: "mail", note_added: "document", status_updated: "refresh", site_visit_booked: "home", closed_deal: "star", logged_in: "profile" };

function field(data: Record<string, unknown>, ...keys: string[]) {
  const key = keys.find((candidate) => data[candidate] != null && String(data[candidate]).trim());
  return key ? String(data[key]) : "—";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function localDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function DataRows({ entries, empty }: { entries: Array<[string, unknown]>; empty: string }) {
  if (!entries.length) return <div className="empty" style={{ padding: 20 }}>{empty}</div>;
  return <div className="kv">{entries.map(([key, raw]) => <div className="row" key={key}><span className="k">{key}</span><span className="v">{typeof raw === "object" ? JSON.stringify(raw) : String(raw || "—")}</span></div>)}</div>;
}

export default function OrgLeadDetailPage() {
  const { id: routeId } = useParams<{ id: string }>();
  const id = Array.isArray(routeId) ? routeId[0] : routeId;
  const { user, isLoading: authLoading, hasPermission } = useAuth();
  const [lead, setLead] = useState<CrmLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [activeTab, setActiveTab] = useState<"activity" | "requirements" | "communications" | "documents" | "deal">("activity");
  const [actionType, setActionType] = useState<"site_visit" | "follow_up">("site_visit");
  const [actionAt, setActionAt] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [savingAction, setSavingAction] = useState(false);
  const canEditLead = hasPermission("leads", "edit") || isOrgAdmin();

  useEffect(() => {
    if (!id || authLoading || !user) return;
    getCrmLead(id).then((result) => {
      setLead(result);
      setActionType(result.nextAction?.type === "follow_up" ? "follow_up" : "site_visit");
      setActionAt(localDateTime(result.nextAction?.scheduledAt));
      setReminderAt(localDateTime(result.nextAction?.reminderAt));
      setActionNote(result.nextAction?.note ?? "");
    }).catch((err) => setError(err instanceof Error ? err.message : "Failed to load lead.")).finally(() => setLoading(false));
  }, [id, authLoading, user]);

  async function updateStatus(status: CrmLeadStatus) {
    if (!lead || !hasPermission("leads", "edit")) return;
    setSaving(true);
    try {
      const result = await assignCrmLead(lead.id, { assignedToId: lead.assignedTo?.id ?? null, status });
      setLead((current) => current ? { ...current, status: result.status } : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update lead.");
    } finally {
      setSaving(false);
    }
  }

  async function addNote() {
    const text = note.trim();
    if (!lead || !text || addingNote || !hasPermission("leads", "edit")) return;
    setAddingNote(true);
    setError("");
    try {
      const activity = await addCrmLeadNote(lead.id, text);
      setLead((current) =>
        current
          ? { ...current, activities: [activity, ...(current.activities ?? [])] }
          : current,
      );
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add note.");
    } finally {
      setAddingNote(false);
    }

  }

  async function saveNextAction() {
    if (!lead || !actionAt || savingAction || !canEditLead) return;
    setSavingAction(true);
    setError("");
    try {
      const result = await updateCrmLeadNextAction(lead.id, {
        actionType,
        scheduledAt: new Date(actionAt).toISOString(),
        note: actionNote,
        reminderAt: reminderAt ? new Date(reminderAt).toISOString() : undefined,
      });
      setLead((current) => current ? {
        ...current,
        nextAction: {
          type: result.type,
          scheduledAt: result.scheduledAt,
          note: result.note,
          reminderAt: result.reminderAt,
        },
        activities: [result.activity, ...(current.activities ?? [])],
      } : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update next action.");
    } finally {
      setSavingAction(false);
    }
  }

  const timeline = useMemo(() => [
    ...(lead?.activities ?? []).map((event) => ({ id: event.id, type: event.type, text: event.text, createdAt: event.createdAt })),
    ...(lead?.callLogs ?? []).map((call) => ({ id: call.id, type: "call_logged", text: `${call.outcome.replace("_", " ")}${call.durationSeconds ? ` · ${Math.floor(call.durationSeconds / 60)}m ${call.durationSeconds % 60}s` : ""}`, createdAt: call.createdAt })),
  ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [lead]);
  const requirements = Object.entries(lead?.data ?? {}).filter(([key]) => /budget|bhk|bed|area|require|preference|timeline/i.test(key));
  const documents = Object.entries(lead?.data ?? {}).filter(([key]) => /brochure|document|floor|pan|aadhaar|proof/i.test(key));

  if (loading || authLoading) return <div className="empty">Loading lead…</div>;
  if (error || !lead) return <div className="empty">{error || "Lead not found."}</div>;

  const name = field(lead.data, "Full Name", "fullName", "Name") === "—" ? "Unknown lead" : field(lead.data, "Full Name", "fullName", "Name");
  const phone = field(lead.data, "Phone", "phone", "Mobile");
  const email = field(lead.data, "Email", "email");
  const project = lead.project?.name ?? field(lead.data, "Project", "project");
  const unit = field(lead.data, "Unit", "unit");

  return (
    <>
      <LeadsPageHead active="lead-center" />
      <div className="page-head reveal in" style={{ marginTop: 4 }}>
        <div><div className="eyebrow"><Icon name="crm" size={14} /> Lead</div><h1>{name}</h1><div className="sub">{project} · {unit} · captured {formatDate(lead.createdAt)}</div></div>
        <div className="actions"><Link className="btn btn-ghost" href="/org/leads">← Back to leads</Link></div>
      </div>

      <div className="ld-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Reveal delay={1}><div className="card"><div className="card-b">
            <div className="prof"><div className="av av-lg a4">{name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div><div className="mono">{phone}</div><div className="muted" style={{ fontSize: 13 }}>{email}</div></div>
            <div className="field" style={{ marginTop: 14 }}><label>Pipeline status</label><select className="inp" value={lead.status} disabled={saving || !hasPermission("leads", "edit")} onChange={(event) => void updateStatus(event.target.value as CrmLeadStatus)}>{statuses.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}</select></div>
          </div></div></Reveal>
          <Reveal delay={2}><div className="card"><div className="card-h"><span className="t">Lead source</span></div><div className="card-b"><div className="kv">
            <div className="row"><span className="k">Source</span><span className="v"><span className="badge b-indigo">{lead.source ?? "website"}</span></span></div>
            <div className="row"><span className="k">Project</span><span className="v">{project}</span></div><div className="row"><span className="k">Unit</span><span className="v">{unit}</span></div>
            <div className="row"><span className="k">Form</span><span className="v">{lead.formName ?? "—"}</span></div><div className="row"><span className="k">Assigned agent</span><span className="v"><span className="badge b-violet">{lead.assignedTo?.name ?? "Unassigned"}</span></span></div>
          </div></div></div></Reveal>
        </div>

        <Reveal delay={2}><div className="card"><div className="card-h" style={{ paddingBottom: 0 }}><div style={{ display: "flex", gap: 18, overflowX: "auto" }}>{(["activity", "requirements", "communications", "documents", "deal"] as const).map((tab) => <button key={tab} className="x" style={{ border: 0, background: "transparent", padding: "0 0 14px", color: activeTab === tab ? "var(--brand)" : undefined, borderBottom: activeTab === tab ? "2px solid var(--brand)" : "2px solid transparent", cursor: "pointer" }} onClick={() => setActiveTab(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}</div></div><div className="card-b">
          {activeTab === "activity" && <>
          {hasPermission("leads", "edit") && <div className="field" style={{ marginBottom: 16 }}><label htmlFor="lead-note">Add note</label><textarea id="lead-note" className="inp" rows={3} value={note} maxLength={2000} placeholder="Add a note about this lead..." onChange={(event) => setNote(event.target.value)} /><button className="btn btn-primary" style={{ marginTop: 8 }} disabled={!note.trim() || addingNote} onClick={() => void addNote()}>{addingNote ? "Saving..." : "Add note"}</button></div>}
          {timeline.length ? <ul className="timeline">{timeline.map((event) => <li key={event.id}><b><Icon name={icons[event.type] ?? "refresh"} size={14} /> {event.type.replaceAll("_", " ")}</b> — {event.text}<div className="tt">{formatDate(event.createdAt)}</div></li>)}</ul> : <div className="empty" style={{ padding: 20 }}>No activity recorded yet.</div>}
          </>}
          {activeTab === "requirements" && <DataRows entries={requirements} empty="No requirement details captured." />}
          {activeTab === "communications" && <DataRows entries={timeline.filter((event) => ["call_logged", "whatsapp_sent", "whatsapp_read"].includes(event.type)).map((event) => [event.type, `${event.text} · ${formatDate(event.createdAt)}`])} empty="No communications recorded." />}
          {activeTab === "documents" && <DataRows entries={documents} empty="No documents attached." />}
          {activeTab === "deal" && <DataRows entries={Object.entries(lead.data).filter(([key]) => /price|deal|booking|payment|status/i.test(key))} empty="No deal details captured." />}
          <div className="help" style={{ marginTop: 16 }}>Submitted enquiry fields are shown below and remain linked to this project lead.</div>
          <div className="kv" style={{ marginTop: 14 }}>{Object.entries(lead.data).map(([key, raw]) => <div className="row" key={key}><span className="k">{key}</span><span className="v">{typeof raw === "object" ? JSON.stringify(raw) : String(raw || "—")}</span></div>)}</div>
        </div></div></Reveal>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}><Reveal delay={3}><div className="card"><div className="card-h"><span className="t">Quick actions</span></div><div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <a className="btn btn-primary btn-block" href={phone !== "—" ? `tel:${phone}` : undefined}><Icon name="phone" size={15} /> Call {phone}</a><a className="btn btn-success btn-block" href={phone !== "—" ? `https://wa.me/${phone.replace(/\D/g, "")}` : undefined}><Icon name="mail" size={15} /> WhatsApp</a><a className="btn btn-ghost btn-block" href={email !== "—" ? `mailto:${email}` : undefined}><Icon name="mail" size={15} /> Email</a>
        </div></div></Reveal><Reveal delay={4}><div className="card"><div className="card-h"><span className="t">Next action</span></div><div className="card-b">
          {lead.nextAction?.scheduledAt && <div className="help" style={{ marginBottom: 12 }}>🏠 <strong>{lead.nextAction.type === "site_visit" ? "Site visit" : "Follow-up"}</strong> — {formatDate(lead.nextAction.scheduledAt)}{lead.nextAction.note ? ` at ${lead.nextAction.note}` : ""}</div>}
          {canEditLead ? <><div className="field"><label>Action</label><select className="inp" value={actionType} onChange={(event) => setActionType(event.target.value as "site_visit" | "follow_up")}><option value="site_visit">Site visit</option><option value="follow_up">Follow-up</option></select></div><div className="field"><label>Reschedule / set follow-up</label><input className="inp" type="datetime-local" value={actionAt} onChange={(event) => setActionAt(event.target.value)} /></div><div className="field"><label>Location or note</label><input className="inp" value={actionNote} onChange={(event) => setActionNote(event.target.value)} placeholder="Palm Residency show flat" /></div><div className="field"><label>Reminder</label><input className="inp" type="datetime-local" value={reminderAt} onChange={(event) => setReminderAt(event.target.value)} /></div><button className="btn btn-primary btn-block" disabled={!actionAt || savingAction} onClick={() => void saveNextAction()}><Icon name="calendar" size={15} /> {savingAction ? "Updating..." : "Update site visit"}</button><button className="btn btn-ghost btn-block" disabled={!reminderAt || savingAction} onClick={() => void saveNextAction()}><Icon name="bell" size={15} /> Set reminder</button></> : <div className="help">You do not have permission to update actions.</div>}
        </div></div></Reveal><Reveal delay={5}><div className="card"><div className="card-h"><span className="t">Lead metadata</span></div><div className="card-b"><div className="kv"><div className="row"><span className="k">Lead ID</span><span className="v mono">{lead.id}</span></div><div className="row"><span className="k">Captured</span><span className="v">{formatDate(lead.createdAt)}</span></div></div></div></div></Reveal></div>
      </div>
    </>
  );
}
