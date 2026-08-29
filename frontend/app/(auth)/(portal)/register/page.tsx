/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { dashboardPathFor } from "@/lib/mock/sessions";
import { mapApiFieldErrors } from "@/lib/form-errors";
import { slugify } from "@/lib/slug";
import { apiFetch } from "@/lib/api";
import type { Plan, SignupInput } from "@/lib/types";
import { COUNTRY_META, COUNTRIES } from "@/lib/countries";

const FIELD_KEYS = [
  "first_name",
  "last_name",
  "company_name",
  "subdomain",
  "work_email",
  "phone_number",
  "city",
  "country",
  "password",
];

const STEPS = [
  { n: 1, label: "Your account", sub: "Admin login" },
  { n: 2, label: "Organisation", sub: "Name, type & subdomain" },
  { n: 3, label: "Business details", sub: "RERA, branding" },
  { n: 4, label: "Modules", sub: "What to enable" },
  { n: 5, label: "Subscription", sub: "Plan & billing" },
  { n: 6, label: "Templates", sub: "Pick designs" },
  { n: 7, label: "Invite team", sub: "Managers & agents" },
  { n: 8, label: "Connect channels", sub: "Ads, WhatsApp, calling" },
];
const TOTAL = STEPS.length;

const ORG_TYPES = [
  { v: "developer", ic: "🏗️", b: "Developer", s: "Build & sell own projects" },
  { v: "broker", ic: "🤝", b: "Broker / Agency", s: "Sell others' inventory" },
  { v: "channel", ic: "🔗", b: "Channel Partner", s: "Refer & close deals" },
  { v: "mixed", ic: "🏢", b: "Mixed", s: "A bit of everything" },
];

const MODULES = [
  { v: "leads", ic: "📇", b: "Leads / CRM", s: "Capture & work every lead" },
  { v: "projects", ic: "🏗️", b: "Projects & Units", s: "Inventory & availability" },
  { v: "calling", ic: "📞", b: "AI Calling", s: "Auto-dial & qualify leads" },
  { v: "whatsapp", ic: "💬", b: "WhatsApp Business", s: "Shared inbox & templates" },
  { v: "landing", ic: "📄", b: "Landing Pages", s: "Campaign pages & forms" },
  { v: "reporting", ic: "📈", b: "Reporting", s: "Lead-gen to closing analytics" },
];

const CHANNELS = [
  { ic: "📱", b: "Meta Ads", s: "Facebook & Instagram lead forms" },
  { ic: "🔍", b: "Google Ads", s: "Search & Performance Max" },
  { ic: "💬", b: "WhatsApp Business API", s: "Shared number for the team" },
  { ic: "📞", b: "Calling / phone bridge", s: "Masked dialler & recordings" },
];

export default function RegisterPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [cur, setCur] = useState(0);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    company_name: "",
    subdomain: "",
    work_email: "",
    phone_number: "",
    city: "",
    country: "",
    password: "",
  });
  const [orgType, setOrgType] = useState("developer");
  const [rera, setRera] = useState("");
  const [gstin, setGstin] = useState("");
  const [brandColour, setBrandColour] = useState("#4f46e5");
  const [modules, setModules] = useState<Record<string, boolean>>({
    leads: true,
    projects: true,
    calling: true,
    whatsapp: true,
    landing: true,
    reporting: true,
  });
  const [invites, setInvites] = useState<{ email: string; role: string }[]>([
    { email: "", role: "Manager" },
    { email: "", role: "Sales" },
  ]);
  const [currency, setCurrency] = useState("");
  const [timezone, setTimezone] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // package & template selection
  const [plans, setPlans] = useState<Plan[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    };
  }

  function updateCompany(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, company_name: value, subdomain: prev.subdomain ? prev.subdomain : slugify(value) }));
    setFieldErrors((prev) => ({ ...prev, company_name: "" }));
  }

  function handleCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const country = e.target.value;
    setForm((prev) => ({ ...prev, country }));
    setFieldErrors((prev) => ({ ...prev, country: "" }));
    const meta = COUNTRY_META[country];
    setCurrency(meta?.currencyLabel ?? "");
    setTimezone(meta?.timezone ?? "");
  }

  const [pendingOrg, setPendingOrg] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<Plan[]>("/plans");
        setPlans(Array.isArray(data) ? data : []);
      } catch {}
      finally { setLoadingPlans(false); }
    })();
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!selectedPlanId) { setTemplates([]); setSelectedTemplateIds([]); return; }
    (async () => {
      setLoadingTemplates(true);
      try {
        const data = await apiFetch<any[]>("/templates");
        const list = Array.isArray(data) ? data : (data as any).data ?? [];
        setTemplates(list);
      } catch { setTemplates([]); }
      finally { setLoadingTemplates(false); }
    })();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [selectedPlanId]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const maxTemplates = (() => {
    if (!selectedPlan) return 0;
    const raw = (selectedPlan.limits as any)?.templates;
    if (!raw || raw === "All" || raw === "Unlimited") return Infinity;
    const n = parseInt(String(raw), 10);
    return Number.isNaN(n) ? Infinity : n;
  })();

  const toggleTemplate = (id: string) => {
    if (selectedTemplateIds.includes(id)) setSelectedTemplateIds((prev) => prev.filter((x) => x !== id));
    else {
      if (selectedTemplateIds.length >= maxTemplates) return;
      setSelectedTemplateIds((prev) => [...prev, id]);
    }
  };

  function validateStep(n: number): boolean {
    setGeneralError(null);
    if (n === 1) {
      const required: (keyof typeof form)[] = ["first_name", "last_name", "work_email", "phone_number", "password"];
      for (const k of required) {
        if (!form[k]?.trim()) { setGeneralError(`${k.replace(/_/g, " ")} is required`); return false; }
      }
      if (form.password.length < 8) { setGeneralError("Password must be at least 8 characters"); return false; }
      return true;
    }
    if (n === 2) {
      if (!form.company_name?.trim()) { setGeneralError("Company name is required"); return false; }
      if (!form.subdomain?.trim()) { setGeneralError("Subdomain is required"); return false; }
      if (!form.country) { setGeneralError("Country is required"); return false; }
      return true;
    }
    if (n === 3) {
      if (!form.city?.trim()) { setGeneralError("City is required"); return false; }
      return true;
    }
    if (n === 5) {
      if (!selectedPlanId) { setGeneralError("Please select a plan"); return false; }
      return true;
    }
    if (n === 6) {
      if (selectedTemplateIds.length === 0) { setGeneralError(maxTemplates === Infinity ? "Select at least 1 template" : `Select 1-${maxTemplates} template(s) for ${selectedPlan?.name}`); return false; }
      if (selectedTemplateIds.length > maxTemplates) { setGeneralError(`Plan "${selectedPlan?.name}" allows max ${maxTemplates} template(s)`); return false; }
      if (!agreedToTerms) { setGeneralError("You must agree to the Terms of Service & Privacy Policy."); return false; }
      return true;
    }
    return true;
  }

  function go(d: number) {
    const next = cur + d;
    if (d > 0 && !validateStep(cur + 1)) return;
    setCur(Math.max(0, Math.min(TOTAL - 1, next)));
    window.scrollTo(0, 0);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cur !== TOTAL - 1) {
      if (validateStep(cur + 1)) setCur((c) => Math.min(TOTAL - 1, c + 1));
      return;
    }
    if (!validateStep(6)) return;
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const payload: SignupInput = {
        first_name: form.first_name,
        last_name: form.last_name,
        company_name: form.company_name,
        work_email: form.work_email,
        phone_number: form.phone_number,
        city: form.city,
        country: form.country || "",
        currency: COUNTRY_META[form.country]?.currency ?? "",
        timezone,
        password: form.password,
        planId: selectedPlanId || undefined,
        billingCycle,
        templateIds: selectedTemplateIds,
      };
      const session: any = await signup(payload);
      if (session?.pending) {
        setPendingOrg({ name: form.company_name, email: form.work_email });
        return;
      }
      router.push(dashboardPathFor(session.role));
      router.refresh();
    } catch (err) {
      const { fieldErrors: fe, general } = mapApiFieldErrors(err, FIELD_KEYS);
      setFieldErrors(fe);
      setGeneralError(general);
      if (Object.keys(fe).length) setCur(0);
    } finally {
      setIsSubmitting(false);
    }
  }

  const subdomain = form.subdomain;

  if (pendingOrg) {
    return (
      <div className="auth">
        <div className="brandside">
          <div className="glow" />
          <div className="logo">iR</div>
          <div>
            <h1 className="reveal in">Your workspace is on its way. 🎉</h1>
            <p className="reveal in" data-delay="1" style={{ marginTop: 18 }}>
              We&apos;ve created <b>{pendingOrg.name}</b> and sent it for super admin approval.
            </p>
          </div>
          <div style={{ color: "#8891b4", fontSize: 13 }}>14-day free trial · No card required</div>
        </div>
        <div className="formside">
          <div className="fw">
            <div className="help" style={{ marginTop: 0 }}>
              <b>Pending approval</b>
              <p style={{ margin: "8px 0 0" }}>
                Your organisation <b>{pendingOrg.name}</b> has been created and is awaiting super admin
                approval. You&apos;ll be able to sign in after approval.
              </p>
              <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
                <li>Selected plan: <b>{selectedPlan?.name ?? "—"}</b> ({billingCycle}) with {selectedTemplateIds.length} template(s)</li>
                <li>Approval usually takes a few minutes to a few hours</li>
                <li>You&apos;ll receive an email once activated</li>
              </ul>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <Link className="btn btn-primary btn-block" href="/login">Go to sign in</Link>
              <button className="btn btn-ghost" type="button" onClick={() => setPendingOrg(null)}>Register another</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isLast = cur === TOTAL - 1;

  return (
    <div className="auth">
      <div className="brandside">
        <div className="glow" />
        <div style={{ position: "relative" }}>
          <div className="logo">iR</div>
        </div>
        <div style={{ position: "relative" }}>
          <h1 className="reveal in">Set up your real-estate workspace in minutes.</h1>
          <p className="reveal in" data-delay="1" style={{ marginTop: 16 }}>
            For developers, brokers &amp; channel partners — capture every lead from ad click to
            booking, all under your own subdomain.
          </p>
          <div className="steps-rail reveal in" data-delay="2" id="rail">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className={`sr${cur + 1 === s.n ? " on" : ""}${cur + 1 > s.n ? " done" : ""}`}
              >
                <span className="n">{cur + 1 > s.n ? "✓" : s.n}</span>
                <div>
                  <b>{s.label}</b>
                  <small>{s.sub}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: "relative", color: "#8891b4", fontSize: 13 }}>
          14-day free trial · No card required
        </div>
      </div>

      <div className="formside">
        <form className="fw" onSubmit={handleSubmit}>
          <div className="fprog">
            <i style={{ width: `${Math.round(((cur + 1) / (TOTAL + 1)) * 100)}%` }} />
          </div>

          {/* STEP 1 — account */}
          <div className={`wpane${cur === 0 ? " on" : ""}`}>
            <h2>Create your account</h2>
            <p className="muted" style={{ marginTop: 6 }}>You&apos;ll be the organisation admin.</p>
            <div style={{ marginTop: 22 }}>
              <div className="row2">
                <div className="field">
                  <label>First name <span className="req">*</span></label>
                  <input className="inp" value={form.first_name} onChange={update("first_name")} placeholder="Rohan" />
                </div>
                <div className="field">
                  <label>Last name <span className="req">*</span></label>
                  <input className="inp" value={form.last_name} onChange={update("last_name")} placeholder="Shah" />
                </div>
              </div>
              <div className="field">
                <label>Work email <span className="req">*</span></label>
                <input className="inp" type="email" value={form.work_email} onChange={update("work_email")} placeholder="admin@skylinedev.com" />
                {fieldErrors.work_email ? <div className="hint" style={{ color: "var(--rose)" }}>{fieldErrors.work_email}</div> : null}
              </div>
              <div className="field">
                <label>Mobile</label>
                <input className="inp" value={form.phone_number} onChange={update("phone_number")} placeholder="+91 98250 41200" />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Password <span className="req">*</span></label>
                <input className="inp" type="password" value={form.password} onChange={update("password")} placeholder="••••••••••" />
                <div className="hint">Min 12 chars, mixed case, number &amp; symbol.</div>
                {fieldErrors.password ? <div className="hint" style={{ color: "var(--rose)" }}>{fieldErrors.password}</div> : null}
              </div>
            </div>
          </div>

          {/* STEP 2 — organisation */}
          <div className={`wpane${cur === 1 ? " on" : ""}`}>
            <h2>Your organisation</h2>
            <p className="muted" style={{ marginTop: 6 }}>Tell us who you are — we&apos;ll tailor the workspace.</p>
            <div style={{ marginTop: 22 }}>
              <div className="field">
                <label>What describes you best? <span className="req">*</span></label>
                <div className="cards2" id="orgType">
                  {ORG_TYPES.map((o) => (
                    <div
                      key={o.v}
                      className={`rc${orgType === o.v ? " on" : ""}`}
                      onClick={() => setOrgType(o.v)}
                    >
                      <div className="ic">{o.ic}</div>
                      <b>{o.b}</b>
                      <small>{o.s}</small>
                    </div>
                  ))}
                </div>
              </div>
                <div className="field">
                  <label>Company name <span className="req">*</span></label>
                  <input className="inp" value={form.company_name} onChange={updateCompany} placeholder="Skyline Developers" />
                </div>
                <div className="field">
                  <label>Subdomain <span className="req">*</span></label>
                  <input className="inp" value={subdomain} onChange={update("subdomain")} placeholder="skylinedev" />
                  <div className="hint">✅ {subdomain || "yourco"}.ipixxel.in is available</div>
                </div>
              <div className="row2">
                <div className="field">
                  <label>Team size</label>
                  <select className="inp" defaultValue="2-10">
                    <option>Just me</option>
                    <option>2–10</option>
                    <option>11–50</option>
                    <option>50+</option>
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Country</label>
                  <select className="inp" value={form.country} onChange={handleCountryChange}>
                    <option value="">Select country…</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 3 — business details */}
          <div className={`wpane${cur === 2 ? " on" : ""}`}>
            <h2>Business details</h2>
            <p className="muted" style={{ marginTop: 6 }}>Compliance &amp; branding — you can finish these later too.</p>
            <div style={{ marginTop: 22 }}>
              <div className="row2">
                <div className="field">
                  <label>Currency</label>
                  <input className="inp" value={currency} readOnly disabled placeholder="INR — ₹" />
                </div>
                <div className="field">
                  <label>City</label>
                  <input className="inp" value={form.city} onChange={update("city")} placeholder="Ahmedabad" />
                </div>
              </div>
              <div className="row2">
                <div className="field">
                  <label>RERA / license no.</label>
                  <input className="inp mono" value={rera} onChange={(e) => setRera(e.target.value)} placeholder="PR/GJ/AHM/2026/…" />
                </div>
                <div className="field">
                  <label>GSTIN</label>
                  <input className="inp mono" value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="24AABCS…" />
                </div>
              </div>
              <div className="field">
                <label>Logo</label>
                <div className="drop">🖼️ Upload logo · <span style={{ color: "var(--brand)", fontWeight: 600 }}>browse</span></div>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Brand colour</label>
                <div className="colorset" id="colors">
                  {["#4f46e5", "#0ea5e9", "#0d9488", "#16a34a", "#d97706", "#e11d48", "#7c3aed"].map((c) => (
                    <span
                      key={c}
                      className={brandColour.toLowerCase() === c ? "on" : ""}
                      style={{ background: c }}
                      onClick={() => setBrandColour(c)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* STEP 4 — modules */}
          <div className={`wpane${cur === 3 ? " on" : ""}`}>
            <h2>Enable modules</h2>
            <p className="muted" style={{ marginTop: 6 }}>Turn on what you need now — add more anytime.</p>
            <div style={{ marginTop: 22 }}>
              {MODULES.map((m) => (
                <div className="chan" key={m.v}>
                  <div className="l">
                    <span className="ci">{m.ic}</span>
                    <div>
                      <b>{m.b}</b>
                      <small>{m.s}</small>
                    </div>
                  </div>
                  <div
                    className={`switch${modules[m.v] ? " on" : ""}`}
                    onClick={() => setModules((p) => ({ ...p, [m.v]: !p[m.v] }))}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* STEP 5 — subscription */}
          <div className={`wpane${cur === 4 ? " on" : ""}`}>
            <h2>Choose your plan</h2>
            <p className="muted" style={{ marginTop: 6 }}>Pick a subscription — you can change it later from Settings.</p>
            <div style={{ marginTop: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <span className="muted" style={{ fontSize: 13 }}>Billing</span>
                <div className="seg">
                  <span className={billingCycle === "monthly" ? "on" : ""} onClick={() => setBillingCycle("monthly")}>Monthly</span>
                  <span className={billingCycle === "yearly" ? "on" : ""} onClick={() => setBillingCycle("yearly")}>Yearly</span>
                </div>
              </div>
              {loadingPlans ? (
                <p className="muted">Loading plans…</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {plans.map((p) => {
                    const isSel = selectedPlanId === p.id;
                    const price = billingCycle === "monthly" ? p.priceMonthly : p.priceYearly;
                    const per = billingCycle === "monthly" ? "/mo" : "/yr";
                    const tplLimit = (p.limits as any)?.templates ?? "—";
                    return (
                      <div
                        key={p.id}
                        className={`rc${isSel ? " on" : ""}`}
                        style={{ display: "block" }}
                        onClick={() => setSelectedPlanId(p.id)}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span className={`badge ${p.badge}`}>{p.name}</span>
                            {p.isPopular ? <span className="chip" style={{ color: "var(--brand)" }}>POPULAR</span> : null}
                            <span style={{ fontSize: 20, fontWeight: 800 }}>
                              ₹{price.toLocaleString("en-IN")}
                              <span style={{ fontSize: 12, fontWeight: 400, color: "var(--muted)" }}>{per}</span>
                            </span>
                          </div>
                          <span
                            className="opt"
                            style={{ borderColor: isSel ? "var(--brand)" : "var(--line-2)", background: isSel ? "var(--brand)" : "transparent", color: isSel ? "#fff" : "var(--muted)" }}
                          >
                            {isSel ? "✓ Selected" : "Select"}
                          </span>
                        </div>
                        <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>{p.description}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                          <span className="chip">{tplLimit} templates</span>
                          <span className="chip">{p.limits?.projects} projects</span>
                          <span className="chip">{p.limits?.users} users</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* STEP 6 — templates */}
          <div className={`wpane${cur === 5 ? " on" : ""}`}>
            <h2>Pick your templates</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Selected plan <b>{selectedPlan?.name ?? "—"}</b> allows{" "}
              <b>{maxTemplates === Infinity ? "All" : maxTemplates}</b> template(s).
            </p>
            <div style={{ marginTop: 22 }}>
              {!selectedPlanId ? (
                <p className="muted">Choose a plan first to see available templates.</p>
              ) : loadingTemplates ? (
                <p className="muted">Loading templates…</p>
              ) : templates.length === 0 ? (
                <p className="muted">No templates available.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {templates.map((tpl: any) => {
                    const id = tpl.id;
                    const sel = selectedTemplateIds.includes(id);
                    const dis = !sel && selectedTemplateIds.length >= maxTemplates;
                    return (
                      <div
                        key={id}
                        className={`rc${sel ? " on" : ""}`}
                        style={{ display: "block", opacity: dis ? 0.4 : 1, pointerEvents: dis ? "none" : "auto" }}
                        onClick={() => toggleTemplate(id)}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <b style={{ fontSize: 13.5 }}>{tpl.name}</b>
                          <span className="opt" style={{ borderColor: sel ? "var(--brand)" : "var(--line-2)", background: sel ? "var(--brand)" : "transparent", color: sel ? "#fff" : "var(--muted)" }}>
                            {sel ? "✓" : "+"}
                          </span>
                        </div>
                        <small className="muted">{tpl.slug} · {tpl.category || ""}</small>
                      </div>
                    );
                  })}
                </div>
              )}
              <label className="check" style={{ marginTop: 18, alignItems: "flex-start" }}>
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => { setAgreedToTerms(e.target.checked); setGeneralError(null); }}
                />
                I agree to the Terms of Service &amp; Privacy Policy
              </label>
            </div>
          </div>

          {/* STEP 7 — invite team */}
          <div className={`wpane${cur === 6 ? " on" : ""}`}>
            <h2>Invite your team</h2>
            <p className="muted" style={{ marginTop: 6 }}>They&apos;ll get an email invite. Skip and add them later if you like.</p>
            <div style={{ marginTop: 22 }} id="invites">
              {invites.map((inv, i) => (
                <div className="inviteRow" key={i}>
                  <input
                    className="inp"
                    placeholder="teammate@email.com"
                    value={inv.email}
                    onChange={(e) => setInvites((prev) => prev.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))}
                  />
                  <select
                    className="inp"
                    value={inv.role}
                    onChange={(e) => setInvites((prev) => prev.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}
                  >
                    <option>Manager</option>
                    <option>Sales</option>
                    <option>Telecaller</option>
                  </select>
                  <button className="btn btn-ghost" type="button" style={{ padding: 0 }} onClick={() => setInvites((prev) => prev.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
            <button
              className="btn btn-soft btn-sm"
              type="button"
              onClick={() => setInvites((prev) => [...prev, { email: "", role: "Sales" }])}
            >
              ＋ Add another
            </button>
          </div>

          {/* STEP 8 — connect channels */}
          <div className={`wpane${cur === 7 ? " on" : ""}`}>
            <h2>Connect your channels</h2>
            <p className="muted" style={{ marginTop: 6 }}>Plug in where leads come from. You can do this later from Integrations.</p>
            <div style={{ marginTop: 22 }}>
              {CHANNELS.map((c) => (
                <div className="chan" key={c.b}>
                  <div className="l">
                    <span className="ci">{c.ic}</span>
                    <div>
                      <b>{c.b}</b>
                      <small>{c.s}</small>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" type="button">Connect</button>
                </div>
              ))}
            </div>
          </div>

          {generalError ? (
            <p role="alert" className="help" style={{ color: "var(--rose)", borderColor: "var(--rose-050)", background: "var(--rose-050)", marginTop: 16 }}>
              {generalError}
            </p>
          ) : null}

          <div className="wfoot">
            <button className="btn btn-ghost" type="button" onClick={() => go(-1)} style={{ visibility: cur === 0 ? "hidden" : "visible" }}>← Back</button>
            <div style={{ flex: 1 }} />
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => go(1)}
              style={{ display: cur === 5 || cur === 6 ? "inline-flex" : "none" }}
            >
              Skip
            </button>
            {isLast ? (
              <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating workspace…" : "🚀 Create workspace"}
              </button>
            ) : (
              <button className="btn btn-primary" type="button" onClick={() => go(1)}>Continue →</button>
            )}
          </div>

          <p className="muted" style={{ textAlign: "center", marginTop: 20, fontSize: 13.5 }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--brand)", fontWeight: 600 }}>Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
