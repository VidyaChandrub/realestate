"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Icon } from "@/components/icons";
import {
  Field,
  FormActions,
  FormAlert,
  FormGrid,
  FormPage,
  FormSection,
  PresetRadios,
  TextArea,
  TextInput,
  formPageStyles,
} from "@/components/forms/form-page";
import { FLASH_KEY, FLASH_TAB_KEY, LIST_PATH } from "../../member-form";

// Create platform role as a full page (was a modal on the Roles tab). Same
// fields and request as before — name, optional key, description, with the
// two quick-start presets.

const PRESETS = [
  { name: "Platform Operator", key: "platform_operator", desc: "Day-to-day Super Admin console: organisations, domains, support" },
  { name: "Platform Support", key: "platform_support", desc: "Helps organisations with onboarding, billing, and access issues" },
];

const NAME_MAX = 100;

export default function CreatePlatformRolePage() {
  const router = useRouter();
  const { isLoading, hasPermission } = useAuth();
  const [form, setForm] = useState({ name: "", key: "", description: "" });
  const [nameError, setNameError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <div className="muted" style={{ padding: 24 }}>Loading…</div>;
  if (!hasPermission("admin_platform_team", "add")) {
    return (
      <div className="form-alert">
        You don&apos;t have permission to create platform roles. <Link href={LIST_PATH}>Back to Platform Team</Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
    if (!form.name.trim()) {
      setNameError("Role name is required.");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/admin/platform-roles", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          key: form.key.trim() || undefined,
          description: form.description,
        }),
      });
      try {
        sessionStorage.setItem(FLASH_KEY, "Platform role created");
        sessionStorage.setItem(FLASH_TAB_KEY, "roles");
      } catch {
        // Storage unavailable — the redirect still happens, just without a toast.
      }
      router.push(LIST_PATH);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create role");
      setSubmitting(false);
    }
  }

  return (
    <FormPage
      eyebrow="Platform · Platform Team"
      title="Create platform role"
      subtitle="Define a new role that can be assigned to platform admins."
      backHref={LIST_PATH}
      backLabel="Back to Platform Team"
    >
      <form className={formPageStyles.panel} onSubmit={handleSubmit} noValidate>
        <FormAlert message={formError} />

        <FormSection title="Quick start" />
        <PresetRadios
          name="pr-preset"
          label="Quick start"
          options={PRESETS}
          selected={(p) => form.key === p.key}
          disabled={submitting}
          onSelect={(p) => {
            setForm({ name: p.name, key: p.key, description: p.desc });
            setNameError(undefined);
          }}
        />

        <FormSection title="Role details" />
        <Field htmlFor="pr-name" label="Role name *" icon="shield" error={nameError}>
          <TextInput
            id="pr-name"
            icon="shield"
            value={form.name}
            maxLength={NAME_MAX}
            placeholder="e.g. Platform Operator"
            invalid={!!nameError}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }));
              setNameError(undefined);
            }}
          />
        </Field>

        <FormGrid>
          <Field htmlFor="pr-key" label="Key / slug" icon="key">
            <TextInput
              id="pr-key"
              icon="key"
              value={form.key}
              maxLength={50}
              placeholder="Auto-generated if empty"
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
            />
          </Field>
          <Field htmlFor="pr-scope" label="Scope" icon="globe">
            <div id="pr-scope" className={formPageStyles.chip}>
              <Icon name="globe" size={16} />
              Platform scope
            </div>
          </Field>
        </FormGrid>

        <Field htmlFor="pr-desc" label="Description" icon="document">
          <TextArea
            id="pr-desc"
            rows={3}
            value={form.description}
            placeholder="What does this role do?"
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </Field>

        <FormActions
          cancelHref={LIST_PATH}
          busy={submitting}
          submitDisabled={!form.name.trim()}
          busyLabel="Creating…"
          submitLabel="Create role"
          submitIcon="plus"
        />
      </form>
    </FormPage>
  );
}
