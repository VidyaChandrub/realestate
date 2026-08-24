"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { mapApiFieldErrors } from "@/lib/form-errors";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGeneralError(null);
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const session = await login({ email, password });
      if (session.role !== "super_admin") {
        setGeneralError("This login is for Super Admins only. Organisation users must sign in at /login.");
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
            Super Admin access is isolated at <span className="font-mono font-bold text-white">/admin-login</span> — different URL from the organisation login at <span className="font-mono text-white">/login</span>.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-indigo-100">
            <li>• Only <b className="text-white">super_admin</b> role can sign in here</li>
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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Super Admin Sign in</h1>
            <p className="mt-2 text-sm text-slate-500">
              Platform owner login — <span className="font-mono font-bold text-slate-700">/admin-login</span> (different URL from <Link href="/login" className="font-mono text-indigo-600 hover:underline">/login</Link>)
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Field label="Super Admin email" error={fieldErrors.email}>
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
              <Input
                type="password"
                required
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
              {isSubmitting ? "Signing in…" : "Sign in to Super Admin →"}
            </Button>

            <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800 border border-amber-100">
              Demo: <b>admin@bigestate.io</b> / <b>demo1234</b> (super_admin) — only works here at <b>/admin-login</b>. Org demo <b>sarah@acmerealty.com</b> must use <Link href="/login" className="underline">/login</Link>.
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
