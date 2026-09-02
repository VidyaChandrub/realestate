"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, changePlan, getInvoices, getOrgDomainInfo, getPlans, requestCustomDomain } from "@/lib/api";
import type { ChangePlanResult, InvoiceRow, OrgBillingSummary, OrgDomainInfo, OrgIndustry, Plan, SafeOrganisation, UpdateOrganisationSettingsInput } from "@/lib/types";
import type { IconName } from "@/components/icons";
import { Icon } from "@/components/icons";
import { subdomainPreviewHost } from "@/lib/domain";
import { COUNTRY_META, COUNTRIES, CURRENCY_OPTIONS, TIMEZONE_OPTIONS } from "@/lib/countries";

const LANGUAGES = [
  { value: "en-IN", label: "English (India)" },
  { value: "hi", label: "Hindi" },
  { value: "gu", label: "Gujarati" },
  { value: "ar", label: "Arabic" },
];

// Matches the registration wizard's ORG_TYPES exactly (Organisation.industry
// enum) — the wizard's "What describes you best?" step and this dropdown
// edit the same field, so the option set has to stay in sync.
const INDUSTRY_OPTIONS: { value: OrgIndustry; label: string }[] = [
  { value: "developer", label: "Real Estate — Developer" },
  { value: "broker", label: "Real Estate — Broker / Agency" },
  { value: "channel", label: "Channel Partner" },
  { value: "mixed", label: "Mixed" },
];


const SUBSCRIPTION_STATUS_BADGE: Record<string, string> = {
  active: "b-green", trial: "b-amber", past_due: "b-rose", paused: "b-gray", cancelled: "b-gray",
};
const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  active: "Active", trial: "Trial", past_due: "Past due", paused: "Paused", cancelled: "Cancelled",
};
const INVOICE_STATUS_BADGE: Record<string, string> = { paid: "b-green", pending: "b-amber" };
const INVOICE_STATUS_LABEL: Record<string, string> = { paid: "Paid", pending: "Pending" };

const PLAN_LIMIT_ROWS: { key: "templates" | "projects" | "users"; label: string }[] = [
  { key: "templates", label: "Templates" },
  { key: "projects", label: "Projects" },
  { key: "users", label: "Users" },
];

const NAV_GROUPS = [
  { grp: "ORGANISATION", items: [
    { s: "general", icon: "building" as IconName, t: "General" },
    { s: "branding", icon: "sparkles" as IconName, t: "Branding" },
    { s: "localization", icon: "globe" as IconName, t: "Localization" },
    { s: "domain", icon: "globe" as IconName, t: "Domain" },
  ] },
  { grp: "SALES", items: [
    { s: "crm", icon: "crm" as IconName, t: "CRM & Leads" },
    { s: "fields", icon: "puzzle" as IconName, t: "Custom Attributes" },
    { s: "pipeline", icon: "modules" as IconName, t: "Pipeline & Sources" },
    { s: "scoring", icon: "star" as IconName, t: "Scoring & Assignment" },
    { s: "automation", icon: "link" as IconName, t: "Automation & SLA" },
  ] },
  { grp: "COMMUNICATION", items: [
    { s: "comms", icon: "phone" as IconName, t: "Calling & WhatsApp" },
    { s: "email", icon: "mail" as IconName, t: "Email" },
    { s: "notifications", icon: "bell" as IconName, t: "Notifications" },
  ] },
  { grp: "PLATFORM", items: [
    { s: "data", icon: "document" as IconName, t: "Data & Import" },
    { s: "api", icon: "key" as IconName, t: "API & Webhooks" },
    { s: "audit", icon: "shield" as IconName, t: "Audit Log" },
  ] },
  { grp: "ACCOUNT", items: [
    { s: "billing", icon: "billing" as IconName, t: "Billing" },
    { s: "security", icon: "lock" as IconName, t: "Security" },
  ] },
] as const;

const SECTION_META: Record<string, { icon: IconName; title: string; sub: string }> = {
  general: { icon: "building", title: "Organisation profile", sub: "Basic details, legal info and registered address" },
  branding: { icon: "sparkles", title: "Logo & identity", sub: "Shown across the app, landing pages & emails" },
  localization: { icon: "globe", title: "Formats & language", sub: "Regional preferences for your workspace" },
  domain: { icon: "globe", title: "Domain & subdomain", sub: "Your organisation site URL and custom domain" },
  crm: { icon: "crm", title: "CRM & leads", sub: "How leads are captured and handled" },
  fields: { icon: "puzzle", title: "Custom attributes", sub: "Add your own fields to leads, contacts, projects & bookings" },
  pipeline: { icon: "modules", title: "Pipeline & sources", sub: "Stages, lost reasons and lead sources" },
  scoring: { icon: "star", title: "Scoring & assignment", sub: "Lead scores and distribution rules" },
  automation: { icon: "link", title: "Automation & SLA", sub: "Trigger workflows and response targets" },
  comms: { icon: "phone", title: "Calling & WhatsApp", sub: "Dialler, AI voice and WhatsApp Business" },
  email: { icon: "mail", title: "Email", sub: "Sending domain and defaults" },
  notifications: { icon: "bell", title: "Notifications", sub: "Channels per event type" },
  data: { icon: "document", title: "Data & import", sub: "Move data in and out of the platform" },
  api: { icon: "key", title: "API & webhooks", sub: "Programmatic access and event delivery" },
  audit: { icon: "shield", title: "Audit log", sub: "Recent admin & security events" },
  billing: { icon: "billing", title: "Billing", sub: "Subscription, plans and invoices" },
  security: { icon: "lock", title: "Security", sub: "Sign-in policy and danger zone" },
};

function Toggle({ on = false }: { on?: boolean }) {
  const [s, setS] = useState(on);
  return <div className={`switch${s ? " on" : ""}`} onClick={() => setS((v) => !v)} />;
}

interface GeneralBrandingForm {
  name: string; legalName: string; industry: OrgIndustry | ""; reraLicenseNo: string; gstin: string;
  supportEmail: string; supportPhone: string;
  city: string; country: string; addressLine1: string; addressLine2: string; state: string; postalCode: string;
  timezone: string; currency: string; defaultLanguage: string; brandColour: string;
  logoUrl: string; faviconUrl: string;
}

function formToOrg(org: SafeOrganisation): GeneralBrandingForm {
  return {
    name: org.name, legalName: org.legal_name ?? "", industry: org.industry ?? "",
    reraLicenseNo: org.rera_license_no ?? "", gstin: org.gstin ?? "",
    supportEmail: org.support_email ?? "", supportPhone: org.support_phone ?? "",
    city: org.city, country: org.country ?? "", addressLine1: org.address_line1 ?? "", addressLine2: org.address_line2 ?? "",
    state: org.state ?? "", postalCode: org.postal_code ?? "", timezone: org.timezone, currency: org.currency,
    defaultLanguage: org.default_language, brandColour: org.brand_colour ?? "#4f46e5",
    logoUrl: org.logo_url ?? "", faviconUrl: org.favicon_url ?? "",
  };
}

// Image field with inline preview + upload + remove — org logo & favicon
// in the branding section. `value` is the stored public URL ("" = none).
function AssetField({
  value,
  uploading,
  accept,
  uploadedLabel,
  onPick,
  onRemove,
}: {
  value: string;
  uploading: boolean;
  accept: string;
  uploadedLabel: string;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onPick(file);
  };
  return value ? (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 11px", border: "1px solid var(--line-2)", borderRadius: 11, background: "var(--surface)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={value} alt="Preview" style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--surface)", flexShrink: 0 }} />
      <span className="muted" style={{ flex: 1, minWidth: 0, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {uploading ? "Uploading…" : uploadedLabel}
      </span>
      <label style={{ flexShrink: 0, cursor: "pointer", color: "var(--brand)", fontWeight: 600, fontSize: 12.5 }}>
        <input type="file" accept={accept} style={{ display: "none" }} onChange={onChange} />
        Replace
      </label>
      <button
        type="button"
        aria-label="Remove"
        title="Remove"
        onClick={onRemove}
        style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 7, border: "1px solid var(--line-2)", background: "var(--surface)", color: "var(--muted)", cursor: "pointer", fontSize: 13, lineHeight: 1 }}
      >
        ✕
      </button>
    </div>
  ) : (
    <label className="drop" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}>
      <input type="file" accept={accept} style={{ display: "none" }} onChange={onChange} />
      {uploading ? "Uploading…" : <><Icon name="upload" size={16} /> Upload · <span style={{ color: "var(--brand)", fontWeight: 600 }}>browse</span></>}
    </label>
  );
}

function formatMoney(amount: number, currency: string) {
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  return `${symbol}${amount.toLocaleString("en-IN")}`;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function PlanLimitsSelect({ limits }: { limits: { templates?: string; projects?: string; users?: string } | null }) {
  const [open, setOpen] = useState(false);
  const rows = PLAN_LIMIT_ROWS.map((r) => ({ ...r, count: limits?.[r.key] ?? null })).filter((r) => r.count != null && r.count !== "");
  return (
    <div className="mselect">
      <button type="button" className="mselect-btn" onClick={() => setOpen((o) => !o)}>
        <span>{rows.length} included</span><span className={`caret${open ? " up" : ""}`}>▾</span>
      </button>
      {open ? (
        <div className="mselect-panel">
          {rows.length === 0 ? (
            <div className="mselect-empty">No limit details for this plan.</div>
          ) : (
            rows.map((r) => (
              <label key={r.key} className="mselect-opt">
                <input type="checkbox" defaultChecked readOnly />
                <span className="cnt">{r.count}</span>
                <span>{r.label}</span>
              </label>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function SectionHead({ section }: { section: string }) {
  const meta = SECTION_META[section];
  if (!meta) return null;
  return (
    <div className="os-sec-head">
      <span className="os-sec-ic"><Icon name={meta.icon} size={20} /></span>
      <div>
        <h2>{meta.title}</h2>
        <p>{meta.sub}</p>
      </div>
    </div>
  );
}

function Card({
  icon, title, sub, action, children,
}: { icon: IconName; title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="os-card-top">
        <span className="os-card-ic"><Icon name={icon} size={18} /></span>
        <div className="os-card-htext">
          <div className="os-card-t">{title}</div>
          {sub ? <div className="os-card-x">{sub}</div> : null}
        </div>
        {action ? <div className="os-card-action">{action}</div> : null}
      </div>
      <div className="card-b">{children}</div>
    </div>
  );
}

const DOMAIN_STATUS_BADGE: Record<string, string> = {
  none: "b-gray", pending: "b-amber", approved: "b-blue", active: "b-green", rejected: "b-rose", connected: "b-green",
};
const DOMAIN_STATUS_LABEL: Record<string, string> = {
  none: "Not set", pending: "Pending approval", approved: "Approved", active: "Active", rejected: "Rejected", connected: "Connected",
};

function DomainSection() {
  const [info, setInfo] = useState<OrgDomainInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customDomain, setCustomDomain] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  async function load() {
    setBusy(true);
    try {
      const data = await getOrgDomainInfo();
      setInfo(data);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Could not load domain settings");
    } finally {
      setLoading(false);
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!customDomain.trim()) return;
    setSending(true);
    setSent(null);
    setError(null);
    try {
      await requestCustomDomain({ domain: customDomain.trim() });
      setCustomDomain("");
      setSent("Custom domain request submitted for review.");
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Could not submit custom domain request");
    } finally {
      setSending(false);
    }
  }

  const badge = (status: string) => (
    <span className={`badge ${DOMAIN_STATUS_BADGE[status] ?? "b-gray"}`}>{DOMAIN_STATUS_LABEL[status] ?? status}</span>
  );

  const host = info?.subdomainHost ?? subdomainPreviewHost(info?.subdomain);

  return (
    <Card icon="globe" title="Subdomain" sub="Your organisation site address on this platform">
      <div className="card-b" style={{ padding: 0 }}>
        {loading ? (
          <div className="muted" style={{ padding: 16 }}>Loading domain settings…</div>
        ) : busy ? null : !info ? (
          <div className="muted" style={{ padding: 16 }}>{error ?? "Domain settings unavailable."}</div>
        ) : (
          <>
            <div className="swrow">
              <div className="tx">
                <b>Subdomain</b>
                <div className="muted">
                  {info.subdomain ? host : "No subdomain requested."}
                  {info.subdomainStatus === "active" ? " — live" : ""}
                </div>
              </div>
              {badge(info.subdomainStatus)}
            </div>
            <div className="swrow">
              <div className="tx">
                <b>Custom domain</b>
                <div className="muted">
                  {info.customDomain ?? "No custom domain mapped yet."}
                  {info.customDomainStatus === "connected" ? " — pointing to your site" : ""}
                </div>
              </div>
              {badge(info.customDomainStatus)}
            </div>

            <div style={{ padding: "4px 16px 16px" }}>
              <div className="os-card-x" style={{ margin: "12px 0 8px", fontWeight: 600, color: "var(--fg)" }}>
                Map a custom domain
              </div>
              <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
                Bring your own domain (e.g. homes.skylinedev.com). A super admin reviews and approves it
                before it goes live. Only available once your organisation is active.
              </div>
              <form onSubmit={handleRequest} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                  <input
                    className="inp"
                    placeholder="example.com"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                  />
                </div>
                <button className="btn btn-primary" type="submit" disabled={sending || info.subdomainStatus !== "active"}>
                  {sending ? "Submitting…" : "Request"}
                </button>
              </form>
              {sent ? <div className="muted" style={{ color: "var(--green)", marginTop: 8 }}>{sent}</div> : null}
              {error ? <div className="muted" style={{ color: "var(--rose)", marginTop: 8 }}>{error}</div> : null}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

export default function OrgSettingsPage() {
  const { accessToken } = useAuth();
  const [section, setSection] = useState("general");
  const [org, setOrg] = useState<SafeOrganisation | null>(null);
  const [form, setForm] = useState<GeneralBrandingForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [navQuery, setNavQuery] = useState("");
  const [billing, setBilling] = useState<OrgBillingSummary | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [plansCycle, setPlansCycle] = useState<"monthly" | "yearly">("monthly");
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeOk, setChangeOk] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!accessToken) return;
    setLoading(true);
    apiFetch<SafeOrganisation>("/org/settings", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => { setOrg(res); setForm(formToOrg(res)); })
      .catch((err) => setSaveError(err instanceof Error ? err.message : "Failed to load settings."))
      .finally(() => setLoading(false));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<OrgBillingSummary>("/org/billing", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(setBilling).catch((err) => setBillingError(err instanceof Error ? err.message : "Failed to load billing."))
      .finally(() => setBillingLoading(false));
  }, [accessToken]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!accessToken) return;
    setPlansLoading(true); setInvoicesLoading(true);
    Promise.all([getPlans(), getInvoices()])
      .then(([p, inv]) => { setPlans(p); setInvoices(inv); })
      .catch(() => {})
      .finally(() => { setPlansLoading(false); setInvoicesLoading(false); });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [accessToken]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const wanted = new URLSearchParams(window.location.search).get("section");
    const valid: string[] = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.s));
    if (wanted && valid.includes(wanted)) setSection(wanted);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function markDirty() { setDirty(true); setSaved(false); }

  function updateForm(patch: Partial<GeneralBrandingForm>) {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev)); markDirty();
  }

  // Logo + favicon share one presigned-upload flow against the org-scoped
  // endpoint (key is scoped to the caller's org server-side). The URL lands
  // in the form and is persisted on the next "Save changes".
  async function handleAssetUpload(kind: "logo" | "favicon", file: File) {
    if (!accessToken) return;
    const setBusy = kind === "logo" ? setLogoUploading : setFaviconUploading;
    const key: "logoUrl" | "faviconUrl" = kind === "logo" ? "logoUrl" : "faviconUrl";
    setSaveError(null);
    setBusy(true);
    try {
      const { uploadUrl, publicUrl } = await apiFetch<{ uploadUrl: string; publicUrl: string }>(
        `/org/settings/${kind}-upload-url`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
        },
      );
      const put = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) throw new Error(`Upload failed (${put.status}).`);
      updateForm({ [key]: publicUrl });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Upload failed — please try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const country = e.target.value;
    const meta = COUNTRY_META[country];
    if (meta) {
      updateForm({ country, currency: meta.currency, timezone: meta.timezone });
    } else {
      updateForm({ country });
    }
  }

  async function handleSave() {
    if (!form || !accessToken) return;
    setSaveError(null); setSaving(true);
    try {
      const body: UpdateOrganisationSettingsInput = {
        name: form.name, city: form.city, country: form.country, addressLine1: form.addressLine1,
        addressLine2: form.addressLine2, state: form.state, postalCode: form.postalCode,
        timezone: form.timezone, currency: form.currency,
        defaultLanguage: form.defaultLanguage, brandColour: form.brandColour,
        logoUrl: form.logoUrl, faviconUrl: form.faviconUrl,
        legalName: form.legalName || undefined,
        industry: form.industry || undefined,
        reraLicenseNo: form.reraLicenseNo || undefined,
        gstin: form.gstin || undefined,
        supportEmail: form.supportEmail || undefined,
        supportPhone: form.supportPhone || undefined,
      };
      const updated = await apiFetch<SafeOrganisation>("/org/settings", {
        method: "PATCH", headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(body),
      });
      setOrg(updated); setForm(formToOrg(updated)); setSaved(true); setDirty(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally { setSaving(false); }
  }

  function handleDiscard() {
    if (!org) return;
    setForm(formToOrg(org)); setDirty(false); setSaved(false); setSaveError(null);
  }

  async function handleChangePlan(planId: string, cycle: "monthly" | "yearly" = plansCycle) {
    if (!accessToken) return;
    setChangeError(null); setChangeOk(null); setChangeLoading(true);
    try {
      const res: ChangePlanResult = await changePlan({ planId, billingCycle: cycle });
      setChangeOk(`Switched to the ${res.planName} plan (${cycle === "yearly" ? "billed yearly" : "billed monthly"}).`);
      const b = await apiFetch<OrgBillingSummary>("/org/billing", { headers: { Authorization: `Bearer ${accessToken}` } });
      setBilling(b); if (b.subscription) setPlansCycle(b.subscription.billingCycle);
    } catch (err) { setChangeError(err instanceof Error ? err.message : "Failed to change plan."); }
    finally { setChangeLoading(false); }
  }

  if (loading || !org || !form) {
    return <div className="card"><div className="card-b"><p className="muted">Loading settings…</p></div></div>;
  }

  const q = navQuery.trim().toLowerCase();
  const filteredGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => (q ? it.t.toLowerCase().includes(q) : true)),
  })).filter((g) => g.items.length > 0);

  const saveButton = (
    <div className="os-actions">
      <button className="btn btn-ghost" onClick={handleDiscard} disabled={saving || !dirty}>Discard</button>
      <button className="btn btn-primary" onClick={() => void handleSave()} disabled={saving}>
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
      </button>
    </div>
  );

  return (
    <div className="os-page">
      <div className="os-head reveal in">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, minWidth: 0 }}>
            <div className="h-text">
              <div className="eyebrow">Workspace</div>
              <h1>Settings</h1>
              <div className="sub">Manage your profile, organisation, CRM &amp; custom attributes, pipeline, communication, automation, data, API and security.</div>
            </div>
          </div>
        {saveButton}
      </div>
      {saveError ? <div className="form-alert">{saveError}</div> : null}

      <div className="os-grid">
        <aside className="os-nav">
          <div className="os-nav-search">
            <Icon name="search" size={15} />
            <input
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder="Search settings…"
              aria-label="Search settings"
            />
          </div>
          <div className="os-nav-groups">
            {filteredGroups.length === 0 ? (
              <div className="os-nav-empty">No settings match “{navQuery}”.</div>
            ) : filteredGroups.map((g) => (
              <div className="os-nav-group" key={g.grp}>
                <div className="os-nav-group-title">{g.grp}</div>
                {g.items.map((it) => (
                  <button
                    key={it.s}
                    className={`os-nav-item${section === it.s ? " on" : ""}`}
                    onClick={() => setSection(it.s)}
                  >
                    <span className="os-nav-ic"><Icon name={it.icon} size={16} /></span>
                    <span className="os-nav-label">{it.t}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        <div className="os-content">
          {/* GENERAL */}
          <div className={`os-section${section === "general" ? " on" : ""}`}>
            <SectionHead section="general" />
            <Card icon="building" title="Organisation profile" sub="Basic details" >
              <div className="row2">
                <div className="field"><label>Organisation name</label><input className="inp" value={form.name} onChange={(e) => updateForm({ name: e.target.value })} /></div>
                <div className="field"><label>Legal / registered name</label><input className="inp" value={form.legalName} onChange={(e) => updateForm({ legalName: e.target.value })} placeholder="Skyline Developers Pvt. Ltd." /></div>
              </div>
              <div className="row2">
                <div className="field">
                  <label>Subdomain</label>
                  <input className="inp inp-mono" value={org.subdomain ?? ""} readOnly disabled placeholder="Not set yet" />
                  <div className="hint">Set from the Domain section — changing it here would break existing links.</div>
                </div>
                <div className="field">
                  <label>Industry</label>
                  <select className="inp" value={form.industry} onChange={(e) => updateForm({ industry: e.target.value as OrgIndustry })}>
                    <option value="">Select…</option>
                    {INDUSTRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="row2">
                <div className="field"><label>RERA / license no.</label><input className="inp inp-mono" value={form.reraLicenseNo} onChange={(e) => updateForm({ reraLicenseNo: e.target.value })} placeholder="PR/GJ/AHM/2026/00842" /></div>
                <div className="field"><label>GSTIN</label><input className="inp inp-mono" value={form.gstin} onChange={(e) => updateForm({ gstin: e.target.value })} placeholder="24AABCS1234F1Z5" /></div>
              </div>
              <div className="row2">
                <div className="field"><label>Support email</label><input className="inp" type="email" value={form.supportEmail} onChange={(e) => updateForm({ supportEmail: e.target.value })} placeholder="care@skylinedev.in" /></div>
                <div className="field"><label>Support phone</label><input className="inp inp-mono" value={form.supportPhone} onChange={(e) => updateForm({ supportPhone: e.target.value })} placeholder="+91 79000 12345" /></div>
              </div>
              <div className="row2">
                <div className="field">
                  <label>Country</label>
                  <select className="inp" value={form.country} onChange={handleCountryChange}>
                    <option value="">Select country…</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {form.country && COUNTRY_META[form.country] ? (
                    <div className="hint" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "var(--green)", display: "inline-flex" }}><Icon name="check" size={13} /></span>
                      <span>Auto-set from {form.country}: Currency <b>{COUNTRY_META[form.country].currency}</b> · Timezone <b>{COUNTRY_META[form.country].timezone}</b></span>
                    </div>
                  ) : null}
                </div>
                <div className="field"><label>City</label><input className="inp" value={form.city} onChange={(e) => updateForm({ city: e.target.value })} /></div>
              </div>
              <div className="row2">
                <div className="field"><label>State</label><input className="inp" value={form.state} onChange={(e) => updateForm({ state: e.target.value })} /></div>
                <div className="field"><label>Postal code</label><input className="inp inp-mono" value={form.postalCode} onChange={(e) => updateForm({ postalCode: e.target.value })} /></div>
              </div>
              <div className="field">
                <label>Registered address</label>
                <textarea className="inp" rows={2} value={form.addressLine1} onChange={(e) => updateForm({ addressLine1: e.target.value })} placeholder="Address line 1" />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Address line 2</label>
                <input className="inp" value={form.addressLine2} onChange={(e) => updateForm({ addressLine2: e.target.value })} placeholder="Optional" />
              </div>
            </Card>
          </div>

          {/* BRANDING */}
          <div className={`os-section${section === "branding" ? " on" : ""}`}>
            <SectionHead section="branding" />
            <Card icon="sparkles" title="Logo & identity" sub="Shown across the app, landing pages & emails">
              <div className="row2">
                <div className="field">
                  <label>Logo</label>
                  <AssetField
                    value={form.logoUrl}
                    uploading={logoUploading}
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    uploadedLabel="Logo uploaded"
                    onPick={(file) => void handleAssetUpload("logo", file)}
                    onRemove={() => updateForm({ logoUrl: "" })}
                  />
                </div>
                <div className="field">
                  <label>Favicon</label>
                  <AssetField
                    value={form.faviconUrl}
                    uploading={faviconUploading}
                    accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,.ico"
                    uploadedLabel="Favicon uploaded"
                    onPick={(file) => void handleAssetUpload("favicon", file)}
                    onRemove={() => updateForm({ faviconUrl: "" })}
                  />
                </div>
              </div>
              <div className="field"><label>Brand colour</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="color"
                    className="colorpick"
                    value={/^#[0-9a-f]{6}$/i.test(form.brandColour) ? form.brandColour : "#4f46e5"}
                    onChange={(e) => updateForm({ brandColour: e.target.value })}
                    aria-label="Pick a brand colour"
                  />
                  <span className="mono">{(form.brandColour || "#4f46e5").toUpperCase()}</span>
                </div>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Email sender name</label>
                <input className="inp" value="" disabled placeholder="Coming soon — part of the Email module" />
              </div>
            </Card>
          </div>

          {/* LOCALIZATION */}
          <div className={`os-section${section === "localization" ? " on" : ""}`}>
            <SectionHead section="localization" />
            <Card icon="globe" title="Formats & language" sub="Regional preferences">
              <div className="row3">
                <div className="field"><label>Timezone</label><select className="inp" value={form.timezone} onChange={(e) => updateForm({ timezone: e.target.value })}>{!TIMEZONE_OPTIONS.some((t) => t.value === form.timezone) && form.timezone ? <option value={form.timezone}>{form.timezone}</option> : null}{TIMEZONE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                <div className="field"><label>Currency</label><select className="inp" value={form.currency} onChange={(e) => updateForm({ currency: e.target.value })}>{!CURRENCY_OPTIONS.some((c) => c.value === form.currency) && form.currency ? <option value={form.currency}>{form.currency}</option> : null}{CURRENCY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                <div className="field"><label>Language</label><select className="inp" value={form.defaultLanguage} onChange={(e) => updateForm({ defaultLanguage: e.target.value })}>{!LANGUAGES.some((l) => l.value === form.defaultLanguage) && form.defaultLanguage ? <option value={form.defaultLanguage}>{form.defaultLanguage}</option> : null}{LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</select></div>
              </div>
              <div className="row3">
                <div className="field"><label>Number format</label><select className="inp" value="" disabled><option value="">Coming soon</option></select></div>
                <div className="field"><label>Date format</label><select className="inp" value="" disabled><option value="">Coming soon</option></select></div>
                <div className="field"><label>Time format</label><select className="inp" value="" disabled><option value="">Coming soon</option></select></div>
              </div>
              <div className="field" style={{ marginBottom: 0, maxWidth: "calc(33.33% - 8px)" }}>
                <label>Week starts</label><select className="inp" value="" disabled><option value="">Coming soon</option></select>
              </div>
            </Card>
          </div>

          {/* DOMAIN */}
          <div className={`os-section${section === "domain" ? " on" : ""}`}>
            <SectionHead section="domain" />
            <DomainSection />
          </div>

          {/* CRM */}
          <div className={`os-section${section === "crm" ? " on" : ""}`}>
            <SectionHead section="crm" />
            <Card icon="crm" title="Lead capture & behaviour" sub="How leads are created and handled">
              <div className="card-b" style={{ padding: 0 }}>
                {[
                  ["Auto-create lead on form submit", "Every website / landing-page submission becomes a lead.", true],
                  ["Capture UTM & ad attribution", "Store source, campaign, ad set and UTM on each lead.", true],
                  ["Require phone number", "Reject leads without a valid phone.", true],
                  ["Merge duplicate leads", "Detect duplicates by phone / email and merge automatically.", true],
                  ["Recycle idle leads", "Return leads with no activity for 7+ days to the pool.", false],
                ].map(([t, d, on]) => (
                  <div className="swrow" key={t as string}>
                    <div className="tx"><b>{t as string}</b><div className="muted">{d as string}</div></div>
                    <Toggle on={on as boolean} />
                  </div>
                ))}
              </div>
            </Card>
            <Card icon="puzzle" title="Required fields" sub="Fields an agent must fill before saving">
              <div className="pill-list">
                {["Name", "Phone", "Project", "Budget", "Source"].map((p) => <span key={p} className="pill">{p}<span className="x">×</span></span>)}
                <span className="pill" style={{ cursor: "pointer", color: "var(--brand)" }}>+ Add field</span>
              </div>
            </Card>
            <Card icon="star" title="Lead tags" sub="Reusable labels agents can apply">
              <div className="pill-list">
                {["Hot", "NRI", "Investor", "Ready buyer", "Price-sensitive", "VIP"].map((p) => (
                <span key={p} className="pill" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{p === "Hot" ? <Icon name="flame" size={13} /> : null}{p}<span className="x">×</span></span>
              ))}
                <span className="pill" style={{ cursor: "pointer", color: "var(--brand)" }}>+ Add tag</span>
              </div>
            </Card>
          </div>

          {/* FIELDS */}
          <div className={`os-section${section === "fields" ? " on" : ""}`}>
            <SectionHead section="fields" />
            <Card icon="puzzle" title="Custom attributes" sub="Add your own fields to leads, contacts, projects & bookings">
              <div className="tbl-wrap"><table className="tbl">
                <thead><tr><th>Label</th><th>API key</th><th>Type</th><th>Entity</th><th>Required</th><th /></tr></thead>
                <tbody>
                  {[
                    ["Preferred floor", "preferred_floor", "Dropdown", "Lead", false],
                    ["Loan status", "loan_status", "Dropdown", "Lead", true],
                    ["Possession timeline", "possession_timeline", "Dropdown", "Lead", false],
                    ["Co-applicant name", "co_applicant", "Text", "Lead", false],
                    ["Carpet area (sqft)", "carpet_area", "Number", "Project unit", true],
                  ].map((r) => (
                    <tr key={r[1] as string}>
                      <td>{r[0] as string}</td><td><span className="mono">{r[1] as string}</span></td><td>{r[2] as string}</td><td>{r[3] as string}</td>
                      <td>{r[4] ? <span className="badge b-green">Yes</span> : <span className="badge b-gray">No</span>}</td>
                      <td><button className="btn btn-ghost btn-sm">Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>+ Add attribute</button>
            </Card>
          </div>

          {/* PIPELINE */}
          <div className={`os-section${section === "pipeline" ? " on" : ""}`}>
            <SectionHead section="pipeline" />
            <Card icon="modules" title="Pipeline stages" sub="Drag to reorder · click to rename">
              <div className="card-b" style={{ padding: 0 }} id="stageList">
                {["New", "Contacted", "Follow-up", "Site Visit", "Negotiation", "Won", "Lost"].map((st, i) => (
                  <div className="stage" key={st}>
                    <span className="grip">⠿</span>
                    <span className="dotc" style={{ background: ["#94a3b8", "#0ea5e9", "#f59e0b", "#6366f1", "#7c3aed", "#16a34a", "#e11d48"][i] }} />
                    <input defaultValue={st} />
                    <button className="btn btn-ghost btn-sm">✕</button>
                  </div>
                ))}
                <button className="btn btn-soft btn-sm" style={{ marginTop: 12 }}>+ Add stage</button>
              </div>
            </Card>
            <Card icon="modules" title="Lost reasons" sub="Why deals are marked lost">
              <div className="pill-list">
                {["Budget mismatch", "Bought elsewhere", "Not responding", "Location not suitable", "Just browsing"].map((p) => <span key={p} className="pill">{p}<span className="x">×</span></span>)}
                <span className="pill" style={{ cursor: "pointer", color: "var(--brand)" }}>+ Add</span>
              </div>
            </Card>
            <Card icon="modules" title="Lead sources" sub="Channels leads can come from">
              <div className="pill-list">
                {["Meta Ads", "Google Ads", "Website", "99acres", "MagicBricks", "Walk-in", "Referral", "Channel partner"].map((p) => <span key={p} className="pill">{p}<span className="x">×</span></span>)}
                <span className="pill" style={{ cursor: "pointer", color: "var(--brand)" }}>+ Add source</span>
              </div>
            </Card>
          </div>

          {/* SCORING */}
          <div className={`os-section${section === "scoring" ? " on" : ""}`}>
            <SectionHead section="scoring" />
            <Card icon="star" title="Lead scoring" sub="Points that make a lead Hot / Warm / Cold">
              <div className="card-b" style={{ padding: 0 }}>
                {[["Budget matches project", "+30"], ["Responded within 1 hour", "+20"], ["Booked a site visit", "+25"], ["Loan pre-approved", "+15"], ["No activity 7 days", "-20"]].map(([t, v]) => (
                  <div className="swrow" key={t as string}><div className="tx"><b>{t as string}</b><div className="muted">{v as string} points</div></div><input className="inp" style={{ width: 80 }} defaultValue={v as string} /></div>
                ))}
                <div className="row3" style={{ marginTop: 16, padding: "4px 0 0" }}>
                  <div className="field"><label><Icon name="flame" size={14} style={{ verticalAlign: "-2px", marginRight: 3 }} /> Hot ≥</label><input className="inp" defaultValue="75" /></div>
                  <div className="field"><label><Icon name="sun" size={14} style={{ verticalAlign: "-2px", marginRight: 3 }} /> Warm ≥</label><input className="inp" defaultValue="45" /></div>
                  <div className="field" style={{ marginBottom: 0 }}><label><Icon name="snowflake" size={14} style={{ verticalAlign: "-2px", marginRight: 3 }} /> Cold below</label><input className="inp" defaultValue="45" /></div>
                </div>
              </div>
            </Card>
            <Card icon="modules" title="Assignment rules" sub="How new leads are distributed">
              <div className="field" style={{ marginBottom: 16 }}><label>Method</label><select className="inp"><option>Round-robin within team</option><option>Load-balanced (fewest open leads)</option><option>By project owner</option><option>Manual</option></select></div>
              <div className="swrow"><div className="tx"><b>Skip offline agents</b><div className="muted">Only assign to agents who are online.</div></div><Toggle on /></div>
              <div className="swrow" style={{ borderBottom: 0 }}><div className="tx"><b>Cap leads per agent/day</b></div><input className="inp" style={{ width: 80 }} defaultValue="25" /></div>
            </Card>
          </div>

          {/* AUTOMATION */}
          <div className={`os-section${section === "automation" ? " on" : ""}`}>
            <SectionHead section="automation" />
            <Card icon="link" title="Response SLA" sub="Targets & escalation">
              <div className="card-b" style={{ padding: 0 }}>
                <div className="swrow"><div className="tx"><b>First-response target</b></div><select className="inp" style={{ width: "auto" }}><option>5 min</option><option>15 min</option><option>30 min</option><option>1 hour</option></select></div>
                <div className="swrow"><div className="tx"><b>Escalate breaches to manager</b><div className="muted">Alert the team lead when SLA is missed.</div></div><Toggle on /></div>
                <div className="swrow" style={{ borderBottom: 0 }}><div className="tx"><b>AI call new leads instantly</b><div className="muted">Auto-dial and qualify within 60 seconds.</div></div><Toggle on /></div>
              </div>
            </Card>
            <Card icon="link" title="Automations" sub="Trigger-based workflows">
              <div className="card-b" style={{ padding: 0 }}>
                {[["WhatsApp welcome on new lead", "Send brochure + booking link automatically.", true], ["Follow-up reminder", "Nudge agent if a lead sits in Follow-up for 2 days.", true], ["Site-visit reminder", "WhatsApp the buyer 24h before a booked visit.", true], ["Re-engage cold leads", "Drip campaign to leads cold for 14 days.", false]].map(([t, d, on]) => (
                  <div className="swrow" key={t as string}><div className="tx"><b>{t as string}</b><div className="muted">{d as string}</div></div><Toggle on={on as boolean} /></div>
                ))}
              </div>
            </Card>
          </div>

          {/* COMMS */}
          <div className={`os-section${section === "comms" ? " on" : ""}`}>
            <SectionHead section="comms" />
            <Card icon="phone" title="Calling" sub="Dialler & AI voice">
              <div className="card-b" style={{ padding: 0 }}>
                {[["Masked calling", "Hide lead numbers; route via bridge.", true], ["Record calls", "Store recordings for QA & training.", true], ["AI voice agent", "Enable automated qualifying calls.", true]].map(([t, d, on]) => (
                  <div className="swrow" key={t as string}><div className="tx"><b>{t as string}</b><div className="muted">{d as string}</div></div><Toggle on={on as boolean} /></div>
                ))}
                <div className="swrow" style={{ borderBottom: 0 }}><div className="tx"><b>Monthly credits per agent</b></div><input className="inp" style={{ width: 100 }} defaultValue="1,000" /></div>
              </div>
            </Card>
            <Card icon="phone" title="WhatsApp Business" sub="Shared number & templates">
              <div className="row2">
                <div className="field"><label>Business number</label><input className="inp inp-mono" defaultValue="+91 79000 12345" /></div>
                <div className="field"><label>Display name</label><input className="inp" defaultValue="Skyline Developers" /></div>
              </div>
              <div className="swrow"><div className="tx"><b>Auto-assign chats to lead owner</b></div><Toggle on /></div>
              <div className="swrow" style={{ borderBottom: 0 }}><div className="tx"><b>Send read receipts</b></div><Toggle on /></div>
            </Card>
          </div>

          {/* EMAIL */}
          <div className={`os-section${section === "email" ? " on" : ""}`}>
            <SectionHead section="email" />
            <Card icon="mail" title="Email delivery" sub="Sending domain & defaults">
              <div className="row2">
                <div className="field"><label>From name</label><input className="inp" defaultValue="Skyline Developers" /></div>
                <div className="field"><label>From address</label><input className="inp inp-mono" defaultValue="hello@skylinedev.in" /></div>
              </div>
              <div className="swrow"><div className="tx"><b>DKIM / SPF verified</b><div className="muted">Domain authentication for deliverability.</div></div><span className="badge b-green">Verified</span></div>
              <div className="swrow"><div className="tx"><b>Track opens & clicks</b></div><Toggle on /></div>
              <div className="field" style={{ marginBottom: 0 }}><label>Default signature</label><textarea className="inp" rows={3} defaultValue={"Skyline Developers\nSG Highway, Ahmedabad · +91 79000 12345"} /></div>
            </Card>
          </div>

          {/* NOTIFICATIONS */}
          <div className={`os-section${section === "notifications" ? " on" : ""}`}>
            <SectionHead section="notifications" />
            <Card icon="bell" title="Notifications" sub="Channels per event type">
              <div className="tbl-wrap"><table className="tbl">
                <thead><tr><th>Event</th><th>Email</th><th>WhatsApp</th><th>In-app</th></tr></thead>
                <tbody>
                  {[["New lead assigned", true, true, true], ["Lead tagged to me", false, true, true], ["Follow-up due", true, false, true], ["Site visit booked", true, true, true], ["Deal won", true, false, true], ["SLA breach", true, false, true], ["Daily summary", true, false, false], ["Weekly report", true, false, false]].map(([t, e, w, a]) => (
                    <tr key={t as string}>
                      <td>{t as string}</td>
                      <td><Toggle on={e as boolean} /></td><td><Toggle on={w as boolean} /></td><td><Toggle on={a as boolean} /></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </Card>
          </div>

          {/* DATA */}
          <div className={`os-section${section === "data" ? " on" : ""}`}>
            <SectionHead section="data" />
            <Card icon="document" title="Import & export" sub="Move data in and out">
              <div className="row2">
                <div className="field"><label>Import leads</label><div className="drop"><Icon name="download" size={16} /> Upload CSV / Excel · <span style={{ color: "var(--brand)", fontWeight: 600 }}>browse</span></div></div>
                <div className="field"><label>Export</label><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button className="btn btn-ghost btn-block"><Icon name="download" size={14} /> Export all leads (CSV)</button>
                  <button className="btn btn-ghost btn-block"><Icon name="download" size={14} /> Export projects &amp; units</button>
                  <button className="btn btn-ghost btn-block"><Icon name="download" size={14} /> Export full backup</button>
                </div></div>
              </div>
            </Card>
          </div>

          {/* API */}
          <div className={`os-section${section === "api" ? " on" : ""}`}>
            <SectionHead section="api" />
            <Card icon="key" title="API keys" sub="Programmatic access">
              <p className="muted" style={{ margin: 0 }}>
                API access isn&apos;t available yet — no keys exist on any organisation. Coming soon.
              </p>
            </Card>
            <Card icon="link" title="Webhooks" sub="POST events to your endpoints">
              <p className="muted" style={{ margin: 0 }}>
                Webhook delivery isn&apos;t available yet. Coming soon.
              </p>
            </Card>
          </div>

          {/* AUDIT */}
          <div className={`os-section${section === "audit" ? " on" : ""}`}>
            <SectionHead section="audit" />
            <Card icon="shield" title="Audit log" sub="Recent admin & security events">
              <div className="tbl-wrap"><table className="tbl">
                <thead><tr><th>Event</th><th>User</th><th>IP</th><th>When</th></tr></thead>
                <tbody>
                  {[["Custom attribute added", "Rohan Shah", "103.21.x.x", "2 min ago"], ["User invited — Nisha Iyer", "Rohan Shah", "103.21.x.x", "1 hr ago"], ["Pipeline stage renamed", "Priya Nair", "49.36.x.x", "3 hrs ago"], ["API key generated", "Rohan Shah", "103.21.x.x", "Yesterday"], ["2FA enabled org-wide", "Rohan Shah", "103.21.x.x", "2 days ago"]].map((r, i) => (
                    <tr key={i}><td>{r[0] as string}</td><td>{r[1] as string}</td><td className="mono">{r[2] as string}</td><td className="muted">{r[3] as string}</td></tr>
                  ))}
                </tbody>
              </table></div>
            </Card>
          </div>

          {/* BILLING */}
          <div className={`os-section${section === "billing" ? " on" : ""}`}>
            <SectionHead section="billing" />
            {changeOk ? <div className="form-alert ok">{changeOk}</div> : null}
            {changeError ? <div className="form-alert">{changeError}</div> : null}
            <Card icon="billing" title="Plan" sub="Subscription & seats">
              <div className="card-b" style={{ padding: 0 }}>
                {billingLoading ? <p className="muted" style={{ padding: "4px 0 16px" }}>Loading billing details…</p> : billingError ? <p className="muted" style={{ padding: "4px 0 16px" }}>{billingError}</p> : !billing?.plan || !billing.subscription ? (
                  <div style={{ padding: "4px 0 16px" }}><p className="muted" style={{ marginTop: 0 }}>No active subscription on this organisation yet.</p><p className="muted" style={{ fontSize: 12.5 }}>Pick a plan below to get started.</p></div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "4px 0 16px" }}>
                    <div className="row2">
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>Current plan</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span className={`badge ${billing.plan.badge}`} style={{ fontSize: 13, padding: "6px 12px" }}>{billing.plan.name}</span>
                          {billing.plan.isPopular ? <span className="chip">Popular</span> : null}
                          <span className={`badge ${SUBSCRIPTION_STATUS_BADGE[billing.subscription.status] ?? "b-gray"}`}>{SUBSCRIPTION_STATUS_LABEL[billing.subscription.status] ?? billing.subscription.status}</span>
                        </div>
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>Price</label>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>
                          {formatMoney(billing.subscription.billingCycle === "yearly" ? billing.plan.priceYearly : billing.plan.priceMonthly, billing.subscription.currency)}
                          <span className="muted" style={{ fontWeight: 400, fontSize: 12.5 }}> / {billing.subscription.billingCycle === "yearly" ? "year" : "month"}</span>
                        </div>
                      </div>
                    </div>
                    {billing.subscription.renewsAt ? (
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>{billing.subscription.status === "trial" ? "Trial ends" : "Renews on"}</label>
                        <div>{formatDate(billing.subscription.renewsAt)}</div>
                      </div>
                    ) : null}
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>Templates</label>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
                        <span>{billing.usage.templatesUsed} of {billing.usage.templatesLimit ?? "unlimited"} used</span>
                        {billing.usage.templatesLimit != null && billing.usage.templatesUsed >= billing.usage.templatesLimit ? <span style={{ color: "var(--rose)", fontWeight: 700 }}>Limit reached</span> : null}
                      </div>
                      {billing.usage.templatesLimit != null ? (
                        <div style={{ height: 8, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.min(100, (billing.usage.templatesUsed / Math.max(1, billing.usage.templatesLimit)) * 100)}%`, background: billing.usage.templatesUsed >= billing.usage.templatesLimit ? "var(--rose)" : "var(--brand)", borderRadius: 999 }} />
                        </div>
                      ) : <div className="muted" style={{ fontSize: 12 }}>Unlimited on this plan.</div>}
                    </div>
                  </div>
                )}
              </div>
            </Card>
            <Card
              icon="billing"
              title="Plans & packages"
              action={(
                <div className="seg">
                  <span className={plansCycle === "monthly" ? "on" : ""} onClick={() => setPlansCycle("monthly")}>Monthly</span>
                  <span className={plansCycle === "yearly" ? "on" : ""} onClick={() => setPlansCycle("yearly")}>Yearly</span>
                </div>
              )}
            >
              {plansLoading ? <p className="muted">Loading plans…</p> : (
                <div className="plans-grid">
                  {plans.map((p) => {
                    const isCurrent = billing?.plan?.id === p.id;
                    const price = plansCycle === "yearly" ? p.priceYearly : p.priceMonthly;
                    return (
                      <div key={p.id} className={`plan-card${isCurrent ? " current" : ""}`} style={{ ["--pc" as string]: p.color }}>
                        {p.isPopular ? <span className="plan-flag">Most popular</span> : null}
                        <div className="plan-name">{p.name}</div>
                        <div className="plan-price">{formatMoney(price, billing?.subscription?.currency ?? "INR")}<span className="muted"> / {plansCycle === "yearly" ? "year" : "month"}</span></div>
                        <PlanLimitsSelect limits={p.limits} />
                        <button className={`btn ${isCurrent ? "" : "btn-primary"}`} disabled={isCurrent || changeLoading} onClick={() => void handleChangePlan(p.id)} style={isCurrent ? { opacity: 0.7, cursor: "default" } : undefined}>
                          {isCurrent ? "Current plan" : `Switch to ${p.name}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
            <Card icon="document" title="Invoices">
              {invoicesLoading ? <p className="muted">Loading invoices…</p> : invoices.length === 0 ? <p className="muted" style={{ marginTop: 0 }}>No invoices yet.</p> : (
                <div className="inv-table">
                  <div className="inv-row inv-head"><span>Invoice</span><span>Date</span><span>Plan</span><span>Amount</span><span>Status</span><span /></div>
                  {invoices.map((inv) => (
                    <div className="inv-row" key={inv.id}>
                      <span className="mono">{inv.number}</span><span>{formatDate(inv.issuedAt)}</span><span>{inv.planName}</span>
                      <span>{formatMoney(inv.amount, inv.currency)}</span>
                      <span><span className={`badge ${INVOICE_STATUS_BADGE[inv.status] ?? "b-gray"}`}>{INVOICE_STATUS_LABEL[inv.status] ?? inv.status}</span></span>
                      <span><button className="btn btn-ghost" disabled title="PDF download coming soon">Download</button></span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* SECURITY */}
          <div className={`os-section${section === "security" ? " on" : ""}`}>
            <SectionHead section="security" />
            <Card icon="lock" title="Sign-in policy" sub="Access & authentication">
              <div className="card-b" style={{ padding: 0 }}>
                {[["Two-factor authentication", "Require 2FA for all admins.", true], ["Strong password policy", "Min 12 chars, mixed case, number & symbol.", true], ["Restrict to office IPs", "Block sign-in from unknown networks.", false], ["Single sign-on (Google)", "Allow SSO via Google Workspace.", false]].map(([t, d, on]) => (
                  <div className="swrow" key={t as string}><div className="tx"><b>{t as string}</b><div className="muted">{d as string}</div></div><Toggle on={on as boolean} /></div>
                ))}
                <div className="swrow" style={{ borderBottom: 0 }}><div className="tx"><b>Session timeout</b></div><select className="inp" style={{ width: "auto" }}><option>30 minutes</option><option>1 hour</option><option>4 hours</option><option>8 hours</option></select></div>
              </div>
            </Card>
            <Card icon="alert" title="Danger zone" sub="Irreversible actions">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button className="btn btn-ghost btn-block" style={{ justifyContent: "flex-start" }}>Sign out all sessions</button>
                <button className="btn btn-danger btn-block" style={{ justifyContent: "flex-start" }}>Deactivate organisation</button>
              </div>
            </Card>
          </div>

          {dirty ? (
            <div className="os-savebar">
              <div className="os-savebar-l">
                <span className="os-save-dot" />
                <div>
                  <b>You have unsaved changes</b>
                  <div>Review and save to apply them.</div>
                </div>
              </div>
              {saveButton}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
