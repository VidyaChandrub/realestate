"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Icon } from "@/components/icons";

export default function RegisterPage() {
  const router = useRouter();
  const { mockRegister } = useAuth();

  const [form, setForm] = useState({
    organisation_name: "",
    work_email: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await mockRegister(form);
      router.push(`/verify-email?email=${encodeURIComponent(form.work_email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg">
          <Icon name="building" size={24} />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Register your organisation
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Start your free 14-day trial — no credit card required.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <Field label="Organisation name">
          <Input
            required
            placeholder="Acme Realty Group"
            value={form.organisation_name}
            onChange={update("organisation_name")}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <Input required placeholder="Jane" value={form.first_name} onChange={update("first_name")} />
          </Field>
          <Field label="Last name">
            <Input required placeholder="Doe" value={form.last_name} onChange={update("last_name")} />
          </Field>
        </div>

        <Field label="Work email" hint="We'll send a verification link to this address.">
          <Input
            type="email"
            required
            placeholder="jane@acmerealty.com"
            value={form.work_email}
            onChange={update("work_email")}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone number">
            <Input required placeholder="+1 555 000 0000" value={form.phone_number} onChange={update("phone_number")} />
          </Field>
          <Field label="Password" hint="At least 8 characters.">
            <Input
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              value={form.password}
              onChange={update("password")}
            />
          </Field>
        </div>

        {error ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={isSubmitting} className="mt-1">
          {isSubmitting ? "Creating your workspace…" : "Create organisation"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Sign in
        </Link>
      </p>
    </div>
  );
}