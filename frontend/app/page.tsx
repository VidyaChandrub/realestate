"use client";

import { useAuth } from "@/lib/auth-context";
import { dashboardPathFor } from "@/lib/mock/sessions";
import { BrandMark } from "@/components/icons";
import { LinkButton } from "@/components/ui/button";

export default function Home() {
  const { user, isLoading } = useAuth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 py-16 dark:bg-slate-950">
      <div className="flex w-full max-w-4xl flex-col items-center gap-8 text-center">
        <div className="flex items-center gap-3">
          <BrandMark size={40} />
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            BigEstate
          </h1>
        </div>

        <p className="max-w-xl text-lg text-slate-600 dark:text-slate-400">
          The real estate SaaS platform for managing your portfolio, teams,
          websites and leads — across every branch of your business.
        </p>

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : user ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Signed in as{" "}
              <span className="font-medium text-slate-900 dark:text-white">
                {user.email}
              </span>{" "}
              ({user.roleLabel})
            </p>
            <LinkButton href={dashboardPathFor(user.role)} size="lg">
              Go to your dashboard
            </LinkButton>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/login" size="lg">
              Sign in
            </LinkButton>
            <LinkButton href="/register" size="lg" variant="outline">
              Register your organisation
            </LinkButton>
          </div>
        )}

        <div className="mt-4 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { title: "Multi-tenant", text: "Isolated data per organisation" },
            { title: "Role-based access", text: "Super Admin, Org Admin & Agents" },
            { title: "All-in-one", text: "Properties, CRM, websites & billing" },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-left dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {item.title}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}