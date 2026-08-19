"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { dashboardPathFor, MOCK_ACCOUNTS, loginPathFor } from "@/lib/mock/sessions";
import type { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/icons";

const ROLE_META: Record<UserRole, { label: string; accent: string }> = {
  super_admin: {
    label: "Super Admin",
    accent: "from-violet-500 to-purple-600",
  },
  organisation_admin: {
    label: "Organisation Admin",
    accent: "from-indigo-500 to-blue-600",
  },
  team_member: {
    label: "Team / Agent",
    accent: "from-emerald-500 to-teal-600",
  },
};

export function LoginForm({ role }: { role: UserRole }) {
  const router = useRouter();
  const { mockLogin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const meta = ROLE_META[role];
  const accounts = MOCK_ACCOUNTS.filter((account) => account.role === role);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await mockLogin(role, email, password);
      router.push(dashboardPathFor());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function fillDemo(accountEmail: string, accountPassword: string) {
    setEmail(accountEmail);
    setPassword(accountPassword);
    setError(null);
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <span
          className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${meta.accent}`}
        >
          <Icon name="shield" size={24} />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {meta.label} sign in
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Access the {meta.label} workspace
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
            Email
          </span>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
            Password
          </span>
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>

        {error ? (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
          >
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={isSubmitting} className="mt-1">
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Demo accounts
        </p>
        <div className="mt-3 space-y-2">
          {accounts.map((account) => (
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
        <Link
          href="/login"
          className="font-medium text-slate-900 underline-offset-4 hover:underline dark:text-white"
        >
          Choose a different role
        </Link>
        <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
        <Link
          href={`${loginPathFor(role)}?demo=1`}
          className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Trouble signing in?
        </Link>
      </p>
    </div>
  );
}