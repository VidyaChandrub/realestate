"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, validateResetToken } from "@/lib/api";
import { PasswordInput } from "@/components/auth/password-input";

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<"checking" | "valid" | "invalid">("checking");

  useEffect(() => {
    if (!token) {
      setTokenStatus("invalid");
      return;
    }
    let cancelled = false;
    validateResetToken(token)
      .then((res) => {
        if (!cancelled) setTokenStatus(res.valid ? "valid" : "invalid");
      })
      .catch(() => {
        if (!cancelled) setTokenStatus("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Missing or invalid reset token. Request a new link.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiFetch<{ success: boolean }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password: password }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
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
            Choose a fresh, strong password and you&apos;ll be back in the pipeline in seconds.
          </p>
        </div>
        <div style={{ position: "relative", color: "#8891b4", fontSize: 13 }}>
          iPixxel Realty · Real-estate CRM &amp; landing pages
        </div>
      </div>

      <div className="formside">
        <div className="fw">
          <div className="reveal in">
            <h2>Set a new password</h2>
            <p className="muted" style={{ marginTop: 8 }}>
              Enter a new password for your account.
            </p>
          </div>

          {tokenStatus === "checking" ? (
            <div className="help reveal in" data-delay="1" style={{ marginTop: 26 }}>
              Checking your reset link…
            </div>
          ) : tokenStatus === "invalid" ? (
            <div className="help reveal in" data-delay="1" style={{ marginTop: 26, color: "var(--rose)", borderColor: "var(--rose-050)", background: "var(--rose-050)" }}>
              ⚠️ This reset link is invalid or has expired. Please{" "}
              <Link href="/forgot-password" style={{ color: "inherit", fontWeight: 600, textDecoration: "underline" }}>
                request a new one
              </Link>.
            </div>
          ) : done ? (
            <div className="help reveal in" data-delay="1" style={{ marginTop: 26 }}>
              ✅ Password updated. You can now{" "}
              <Link href="/login" style={{ color: "var(--brand)", fontWeight: 600 }}>sign in</Link>.
            </div>
          ) : (
            <form className="reveal in" data-delay="1" style={{ marginTop: 26 }} onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label>New password</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••••"
                />
              </div>
              <div className="field">
                <label>Confirm password</label>
                <PasswordInput
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••••"
                />
              </div>
              {error ? (
                <div className="help" style={{ color: "var(--rose)", borderColor: "var(--rose-050)", background: "var(--rose-050)", marginBottom: 14 }}>
                  {error}
                </div>
              ) : null}
              <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating…" : "Update password"}
              </button>
            </form>
          )}

          <p className="muted reveal in" data-delay="3" style={{ textAlign: "center", marginTop: 24, fontSize: 13.5 }}>
            ← Back to <Link href="/login" style={{ color: "var(--brand)", fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="auth"><div className="formside"><div className="fw"><p className="muted">Loading…</p></div></div></div>}>
      <ResetForm />
    </Suspense>
  );
}
