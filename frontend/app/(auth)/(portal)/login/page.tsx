import Link from "next/link";
import { BrandMark } from "@/components/icons";
import { loginPathFor } from "@/lib/mock/sessions";
import type { UserRole } from "@/lib/types";

const ROLE_CARDS: {
  role: UserRole;
  title: string;
  description: string;
  accent: string;
  icon: string;
}[] = [
  {
    role: "super_admin",
    title: "Super Admin",
    description: "Manage platform, organisations, modules and templates.",
    accent: "from-violet-500 to-purple-600",
    icon: "🏛️",
  },
  {
    role: "organisation_admin",
    title: "Organisation Admin",
    description: "Run your real estate organisation and team workspace.",
    accent: "from-indigo-500 to-blue-600",
    icon: "🏢",
  },
];

export default function LoginRolePage() {
  return (
    <div>
      <div className="mb-6 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
          <BrandMark size={30} />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Sign in to BigEstate
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Choose the role that matches how you&apos;ll work
        </p>
      </div>

      <div className="grid gap-3">
        {ROLE_CARDS.map((card) => (
          <Link
            key={card.role}
            href={loginPathFor(card.role)}
            className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg text-white shadow ${card.accent}`}
            >
              {card.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                {card.title}
              </span>
              <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">
                {card.description}
              </span>
            </span>
            <span className="text-slate-300 transition-transform group-hover:translate-x-0.5 dark:text-slate-600">
              →
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        New organisation?{" "}
        <Link
          href="/register"
          className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Register your business
        </Link>
      </p>
    </div>
  );
}