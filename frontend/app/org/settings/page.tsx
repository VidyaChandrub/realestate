"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import type { SafeOrganisation, UpdateOrganisationSettingsInput } from "@/lib/types";

const TABS = ["General", "Branding", "Notifications", "Billing", "Security"] as const;
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
  timezone: string;
  currency: string;
  defaultLanguage: string;
  brandColour: string;
}

function formToOrg(org: SafeOrganisation): GeneralBrandingForm {
  return {
    name: org.name,
    timezone: org.timezone,
    currency: org.currency,
    defaultLanguage: org.default_language,
    brandColour: org.brand_colour ?? "#4f46e5",
  };
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
          <div className="eyebrow">⚙️ More</div>
          <h1>Organisation Settings</h1>
          <div className="sub">Manage your organisation profile, branding, notifications, billing and security.</div>
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
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
          <div className="card">
            <div className="card-h">
              <span className="t">Billing</span>
            </div>
            <div className="card-b">
              <p className="muted">Coming soon — billing and plans aren&apos;t built yet.</p>
            </div>
          </div>
        </Reveal>
      ) : null}

      {tab === "Security" ? (
        <Reveal delay={2}>
          <div className="card">
            <div className="card-h">
              <span className="t">Security</span>
            </div>
            <div className="card-b">
              <p className="muted">Coming soon — password and session settings aren&apos;t built yet.</p>
            </div>
          </div>
        </Reveal>
      ) : null}
    </>
  );
}
