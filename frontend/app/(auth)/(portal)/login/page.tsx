"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { dashboardPathFor, MOCK_ACCOUNTS } from "@/lib/mock/sessions";
import { mapApiFieldErrors } from "@/lib/form-errors";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Icon } from "@/components/icons";

const FIELD_KEYS = ["email", "password"];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function fillDemo(accountEmail: string, accountPassword: string) {
    setEmail(accountEmail);
    setPassword(accountPassword);
    setGeneralError(null);
    setFieldErrors({});
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGeneralError(null);
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      await login({ email, password });
      router.push(dashboardPathFor());
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
    <div>
      <div className="mb-6 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg">
          <Icon name="shield" size={24} />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Sign in to BigEstate
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          One login for Super Admin, Org Admin, Managers &amp; Sales.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <Field label="Work email" error={fieldErrors.email}>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((prev) => ({ ...prev, email: "" }));
            }}
            placeholder="you@company.com"
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

        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={keepSignedIn}
            onChange={(e) => setKeepSignedIn(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
          />
          Keep me signed in
        </label>

        {generalError ? (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
          >
            {generalError}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={isSubmitting} className="mt-1">
          {isSubmitting ? "Signing in…" : "Sign in →"}
        </Button>
      </form>

      <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Demo accounts
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Click to fill the form — you still need a real account to sign in. Each role sees a
          different menu once signed in.
        </p>
        <div className="mt-3 space-y-2">
          {MOCK_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => fillDemo(account.email, account.password)}
              className="flex w-full items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-left transition-colors hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                  {account.email}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {account.label} · {account.description}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700">
                password: {account.password}
              </span>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        New here?{" "}
        <Link href="/register" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Create an organisation
        </Link>
      </p>
    </div>
  );
}
