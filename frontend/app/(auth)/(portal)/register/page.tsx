"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { mapApiFieldErrors } from "@/lib/form-errors";
import { slugify } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Icon } from "@/components/icons";

const FIELD_KEYS = [
  "first_name",
  "last_name",
  "company_name",
  "work_email",
  "phone_number",
  "city",
  "password",
];

export default function RegisterPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    company_name: "",
    work_email: "",
    phone_number: "",
    city: "",
    password: "",
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGeneralError(null);

    if (!agreedToTerms) {
      setGeneralError("You must agree to the Terms of Service & Privacy Policy.");
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      await signup(form);
      router.push("/superadmin");
      router.refresh();
    } catch (err) {
      const { fieldErrors: fe, general } = mapApiFieldErrors(err, FIELD_KEYS);
      setFieldErrors(fe);
      setGeneralError(general);
    } finally {
      setIsSubmitting(false);
    }
  }

  const subdomain = slugify(form.company_name);

  return (
    <div>
      <div className="mb-6 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg">
          <Icon name="building" size={24} />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Create your organisation
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Set up your developer workspace in under two minutes.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" error={fieldErrors.first_name}>
            <Input
              required
              placeholder="Rohan"
              value={form.first_name}
              onChange={update("first_name")}
              autoComplete="given-name"
            />
          </Field>
          <Field label="Last name" error={fieldErrors.last_name}>
            <Input
              required
              placeholder="Shah"
              value={form.last_name}
              onChange={update("last_name")}
              autoComplete="family-name"
            />
          </Field>
        </div>

        <Field
          label="Company / Developer name"
          error={fieldErrors.company_name}
          hint={
            form.company_name
              ? undefined
              : "Your workspace will live at a subdomain based on this name."
          }
        >
          <Input
            required
            placeholder="Skyline Developers"
            value={form.company_name}
            onChange={update("company_name")}
          />
          {form.company_name && !fieldErrors.company_name ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Your workspace will live at{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {subdomain}
              </span>
              .ipixxel.in
            </p>
          ) : null}
        </Field>

        <Field label="Work email" error={fieldErrors.work_email}>
          <Input
            type="email"
            required
            placeholder="admin@skylinedev.com"
            value={form.work_email}
            onChange={update("work_email")}
            autoComplete="email"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" error={fieldErrors.phone_number}>
            <Input
              required
              placeholder="+91 98250 41200"
              value={form.phone_number}
              onChange={update("phone_number")}
              autoComplete="tel"
            />
          </Field>
          <Field label="City" error={fieldErrors.city}>
            <Input
              required
              placeholder="Ahmedabad"
              value={form.city}
              onChange={update("city")}
              autoComplete="address-level2"
            />
          </Field>
        </div>

        <Field label="Password" error={fieldErrors.password}>
          <Input
            type="password"
            required
            minLength={8}
            placeholder="••••••••••"
            value={form.password}
            onChange={update("password")}
            autoComplete="new-password"
          />
        </Field>

        <label className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            required
            checked={agreedToTerms}
            onChange={(e) => {
              setAgreedToTerms(e.target.checked);
              setGeneralError(null);
            }}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
          />
          I agree to the Terms of Service &amp; Privacy Policy
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
          {isSubmitting ? "Creating your workspace…" : "Create organisation & sign in →"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Sign in
        </Link>
      </p>
    </div>
  );
}
