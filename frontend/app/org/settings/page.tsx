"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, getPlans, getInvoices, changePlan } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import type { ChangePlanInput, ChangePlanResult, InvoiceRow, OrgBillingSummary, Plan, SafeOrganisation, UpdateOrganisationSettingsInput } from "@/lib/types";

const TABS = ["General", "Branding", "Notifications", "Billing"] as const;
type Tab = (typeof TABS)[number];

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (GMT+5:30)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GMT+4:00)" },
  { value: "Asia/Riyadh", label: "Asia/Riyadh (GMT+3:00)" },
];

const CURRENCIES = [
  { value: "INR", label: "INR — Indian Rupee (₹)" },
  { value: "AED", label: "AED — UAE Dirham (د.إ)" },
  { value: "USD", label: "USD — US Dollar ($)" },
];

const LANGUAGES = [
  { value: "en-IN", label: "English (India)" },
  { value: "hi", label: "Hindi" },
  { value: "gu", label: "Gujarati" },
  { value: "ar", label: "Arabic" },
];

const BRAND_SWATCHES = ["#4f46e5", "#0ea5e9", "#0d9488", "#16a34a", "#d97706", "#e11d48", "#7c3aed"];

const NOTIFICATION_ROWS = [
  { label: "New lead email", description: "Email the assigned agent when a new lead arrives.", defaultOn: true },
  { label: "WhatsApp alert", description: "Push a WhatsApp alert to agents for hot leads.", defaultOn: true },
  { label: "Daily summary", description: "Morning digest of yesterday's leads and calls.", defaultOn: true },
  { label: "Weekly report", description: "Monday performance report to admins.", defaultOn: false },
];

interface GeneralBrandingForm {
  name: string;
  city: string;
  country: string;
  addressLine1: string;
  state: string;
  postalCode: string;
  timezone: string;
  currency: string;
  defaultLanguage: string;
  brandColour: string;
}

function formToOrg(org: SafeOrganisation): GeneralBrandingForm {
  return {
    name: org.name,
    city: org.city,
    country: org.country ?? "",
    addressLine1: org.address_line1 ?? "",
    state: org.state ?? "",
    postalCode: org.postal_code ?? "",
    timezone: org.timezone,
    currency: org.currency,
    defaultLanguage: org.default_language,
    brandColour: org.brand_colour ?? "#4f46e5",
  };
}

function formatMoney(amount: number, currency: string): string {
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  return `${symbol}${amount.toLocaleString("en-IN")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const SUBSCRIPTION_STATUS_BADGE: Record<string, string> = {
  active: "b-green",
  trial: "b-amber",
  past_due: "b-rose",
  paused: "b-gray",
  cancelled: "b-gray",
};

const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  active: "Active",
  trial: "Trial",
  past_due: "Past due",
  paused: "Paused",
  cancelled: "Cancelled",
};

const INVOICE_STATUS_BADGE: Record<string, string> = {
  paid: "b-green",
  pending: "b-amber",
};

const INVOICE_STATUS_LABEL: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
};

// Dynamic plan limits surfaced as counts on the plan cards (no static copy).
const PLAN_LIMIT_ROWS: { key: "templates" | "projects" | "users"; label: string }[] = [
  { key: "templates", label: "Templates" },
  { key: "projects", label: "Projects" },
  { key: "users", label: "Users" },
];

type PlanLimits = { templates?: string; projects?: string; users?: string } | null;

// Dynamic multi-select: options are derived from the plan's `limits` (templates /
// projects / users) with their counts — nothing is hardcoded.
function PlanLimitsSelect({ limits }: { limits: PlanLimits }) {
  const [open, setOpen] = useState(false);
  const rows = PLAN_LIMIT_ROWS.map((r) => ({ ...r, count: limits?.[r.key] ?? null })).filter(
    (r) => r.count != null && r.count !== "",
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set(rows.map((r) => r.key)));

  return (
    <div className="mselect">
      <button type="button" className="mselect-btn" onClick={() => setOpen((o) => !o)}>
        <span>
          {selected.size} included
        </span>
        <span className={`caret${open ? " up" : ""}`}>▾</span>
      </button>
      {open ? (
        <div className="mselect-panel">
          {rows.length === 0 ? (
            <div className="mselect-empty">No limit details for this plan.</div>
          ) : (
            rows.map((r) => (
              <label key={r.key} className="mselect-opt">
                <input
                  type="checkbox"
                  checked={selected.has(r.key)}
                  onChange={(e) =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(r.key);
                      else next.delete(r.key);
                      return next;
                    })
                  }
                />
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

export default function OrgSettingsPage() {
  const { accessToken } = useAuth();

  const [tab, setTab] = useState<Tab>("General");
  const [org, setOrg] = useState<SafeOrganisation | null>(null);
  const [form, setForm] = useState<GeneralBrandingForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
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
    if (!accessToken) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    apiFetch<SafeOrganisation>("/org/settings", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        setOrg(res);
        setForm(formToOrg(res));
      })
      .catch((err) => setSaveError(err instanceof Error ? err.message : "Failed to load settings."))
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<OrgBillingSummary>("/org/billing", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(setBilling)
      .catch((err) => setBillingError(err instanceof Error ? err.message : "Failed to load billing details."))
      .finally(() => setBillingLoading(false));
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    setPlansLoading(true);
    setInvoicesLoading(true);
    Promise.all([getPlans(), getInvoices()])
      .then(([p, inv]) => {
        setPlans(p);
        setInvoices(inv);
      })
      .catch(() => {
        /* non-fatal — billing tab still renders the current plan */
      })
      .finally(() => {
        setPlansLoading(false);
        setInvoicesLoading(false);
      });
  }, [accessToken]);

  function updateForm(patch: Partial<GeneralBrandingForm>) {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
    setSaved(false);
  }

  async function handleSave() {
    if (!form || !accessToken) return;
    setSaveError(null);
    setSaving(true);
    try {
      const body: UpdateOrganisationSettingsInput = {
        name: form.name,
        city: form.city,
        country: form.country,
        addressLine1: form.addressLine1,
        state: form.state,
        postalCode: form.postalCode,
        timezone: form.timezone,
        currency: form.currency,
        defaultLanguage: form.defaultLanguage,
        brandColour: form.brandColour,
      };
      const updated = await apiFetch<SafeOrganisation>("/org/settings", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });
      setOrg(updated);
      setForm(formToOrg(updated));
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePlan(planId: string, cycle: "monthly" | "yearly" = plansCycle) {
    if (!accessToken) return;
    setChangeError(null);
    setChangeOk(null);
    setChangeLoading(true);
    try {
      const res = await changePlan({ planId, billingCycle: cycle });
      setChangeOk(
        `Switched to the ${res.planName} plan (${cycle === "yearly" ? "billed yearly" : "billed monthly"}).`,
      );
      const b = await apiFetch<OrgBillingSummary>("/org/billing", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setBilling(b);
      if (b.subscription) setPlansCycle(b.subscription.billingCycle);
    } catch (err) {
      setChangeError(err instanceof Error ? err.message : "Failed to change plan.");
    } finally {
      setChangeLoading(false);
    }
  }

  if (loading || !org || !form) {
    return (
      <div className="card">
        <div className="card-b">
          <p className="muted">Loading settings…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"> More</div>
          <h1>Organisation Settings</h1>
          <div className="sub">Manage your organisation profile, branding, notifications and billing.</div>
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : saved ? "Saved " : "Save changes"}
          </button>
        </div>
      </div>

      {saveError ? <div className="form-alert">{saveError}</div> : null}

      <div className="tabs reveal in">
        {TABS.map((t) => (
          <a key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t}
          </a>
        ))}
      </div>

      {tab === "General" ? (
        <Reveal delay={2}>
          <div className="card">
            <div className="card-h">
              <span className="t">General</span>
              <span className="x">Organisation profile</span>
            </div>
            <div className="card-b">
              <div className="row2">
                <div className="field">
                  <label>Organisation name</label>
                  <input
                    className="inp"
                    value={form.name}
                    onChange={(e) => updateForm({ name: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Subdomain</label>
                  <input className="inp mono" value={org.slug} readOnly disabled />
                </div>
              </div>
              <div className="row2">
                <div className="field">
                  <label>Timezone</label>
                  <select value={form.timezone} onChange={(e) => updateForm({ timezone: e.target.value })}>
                    {TIMEZONES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Currency</label>
                  <select value={form.currency} onChange={(e) => updateForm({ currency: e.target.value })}>
                    {CURRENCIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Default language</label>
                <select
                  value={form.defaultLanguage}
                  onChange={(e) => updateForm({ defaultLanguage: e.target.value })}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="row2">
                <div className="field">
                  <label>City</label>
                  <input
                    className="inp"
                    value={form.city}
                    onChange={(e) => updateForm({ city: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Country</label>
                  <input
                    className="inp"
                    value={form.country}
                    onChange={(e) => updateForm({ country: e.target.value })}
                  />
                </div>
              </div>
              <div className="field">
                <label>Address Line 1</label>
                <input
                  className="inp"
                  value={form.addressLine1}
                  onChange={(e) => updateForm({ addressLine1: e.target.value })}
                />
              </div>
              <div className="row2">
                <div className="field">
                  <label>State</label>
                  <input
                    className="inp"
                    value={form.state}
                    onChange={(e) => updateForm({ state: e.target.value })}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Postal Code</label>
                  <input
                    className="inp"
                    value={form.postalCode}
                    onChange={(e) => updateForm({ postalCode: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      ) : null}

      {tab === "Branding" ? (
        <Reveal delay={2}>
          <div className="card">
            <div className="card-h">
              <span className="t">Branding</span>
              <span className="x">Logo, favicon &amp; brand colour</span>
            </div>
            <div className="card-b">
              <div className="row2">
                <div className="field">
                  <label>Logo</label>
                  <div
                    style={{
                      border: "1.5px dashed var(--line-2)",
                      borderRadius: 12,
                      padding: 22,
                      textAlign: "center",
                      color: "var(--muted)",
                      background: "var(--surface-2)",
                      opacity: 0.7,
                    }}
                  >
                    {org.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={org.logo_url}
                        alt="Logo"
                        style={{ width: 44, height: 44, borderRadius: 12, margin: "0 auto 8px", objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          margin: "0 auto 8px",
                          background: "linear-gradient(135deg, var(--brand), var(--iris), var(--sky))",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontWeight: 800,
                        }}
                      >
                        iR
                      </div>
                    )}
                    Upload logo · <span style={{ color: "var(--brand)", fontWeight: 600 }}>coming soon</span>
                  </div>
                </div>
                <div className="field">
                  <label>Favicon</label>
                  <div
                    style={{
                      border: "1.5px dashed var(--line-2)",
                      borderRadius: 12,
                      padding: 22,
                      textAlign: "center",
                      color: "var(--muted)",
                      background: "var(--surface-2)",
                      opacity: 0.7,
                    }}
                  >
                    {org.favicon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={org.favicon_url}
                        alt="Favicon"
                        style={{ width: 44, height: 44, borderRadius: 10, margin: "0 auto 8px", objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          margin: "0 auto 8px",
                          background: "var(--brand)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontWeight: 800,
                        }}
                      >
                        iR
                      </div>
                    )}
                    Upload favicon · <span style={{ color: "var(--brand)", fontWeight: 600 }}>coming soon</span>
                  </div>
                </div>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Brand colour</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {BRAND_SWATCHES.map((colour) => (
                    <span
                      key={colour}
                      role="button"
                      tabIndex={0}
                      onClick={() => updateForm({ brandColour: colour })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") updateForm({ brandColour: colour });
                      }}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        background: colour,
                        cursor: "pointer",
                        boxShadow:
                          form.brandColour.toLowerCase() === colour.toLowerCase()
                            ? "0 0 0 3px var(--brand-050)"
                            : undefined,
                      }}
                    />
                  ))}
                  <input
                    className="inp mono"
                    style={{ width: 110 }}
                    value={form.brandColour}
                    onChange={(e) => updateForm({ brandColour: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      ) : null}

      {tab === "Notifications" ? (
        <Reveal delay={2}>
          <div className="card">
            <div className="card-h">
              <span className="t">Notifications</span>
              <span className="x">Coming soon</span>
            </div>
            <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <p className="muted" style={{ marginTop: 0 }}>
                Notification preferences aren&apos;t built yet — shown here for preview only.
              </p>
              {NOTIFICATION_ROWS.map((row, i) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 4px",
                    borderBottom: i < NOTIFICATION_ROWS.length - 1 ? "1px solid var(--line)" : undefined,
                    opacity: 0.6,
                  }}
                >
                  <div>
                    <b>{row.label}</b>
                    <div className="muted" style={{ fontSize: 12.5 }}>
                      {row.description}
                    </div>
                  </div>
                  <div
                    className={`switch${row.defaultOn ? " on" : ""}`}
                    style={{ pointerEvents: "none" }}
                    aria-disabled
                  />
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      ) : null}

      {tab === "Billing" ? (
        <Reveal delay={2}>
          {changeOk ? <div className="form-alert ok">{changeOk}</div> : null}
          {changeError ? <div className="form-alert">{changeError}</div> : null}

          <div className="card">
            <div className="card-h">
              <span className="t">Current plan</span>
              {billing?.subscription ? (
                <span className={`badge ${SUBSCRIPTION_STATUS_BADGE[billing.subscription.status] ?? "b-gray"}`}>
                  {SUBSCRIPTION_STATUS_LABEL[billing.subscription.status] ?? billing.subscription.status}
                </span>
              ) : null}
            </div>
            <div className="card-b">
              {billingLoading ? (
                <p className="muted">Loading billing details…</p>
              ) : billingError ? (
                <p className="muted">{billingError}</p>
              ) : !billing?.plan || !billing.subscription ? (
                <div>
                  <p className="muted" style={{ marginTop: 0 }}>No active subscription on this organisation yet.</p>
                  <p className="muted" style={{ fontSize: 12.5 }}>Pick a plan below to get started.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div className="row2">
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>Current plan</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className={`badge ${billing.plan.badge}`} style={{ fontSize: 13, padding: "6px 12px" }}>{billing.plan.name}</span>
                        {billing.plan.isPopular ? <span className="chip">Popular</span> : null}
                      </div>
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>Price</label>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>
                        {formatMoney(
                          billing.subscription.billingCycle === "yearly" ? billing.plan.priceYearly : billing.plan.priceMonthly,
                          billing.subscription.currency,
                        )}
                        <span className="muted" style={{ fontWeight: 400, fontSize: 12.5 }}>
                          {" "}/ {billing.subscription.billingCycle === "yearly" ? "year" : "month"}
                        </span>
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
                      <span>
                        {billing.usage.templatesUsed} of {billing.usage.templatesLimit ?? "unlimited"} used
                      </span>
                      {billing.usage.templatesLimit != null && billing.usage.templatesUsed >= billing.usage.templatesLimit ? (
                        <span style={{ color: "var(--rose)", fontWeight: 700 }}>Limit reached</span>
                      ) : null}
                    </div>
                    {billing.usage.templatesLimit != null ? (
                      <div style={{ height: 8, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(100, (billing.usage.templatesUsed / Math.max(1, billing.usage.templatesLimit)) * 100)}%`,
                            background: billing.usage.templatesUsed >= billing.usage.templatesLimit ? "var(--rose)" : "var(--brand)",
                            borderRadius: 999,
                          }}
                        />
                      </div>
                    ) : (
                      <div className="muted" style={{ fontSize: 12 }}>Unlimited on this plan.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ marginTop: 18 }}>
            <div className="card-h">
              <span className="t">Plans &amp; packages</span>
              <div className="seg">
                <button className={plansCycle === "monthly" ? "on" : ""} onClick={() => setPlansCycle("monthly")} type="button">
                  Monthly
                </button>
                <button className={plansCycle === "yearly" ? "on" : ""} onClick={() => setPlansCycle("yearly")} type="button">
                  Yearly
                </button>
              </div>
            </div>
            <div className="card-b">
              {plansLoading ? (
                <p className="muted">Loading plans…</p>
              ) : (
                <div className="plans-grid">
                  {plans.map((p) => {
                    const isCurrent = billing?.plan?.id === p.id;
                    const price = plansCycle === "yearly" ? p.priceYearly : p.priceMonthly;
                    return (
                      <div key={p.id} className={`plan-card${isCurrent ? " current" : ""}`} style={{ ["--pc" as string]: p.color }}>
                        {p.isPopular ? <span className="plan-flag">Most popular</span> : null}
                        <div className="plan-name">{p.name}</div>
                        <div className="plan-price">
                          {formatMoney(price, billing?.subscription?.currency ?? "INR")}
                          <span className="muted"> / {plansCycle === "yearly" ? "year" : "month"}</span>
                        </div>
                        <PlanLimitsSelect limits={p.limits} />
                        <button
                          className={`btn ${isCurrent ? "" : "btn-primary"}`}
                          disabled={isCurrent || changeLoading}
                          onClick={() => void handleChangePlan(p.id)}
                          style={isCurrent ? { opacity: 0.7, cursor: "default" } : undefined}
                        >
                          {isCurrent ? "Current plan" : `Switch to ${p.name}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ marginTop: 18 }}>
            <div className="card-h">
              <span className="t">Invoices</span>
            </div>
            <div className="card-b">
              {invoicesLoading ? (
                <p className="muted">Loading invoices…</p>
              ) : invoices.length === 0 ? (
                <p className="muted" style={{ marginTop: 0 }}>No invoices yet.</p>
              ) : (
                <div className="inv-table">
                  <div className="inv-row inv-head">
                    <span>Invoice</span>
                    <span>Date</span>
                    <span>Plan</span>
                    <span>Amount</span>
                    <span>Status</span>
                    <span />
                  </div>
                  {invoices.map((inv) => (
                    <div className="inv-row" key={inv.id}>
                      <span className="mono">{inv.number}</span>
                      <span>{formatDate(inv.issuedAt)}</span>
                      <span>{inv.planName}</span>
                      <span>{formatMoney(inv.amount, inv.currency)}</span>
                      <span>
                        <span className={`badge ${INVOICE_STATUS_BADGE[inv.status] ?? "b-gray"}`}>
                          {INVOICE_STATUS_LABEL[inv.status] ?? inv.status}
                        </span>
                      </span>
                      <span>
                        <button className="btn btn-ghost" disabled title="PDF download coming soon">
                          Download
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Reveal>
      ) : null}
    </>
  );
}
