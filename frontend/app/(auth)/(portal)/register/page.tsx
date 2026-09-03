/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Icon, type IconName } from "@/components/icons";
import { PasswordInput } from "@/components/auth/password-input";
import { mapApiFieldErrors } from "@/lib/form-errors";
import { slugify } from "@/lib/slug";
import {
  apiFetch,
  checkSubdomainAvailability,
  completeOnboardingStep,
  createOrganisationStep,
  getLogoUploadUrl,
  resumeSignup,
  saveBusinessDetailsStep,
  saveInviteStep,
  saveModulesStep,
  saveSubscriptionStep,
  saveTemplatesStep,
  signupStep1,
} from "@/lib/api";
import { subdomainPreviewHost, suggestSubdomainsFromName } from "@/lib/domain";
import { callingCodeForCountry, validatePhoneForCountry } from "@/lib/phone";
import type { OnboardingStep, OrgIndustry, Plan, SubdomainAvailability } from "@/lib/types";
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

// On-screen labels for the Step 1 required-field check, so the
// "… is required" message reads like the field's label (capitalised)
// instead of the raw snake_case key ("first name is required").
const STEP1_FIELD_LABELS: Record<string, string> = {
  first_name: "First name",
  last_name: "Last name",
  work_email: "Work email",
  country: "Country",
  phone_number: "Mobile number",
  password: "Password",
};

// Order here is the actual wizard flow: Modules sits between Templates and
// Invite (mandatory steps — Account, Organisation, Business Details,
// Subscription, Templates — come first; skippable ones after).
const STEPS = [
  { n: 1, label: "Your account", sub: "Admin login" },
  { n: 2, label: "Organisation", sub: "Name, type & subdomain" },
  { n: 3, label: "Business details", sub: "RERA, branding" },
  { n: 4, label: "Subscription", sub: "Plan & billing" },
  { n: 5, label: "Templates", sub: "Pick designs" },
  { n: 6, label: "Modules", sub: "What to enable" },
  { n: 7, label: "Invite team", sub: "Managers & agents" },
  { n: 8, label: "Connect channels", sub: "Ads, WhatsApp, calling" },
];
const TOTAL = STEPS.length;

// Mirrors backend/src/common/utils/onboarding.util.ts's ONBOARDING_STEP_ORDER
// exactly — used only to translate a resume response's `nextStep` into a
// wizard step index. Keep these two in sync if the flow ever reorders again.
const ONBOARDING_ORDER: OnboardingStep[] = [
  "account",
  "organisation",
  "business_details",
  "subscription",
  "templates",
  "modules",
  "invite",
  "connect",
  "completed",
];

function uiStepForOnboardingStep(step: OnboardingStep): number {
  const idx = ONBOARDING_ORDER.indexOf(step);
  return Math.min(Math.max(idx + 1, 1), TOTAL);
}

const ORG_TYPES: { v: string; ic: IconName; b: string; s: string }[] = [
  { v: "developer", ic: "building", b: "Developer", s: "Build & sell own projects" },
  { v: "broker", ic: "users", b: "Broker / Agency", s: "Sell others' inventory" },
  { v: "channel", ic: "link", b: "Channel Partner", s: "Refer & close deals" },
  { v: "mixed", ic: "building", b: "Mixed", s: "A bit of everything" },
];

const MODULES: { v: string; ic: IconName; b: string; s: string }[] = [
  { v: "leads", ic: "crm", b: "Leads / CRM", s: "Capture & work every lead" },
  { v: "projects", ic: "building", b: "Projects & Units", s: "Inventory & availability" },
  { v: "calling", ic: "phone", b: "AI Calling", s: "Auto-dial & qualify leads" },
  { v: "whatsapp", ic: "mail", b: "WhatsApp Business", s: "Shared inbox & templates" },
  { v: "landing", ic: "document", b: "Landing Pages", s: "Campaign pages & forms" },
  { v: "reporting", ic: "reports", b: "Reporting", s: "Lead-gen to closing analytics" },
];

const INVITE_ROLES = [
  { v: "manager", label: "Manager" },
  { v: "sales", label: "Sales" },
] as const;

const CHANNELS: { ic: IconName; b: string; s: string }[] = [
  { ic: "phone", b: "Meta Ads", s: "Facebook & Instagram lead forms" },
  { ic: "search", b: "Google Ads", s: "Search & Performance Max" },
  { ic: "mail", b: "WhatsApp Business API", s: "Shared number for the team" },
  { ic: "phone", b: "Calling / phone bridge", s: "Masked dialler & recordings" },
];

export default function RegisterPage() {
  const router = useRouter();
  const { applyAuthTokens, logout } = useAuth();

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
  const [teamSize, setTeamSize] = useState("2–10");
  const [rera, setRera] = useState("");
  const [gstin, setGstin] = useState("");
  const [brandColour, setBrandColour] = useState("#4f46e5");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [modules, setModules] = useState<Record<string, boolean>>({
    leads: true,
    projects: true,
    calling: true,
    whatsapp: true,
    landing: true,
    reporting: true,
  });
  // Email + role only — the invited person supplies their own name later
  // (there's no first-login profile step yet; see the Issue 2 writeup).
  const [invites, setInvites] = useState<{ email: string; role: "manager" | "sales" }[]>([
    { email: "", role: "manager" },
    { email: "", role: "sales" },
  ]);
  const [currency, setCurrency] = useState("");
  const [timezone, setTimezone] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subdomainCheck, setSubdomainCheck] = useState<SubdomainAvailability | null>(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  // Set once Step 1 reports the email belongs to a *completed* account —
  // stops the wizard cold and points at real sign-in instead.
  const [accountExists, setAccountExists] = useState(false);
  // Set once the wizard finishes but the org still isn't Super-Admin
  // approved — dashboard access is blocked server-side regardless of this
  // screen (OrgApprovedGuard), this is just honest UX instead of 403s.
  const [pendingApproval, setPendingApproval] = useState(false);

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

  // Digits only, capped at 15 — the ITU E.164 maximum length for the
  // national number across every country — so the field can't be typed
  // into indefinitely, and what's stored is always a plain digit string
  // (paired with the derived country code prefixed at submit time, see
  // commitStep's Step 1 branch) rather than free text that could contain
  // spaces/dashes and vary between two entries of the "same" number.
  function updatePhoneNumber(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 15);
    setForm((prev) => ({ ...prev, phone_number: digits }));
    setFieldErrors((prev) => ({ ...prev, phone_number: "" }));
  }

  function handleCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const country = e.target.value;
    setForm((prev) => ({ ...prev, country }));
    setFieldErrors((prev) => ({ ...prev, country: "" }));
    const meta = COUNTRY_META[country];
    setCurrency(meta?.currencyLabel ?? "");
    setTimezone(meta?.timezone ?? "");
  }

  // Debounced live subdomain availability check for the step-2 field.
  useEffect(() => {
    const sub = form.subdomain?.trim().toLowerCase();
    if (!sub || sub.length < 2) {
      setSubdomainCheck(null);
      setCheckingSubdomain(false);
      return;
    }
    setCheckingSubdomain(true);
    const timer = setTimeout(() => {
      checkSubdomainAvailability(sub)
        .then((res) => setSubdomainCheck(res))
        .catch(() => setSubdomainCheck(null))
        .finally(() => setCheckingSubdomain(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [form.subdomain]);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<Plan[]>("/plans");
        setPlans(Array.isArray(data) ? data : []);
      } catch {}
      finally { setLoadingPlans(false); }
    })();
  }, []);

  // The template catalog is reference data a Super Admin can change at any
  // time (add/edit/unpublish/delete) — it must be re-fetched live every
  // time this step is actually shown, not just once when a plan is first
  // picked. Depending on `cur` too (not just selectedPlanId) means going
  // Back then Continue back into this step — or resuming straight into
  // it — always fires a fresh fetch. selectedTemplateIds (the user's own
  // picks) is untouched here on purpose: only cleared when the plan
  // itself goes away, never just from navigating off this step.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!selectedPlanId) { setTemplates([]); setSelectedTemplateIds([]); return; }
    if (cur !== 4) return; // Step 5 (Templates), 0-indexed — see STEPS above
    let cancelled = false;
    (async () => {
      setLoadingTemplates(true);
      try {
        const data = await apiFetch<any[]>("/templates");
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data as any).data ?? [];
        setTemplates(list);
      } catch { if (!cancelled) setTemplates([]); }
      finally { if (!cancelled) setLoadingTemplates(false); }
    })();
    return () => { cancelled = true; };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [selectedPlanId, cur]);

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

  // Proactive subdomain suggestions, derived from the company name as soon
  // as it's entered — additive to (not a replacement for) the real
  // conflict-check suggestions below, which only exist once something's
  // actually been typed into Subdomain and found taken.
  const companySubdomainSuggestions = useMemo(
    () => suggestSubdomainsFromName(form.company_name),
    [form.company_name],
  );

  // Auto-derived from the Step 1 Country selector — shown as a fixed
  // prefix next to Mobile, editable only for the number itself.
  const phoneCallingCode = useMemo(() => callingCodeForCountry(form.country), [form.country]);

  // n is the 1-indexed step being left (matches STEPS[].n / the wizard
  // order above: 1 Account, 2 Organisation, 3 Business details,
  // 4 Subscription, 5 Templates, 6 Modules, 7 Invite, 8 Connect).
  function validateStep(n: number): boolean {
    setGeneralError(null);
    if (n === 1) {
      const required: (keyof typeof form)[] = ["first_name", "last_name", "work_email", "country", "phone_number", "password"];
      for (const k of required) {
        if (!form[k]?.trim()) { setGeneralError(`${STEP1_FIELD_LABELS[k] ?? k.replace(/_/g, " ")} is required`); return false; }
      }
      const phoneError = validatePhoneForCountry(form.phone_number, form.country);
      if (phoneError) { setGeneralError(phoneError); return false; }
      if (form.password.length < 8) { setGeneralError("Password must be at least 8 characters"); return false; }
      return true;
    }
    if (n === 2) {
      if (!form.company_name?.trim()) { setGeneralError("Company name is required"); return false; }
      if (!form.subdomain?.trim()) { setGeneralError("Subdomain is required"); return false; }
      return true;
    }
    if (n === 3) {
      if (!form.city?.trim()) { setGeneralError("City is required"); return false; }
      return true;
    }
    if (n === 4) {
      if (!selectedPlanId) { setGeneralError("Please select a plan"); return false; }
      return true;
    }
    if (n === 5) {
      if (selectedTemplateIds.length === 0) { setGeneralError(maxTemplates === Infinity ? "Select at least 1 template" : `Select 1-${maxTemplates} template(s) for ${selectedPlan?.name}`); return false; }
      if (selectedTemplateIds.length > maxTemplates) { setGeneralError(`Plan "${selectedPlan?.name}" allows max ${maxTemplates} template(s)`); return false; }
      if (!agreedToTerms) { setGeneralError("You must agree to the Terms of Service & Privacy Policy."); return false; }
      return true;
    }
    return true;
  }

  // Persists whatever tokens a step handed back, so the next step's
  // request already carries the right Authorization header.
  function applyTokens(user: any, tokens: { access_token: string; refresh_token: string }) {
    applyAuthTokens(user, tokens);
  }

  // Each step commits to the backend before the wizard is allowed to move
  // on — resuming and re-submitting an already-completed step updates
  // cleanly rather than erroring or duplicating rows (see the
  // OnboardingService methods this calls).
  async function commitStep(n: number): Promise<boolean> {
    if (n === 1) {
      const res = await signupStep1({
        first_name: form.first_name,
        last_name: form.last_name,
        work_email: form.work_email,
        // form.phone_number holds just the national number the user
        // typed — the country's dial code (derived from the Step 1
        // Country selector) is prefixed here so what's persisted is a
        // fully-qualified number, not just the digits.
        phone_number: phoneCallingCode ? `${phoneCallingCode} ${form.phone_number}` : form.phone_number,
        password: form.password,
      });
      if (res.status === "exists_completed") {
        setAccountExists(true);
        setGeneralError("You already have an account with this email — sign in instead.");
        return false;
      }
      if (res.status === "exists_incomplete") {
        // Silently resume — no password re-entry, see AuthService.resumeSignup.
        const resumed = await resumeSignup(form.work_email);
        applyTokens(resumed.user, resumed);
        setForm((prev) => ({
          ...prev,
          company_name: resumed.organisation?.name ?? prev.company_name,
          subdomain: resumed.organisation?.subdomain ?? prev.subdomain,
          country: resumed.organisation?.country ?? prev.country,
          city: resumed.organisation?.city ?? prev.city,
        }));
        if (resumed.organisation) {
          setRera(resumed.organisation.rera_license_no ?? "");
          setGstin(resumed.organisation.gstin ?? "");
          setBrandColour(resumed.organisation.brand_colour ?? "#4f46e5");
          setLogoUrl(resumed.organisation.logo_url ?? null);
          // industry was already being persisted (Step 2) but never restored
          // here — same class of bug as teamSize, fixing both together.
          if (resumed.organisation.industry) setOrgType(resumed.organisation.industry);
          if (resumed.organisation.team_size) setTeamSize(resumed.organisation.team_size);
        }
        if (resumed.subscription) {
          setSelectedPlanId(resumed.subscription.planId);
          setBillingCycle((resumed.subscription.billingCycle as "monthly" | "yearly") ?? "monthly");
        }
        setSelectedTemplateIds(resumed.templateIds ?? []);
        setCur(uiStepForOnboardingStep(resumed.nextStep) - 1);
        window.scrollTo(0, 0);
        return false; // step already advanced cur directly — skip the +1 below
      }
      applyTokens(res.user, res);
      return true;
    }

    if (n === 2) {
      const res = await createOrganisationStep({
        company_name: form.company_name,
        industry: orgType as OrgIndustry,
        teamSize,
        subdomain: form.subdomain || undefined,
        country: form.country || undefined,
        currency: COUNTRY_META[form.country]?.currency ?? undefined,
        timezone: timezone || undefined,
      });
      applyTokens(res.user, res);
      return true;
    }

    if (n === 3) {
      await saveBusinessDetailsStep({
        city: form.city,
        reraLicenseNo: rera || undefined,
        gstin: gstin || undefined,
        brandColour: brandColour || undefined,
        logoUrl: logoUrl || undefined,
      });
      return true;
    }

    if (n === 4) {
      await saveSubscriptionStep({ planId: selectedPlanId, billingCycle });
      return true;
    }

    if (n === 5) {
      await saveTemplatesStep({ templateIds: selectedTemplateIds });
      return true;
    }

    if (n === 6) {
      const enabled = Object.entries(modules).filter(([, v]) => v).map(([k]) => k);
      await saveModulesStep({ enabledModules: enabled });
      return true;
    }

    if (n === 7) {
      const entries = invites.filter((i) => i.email.trim());
      if (entries.length > 0) {
        await saveInviteStep({ invites: entries });
      } else {
        await skipStep("invite");
      }
      return true;
    }

    return true;
  }

  // Modules/Invite/Connect are skippable — "Skip" still advances
  // onboardingStep so progress isn't lost, it just doesn't save data.
  async function skipStep(step: "modules" | "invite") {
    if (step === "modules") await saveModulesStep({ skip: true });
    if (step === "invite") await saveInviteStep({ invites: [] });
  }

  function go(d: number) {
    if (d < 0) {
      setCur((c) => Math.max(0, c - 1));
      window.scrollTo(0, 0);
      return;
    }
    void goNext();
  }

  async function goNext() {
    const stepNumber = cur + 1;
    if (!validateStep(stepNumber)) return;
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const advance = await commitStep(stepNumber);
      if (advance) {
        setCur((c) => Math.min(TOTAL - 1, c + 1));
        window.scrollTo(0, 0);
      }
    } catch (err) {
      const { fieldErrors: fe, general } = mapApiFieldErrors(err, FIELD_KEYS);
      setFieldErrors(fe);
      setGeneralError(general);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSkip() {
    setGeneralError(null);
    setIsSubmitting(true);
    try {
      if (cur === 5) await skipStep("modules");
      if (cur === 6) await skipStep("invite");
      setCur((c) => Math.min(TOTAL - 1, c + 1));
      window.scrollTo(0, 0);
    } catch (err) {
      const { general } = mapApiFieldErrors(err, FIELD_KEYS);
      setGeneralError(general);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLogoUploading(true);
    setGeneralError(null);
    try {
      const { uploadUrl, publicUrl } = await getLogoUploadUrl({
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });
      const put = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) throw new Error("Logo upload failed — please try again.");
      setLogoUrl(publicUrl);
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : "Logo upload failed — please try again.");
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cur !== TOTAL - 1) {
      void goNext();
      return;
    }
    setFieldErrors({});
    setGeneralError(null);
    setIsSubmitting(true);
    try {
      const result = await completeOnboardingStep();
      // The org is only actually usable once a Super Admin approves it
      // (see backend OrgApprovedGuard) — the wizard finishing and the org
      // being approved are two different things. A still-pending org
      // lands on the holding screen below instead of a dashboard that
      // would 403 on its very first request.
      if (result.organisationStatus !== "active") {
        // The session token is real but every dashboard route now 403s
        // for it (OrgApprovedGuard) until a super admin approves — clear
        // it locally too, rather than leaving a stale "logged in" state
        // that goes nowhere if the user navigates away and back.
        await logout();
        setPendingApproval(true);
        return;
      }
      router.push("/org");
      router.refresh();
    } catch (err) {
      const { general } = mapApiFieldErrors(err, FIELD_KEYS);
      setGeneralError(general ?? "Couldn't finish setup — please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const subdomain = form.subdomain;

  if (accountExists) {
    return (
      <div className="auth">
        <div className="brandside">
          <div className="glow" />
          <div className="logo">iR</div>
          <div>
            <h1 className="reveal in">Welcome back.</h1>
            <p className="reveal in" data-delay="1" style={{ marginTop: 18 }}>
              An account already exists for <b>{form.work_email}</b>.
            </p>
          </div>
        </div>
        <div className="formside">
          <div className="fw">
            <div className="help" style={{ marginTop: 0 }}>
              <b>You already have an account</b>
              <p style={{ margin: "8px 0 0" }}>
                This email has already finished workspace setup — sign in instead of registering again.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <Link className="btn btn-primary btn-block" href="/login">Go to sign in</Link>
              <button className="btn btn-ghost" type="button" onClick={() => setAccountExists(false)}>Use a different email</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pendingApproval) {
    return (
      <div className="auth">
        <div className="brandside">
          <div className="glow" />
          <div className="logo">iR</div>
          <div>
            <h1 className="reveal in">Your workspace is on its way. 🎉</h1>
            <p className="reveal in" data-delay="1" style={{ marginTop: 18 }}>
              <b>{form.company_name}</b> is set up and waiting on super admin approval.
            </p>
          </div>
          <div style={{ color: "#8891b4", fontSize: 13 }}>14-day free trial · No card required</div>
        </div>
        <div className="formside">
          <div className="fw">
            <div className="help" style={{ marginTop: 0 }}>
              <b>Pending approval</b>
              <p style={{ margin: "8px 0 0" }}>
                Everything you entered is saved — a super admin just needs to approve <b>{form.company_name}</b>{" "}
                before the dashboard opens up. You&apos;ll be able to sign in as soon as that happens, no further
                action needed from you here.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <Link className="btn btn-primary btn-block" href="/login">Go to sign in</Link>
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
              <div className="row2">
                <div className="field">
                  <label>Country <span className="req">*</span></label>
                  <select className="inp" value={form.country} onChange={handleCountryChange}>
                    <option value="">Select country…</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Mobile <span className="req">*</span></label>
                  <div className="phone-inp">
                    <span className="cc">{phoneCallingCode ?? "+--"}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.phone_number}
                      onChange={updatePhoneNumber}
                      placeholder="98250 41200"
                      aria-label="Mobile number"
                    />
                  </div>
                {/*<div className="hint">{phoneCallingCode ? "Auto-set from Country." : "Select a country to set the code."}</div>*/}
                  {fieldErrors.phone_number ? <div className="hint" style={{ color: "var(--rose)" }}>{fieldErrors.phone_number}</div> : null}
                </div>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Password <span className="req">*</span></label>
                <PasswordInput value={form.password} onChange={update("password")} placeholder="••••••••••" autoComplete="new-password" />
                <div className="hint">Min 8 characters.</div>
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
                      <div className="ic"><Icon name={o.ic} /></div>
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
                  {!checkingSubdomain && !subdomainCheck && companySubdomainSuggestions.length > 0 ? (
                    <div className="hint" style={{ display: "block", color: "var(--muted)" }}>
                      Suggestions:{" "}
                      {companySubdomainSuggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className="chip"
                          style={{ cursor: "pointer", margin: "2px 4px 2px 0" }}
                          onClick={() => setForm((prev) => ({ ...prev, subdomain: s }))}
                        >
                          {subdomainPreviewHost(s)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {checkingSubdomain ? (
                    <div className="hint">Checking availability…</div>
                  ) : subdomainCheck ? (
                    subdomainCheck.available ? (
                      <div className="hint" style={{ color: "var(--green)" }}>
                        ✅ {subdomainCheck.host} is available
                      </div>
                    ) : (
                      <div className="hint" style={{ color: "var(--rose)" }}>
                        ❌ {subdomainCheck.host} is already taken. Please choose another.
                        {subdomainCheck.suggestions.length ? (
                          <span style={{ display: "block", marginTop: 6, color: "var(--muted)" }}>
                            Suggestions:{" "}
                            {subdomainCheck.suggestions.map((s) => (
                              <button
                                key={s}
                                type="button"
                                className="chip"
                                style={{ cursor: "pointer", margin: "2px 4px 2px 0" }}
                                onClick={() => {
                                  setForm((prev) => ({ ...prev, subdomain: s }));
                                  setSubdomainCheck(null);
                                }}
                              >
                                {subdomainPreviewHost(s)}
                              </button>
                            ))}
                          </span>
                        ) : null}
                      </div>
                    )
                  ) : subdomain ? (
                    <div className="hint">✅ {subdomainPreviewHost(subdomain)} is available</div>
                  ) : (
                    <div className="hint">You&apos;ll get <b>{subdomainPreviewHost("yourco")}</b></div>
                  )}
                </div>
              <div className="row2">
                <div className="field" style={{ marginBottom: form.country ? 0 : undefined }}>
                  <label>Team size</label>
                  <select className="inp" value={teamSize} onChange={(e) => setTeamSize(e.target.value)}>
                    <option value="Just me">Just me</option>
                    <option value="2–10">2–10</option>
                    <option value="11–50">11–50</option>
                    <option value="50+">50+</option>
                  </select>
                </div>
                {!form.country ? (
                  // Country now lives on Step 1 — this only appears as a
                  // fallback if it somehow wasn't set there (e.g. resuming
                  // right after Step 1, before Step 2 ever submitted and
                  // persisted it — Step 1 itself isn't shown again on resume).
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Country</label>
                    <select className="inp" value={form.country} onChange={handleCountryChange}>
                      <option value="">Select country…</option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* STEP 3 — business details */}
          <div className={`wpane${cur === 2 ? " on" : ""}`}>
            <h2>Business details</h2>
            <p className="muted" style={{ marginTop: 6 }}>Compliance &amp; branding.</p>
            <div style={{ marginTop: 22 }}>
              <div className="row2">
                <div className="field">
                  <label>Currency</label>
                  <input className="inp" value={currency} readOnly disabled placeholder="INR — ₹" />
                </div>
                <div className="field">
                  <label>City <span className="req">*</span></label>
                  <input className="inp" value={form.city} onChange={update("city")} placeholder="Ahmedabad" />
                </div>
              </div>
              <div className="row2">
                <div className="field">
                  <label>RERA / license no.</label>
                  <input className="inp inp-mono" value={rera} onChange={(e) => setRera(e.target.value)} placeholder="PR/GJ/AHM/2026/…" />
                </div>
                <div className="field">
                  <label>GSTIN</label>
                  <input className="inp inp-mono" value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="24AABCS…" />
                </div>
              </div>
              <div className="field">
                <label>Logo</label>
                {logoUrl ? (
                  <div className="drop" style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-start", cursor: "default" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--surface)", flexShrink: 0 }}
                    />
                    <span className="muted" style={{ flex: 1, minWidth: 0, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {logoUploading ? "Uploading…" : "Logo uploaded"}
                    </span>
                    <label style={{ flexShrink: 0, cursor: "pointer", color: "var(--brand)", fontWeight: 600, fontSize: 12.5 }}>
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={handleLogoSelect} style={{ display: "none" }} />
                      Replace
                    </label>
                    <button
                      type="button"
                      onClick={() => setLogoUrl(null)}
                      aria-label="Remove logo"
                      title="Remove logo"
                      style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 7, border: "1px solid var(--line-2)", background: "var(--surface)", color: "var(--muted)", cursor: "pointer", fontSize: 13, lineHeight: 1 }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="drop" style={{ cursor: "pointer", display: "block" }}>
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={handleLogoSelect} style={{ display: "none" }} />
                    {logoUploading ? (
                      "Uploading…"
                    ) : (
                      <>🖼️ Upload logo · <span style={{ color: "var(--brand)", fontWeight: 600 }}>browse</span></>
                    )}
                  </label>
                )}
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Brand colour</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="color"
                    className="colorpick"
                    value={/^#[0-9a-f]{6}$/i.test(brandColour) ? brandColour : "#4f46e5"}
                    onChange={(e) => setBrandColour(e.target.value)}
                    aria-label="Pick a brand colour"
                  />
                  <span className="mono">{brandColour.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 4 — subscription */}
          <div className={`wpane${cur === 3 ? " on" : ""}`}>
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

          {/* STEP 5 — templates */}
          <div className={`wpane${cur === 4 ? " on" : ""}`}>
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
              <label className="check" style={{ marginTop: 18 }}>
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => { setAgreedToTerms(e.target.checked); setGeneralError(null); }}
                  style={{ flexShrink: 0 }}
                />
                I agree to the Terms of Service &amp; Privacy Policy
              </label>
            </div>
          </div>

          {/* STEP 6 — modules */}
          <div className={`wpane${cur === 5 ? " on" : ""}`}>
            <h2>Enable modules</h2>
            <p className="muted" style={{ marginTop: 6 }}>Turn on what you need now — add more anytime from Settings.</p>
            <div style={{ marginTop: 22 }}>
              {MODULES.map((m) => (
                <div className="chan" key={m.v}>
                  <div className="l">
                    <span className="ci"><Icon name={m.ic} /></span>
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

          {/* STEP 7 — invite team */}
          <div className={`wpane${cur === 6 ? " on" : ""}`}>
            <h2>Invite your team</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              They&apos;ll get an email invite and set up their name &amp; password when they first sign in.
              Skip and add them later if you like.
            </p>
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
                    onChange={(e) => setInvites((prev) => prev.map((x, j) => (j === i ? { ...x, role: e.target.value as "manager" | "sales" } : x)))}
                  >
                    {INVITE_ROLES.map((r) => (
                      <option key={r.v} value={r.v}>{r.label}</option>
                    ))}
                  </select>
                  <button className="btn btn-ghost" type="button" style={{ padding: 0 }} onClick={() => setInvites((prev) => prev.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
            <button
              className="btn btn-soft btn-sm"
              type="button"
              onClick={() => setInvites((prev) => [...prev, { email: "", role: "sales" }])}
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
                    <span className="ci"><Icon name={c.ic} /></span>
                    <div>
                      <b>{c.b}</b>
                      <small>{c.s}</small>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" type="button" disabled>Connect</button>
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
              onClick={handleSkip}
              disabled={isSubmitting}
              style={{ display: cur === 5 || cur === 6 ? "inline-flex" : "none" }}
            >
              Skip
            </button>
            {isLast ? (
              <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Finishing setup…" : "🚀 Go to workspace"}
              </button>
            ) : (
              <button className="btn btn-primary" type="button" onClick={() => go(1)} disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Continue →"}
              </button>
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
