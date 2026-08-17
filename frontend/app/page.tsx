"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, isLoading, logout } = useAuth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="flex w-full max-w-3xl flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          BigEstate
        </h1>
        <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
          The real estate SaaS platform for managing your portfolio and teams.
        </p>

        {isLoading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : user ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Signed in as{" "}
              <span className="font-medium text-zinc-950 dark:text-zinc-50">
                {user.email}
              </span>
            </p>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="flex h-11 items-center justify-center rounded-lg bg-zinc-950 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="flex h-11 items-center justify-center rounded-lg border border-zinc-300 px-6 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Create account
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}