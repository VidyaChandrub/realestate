"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "organisation", label: "Organisation" },
  { key: "team", label: "Team" },
  { key: "properties", label: "Properties" },
  { key: "website", label: "Website" },
];

const TEMPLATES = [
  { id: "skyline", name: "Skyline One", price: "Free", accent: "from-sky-500 to-blue-600" },
  { id: "coastal", name: "Coastal Breeze", price: "$49", accent: "from-teal-500 to-emerald-600" },
  { id: "urban", name: "Urban Loft", price: "$79", accent: "from-violet-500 to-purple-600" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { getOrgSetup, completeOnboarding } = useAuth();

  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState("skyline");
  const [teamSize, setTeamSize] = useState("6 - 10");
  const [orgType, setOrgType] = useState("Residential agency");
  const [monthlyListings, setMonthlyListings] = useState("25 - 100");

  useEffect(() => {
    const setup = getOrgSetup();
    if (!setup || setup.step !== "onboarding") {
      router.replace("/register");
    }
  }, [getOrgSetup, router]);

  const setup = getOrgSetup();
  const isLast = step === STEPS.length - 1;

  function next() {
    if (isLast) {
      completeOnboarding();
      router.push("/superadmin");
      router.refresh();
      return;
    }
    setStep((s) => s + 1);
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {setup ? `Welcome, ${setup.organisationName}` : "Set up your workspace"}
          </h1>
          <span className="text-sm font-medium text-slate-400">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>

        <div className="mt-5 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex flex-1 flex-col gap-1.5">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  i <= step ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800",
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium",
                  i === step
                    ? "text-slate-900 dark:text-white"
                    : i < step
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-slate-400",
                )}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        {step === 0 ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Organisation profile
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Tell us a little about your real estate business.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Organisation type">
                <Select value={orgType} onChange={(e) => setOrgType(e.target.value)}>
                  <option>Residential agency</option>
                  <option>Commercial agency</option>
                  <option>Property developer</option>
                  <option>Property management</option>
                  <option>Independent broker</option>
                </Select>
              </Field>
              <Field label="Team size">
                <Select value={teamSize} onChange={(e) => setTeamSize(e.target.value)}>
                  <option>1 - 5</option>
                  <option>6 - 10</option>
                  <option>11 - 25</option>
                  <option>25+</option>
                </Select>
              </Field>
            </div>
            <Field label="Average monthly listings">
              <Select value={monthlyListings} onChange={(e) => setMonthlyListings(e.target.value)}>
                <option>Under 10</option>
                <option>25 - 100</option>
                <option>100 - 500</option>
                <option>500+</option>
              </Select>
            </Field>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Invite your team
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Add your colleagues — you can always invite more later from settings.
              </p>
            </div>
            <div className="flex gap-2">
              <Input placeholder="teammate@company.com" className="flex-1" />
              <Button type="button" variant="outline">
                <Icon name="plus" size={16} />
                Add
              </Button>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              Invites will be sent once your workspace is live.
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Add your first property
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Import an existing listing or start with a blank project.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <Icon name="download" size={18} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Import listings
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    Bulk import from CSV or MLS
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <Icon name="plus" size={18} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Start from scratch
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    Create a property or project manually
                  </span>
                </span>
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Pick your website template
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Your listings will be showcased on this design. You can switch anytime.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplate(template.id)}
                  className={cn(
                    "overflow-hidden rounded-xl border text-left transition-all",
                    selectedTemplate === template.id
                      ? "border-indigo-500 ring-2 ring-indigo-500/30"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700",
                  )}
                >
                  <div className={cn("flex h-20 items-center justify-center bg-gradient-to-br text-2xl", template.accent)}>
                    🏠
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {template.name}
                    </span>
                    <span className="text-xs font-medium text-slate-400">{template.price}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            Back
          </Button>
          <Button type="button" onClick={next}>
            {isLast ? "Launch workspace" : "Continue"}
            {!isLast ? <Icon name="chevron-right" size={16} /> : null}
          </Button>
        </div>
      </div>
    </div>
  );
}