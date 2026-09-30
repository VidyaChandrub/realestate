"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import {
  Field,
  FormActions,
  FormAlert,
  FormGrid,
  FormPage,
  SelectInput,
  TextArea,
  TextInput,
  formPageStyles,
} from "@/components/forms/form-page";
import type { DynamicRole } from "@/lib/types";
import { FLASH_KEY, FLASH_TAB_KEY, LIST_PATH, SUPER_ADMIN_ROLE } from "../../../member-form";

// Edit platform role as a full page (was a modal on the Roles tab). Same
// fields and PATCH request as before: name, key, status, description.

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="form-alert">
      {children} <Link href={LIST_PATH}>Back to Platform Team</Link>
    </div>
  );
}

export default function EditPlatformRolePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { isLoading, hasPermission } = useAuth();
  const canEdit = hasPermission("admin_platform_team", "edit");

  const [role, setRole] = useState<DynamicRole | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || isLoading || !canEdit) return;
    let cancelled = false;
    // No single-role endpoint — the list is small and already what the
    // Roles tab loads.
    apiFetch<DynamicRole[]>("/admin/platform-roles")
      .then((list) => {
        if (cancelled) return;
        const found = list.find((r) => r.id === id);
        if (found) setRole(found);
        else setLoadError("Platform role not found.");
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load platform role");
      });
    return () => {
      cancelled = true;
    };
  }, [id, isLoading, canEdit]);

  if (isLoading) return <div className="muted" style={{ padding: 24 }}>Loading…</div>;
  if (!canEdit) return <Notice>You don&apos;t have permission to edit platform roles.</Notice>;
  if (loadError) return <Notice>{loadError}</Notice>;
  if (!role) return <div className="muted" style={{ padding: 24 }}>Loading…</div>;
  // Mirrors the Roles tab (no Edit on Super Admin) and the backend, which
  // rejects any update to it.
  if (role.key === SUPER_ADMIN_ROLE) return <Notice>The Super Admin role can&apos;t be edited.</Notice>;
  return <EditRoleForm key={role.id} role={role} />;
}

function EditRoleForm({ role }: { role: DynamicRole }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: role.name,
    key: role.key,
    description: role.description ?? "",
    status: role.status,
  });
  const [nameError, setNameError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      await apiFetch(`/admin/platform-roles/${encodeURIComponent(role.id)}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      try {
        sessionStorage.setItem(FLASH_KEY, "Platform role updated");
        sessionStorage.setItem(FLASH_TAB_KEY, "roles");
      } catch {
        // Storage unavailable — the redirect still happens, just without a toast.
      }
      router.push(LIST_PATH);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update role");
      setSubmitting(false);
    }
  }

  return (
    <FormPage
      eyebrow="Platform · Platform Team"
      title={`Edit role: ${role.name}`}
      subtitle="Update this role's name, key, status or description."
      backHref={LIST_PATH}
      backLabel="Back to Platform Team"
    >
      <form className={formPageStyles.panel} onSubmit={handleSubmit} noValidate>
        <FormAlert message={formError} />

        <Field htmlFor="er-name" label="Role name *" icon="shield" error={nameError}>
          <TextInput
            id="er-name"
            icon="shield"
            value={form.name}
            maxLength={100}
            invalid={!!nameError}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }));
              setNameError(undefined);
            }}
          />
        </Field>

        <FormGrid>
          <Field htmlFor="er-key" label="Key" icon="key">
            <TextInput
              id="er-key"
              icon="key"
              value={form.key}
              maxLength={50}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
            />
          </Field>
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
        </FormGrid>

        <Field htmlFor="er-desc" label="Description" icon="document">
          <TextArea
            id="er-desc"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </Field>

        <FormActions cancelHref={LIST_PATH} busy={submitting} busyLabel="Saving…" submitLabel="Save changes" />
      </form>
    </FormPage>
  );
}
