/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Icon, type IconName } from "@/components/icons";
import { PasswordInput } from "@/components/auth/password-input";
import { mapApiFieldErrors } from "@/lib/form-errors";
import {
  createOrganisationStep,
  previewDraft,
  resumeExistingDraft,
  resumeSignup,
  restartExistingDraft,
  signupStep1,
  verifyEmail,
  resendVerification,
} from "@/lib/api";
import { callingCodeForCountry, validatePhoneForCountry } from "@/lib/phone";
import type { OnboardingStep, OrgIndustry, ResumeSignupResponse } from "@/lib/types";
import { COUNTRY_META, COUNTRIES } from "@/lib/countries";

const FIELD_KEYS = [
  "first_name",
  "last_name",
  "company_name",
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

// Simplified wizard — just Account and Organisation. Every other step
// (Business Details, Subscription, Templates, Modules, Invite, Connect) was
// removed: City and Terms of Service moved into Organisation; the rest have
// in-app equivalents post-signup (Org Settings, Templates page, Users page)
// or, for Connect, were never implemented in the first place.
const STEPS = [
  { n: 1, label: "Your account", sub: "Admin login" },
  { n: 2, label: "Organisation", sub: "Name, city & type" },
];
const TOTAL = STEPS.length;

// Mirrors backend/src/common/utils/onboarding.util.ts's ONBOARDING_STEP_ORDER
// exactly — used only to translate a resumed draft's onboardingStep into a
// human label for the "you already started this" popup. The enum itself
// keeps every historical value (see onboarding.util.ts's own comment); a
// step past index 1 here means the draft is legacy and the backend
// self-heals it straight to 'completed' the moment it's touched (see
// AuthService.finalizeLegacyOnboardingDraft), so completedStepLabel below
// falls back to a generic label rather than describing a step this wizard
// no longer shows.
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

function completedStepLabel(step: OnboardingStep): string {
  const idx = ONBOARDING_ORDER.indexOf(step);
  return STEPS[idx]?.label ?? "your account";
}

// The step-1 Mobile field holds just the national number the user typed
// (see updatePhoneNumber below); what's persisted server-side is the
// fully-qualified "+<code> <digits>" string. Strip the calling code back
// off so a resumed draft's phone re-populates that same national-only field
// instead of showing the dial code baked into the digits.
function stripCallingCode(storedNumber: string, callingCode: string | null): string {
  const digits = storedNumber.replace(/\D/g, "");
  const codeDigits = (callingCode ?? "").replace(/\D/g, "");
  if (codeDigits && digits.startsWith(codeDigits)) {
    return digits.slice(codeDigits.length);
  }
  return digits;
}

const ORG_TYPES: { v: string; ic: IconName; b: string; s: string }[] = [
  { v: "developer", ic: "building", b: "Developer", s: "Build & sell own projects" },
  { v: "broker", ic: "users", b: "Broker / Agency", s: "Sell others' inventory" },
  { v: "channel", ic: "link", b: "Channel Partner", s: "Refer & close deals" },
  { v: "mixed", ic: "building", b: "Mixed", s: "A bit of everything" },
];

export default function RegisterPage() {
  const router = useRouter();
  const { applyAuthTokens, logout, user } = useAuth();

  // The account id this wizard instance has itself confirmed, server-side,
  // is a valid not-yet-completed draft — via signupStep1's own success, the
  // silent mount-resume, or "Continue previous setup" (see applyResumedState
  // and commitStep's Step 1 branch). Intentionally separate from the `user`
  // above: that comes from auth-context/localStorage and can be a stale
  // leftover from an earlier, unrelated visit, which must never be trusted
  // to route a fresh Step 1 submit into resumeExistingDraft.
  const resumedAccountIdRef = useRef<string | null>(null);

  const [cur, setCur] = useState(0);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    company_name: "",
    work_email: "",
    phone_number: "",
    city: "",
    country: "",
    password: "",
  });
  const [orgType, setOrgType] = useState("developer");
  const [teamSize, setTeamSize] = useState("2–10");
  const [currency, setCurrency] = useState("");
  const [timezone, setTimezone] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Set once Step 1 reports the email belongs to a *completed* account —
  // stops the wizard cold and points at real sign-in instead.
  const [accountExists, setAccountExists] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sent">("idle");
  const [resumeAfterVerify, setResumeAfterVerify] = useState<OnboardingStep | null>(null);
  // Set when Step 1's email or mobile matches someone's still-in-progress
  // signup — the popup asks whether to continue that draft or start fresh
  // with whatever was just typed, see handleContinueDraft/handleStartFreshDraft.
  const [draftCollision, setDraftCollision] = useState<{
    existingUserId: string;
    firstName: string | null;
    lastName: string | null;
    onboardingStep: OnboardingStep;
  } | null>(null);
  const [draftBusy, setDraftBusy] = useState<"resume" | "restart" | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    };
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

  // Auto-derived from the Step 1 Country selector — shown as a fixed
  // prefix next to Mobile, editable only for the number itself.
  const phoneCallingCode = useMemo(() => callingCodeForCountry(form.country), [form.country]);

  // n is the 1-indexed step being left (matches STEPS[].n: 1 Account, 2 Organisation).
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
      if (!form.city?.trim()) { setGeneralError("City is required"); return false; }
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
  // on. Step 2 is now the FINAL step: createOrganisationStep finishes
  // onboarding server-side in the same call (assigns the Basic plan,
  // activates the org, marks onboarding completed) — there is no separate
  // "complete" call anymore.
  async function commitStep(n: number): Promise<boolean> {
    if (n === 1) {
      // This page instance is handling Step 1 itself (fresh signup or a
      // resume, either way via direct user action) — mark the silent
      // mount-resume effect below as already "done" so it can't fire off
      // the back of the user/onboarding_step change applyTokens is about to
      // cause and reset `cur` back to Step 1 out from under a fresh signup
      // that just correctly advanced to Step 2.
      didResumeRef.current = true;

      // This exact wizard instance already confirmed *with the server* that
      // it's resuming a specific not-yet-completed account (mount-resume,
      // "Continue previous setup", or Step 1 already having succeeded once
      // this visit — see the three places that set resumedAccountIdRef).
      // Re-submitting Step 1 in that case must update THAT account
      // (resumeExistingDraft) rather than signupStep1, which would find it
      // by email/phone and treat it as a fresh collision with itself,
      // re-showing the "Welcome back" popup.
      //
      // Deliberately NOT keyed off the `user` from auth context: that can
      // be a stale session left over in this browser from an earlier,
      // unrelated visit (or a since-deleted "start fresh" draft) — trusting
      // it here misrouted a brand new signup into resumeExistingDraft with
      // an existingUserId nothing in the database matches, surfacing "No
      // signup in progress for this account" instead of ever reaching
      // signupStep1's real, server-side email/phone collision check.
      if (resumedAccountIdRef.current) {
        const resumed = await resumeExistingDraft({
          existingUserId: resumedAccountIdRef.current,
          first_name: form.first_name,
          last_name: form.last_name,
          work_email: form.work_email,
          phone_number: phoneCallingCode ? `${phoneCallingCode} ${form.phone_number}` : form.phone_number,
          password: form.password,
        });
        applyTokens(resumed.user, resumed);
        resumedAccountIdRef.current = resumed.user.id;
        if (resumed.email_verification_required || !resumed.user.email_verified_at) {
          setAwaitingVerification(true);
          setVerifyCode("");
          setVerifyError(null);
          return false;
        }
        return true;
      }

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
        // Don't silently resume — that used to discard whatever was just
        // retyped above (see AuthService.resumeExistingDraft). Ask instead.
        setDraftError(null);
        setDraftCollision({
          existingUserId: res.existingUserId,
          firstName: res.firstName,
          lastName: res.lastName,
          onboardingStep: res.onboardingStep,
        });
        return false;
      }
      applyTokens(res.user, res);
      resumedAccountIdRef.current = res.user.id;
      if (res.email_verification_required || !res.user.email_verified_at) {
        setAwaitingVerification(true);
        setVerifyCode("");
        setVerifyError(null);
        return false;
      }
      return true;
    }

    if (n === 2) {
      const res = await createOrganisationStep({
        company_name: form.company_name,
        industry: orgType as OrgIndustry,
        teamSize,
        city: form.city,
        agreedToTerms,
        country: form.country || undefined,
        currency: COUNTRY_META[form.country]?.currency ?? undefined,
        timezone: timezone || undefined,
      });
      applyTokens(res.user, res);
      return true;
    }

    return true;
  }

  // Shared by handleContinueDraft (and, previously, the old silent-resume
  // branch) — restores every downstream step's local state from whatever
  // the backend has saved for this draft.
  //
  // Deliberately always lands the wizard back on Step 1 (never jumps ahead
  // to whatever step the draft had reached) — every field the draft already
  // has is prefilled there so the person can review/edit before clicking
  // through, rather than being dropped mid-flow on a page they don't
  // recognise.
  function applyResumedState(resumed: ResumeSignupResponse) {
    applyTokens(resumed.user, resumed);
    resumedAccountIdRef.current = resumed.user.id;
    const resumedCountry = resumed.organisation?.country ?? form.country;
    const resumedCallingCode = callingCodeForCountry(resumedCountry);
    setForm((prev) => ({
      ...prev,
      first_name: resumed.user.first_name ?? prev.first_name,
      last_name: resumed.user.last_name ?? prev.last_name,
      work_email: resumed.user.email ?? prev.work_email,
      phone_number: resumed.user.phone_number
        ? stripCallingCode(resumed.user.phone_number, resumedCallingCode)
        : prev.phone_number,
      // Never recoverable from its hash, and leaving whatever was typed on
      // the collision attempt sitting here would look like "old" data it
      // isn't — clear it so Step 1 visibly asks for it again.
      password: "",
      company_name: resumed.organisation?.name ?? prev.company_name,
      country: resumedCountry,
      city: resumed.organisation?.city ?? prev.city,
    }));
    if (resumed.organisation) {
      if (resumed.organisation.industry) setOrgType(resumed.organisation.industry);
      if (resumed.organisation.team_size) setTeamSize(resumed.organisation.team_size);
    }
    if (resumed.email_verification_required || !resumed.user.email_verified_at) {
      setAwaitingVerification(true);
      setVerifyCode("");
      setVerifyError(null);
      setResumeAfterVerify(resumed.nextStep);
      return;
    }
    setCur(0);
    window.scrollTo(0, 0);
  }

  const didResumeRef = useRef(false);
  useEffect(() => {
    if (didResumeRef.current) return;
    if (!user || user.role === "super_admin" || user.role === "team_member") return;
    if (user.onboarding_step === "completed") return;
    didResumeRef.current = true;
    resumeSignup(user.email)
      .then((resumed) => applyResumedState(resumed))
      .catch(() => {
        didResumeRef.current = false;
      });
    // Resume once when an incomplete session is already present (e.g. after login).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.onboarding_step]);

  async function handleVerifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifyError(null);
    setVerifyBusy(true);
    try {
      await verifyEmail(form.work_email, verifyCode);
      setAwaitingVerification(false);
      setVerifyCode("");
      if (resumeAfterVerify) {
        // Same rule as applyResumedState: land back on Step 1 (prefilled),
        // not wherever the resumed draft had reached.
        setCur(0);
        setResumeAfterVerify(null);
      } else {
        setCur((c) => Math.max(c, 1));
      }
      window.scrollTo(0, 0);
    } catch (err) {
      const { general } = mapApiFieldErrors(err, FIELD_KEYS);
      setVerifyError(general ?? "That code doesn't look right. Check it and try again.");
    } finally {
      setVerifyBusy(false);
    }
  }

  async function handleResendVerification() {
    setVerifyError(null);
    try {
      await resendVerification(form.work_email);
      setResendState("sent");
      window.setTimeout(() => setResendState("idle"), 2000);
    } catch (err) {
      const { general } = mapApiFieldErrors(err, FIELD_KEYS);
      setVerifyError(general ?? "Couldn't resend the code. Please try again.");
    }
  }

  // "Continue previous setup" — a read-only preview of the draft exactly as
  // it was saved (ignores whatever was just retyped on this collision
  // attempt) so Step 1 lands back with the OLD data prefilled for review —
  // not the new name/password just typed, and not skipped ahead to
  // whichever step the draft had reached. The person can edit any field
  // (password included — it can't be recovered from its hash, so that one
  // starts blank) and it's only actually saved once they click Continue
  // again, which commitStep's Step 1 branch routes through
  // resumeExistingDraft for exactly this reason.
  async function handleContinueDraft() {
    if (!draftCollision) return;
    setDraftError(null);
    setDraftBusy("resume");
    try {
      const resumed = await previewDraft({ existingUserId: draftCollision.existingUserId });
      applyResumedState(resumed);
      setDraftCollision(null);
    } catch (err) {
      const { general } = mapApiFieldErrors(err, FIELD_KEYS);
      setDraftError(general ?? "Couldn't continue that setup — please try again.");
    } finally {
      setDraftBusy(null);
    }
  }

  // "Start fresh instead" permanently removes the abandoned draft. No new
  // account is created until the user submits the blank Step 1 again, which
  // keeps verification and collision detection on the normal signup path.
  async function handleStartFreshDraft() {
    if (!draftCollision) return;
    setDraftError(null);
    setDraftBusy("restart");
    try {
      const res = await restartExistingDraft({
        existingUserId: draftCollision.existingUserId,
      });
      if (res.status !== "restarted") {
        setDraftError("Couldn't start a fresh setup — please try again.");
        return;
      }
      await logout();
      didResumeRef.current = true;
      resumedAccountIdRef.current = null;
      setAwaitingVerification(false);
      setVerifyCode("");
      setVerifyError(null);
      setResumeAfterVerify(null);
      setForm({
        first_name: "",
        last_name: "",
        company_name: "",
        work_email: "",
        phone_number: "",
        city: "",
        country: "",
        password: "",
      });
      setCurrency("");
      setTimezone("");
      setOrgType("developer");
      setTeamSize("2–10");
      setAgreedToTerms(false);
      setFieldErrors({});
      setGeneralError(null);
      setDraftCollision(null);
      setCur(0);
      window.scrollTo(0, 0);
    } catch (err) {
      const { general } = mapApiFieldErrors(err, FIELD_KEYS);
      setDraftError(general ?? "Couldn't start a fresh setup — please try again.");
    } finally {
      setDraftBusy(null);
    }
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

  // Step 2 is the last step — commitStep(2) both creates the organisation
  // AND finishes onboarding server-side (Basic plan, active status,
  // completed step), so a successful commit here goes straight to the
  // dashboard rather than advancing to a step that no longer exists. There
  // is no "pending approval" holding screen anymore — the approval gate is
  // gone (see backend OrgApprovedGuard).
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cur !== TOTAL - 1) {
      void goNext();
      return;
    }
    const stepNumber = cur + 1;
    if (!validateStep(stepNumber)) return;
    setFieldErrors({});
    setGeneralError(null);
    setIsSubmitting(true);
    try {
      const advance = await commitStep(stepNumber);
      if (advance) {
        router.push("/org");
        router.refresh();
      }
    } catch (err) {
      const { fieldErrors: fe, general } = mapApiFieldErrors(err, FIELD_KEYS);
      setFieldErrors(fe);
      setGeneralError(general ?? "Couldn't finish setup — please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

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

  if (awaitingVerification) {
    return (
      <div className="auth">
        <div className="brandside">
          <div className="glow" />
          <div className="logo">iR</div>
          <div>
            <h1 className="reveal in">Check your inbox.</h1>
            <p className="reveal in" data-delay="1" style={{ marginTop: 18 }}>
              We sent a 6-digit code to <b>{form.work_email}</b>. Enter it to activate your account.
            </p>
          </div>
        </div>
        <div className="formside">
          <div className="fw">
            <h2>Verify your email</h2>
            <p className="muted" style={{ marginTop: 8 }}>
              The code expires in 60 minutes.
            </p>
            <form style={{ marginTop: 26 }} onSubmit={handleVerifyEmail} noValidate>
              <div className="field">
                <label>Verification code</label>
                <input
                  className="inp"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => {
                    setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setVerifyError(null);
                  }}
                  placeholder="000000"
                  aria-label="Verification code"
                  style={{ letterSpacing: "0.35em", textAlign: "center", fontWeight: 700 }}
                />
              </div>
              {verifyError ? (
                <p role="alert" className="help" style={{ color: "var(--rose)", borderColor: "var(--rose-050)", background: "var(--rose-050)", marginBottom: 14 }}>
                  {verifyError}
                </p>
              ) : null}
              <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={verifyBusy || verifyCode.length !== 6}>
                {verifyBusy ? "Verifying…" : "Verify email →"}
              </button>
            </form>
            <p className="muted" style={{ textAlign: "center", marginTop: 20, fontSize: 13.5 }}>
              Didn&apos;t receive it?{" "}
              <button
                type="button"
                onClick={handleResendVerification}
                style={{ color: "var(--brand)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
              >
                {resendState === "sent" ? "Code re-sent" : "Resend code"}
              </button>
            </p>
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

          {/* STEP 2 — organisation (final step) */}
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
                <input className="inp" value={form.company_name} onChange={update("company_name")} placeholder="Skyline Developers" />
              </div>
              <div className="row2">
                <div className="field">
                  <label>City <span className="req">*</span></label>
                  <input className="inp" value={form.city} onChange={update("city")} placeholder="Ahmedabad" />
                </div>
                <div className="field">
                  <label>Team size</label>
                  <select className="inp" value={teamSize} onChange={(e) => setTeamSize(e.target.value)}>
                    <option value="Just me">Just me</option>
                    <option value="2–10">2–10</option>
                    <option value="11–50">11–50</option>
                    <option value="50+">50+</option>
                  </select>
                </div>
              </div>
              {!form.country ? (
                // Country now lives on Step 1 — this only appears as a
                // fallback if it somehow wasn't set there (e.g. resuming
                // right after Step 1, before Step 2 ever submitted and
                // persisted it — Step 1 itself isn't shown again on resume).
                <div className="field">
                  <label>Country</label>
                  <select className="inp" value={form.country} onChange={handleCountryChange}>
                    <option value="">Select country…</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              ) : null}
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

          {generalError ? (
            <p role="alert" className="help" style={{ color: "var(--rose)", borderColor: "var(--rose-050)", background: "var(--rose-050)", marginTop: 16 }}>
              {generalError}
            </p>
          ) : null}

          <div className="wfoot">
            <button className="btn btn-ghost" type="button" onClick={() => go(-1)} style={{ visibility: cur === 0 ? "hidden" : "visible" }}>← Back</button>
            <div style={{ flex: 1 }} />
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

      {draftCollision ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 400,
            padding: 20,
          }}
          onClick={() => {
            if (!draftBusy) setDraftCollision(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              borderRadius: 20,
              padding: 28,
              width: 460,
              maxWidth: "100%",
              boxShadow: "var(--sh-lg)",
              position: "relative",
            }}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => { if (!draftBusy) setDraftCollision(null); }}
              disabled={!!draftBusy}
              style={{
                position: "absolute",
                top: 18,
                right: 18,
                border: "none",
                background: "none",
                color: "var(--muted)",
                fontSize: 15,
                cursor: draftBusy ? "not-allowed" : "pointer",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
            <h2 style={{ margin: "0 0 6px", fontSize: 19, fontWeight: 800, color: "var(--ink)" }}>
              Welcome back
            </h2>
            <p style={{ margin: "0 0 20px", color: "var(--ink-2)", fontSize: 13.5, lineHeight: 1.6 }}>
              Looks like {draftCollision.firstName ? <b>{draftCollision.firstName}</b> : "someone"} already
              started setting up a workspace with this email or mobile number — it got as far as{" "}
              <b>{completedStepLabel(draftCollision.onboardingStep)}</b>. Want to continue where that setup
              left off, or start fresh with what you just entered?
            </p>
            {draftError ? (
              <p role="alert" className="help" style={{ color: "var(--rose)", borderColor: "var(--rose-050)", background: "var(--rose-050)", marginBottom: 16 }}>
                {draftError}
              </p>
            ) : null}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                className="btn btn-primary btn-block"
                type="button"
                onClick={handleContinueDraft}
                disabled={!!draftBusy}
              >
                {draftBusy === "resume" ? "Continuing…" : "Continue previous setup →"}
              </button>
              <button
                className="btn btn-ghost btn-block"
                type="button"
                onClick={handleStartFreshDraft}
                disabled={!!draftBusy}
              >
                {draftBusy === "restart" ? "Starting fresh…" : "Start fresh instead"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
