"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { mapApiFieldErrors } from "@/lib/form-errors";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";
import { Icon } from "@/components/icons";

const FIELD_KEYS = ["email", "password"];

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Surface the reason a live session was force-ended (see forceSessionEnd in
  // lib/api.ts) — e.g. a Super Admin disabled this Platform Team member while
  // they were signed in.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "account_revoked") {
      setNotice(
        "Your account access has been revoked. Please contact your administrator.",
      );
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGeneralError(null);
    setFieldErrors({});
    setNotice(null);
    setIsSubmitting(true);
    try {
      const session = await login({ email, password, portal: "platform" });
      if (session.org_id) {
        setGeneralError("This login is for Platform Team members only. Organisation users must sign in at /login.");
        return;
      }
      // First login with emailed credentials — the forced password-change flow
      // (shared with the Org user first-login flow) must complete before the
      // console is reachable; the backend blocks it until then regardless.
      if (session.must_change_password) {
        router.push("/change-password");
        router.refresh();
        return;
      }
      router.push("/admin-console");
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
    <div className="flex min-h-screen bg-white">
      <aside className="relative hidden w-[44%] overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-800 lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="flex items-center gap-2.5 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur">iR</span>
          <span className="text-lg font-bold tracking-tight">iPixxel Realty</span>
          <span className="ml-2 rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold tracking-wide text-white">SUPER ADMIN</span>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight text-white">Platform control — separate login.</h2>
          <p className="mt-4 text-sm leading-relaxed text-indigo-100">
            Platform access is isolated at <span className="font-mono font-bold text-white">/admin-login</span> — different URL from the organisation login at <span className="font-mono text-white">/login</span>.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-indigo-100">
            <li>• Super Admin and Platform Team members sign in here</li>
            <li>• Organisation admins, managers, sales → use <Link href="/login" className="underline text-white">/login</Link></li>
            <li>• Brute-force protection + forced password change on first login</li>
          </ul>
        </div>
        <p className="text-xs text-indigo-200">© {new Date().getFullYear()} iPixxel Realty · Platform</p>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
              <Icon name="shield" size={24} />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Sign in</h1>
            <p className="mt-2 text-sm text-slate-500">
              Super Admin and Platform Team login — <span className="font-mono font-bold text-slate-700">/admin-login</span> (different URL from <Link href="/login" className="font-mono text-indigo-600 hover:underline">/login</Link>)
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {notice ? (
              <p role="status" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {notice}
              </p>
            ) : null}
            <Field label="Platform email" error={fieldErrors.email}>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: "" }));
                }}
                placeholder="admin@bigestate.io"
                autoComplete="email"
              />
            </Field>

            <Field label="Password" error={fieldErrors.password}>
              <PasswordInput
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, password: "" }));
                }}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>

            {generalError ? (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {generalError}
              </p>
            ) : null}

            <Button type="submit" size="lg" disabled={isSubmitting} className="mt-1 bg-slate-900 hover:bg-slate-800">
              {isSubmitting ? "Signing in…" : "Sign in to Platform →"}
            </Button>

            <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800 border border-amber-100">
              Platform accounts sign in at <b>/admin-login</b>. Organisation accounts must use <Link href="/login" className="underline">/login</Link>.
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Organisation user? <Link href="/login" className="font-medium text-indigo-600 hover:underline">Sign in at /login</Link> ·{" "}
            <Link href="/register" className="font-medium text-slate-600 hover:underline">Create organisation</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
