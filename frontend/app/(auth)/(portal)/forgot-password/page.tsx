"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("admin@skylinedev.com");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSent(false);
    setIsSubmitting(true);
    try {
      await apiFetch<{ success: boolean }>(
        "/auth/forgot-password",
        { method: "POST", body: JSON.stringify({ email }) },
      );
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset link.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      subtitle="Enter the email linked to your account and we'll send you a secure, single-use reset link."
      footer={
        <>
          ← Back to <Link href="/login">Sign in</Link>
        </>
      }
    >
      <form style={{ marginTop: 24 }} onSubmit={handleSubmit} noValidate>
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
        <div className="help" style={{ marginTop: 20, color: "var(--rose)", borderColor: "var(--rose-050)", background: "var(--rose-050)" }}>
          {error}
        </div>
      ) : sent ? (
        <div className="help" style={{ marginTop: 20 }}>
          📩 A reset link has been sent to <b>{email}</b>. The link is valid
          for <b>5 minutes</b>.
        </div>
      ) : (
        <div className="help" style={{ marginTop: 20 }}>
          📩 The reset link is valid for <b>5 minutes</b>. If it expires, just request a new one.
        </div>
      )}
    </AuthShell>
  );
}
