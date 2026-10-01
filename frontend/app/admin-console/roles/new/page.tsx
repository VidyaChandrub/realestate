"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { setFlash } from "@/lib/flash";
import {
  Field,
  FormActions,
  FormAlert,
  FormGrid,
  FormNote,
  FormPage,
  FormSection,
  PresetRadios,
  TextArea,
  TextInput,
  formPageStyles,
} from "@/components/forms/form-page";
import { ORG_PRESETS, ROLES_FLASH_KEY, ROLES_PATH } from "../role-shared";

// Create organisation role — full page (was the "Create Custom Role" modal on
// /admin-console/roles). Same fields, presets and POST as before.

export default function CreateOrgRolePage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [form, setForm] = useState({ name: "", key: "", description: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || submitting) return;
    if (!form.name) {
      setError("Role name is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/admin/roles", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          name: form.name,
          key: form.key || undefined,
          description: form.description,
        }),
      });
      setFlash(ROLES_FLASH_KEY, { message: "Role created successfully" });
      router.push(ROLES_PATH);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create role");
      setSubmitting(false);
    }
  }

  return (
    <FormPage
      eyebrow="Organisations · Organisation Roles"
      title="Create custom role"
      subtitle="Add an organisation role that customer workspaces can assign to their members."
      backHref={ROLES_PATH}
      backLabel="Back to Organisation Roles"
    >
      <form className={formPageStyles.panel} onSubmit={handleSubmit}>
        <FormAlert message={error} />

        <FormSection title="Quick presets (click to pre-fill)" />
        <PresetRadios
          name="or-preset"
          label="Quick presets"
          options={ORG_PRESETS}
          selected={(p) => form.key === p.key}
          disabled={submitting}
          onSelect={(p) => setForm({ name: p.name, key: p.key, description: p.desc })}
        />

        <FormSection title="Role details" />
        <FormGrid>
          <Field htmlFor="or-name" label="Role name *" icon="shield">
            <TextInput
              id="or-name"
              required
              icon="shield"
              placeholder="e.g. Senior Property Specialist"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field htmlFor="or-key" label="Role key / slug" note="(Auto-generated if empty)" icon="key">
            <TextInput
              id="or-key"
              icon="key"
              placeholder="e.g. senior_property_specialist"
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
            />
          </Field>
        </FormGrid>

        <Field htmlFor="or-scope" label="Scope" icon="building">
          <div id="or-scope">
            <FormNote title="🏢 Organisation Scope">
              These roles apply inside customer organisations — not the Super Admin console.
            </FormNote>
          </div>
        </Field>

        <Field htmlFor="or-desc" label="Description" icon="document">
          <TextArea
            id="or-desc"
            rows={3}
            placeholder="Describe the responsibilities and access level of this role…"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </Field>

        <FormActions
          cancelHref={ROLES_PATH}
          busy={submitting}
          submitDisabled={!form.name.trim()}
          busyLabel="Creating…"
          submitLabel="Create Role"
          submitIcon="plus"
        />
      </form>
    </FormPage>
  );
}
