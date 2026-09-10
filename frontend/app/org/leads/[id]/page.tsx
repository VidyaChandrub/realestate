"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon, type IconName } from "@/components/icons";
import { LeadsPageHead } from "@/components/org/crm-tabs";
import { LeadStatusSelect } from "@/components/org/lead-status-select";
import { StageBadge } from "@/lib/lead-stages";
import { useAuth } from "@/lib/auth-context";
import { isOrgAdmin } from "@/lib/session";
import { addCrmLeadNote, assignCrmLead, getCrmLead, updateCrmLeadNextAction } from "@/lib/api";
import type { CrmLead, CrmLeadStatus } from "@/lib/types";
import { leadField, leadDisplaySource } from "@/lib/lead-display";

const icons: Record<string, IconName> = {
  call_logged: "phone",
  whatsapp_sent: "mail",
  whatsapp_read: "mail",
  note_added: "document",
  status_updated: "refresh",
  site_visit_booked: "home",
  closed_deal: "star",
  logged_in: "profile",
};

const field = leadField;

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

function isNextActionEvent(type: string, text: string) {
  return type === "site_visit_booked" || text.startsWith("Next action ");
}

export default function OrgLeadDetailPage() {
  const { id: routeId } = useParams<{ id: string }>();
  const id = Array.isArray(routeId) ? routeId[0] : routeId;
  const { user, isLoading: authLoading, hasPermission } = useAuth();
  const [lead, setLead] = useState<CrmLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [note, setNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [activeTab, setActiveTab] = useState<"activity" | "requirements" | "communications" | "documents" | "deal">("activity");
  const [actionType, setActionType] = useState<"site_visit" | "follow_up">("follow_up");
  const [actionAt, setActionAt] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [savingAction, setSavingAction] = useState(false);
  const nextActionRef = useRef<HTMLDivElement | null>(null);
  const canEditLead = hasPermission("crm", "edit") || isOrgAdmin();
  const canAddNote = hasPermission("crm", "add") || canEditLead;

  function applyNextActionForm(result: CrmLead) {
    setActionType(result.nextAction?.type === "site_visit" ? "site_visit" : "follow_up");
    setActionAt(localDateTime(result.nextAction?.scheduledAt));
    setReminderAt(localDateTime(result.nextAction?.reminderAt));
    setActionNote(result.nextAction?.note ?? "");
  }

  useEffect(() => {
    if (!id || authLoading || !user) return;
    getCrmLead(id).then((result) => {
      setLead(result);
      applyNextActionForm(result);
    }).catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load lead.")).finally(() => setLoading(false));
  }, [id, authLoading, user]);

  async function confirmStatus(status: CrmLeadStatus, statusNote: string) {
    if (!lead || !canEditLead) return;
    setActionError("");
    await assignCrmLead(lead.id, {
      assignedToId: lead.assignedTo?.id ?? null,
      status,
      note: statusNote,
    });
    const fresh = await getCrmLead(lead.id);
    setLead(fresh);
  }

  async function addNote() {
    const text = note.trim();
    if (!lead || !text || addingNote || !canAddNote) return;
    setAddingNote(true);
    setActionError("");
    try {
      const activity = await addCrmLeadNote(lead.id, text);
      setLead((current) =>
        current
          ? { ...current, activities: [activity, ...(current.activities ?? [])] }
          : current,
      );
      setNote("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to add note.");
    } finally {
      setAddingNote(false);
    }
  }

  async function saveNextAction() {
    if (!lead || savingAction || !canEditLead) return;
    if (!actionAt) {
      setActionError("Set a date and time for the next action.");
      return;
    }
    setSavingAction(true);
    setActionError("");
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
          type: result.type as "site_visit" | "follow_up",
          scheduledAt: result.scheduledAt,
          note: result.note,
          reminderAt: result.reminderAt,
        },
        activities: [result.activity, ...(current.activities ?? [])],
      } : current);
      setActionType(result.type === "site_visit" ? "site_visit" : "follow_up");
      setActionAt(localDateTime(result.scheduledAt));
      setReminderAt(localDateTime(result.reminderAt));
      setActionNote(result.note ?? "");
      setActiveTab("activity");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update next action.");
    } finally {
      setSavingAction(false);
    }
  }

  const timeline = useMemo(() => [
    ...(lead?.activities ?? []).map((event) => ({ id: event.id, type: event.type, text: event.text, createdAt: event.createdAt, actor: event.actor ?? null })),
    ...(lead?.callLogs ?? []).map((call) => ({ id: call.id, type: "call_logged", text: `${call.outcome.replace("_", " ")}${call.durationSeconds ? ` · ${Math.floor(call.durationSeconds / 60)}m ${call.durationSeconds % 60}s` : ""}`, createdAt: call.createdAt, actor: call.actor ?? null })),
  ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [lead]);
  const requirements = Object.entries(lead?.data ?? {}).filter(([key]) => /budget|bhk|bed|area|require|preference|timeline|interest/i.test(key));
  const documents = Object.entries(lead?.data ?? {}).filter(([key]) => /brochure|document|floor|pan|aadhaar|proof/i.test(key));

  if (loading || authLoading) return <div className="empty">Loading lead…</div>;
  if (loadError || !lead) return <div className="empty">{loadError || "Lead not found."}</div>;

  const name = field(lead.data, "Full Name", "Full name", "fullName", "Name") === "—" ? "Unknown lead" : field(lead.data, "Full Name", "Full name", "fullName", "Name");
  const phone = field(lead.data, "Phone", "Phone number", "phone", "Mobile");
  const email = field(lead.data, "Email", "Email address", "email");
  const project = lead.project?.name ?? field(lead.data, "Project", "project");
  const unit = field(lead.data, "Unit", "unit");
  const nextActionLabel = lead.nextAction?.type === "site_visit" ? "Site visit" : "Follow-up";

  return (
    <>
      <LeadsPageHead active="lead-center" />
      <div className="page-head reveal in" style={{ marginTop: 4 }}>
        <div><div className="eyebrow"><Icon name="crm" size={14} /> Lead</div><h1>{name}</h1><div className="sub">{project} · {unit} · captured {formatDate(lead.createdAt)}</div></div>
        <div className="actions">{canEditLead ? <Link className="btn btn-primary" href={`/org/leads/${lead.id}/edit`}><Icon name="edit" size={14} /> Edit lead</Link> : null}<Link className="btn btn-ghost" href="/org/leads">← Back to leads</Link></div>
      </div>
      {actionError ? <div className="empty" style={{ padding: 12, marginBottom: 12, color: "var(--rose)" }}>{actionError}</div> : null}

      <div className="ld-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Reveal delay={1}><div className="card"><div className="card-b">
            <div className="prof"><div className="av av-lg a4">{name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div><div className="mono">{phone}</div><div className="muted" style={{ fontSize: 13 }}>{email}</div></div>
            <div className="field" style={{ marginTop: 14 }}>
              <label>Pipeline status</label>
              {canEditLead ? (
                <LeadStatusSelect value={lead.status} onConfirm={confirmStatus} />
              ) : (
                <div><StageBadge status={lead.status} /></div>
              )}
            </div>
          </div></div></Reveal>
          <Reveal delay={2}><div className="card"><div className="card-h"><span className="t">Lead source</span></div><div className="card-b"><div className="kv">
            <div className="row"><span className="k">Source</span><span className="v"><span className="badge b-indigo">{leadDisplaySource(lead)}</span></span></div>
            <div className="row"><span className="k">Project</span><span className="v">{project}</span></div><div className="row"><span className="k">Unit</span><span className="v">{unit}</span></div>
            <div className="row"><span className="k">Form</span><span className="v">{lead.formName ?? "—"}</span></div><div className="row"><span className="k">Assigned agent</span><span className="v"><span className="badge b-violet">{lead.assignedTo?.name ?? "Unassigned"}</span></span></div>
          </div></div></div></Reveal>
        </div>

        <Reveal delay={2}><div className="card"><div className="card-h" style={{ paddingBottom: 0 }}><div style={{ display: "flex", gap: 18, overflowX: "auto" }}>{(["activity", "requirements", "communications", "documents", "deal"] as const).map((tab) => <button key={tab} className="x" style={{ border: 0, background: "transparent", padding: "0 0 14px", color: activeTab === tab ? "var(--brand)" : undefined, borderBottom: activeTab === tab ? "2px solid var(--brand)" : "2px solid transparent", cursor: "pointer" }} onClick={() => setActiveTab(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}</div></div><div className="card-b">
          {activeTab === "activity" && <>
          {canAddNote && <div className="field" style={{ marginBottom: 16 }}><label htmlFor="lead-note">Add note</label><textarea id="lead-note" className="inp" rows={3} value={note} maxLength={2000} placeholder="Add a note about this lead..." onChange={(event) => setNote(event.target.value)} /><button className="btn btn-primary" style={{ marginTop: 8 }} disabled={!note.trim() || addingNote} onClick={() => void addNote()}>{addingNote ? "Saving..." : "Add note"}</button></div>}
          {timeline.length ? <ul className="timeline">{timeline.map((event) => <li key={event.id}><b><Icon name={icons[event.type] ?? "refresh"} size={14} /> {event.type.replaceAll("_", " ")}</b> — {event.text} <span className="muted">· {event.actor?.name ?? "System"}</span>{canEditLead && isNextActionEvent(event.type, event.text) ? <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => { nextActionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Edit next action</button> : null}<div className="tt">{formatDate(event.createdAt)}</div></li>)}</ul> : <div className="empty" style={{ padding: 20 }}>No activity recorded yet.</div>}
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
        </div></div></Reveal>
        <Reveal delay={4}><div className="card" ref={nextActionRef}><div className="card-h"><span className="t">Next action</span></div><div className="card-b">
          {lead.nextAction?.scheduledAt ? (
            <div className="help" style={{ marginBottom: 12 }}>
              <strong>{nextActionLabel}</strong> — {formatDate(lead.nextAction.scheduledAt)}
              {lead.nextAction.note ? ` · ${lead.nextAction.note}` : ""}
              {lead.nextAction.reminderAt ? ` · reminder ${formatDate(lead.nextAction.reminderAt)}` : ""}
            </div>
          ) : (
            <div className="help" style={{ marginBottom: 12 }}>No next action yet. Schedule a follow-up or site visit — it will appear in activity.</div>
          )}
          {canEditLead ? (
            <>
              <div className="field"><label>Action</label><select className="inp" value={actionType} onChange={(event) => setActionType(event.target.value as "site_visit" | "follow_up")}><option value="follow_up">Follow-up</option><option value="site_visit">Site visit</option></select></div>
              <div className="field"><label>Date and time</label><input className="inp" type="datetime-local" value={actionAt} onChange={(event) => setActionAt(event.target.value)} /></div>
              <div className="field"><label>Note</label><input className="inp" value={actionNote} onChange={(event) => setActionNote(event.target.value)} placeholder="Location, agenda, or note" /></div>
              <div className="field"><label>Reminder (optional)</label><input className="inp" type="datetime-local" value={reminderAt} onChange={(event) => setReminderAt(event.target.value)} /></div>
              <button className="btn btn-primary btn-block" disabled={savingAction} onClick={() => void saveNextAction()}><Icon name="calendar" size={15} /> {savingAction ? "Saving…" : lead.nextAction?.scheduledAt ? "Update next action" : "Save next action"}</button>
            </>
          ) : <div className="help">You do not have permission to update actions.</div>}
        </div></div></Reveal>
        <Reveal delay={5}><div className="card"><div className="card-h"><span className="t">Lead metadata</span></div><div className="card-b"><div className="kv"><div className="row"><span className="k">Lead ID</span><span className="v mono">{lead.id}</span></div><div className="row"><span className="k">Captured</span><span className="v">{formatDate(lead.createdAt)}</span></div></div></div></div></Reveal></div>
      </div>
    </>
  );
}
