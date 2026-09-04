"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { dashboardPathFor } from "@/lib/mock/sessions";
import { PasswordInput } from "@/components/auth/password-input";
import { mapApiFieldErrors } from "@/lib/form-errors";

const FIELD_KEYS = ["email", "password"];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("admin@skylinedev.com");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Read the browser-only query string after hydration so the server and
  // client render the same initial markup.
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (new URLSearchParams(window.location.search).get("reason") === "org_inactive") {
      setNotice(
        "You were signed out because your organisation's access was changed. Contact your administrator if this is unexpected.",
      );
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGeneralError(null);
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const session = await login({ email, password });
      router.push(
        session.must_change_password
          ? "/change-password"
          : dashboardPathFor(session.role),
      );
      router.refresh();
    } catch (err) {
      const { fieldErrors: fe, general } = mapApiFieldErrors(err, FIELD_KEYS);
      setFieldErrors(fe);
      setGeneralError(general);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth">
      <div className="brandside">
        <div className="glow" />
        <div style={{ position: "relative" }}>
          <div className="logo">iR</div>
        </div>
        <div style={{ position: "relative" }}>
          <h1 className="reveal in">From ad click to site visit — nothing leaks.</h1>
          <p className="reveal in" data-delay="1" style={{ marginTop: 18 }}>
            iPixxel Realty captures every property enquiry from Meta, Google, WhatsApp and your
            landing pages into one CRM — so your sales team follows up before the lead goes cold.
          </p>
          <div
            className="reveal in"
            data-delay="2"
            style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 30 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15, color: "#e6e9f8" }}>
              ✅ <span>Auto-capture leads from every ad &amp; landing page</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15, color: "#e6e9f8" }}>
              ✅ <span>Call centre &amp; WhatsApp follow-ups in one place</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15, color: "#e6e9f8" }}>
              ✅ <span>Live pipeline — New to Won, per project &amp; agent</span>
            </div>
          </div>
        </div>
        <div style={{ position: "relative", color: "#8891b4", fontSize: 13 }}>
          Trusted by Skyline Developers, Green Acres &amp; Dubai Prime Estates
        </div>
      </div>

      <div className="formside">
        <div className="fw">
          <div className="reveal in">
            <h2>Sign in to iPixxel Realty</h2>
            <p className="muted" style={{ marginTop: 8 }}>
              One login for Super Admin, Org Admin, Managers &amp; Sales.
            </p>
          </div>
          {notice ? (
            <p role="status" className="help reveal in" style={{ marginTop: 18, borderColor: "var(--rose-050)", background: "var(--rose-050)", color: "var(--rose)" }}>
              {notice}
            </p>
          ) : null}
          <form className="reveal in" data-delay="1" style={{ marginTop: 26 }} onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label>Work email</label>
              <input
                className="inp"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: "" }));
                }}
                autoComplete="email"
                placeholder="admin@skylinedev.com"
              />
              {fieldErrors.email ? <div className="hint" style={{ color: "var(--rose)" }}>{fieldErrors.email}</div> : null}
            </div>
            <div className="field">
              <label>Password</label>
              <PasswordInput
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, password: "" }));
                }}
                autoComplete="current-password"
                placeholder="••••••••••"
              />
              {fieldErrors.password ? <div className="hint" style={{ color: "var(--rose)" }}>{fieldErrors.password}</div> : null}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <label className="check">
                <input type="checkbox" checked={keepSignedIn} onChange={(e) => setKeepSignedIn(e.target.checked)} /> Keep me signed in
              </label>
              <Link href="/forgot-password" style={{ color: "var(--brand)", fontWeight: 600, fontSize: 13.5 }}>
                Forgot password?
              </Link>
            </div>

            {generalError ? (
              <p role="alert" className="help" style={{ color: "var(--rose)", borderColor: "var(--rose-050)", background: "var(--rose-050)", marginBottom: 14 }}>
                {generalError}
              </p>
            ) : null}

            <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in →"}
            </button>
          </form>

    
          <p className="muted reveal in" data-delay="3" style={{ textAlign: "center", marginTop: 24, fontSize: 13.5 }}>
            New here?{" "}
            <Link href="/register" style={{ color: "var(--brand)", fontWeight: 600 }}>Create an organisation</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
