"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  SelectInput,
  TextArea,
  TextInput,
  formPageStyles,
} from "@/components/forms/form-page";
import type { DynamicRole } from "@/lib/types";
import { ROLES_FLASH_KEY, ROLES_PATH, SYSTEM_ROLE_KEYS, roleInUseMessage } from "../../role-shared";

// Edit organisation role — full page (was the "Edit Role" modal on
// /admin-console/roles). Same fields, checks and PATCH as before.

export default function EditOrgRolePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { accessToken } = useAuth();
  const [role, setRole] = useState<DynamicRole | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !accessToken) return;
    let cancelled = false;
    // Same list the Roles page loads — there's no single-role endpoint.
    apiFetch<DynamicRole[]>("/admin/roles", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((list) => {
        if (cancelled) return;
        const found = list.find((r) => r.id === id);
        if (found) setRole(found);
        else setLoadError("Role not found.");
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load role");
      });
    return () => {
      cancelled = true;
    };
  }, [id, accessToken]);

  if (loadError) {
    return (
      <div className="form-alert">
        {loadError} <Link href={ROLES_PATH}>Back to Organisation Roles</Link>
      </div>
    );
  }
  if (!role) return <div className="muted" style={{ padding: 24 }}>Loading…</div>;
  return <EditRoleForm key={role.id} role={role} />;
}

function EditRoleForm({ role }: { role: DynamicRole }) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const isSystem = SYSTEM_ROLE_KEYS.includes(role.key);
  const [form, setForm] = useState({
    name: role.name,
    key: role.key,
    description: role.description ?? "",
    status: role.status,
    sortOrder: role.sortOrder ?? 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || submitting) return;
    // A role still assigned to users can't be made inactive (server re-checks).
    const assigned = role._count?.userRoles ?? 0;
    if (form.status === "inactive" && role.status !== "inactive" && assigned > 0) {
      setError(roleInUseMessage(role.name, assigned, "make it inactive"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/admin/roles/${encodeURIComponent(role.id)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(form),
      });
      setFlash(ROLES_FLASH_KEY, { message: "Role updated successfully" });
      router.push(ROLES_PATH);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
      setSubmitting(false);
    }
  }

  return (
    <FormPage
      eyebrow="Organisations · Organisation Roles"
      title={`Edit role: ${role.name}`}
      subtitle="Update role settings and status — same fields as creation."
      backHref={ROLES_PATH}
      backLabel="Back to Organisation Roles"
    >
      <form className={formPageStyles.panel} onSubmit={handleSubmit}>
        <FormAlert message={error} />

        <FormGrid>
          <Field htmlFor="er-name" label="Role name *" icon="shield">
            <TextInput
              id="er-name"
              required
              icon="shield"
              placeholder="e.g. Senior Property Specialist"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field
            htmlFor="er-key"
            label="Role key / slug"
            note={isSystem ? "(locked for system roles)" : "(System-role keys are locked)"}
            icon="key"
          >
            <TextInput
              id="er-key"
              icon="key"
              placeholder="e.g. senior_property_specialist"
              readOnly={isSystem}
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
            />
          </Field>
        </FormGrid>

        <Field htmlFor="er-scope" label="Scope" icon="building">
          <div id="er-scope">
            <FormNote title={role.scope === "team" ? "👥 Team Scope" : "🏢 Organisation Scope"}>
              Organisation-role scope cannot be switched to the Super Admin console.
            </FormNote>
          </div>
        </Field>

        <Field htmlFor="er-desc" label="Description" icon="document">
          <TextArea
            id="er-desc"
            rows={3}
            placeholder="Describe the responsibilities and access level of this role…"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </Field>

        <FormGrid>
          <Field htmlFor="er-status" label="Status" icon="activity">
            <SelectInput
              id="er-status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "active" | "inactive" }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </SelectInput>
          </Field>
          <Field htmlFor="er-sort" label="Sort order" icon="filter">
            <TextInput
              id="er-sort"
              icon="filter"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
            />
          </Field>
        </FormGrid>

        <FormActions cancelHref={ROLES_PATH} busy={submitting} busyLabel="Saving…" submitLabel="Save Changes" />
      </form>
    </FormPage>
  );
}
