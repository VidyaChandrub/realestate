"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { mapApiFieldErrors } from "@/lib/form-errors";
import { verifyEmail, resendVerification } from "@/lib/api";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sent">("idle");

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Enter the email you registered with.");
      return;
    }
    setIsSubmitting(true);
    try {
      await verifyEmail(email.trim(), code);
      router.push("/register");
      router.refresh();
    } catch (err) {
      const { general } = mapApiFieldErrors(err, ["email", "code"]);
      setError(general ?? "That code doesn't look right. Check it and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!email.trim()) {
      setError("Enter the email you registered with.");
      return;
    }
    setError(null);
    try {
      await resendVerification(email.trim());
      setResendState("sent");
      window.setTimeout(() => setResendState("idle"), 2000);
    } catch (err) {
      const { general } = mapApiFieldErrors(err, ["email"]);
      setError(general ?? "Couldn't resend the code. Please try again.");
    }
  }

  return (
    <div className="auth">
      <div className="brandside">
        <div className="glow" />
        <div className="logo">iR</div>
        <div>
          <h1 className="reveal in">Check your inbox.</h1>
          <p className="reveal in" data-delay="1" style={{ marginTop: 18 }}>
            Enter the 6-digit code we emailed you to activate your account.
          </p>
        </div>
      </div>
      <div className="formside">
        <div className="fw">
          <h2>Verify your email</h2>
          <p className="muted" style={{ marginTop: 8 }}>
            The code expires in 60 minutes.
          </p>
          <form style={{ marginTop: 26 }} onSubmit={handleVerify} noValidate>
            <div className="field">
              <label>Work email</label>
              <input
                className="inp"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                autoComplete="email"
                placeholder="admin@skylinedev.com"
              />
            </div>
            <div className="field">
              <label>Verification code</label>
              <input
                className="inp"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setError(null);
                }}
                placeholder="000000"
                aria-label="Verification code"
                style={{ letterSpacing: "0.35em", textAlign: "center", fontWeight: 700 }}
              />
            </div>
            {error ? (
              <p role="alert" className="help" style={{ color: "var(--rose)", borderColor: "var(--rose-050)", background: "var(--rose-050)", marginBottom: 14 }}>
                {error}
              </p>
            ) : null}
            <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={isSubmitting || code.length !== 6}>
              {isSubmitting ? "Verifying…" : "Verify email →"}
            </button>
          </form>
          <p className="muted" style={{ textAlign: "center", marginTop: 20, fontSize: 13.5 }}>
            Didn&apos;t receive it?{" "}
            <button
              type="button"
              onClick={handleResend}
              style={{ color: "var(--brand)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
            >
              {resendState === "sent" ? "Code re-sent" : "Resend code"}
            </button>
          </p>
          <p className="muted" style={{ textAlign: "center", marginTop: 16, fontSize: 13.5 }}>
            ← Back to <Link href="/login" style={{ color: "var(--brand)", fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
