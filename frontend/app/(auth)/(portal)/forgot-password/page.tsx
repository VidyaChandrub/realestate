"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@skylinedev.com");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await apiFetch<{ success: boolean; resetToken?: string }>(
        "/auth/forgot-password",
        { method: "POST", body: JSON.stringify({ email }) },
      );
      setSent(true);
      if (res.resetToken) {
        router.push(`/reset-password?token=${encodeURIComponent(res.resetToken)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset link.");
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
            Back to your leads in a moment. We&apos;ll email you a secure link to reset your password
            and get you back into the pipeline.
          </p>
          <div
            className="reveal in"
            data-delay="2"
            style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 30 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15, color: "#e6e9f8" }}>
              ✅ <span>Secure, single-use reset link</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15, color: "#e6e9f8" }}>
              ✅ <span>Your leads &amp; pipeline stay safe</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15, color: "#e6e9f8" }}>
              ✅ <span>Support at hello@ipixxel.in if you&apos;re stuck</span>
            </div>
          </div>
        </div>
        <div style={{ position: "relative", color: "#8891b4", fontSize: 13 }}>
          iPixxel Realty · Real-estate CRM &amp; landing pages
        </div>
      </div>

      <div className="formside">
        <div className="fw">
          <div className="reveal in">
            <h2>Reset your password</h2>
            <p className="muted" style={{ marginTop: 8 }}>
              Enter the email linked to your account and we&apos;ll send you a reset link.
            </p>
          </div>
          <form className="reveal in" data-delay="1" style={{ marginTop: 26 }} onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label>Work email</label>
              <input
                className="inp"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="admin@skylinedev.com"
              />
            </div>
            <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send reset link"}
            </button>
          </form>

          {error ? (
            <div className="help reveal in" data-delay="2" style={{ marginTop: 20, color: "var(--rose)", borderColor: "var(--rose-050)", background: "var(--rose-050)" }}>
              {error}
            </div>
          ) : null}

          {sent ? (
            <div className="help reveal in" data-delay="2" style={{ marginTop: 20 }}>
              📩 If an account exists for <b>{email}</b>, a reset link is on its way. The link is valid
              for <b>30–60 minutes</b>.
            </div>
          ) : (
            <div className="help reveal in" data-delay="2" style={{ marginTop: 20 }}>
              📩 The reset link is valid for <b>30–60 minutes</b>. If it expires, just request a new one.
            </div>
          )}

          <p className="muted reveal in" data-delay="3" style={{ textAlign: "center", marginTop: 24, fontSize: 13.5 }}>
            ← Back to <Link href="/login" style={{ color: "var(--brand)", fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
