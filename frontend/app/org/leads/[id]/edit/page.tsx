"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { LeadsPageHead } from "@/components/org/crm-tabs";
import { LeadStatusSelect, StatusNoteModal } from "@/components/org/lead-status-select";
import { UnitAttributeSelect } from "@/components/org/project-form-fields";
import { useAuth } from "@/lib/auth-context";
import { isOrgAdmin } from "@/lib/session";
import { isValidLoosePhone, LOOSE_PHONE_MESSAGE } from "@/lib/phone";
import {
  apiFetch,
  assignCrmLead,
  getCrmAssignableUsers,
  getCrmLead,
  getOrgCatalogOptions,
  updateCrmLead,
} from "@/lib/api";
import type {
  CrmLead,
  CrmLeadStatus,
  OrgCatalogCategory,
  OrgCatalogOption,
  ProjectsListResponse,
  UpdateLeadInput,
} from "@/lib/types";
import "@/app/org/org.css";

const SOURCES = ["Meta Lead Ad", "Google Ads", "Website form", "Portal (99acres)", "Walk-in", "Referral"];
const TEMPERATURES: Array<{ value: string; label: string }> = [
  { value: "hot", label: "🔥 Hot" },
  { value: "warm", label: "🌤️ Warm" },
  { value: "cold", label: "❄️ Cold" },
];

// Lead-only lists (tags + Purpose/Financing/Loan status/Timeline/Preferred
// floor) are managed under Settings → CRM & Leads. Configuration, Facing and
// Parking are shared org-wide lists managed under Project Catalogs.
const LEAD_CATALOG_HREF = "/org/settings?section=crm";
const PROJECT_CATALOG_HREF = "/org/settings?section=catalogs";

function dataField(data: Record<string, unknown> | undefined, ...keys: string[]): string {
  if (!data) return "";
  for (const key of keys) {
    const v = data[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/**
 * Keystroke sanitiser for the phone fields — same approach as org/users and
 * admin-console/admins, widened to keep the separators the loose CRM rule
 * allows. Permits digits, a single leading "+", spaces, hyphens and
 * parentheses; drops everything else, and stops accepting digits past 15
 * (E.164's ceiling). "Too short" (< 7 digits) can't be prevented by filtering,
 * so it stays an inline error.
 */
const PHONE_MAX_DIGITS = 15;
function sanitizePhoneInput(raw: string): string {
  const hasLeadingPlus = /^\s*\+/.test(raw);
  let digits = 0;
  let body = "";
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") {
      if (digits >= PHONE_MAX_DIGITS) continue; // block the 16th digit onward
      digits += 1;
      body += ch;
    } else if (ch === " " || ch === "-" || ch === "(" || ch === ")") {
      body += ch;
    }
  }
  return (hasLeadingPlus ? "+" : "") + body;
}

interface FormState {
  fullName: string;
  phone: string;
  email: string;
  altName: string;
  altPhone: string;
  whatsapp: string;
  city: string;
  tags: string[];
  configurations: string[];
  budgetMin: string;
  budgetMax: string;
  purpose: string;
  financing: string;
  loanStatus: string;
  timelineToBuy: string;
  preferredFloor: string;
  facing: string;
  parking: string;
  requirementNotes: string;
  projectId: string;
  source: string;
  campaign: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  temperature: string;
  assignedToId: string;
  consentWhatsapp: boolean;
  consentCall: boolean;
  consentEmail: boolean;
}

function toForm(lead: CrmLead): FormState {
  const data = lead.data as Record<string, unknown>;
  return {
    fullName: dataField(data, "fullName", "Full Name", "Full name", "name", "Name"),
    phone: sanitizePhoneInput(dataField(data, "phone", "Phone", "phoneNumber", "Phone number", "Mobile")),
    email: dataField(data, "email", "Email", "Email address"),
    altName: lead.altName ?? "",
    altPhone: sanitizePhoneInput(lead.altPhone ?? ""),
    whatsapp: sanitizePhoneInput(lead.whatsapp ?? ""),
    city: lead.city ?? "",
    tags: lead.tags ?? [],
    configurations: lead.configurations ?? [],
    budgetMin: lead.budgetMin != null ? String(lead.budgetMin) : "",
    budgetMax: lead.budgetMax != null ? String(lead.budgetMax) : "",
    purpose: lead.purpose ?? "",
    financing: lead.financing ?? "",
    loanStatus: lead.loanStatus ?? "",
    timelineToBuy: lead.timelineToBuy ?? "",
    preferredFloor: lead.preferredFloor ?? "",
    facing: lead.facing ?? "",
    parking: lead.parking ?? "",
    requirementNotes: lead.requirementNotes ?? "",
    projectId: lead.projectId ?? "",
    source: lead.source ?? "",
    campaign: lead.campaign ?? "",
    utmSource: lead.utmSource ?? "",
    utmMedium: lead.utmMedium ?? "",
    utmCampaign: lead.utmCampaign ?? "",
    temperature: lead.temperature ?? "",
    assignedToId: lead.assignedTo?.id ?? "",
    consentWhatsapp: lead.consentWhatsapp ?? false,
    consentCall: lead.consentCall ?? false,
    consentEmail: lead.consentEmail ?? false,
  };
}

/** Rupee amount → integer; "" / unparseable → null. */
function parseRupees(value: string): number | null {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : null;
}

export default function OrgLeadEditPage() {
  const { id: routeId } = useParams<{ id: string }>();
  const id = Array.isArray(routeId) ? routeId[0] : routeId;
  const router = useRouter();
  const { user, isLoading: authLoading, hasPermission } = useAuth();
  const canEditLead = hasPermission("crm", "edit") || isOrgAdmin();

  const [lead, setLead] = useState<CrmLead | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [assignees, setAssignees] = useState<{ id: string; name: string }[]>([]);
  // Org option lists. Configuration reads `unit_type`, Facing/Parking read the
  // shared `facing` / `parking` catalogs (same value sets as units); Tags and
  // Purpose/Financing/Loan status/Timeline/Preferred floor read their own
  // lead-only `lead_*` catalogs. One fetch, filtered per category.
  const [catalog, setCatalog] = useState<OrgCatalogOption[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));
  const toggleInList = (key: "tags" | "configurations", value: string) =>
    setForm((f) =>
      f
        ? {
            ...f,
            [key]: f[key].includes(value)
              ? f[key].filter((v) => v !== value)
              : [...f[key], value],
          }
        : f,
    );

  useEffect(() => {
    if (!id || authLoading || !user) return;
    getCrmLead(id)
      .then((result) => {
        setLead(result);
        setForm(toForm(result));
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load lead."))
      .finally(() => setLoading(false));
  }, [id, authLoading, user]);

  useEffect(() => {
    if (!canEditLead) return;
    apiFetch<ProjectsListResponse>("/org/projects?page=1&limit=100")
      .then((res) => setProjects(res.data.map((p) => ({ id: p.id, name: p.name }))))
      .catch(() => setProjects([]));
    getCrmAssignableUsers()
      .then((res) => setAssignees(res.data.map((a) => ({ id: a.id, name: a.name }))))
      .catch(() => setAssignees([]));
    getOrgCatalogOptions()
      .then((rows) => setCatalog(rows))
      .catch((e) => setCatalogError(e instanceof Error ? e.message : "Failed to load option lists."));
  }, [canEditLead]);

  /** Sorted option list for one catalog category ([] until the fetch lands). */
  const catOptions = useMemo(() => {
    const byCat = (cat: OrgCatalogCategory): OrgCatalogOption[] =>
      (catalog ?? [])
        .filter((o) => o.category === cat)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
    return byCat;
  }, [catalog]);

  // Tag chips: the org's `lead_tag` catalog, plus any tag already on this lead
  // that has since left the catalog (so an edit never silently drops it).
  const tagOptions = useMemo(() => {
    if (!form) return [] as string[];
    const fromCatalog = catOptions("lead_tag").map((o) => o.label);
    return [...fromCatalog, ...form.tags.filter((t) => !fromCatalog.includes(t))];
  }, [catOptions, form]);

  const configLabels = useMemo(() => {
    if (!form) return [] as string[];
    const fromCatalog = catOptions("unit_type").map((o) => o.label);
    // Keep any already-saved configuration that has since left the catalog.
    return [...fromCatalog, ...form.configurations.filter((c) => !fromCatalog.includes(c))];
  }, [catOptions, form]);

  // Client-side phone check — UX only; UpdateLeadDto re-validates on the server.
  const phoneErrors = useMemo(() => {
    const check = (v: string) =>
      v.trim() && !isValidLoosePhone(v) ? LOOSE_PHONE_MESSAGE : "";
    return form
      ? { phone: check(form.phone), altPhone: check(form.altPhone), whatsapp: check(form.whatsapp) }
      : { phone: "", altPhone: "", whatsapp: "" };
  }, [form]);
  const hasPhoneError = Boolean(phoneErrors.phone || phoneErrors.altPhone || phoneErrors.whatsapp);

  async function save() {
    if (!lead || !form || saving) return;
    if (hasPhoneError) {
      setSaveError("Fix the highlighted phone number(s) before saving.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const payload: UpdateLeadInput = {
        contact: {
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
        },
        altName: form.altName.trim() || null,
        altPhone: form.altPhone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        city: form.city.trim() || null,
        tags: form.tags,
        configurations: form.configurations,
        budgetMin: parseRupees(form.budgetMin),
        budgetMax: parseRupees(form.budgetMax),
        purpose: form.purpose || null,
        financing: form.financing || null,
        loanStatus: form.loanStatus || null,
        timelineToBuy: form.timelineToBuy || null,
        preferredFloor: form.preferredFloor || null,
        facing: form.facing || null,
        parking: form.parking || null,
        requirementNotes: form.requirementNotes.trim() || null,
        projectId: form.projectId || null,
        source: form.source.trim() || null,
        campaign: form.campaign.trim() || null,
        utmSource: form.utmSource.trim() || null,
        utmMedium: form.utmMedium.trim() || null,
        utmCampaign: form.utmCampaign.trim() || null,
        temperature: form.temperature || null,
        assignedToId: form.assignedToId || null,
        consentWhatsapp: form.consentWhatsapp,
        consentCall: form.consentCall,
        consentEmail: form.consentEmail,
      };
      await updateCrmLead(lead.id, payload);
      router.push(`/org/leads/${lead.id}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes.");
      setSaving(false);
    }
  }

  async function confirmStatus(status: CrmLeadStatus, note: string) {
    if (!lead) return;
    await assignCrmLead(lead.id, {
      assignedToId: lead.assignedTo?.id ?? null,
      status,
      note,
    });
    // Only refresh the pipeline-status display — keep the user's in-progress
    // form edits intact (status is a separate, immediate action).
    setLead((current) => (current ? { ...current, status } : current));
  }

  if (loading || authLoading) return <div className="empty">Loading lead…</div>;
  if (loadError || !lead || !form) return <div className="empty">{loadError || "Lead not found."}</div>;
  if (!canEditLead) return <div className="empty">You do not have permission to edit this lead.</div>;

  const catalogLoaded = catalog !== null;

  const reqSelect = (
    label: string,
    category: OrgCatalogCategory,
    key: "purpose" | "financing" | "loanStatus" | "timelineToBuy" | "preferredFloor" | "facing" | "parking",
  ) => (
    <div className="field">
      <label>{label}</label>
      <UnitAttributeSelect
        options={catOptions(category)}
        loaded={catalogLoaded}
        error={catalogError}
        value={form[key]}
        onChange={(v) => set(key, v)}
        placeholder="—"
        emptyHint={`No ${label.toLowerCase()} options yet.`}
        // Shared lists (facing / parking) are managed under Project Catalogs;
        // the lead-only ones under CRM & Leads.
        settingsHref={category.startsWith("lead_") ? LEAD_CATALOG_HREF : PROJECT_CATALOG_HREF}
      />
    </div>
  );

  return (
    <>
      <LeadsPageHead active="lead-center" />
      <div className="page-head reveal in" style={{ marginTop: 4 }}>
        <div>
          <div className="eyebrow">
            <Link href={`/org/leads/${lead.id}`}>← {form.fullName || "Lead"}</Link> · Edit
          </div>
          <h1>Edit lead</h1>
          <div className="sub">Update contact, requirement, source and assignment details.</div>
        </div>
        <div className="actions">
          <Link className="btn btn-ghost" href={`/org/leads/${lead.id}`}>✕ Cancel</Link>
          <button className="btn btn-primary" type="button" disabled={saving || hasPhoneError} onClick={() => void save()}>
            {saving ? "Saving…" : "💾 Save changes"}
          </button>
        </div>
      </div>

      {saveError ? (
        <div className="empty" style={{ padding: 12, marginBottom: 12, color: "var(--rose)" }}>{saveError}</div>
      ) : null}

      <div className="ed-grid">
        {/* MAIN FORM */}
        <div className="card" style={{ padding: 24 }}>
          {/* Contact */}
          <div className="sec-block">
            <h3 style={{ margin: "0 0 14px" }}>👤 Contact</h3>
            <div className="row2">
              <div className="field">
                <label>Full name</label>
                <input className="inp" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
              </div>
              <div className="field">
                <label>Alternate name / co-applicant</label>
                <input className="inp" value={form.altName} placeholder="e.g. spouse name" onChange={(e) => set("altName", e.target.value)} />
              </div>
            </div>
            <div className="row3">
              <div className="field">
                <label>Phone</label>
                <input
                  className={`inp inp-mono${phoneErrors.phone ? " inp-invalid" : ""}`}
                  value={form.phone}
                  inputMode="tel"
                  placeholder="+91 98204 55127"
                  onChange={(e) => set("phone", sanitizePhoneInput(e.target.value))}
                />
                {phoneErrors.phone ? <div className="hint" style={{ color: "var(--rose)" }}>{phoneErrors.phone}</div> : null}
              </div>
              <div className="field">
                <label>Alternate phone</label>
                <input
                  className={`inp inp-mono${phoneErrors.altPhone ? " inp-invalid" : ""}`}
                  value={form.altPhone}
                  inputMode="tel"
                  placeholder="+91 …"
                  onChange={(e) => set("altPhone", sanitizePhoneInput(e.target.value))}
                />
                {phoneErrors.altPhone ? <div className="hint" style={{ color: "var(--rose)" }}>{phoneErrors.altPhone}</div> : null}
              </div>
              <div className="field">
                <label>WhatsApp</label>
                <input
                  className={`inp inp-mono${phoneErrors.whatsapp ? " inp-invalid" : ""}`}
                  value={form.whatsapp}
                  inputMode="tel"
                  placeholder="+91 98204 55127"
                  onChange={(e) => set("whatsapp", sanitizePhoneInput(e.target.value))}
                />
                {phoneErrors.whatsapp ? <div className="hint" style={{ color: "var(--rose)" }}>{phoneErrors.whatsapp}</div> : null}
              </div>
            </div>
            <div className="row2">
              <div className="field">
                <label>Email</label>
                <input className="inp" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="field">
                <label>City / location</label>
                <input className="inp" value={form.city} onChange={(e) => set("city", e.target.value)} />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Tags</label>
              {!catalogLoaded ? (
                <div className="hint">Loading tags…</div>
              ) : tagOptions.length === 0 ? (
                <div className="hint">
                  No lead tags yet.{" "}
                  <Link className="brand-link" href={LEAD_CATALOG_HREF}>Add them in Settings →</Link>
                </div>
              ) : (
                <div className="opts">
                  {tagOptions.map((tag) => {
                    const on = form.tags.includes(tag);
                    return (
                      <span key={tag} className={`opt ${on ? "on" : ""}`} onClick={() => toggleInList("tags", tag)}>
                        <span className="b">{on ? "✓" : ""}</span>{tag}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Requirement */}
          <div className="sec-block" style={{ borderTop: "1px solid var(--line)", marginTop: 22, paddingTop: 18 }}>
            <h3 style={{ margin: "0 0 14px" }}>🎯 Requirement</h3>
            <div className="field">
              <label>Configuration</label>
              {!catalogLoaded ? (
                <div className="hint">Loading configurations…</div>
              ) : configLabels.length === 0 ? (
                <div className="hint">
                  No configurations in your catalog.{" "}
                  <Link className="brand-link" href={PROJECT_CATALOG_HREF}>Add them in Settings →</Link>
                </div>
              ) : (
                <div className="opts">
                  {configLabels.map((cfg) => {
                    const on = form.configurations.includes(cfg);
                    return (
                      <span key={cfg} className={`opt ${on ? "on" : ""}`} onClick={() => toggleInList("configurations", cfg)}>
                        <span className="b">{on ? "✓" : ""}</span>{cfg}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="row3">
              <div className="field">
                <label>Budget — min (₹)</label>
                <input className="inp" inputMode="numeric" value={form.budgetMin} placeholder="e.g. 14000000" onChange={(e) => set("budgetMin", e.target.value)} />
              </div>
              <div className="field">
                <label>Budget — max (₹)</label>
                <input className="inp" inputMode="numeric" value={form.budgetMax} placeholder="e.g. 18000000" onChange={(e) => set("budgetMax", e.target.value)} />
              </div>
              {reqSelect("Purpose", "lead_purpose", "purpose")}
            </div>
            <div className="row3">
              {reqSelect("Financing", "lead_financing", "financing")}
              {reqSelect("Loan status", "lead_loan_status", "loanStatus")}
              {reqSelect("Timeline to buy", "lead_timeline_to_buy", "timelineToBuy")}
            </div>
            <div className="row3">
              {reqSelect("Preferred floor", "lead_preferred_floor", "preferredFloor")}
              {reqSelect("Facing", "facing", "facing")}
              {reqSelect("Parking", "parking", "parking")}
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Requirement notes</label>
              <textarea className="inp" rows={3} value={form.requirementNotes} onChange={(e) => set("requirementNotes", e.target.value)} />
            </div>
          </div>

          {/* Source & project */}
          <div className="sec-block" style={{ borderTop: "1px solid var(--line)", marginTop: 22, paddingTop: 18 }}>
            <h3 style={{ margin: "0 0 14px" }}>📣 Source &amp; project</h3>
            <div className="row2">
              <div className="field">
                <label>Project of interest</label>
                <select className="inp" value={form.projectId} onChange={(e) => set("projectId", e.target.value)}>
                  <option value="">No project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  {form.projectId && !projects.some((p) => p.id === form.projectId) && lead.project ? (
                    <option value={form.projectId}>{lead.project.name}</option>
                  ) : null}
                </select>
              </div>
              <div className="field">
                <label>Lead source</label>
                <select className="inp" value={form.source} onChange={(e) => set("source", e.target.value)}>
                  <option value="">—</option>
                  {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  {form.source && !SOURCES.includes(form.source) ? (
                    <option value={form.source}>{form.source}</option>
                  ) : null}
                </select>
              </div>
            </div>
            <div className="row2">
              <div className="field">
                <label>Campaign</label>
                <input className="inp" value={form.campaign} onChange={(e) => set("campaign", e.target.value)} />
              </div>
              <div className="field">
                <label>UTM source</label>
                <input className="inp inp-mono" value={form.utmSource} onChange={(e) => set("utmSource", e.target.value)} />
              </div>
            </div>
            <div className="row2" style={{ marginBottom: 0 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>UTM medium</label>
                <input className="inp inp-mono" value={form.utmMedium} onChange={(e) => set("utmMedium", e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>UTM campaign</label>
                <input className="inp inp-mono" value={form.utmCampaign} onChange={(e) => set("utmCampaign", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* SIDE */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card">
            <div className="card-h"><span className="t">Status &amp; scoring</span></div>
            <div className="card-b">
              <div className="field">
                <label>Pipeline status</label>
                <LeadStatusSelect value={lead.status} onConfirm={confirmStatus} />
                <div className="hint">Saved immediately — a note is required and appears in activity.</div>
              </div>
              <div className="field">
                <label>Temperature</label>
                <div className="opts" data-single>
                  {TEMPERATURES.map((t) => {
                    const on = form.temperature === t.value;
                    return (
                      <span
                        key={t.value}
                        className={`opt rad ${on ? "on" : ""}`}
                        onClick={() => set("temperature", on ? "" : t.value)}
                      >
                        <span className="b">{on ? "●" : ""}</span>{t.label}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Lead score (auto)</label>
                <input className="inp" value="—" disabled readOnly />
                <div className="hint">Recalculated from activity &amp; profile — automated scoring is not enabled yet.</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><span className="t">Assignment</span></div>
            <div className="card-b">
              <div className="field">
                <label>Owner / agent</label>
                <select className="inp" value={form.assignedToId} onChange={(e) => set("assignedToId", e.target.value)}>
                  <option value="">{lead.projectTeam?.count ? "Project team (no individual owner)" : "Unassigned"}</option>
                  {assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  {form.assignedToId && !assignees.some((a) => a.id === form.assignedToId) && lead.assignedTo ? (
                    <option value={form.assignedToId}>{lead.assignedTo.name}</option>
                  ) : null}
                </select>
                {!form.assignedToId && lead.projectTeam?.count ? (
                  <div className="hint">
                    Visible to {lead.projectTeam.count} project agent{lead.projectTeam.count === 1 ? "" : "s"} ({lead.projectTeam.names.join(", ")}) until someone is assigned.
                  </div>
                ) : null}
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Team</label>
                <select className="inp" value="" disabled>
                  <option value="">Teams not configured</option>
                </select>
                <div className="hint">Teams aren’t a feature yet — this will activate once team management ships.</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><span className="t">Consent</span></div>
            <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label className="check">
                <span className={`switch ${form.consentWhatsapp ? "on" : ""}`} onClick={() => set("consentWhatsapp", !form.consentWhatsapp)} />
                WhatsApp opt-in
              </label>
              <label className="check">
                <span className={`switch ${form.consentCall ? "on" : ""}`} onClick={() => set("consentCall", !form.consentCall)} />
                Call &amp; SMS opt-in
              </label>
              <label className="check">
                <span className={`switch ${form.consentEmail ? "on" : ""}`} onClick={() => set("consentEmail", !form.consentEmail)} />
                Email marketing
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="ed-foot" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
        <button
          className="btn btn-danger"
          type="button"
          disabled={lead.status === "lost"}
          onClick={() => setLostOpen(true)}
        >
          Mark as Lost
        </button>
        <div style={{ flex: 1 }} />
        <Link className="btn btn-ghost" href={`/org/leads/${lead.id}`}>Cancel</Link>
        <button className="btn btn-primary" type="button" disabled={saving || hasPhoneError} onClick={() => void save()}>
          {saving ? "Saving…" : "💾 Save changes"}
        </button>
      </div>

      <StatusNoteModal
        open={lostOpen}
        fromStatus={lead.status}
        toStatus={lostOpen ? "lost" : null}
        onClose={() => setLostOpen(false)}
        onConfirm={confirmStatus}
      />
    </>
  );
}
