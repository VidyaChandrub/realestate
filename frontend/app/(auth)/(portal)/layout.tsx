import type { ReactNode } from "react";
import { BrandMark } from "@/components/icons";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950">
      <aside className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="relative z-10 flex items-center gap-2.5 text-white">
          <BrandMark size={32} />
          <span className="text-lg font-bold tracking-tight">BigEstate</span>
        </div>
        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-bold leading-tight text-white">
            The operating system for modern real estate teams.
          </h2>
          <p className="mt-4 text-indigo-100">
            Manage properties, projects, websites, leads and revenue — all in one
            multi-tenant platform.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <div className="flex -space-x-2">
              {["SR", "DC", "PN", "OM"].map((initials) => (
                <span
                  key={initials}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 text-xs font-semibold text-white backdrop-blur"
                >
                  {initials}
                </span>
              ))}
            </div>
            <p className="text-sm text-indigo-100">
              Trusted by 140+ real estate organisations
            </p>
          </div>
        </div>
        <p className="relative z-10 text-xs text-indigo-200">
          © {new Date().getFullYear()} BigEstate. All rights reserved.
        </p>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <BrandMark size={30} />
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            BigEstate
          </span>
        </div>
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}