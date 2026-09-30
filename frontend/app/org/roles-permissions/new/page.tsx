"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { setFlash } from "@/lib/flash";
import {
  Field,
  FormActions,
  FormAlert,
  FormPage,
  FormSection,
  TextArea,
  TextInput,
  formPageStyles,
} from "@/components/forms/form-page";
import { ORG_ROLES_FLASH_KEY, ORG_ROLES_PATH } from "../roles-shared";

// Create custom organisation role — full page (was the "Create Custom Role"
// modal on Roles & Permissions). Same presets, fields and POST.

const PRESETS = [
  { name: "Senior Telecaller", desc: "Manages lead qualification, calling, and follow-ups" },
  { name: "Sales Team Lead", desc: "Oversees sales agent pipeline, assignment, and site visits" },
  { name: "Site Visit Executive", desc: "Coordinates property site tours and customer feedback" },
  { name: "Accounts & Billing", desc: "Handles customer payment schedules and invoices" },
];

export default function CreateOrgRolePage() {
  const { isLoading, hasPermission } = useAuth();
  if (isLoading) return <div className="muted" style={{ padding: 24 }}>Loading…</div>;
  if (!hasPermission("roles_permissions", "add")) {
    return (
      <div className="form-alert">
        You don&apos;t have permission to create roles. <Link href={ORG_ROLES_PATH}>Back to Roles &amp; Permissions</Link>
      </div>
    );
  }
  return <CreateOrgRoleForm />;
}

function CreateOrgRoleForm() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [creatingRole, setCreatingRole] = useState(false);
  const [createRoleError, setCreateRoleError] = useState<string | null>(null);

  async function handleCreateOrgRole(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !newRoleName.trim() || creatingRole) return;
    setCreatingRole(true);
    setCreateRoleError(null);
    try {
      await apiFetch("/org/permissions/org-roles", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name: newRoleName.trim(), description: newRoleDescription.trim() || undefined }),
      });
      setFlash(ORG_ROLES_FLASH_KEY, { message: `Role '${newRoleName.trim()}' created` });
      router.push(ORG_ROLES_PATH);
    } catch (err) {
      setCreateRoleError(err instanceof Error ? err.message : "Failed to create role.");
      setCreatingRole(false);
    }
  }

  return (
    <FormPage
      eyebrow="Team · Roles & Permissions"
      title="Create custom role"
      subtitle="Add a role specific to your organisation. You can then configure its module permissions in the matrix."
      backHref={ORG_ROLES_PATH}
      backLabel="Back to Roles & Permissions"
    >
      <form className={formPageStyles.panel} onSubmit={handleCreateOrgRole}>
        <FormAlert message={createRoleError} />

        <FormSection title="Quick presets (click to pre-fill)" />
        <div className={formPageStyles.presets}>
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className={formPageStyles.preset}
              aria-pressed={newRoleName === preset.name}
              onClick={() => {
                setNewRoleName(preset.name);
                setNewRoleDescription(preset.desc);
              }}
            >
              <div className={formPageStyles.presetTitle}>＋ {preset.name}</div>
              <div className={formPageStyles.presetDesc}>{preset.desc}</div>
            </button>
          ))}
        </div>

        <FormSection title="Role details" />
        <Field htmlFor="nr-name" label="Role name *" icon="shield">
          <TextInput
            id="nr-name"
            icon="shield"
            required
            autoFocus
            placeholder="e.g. Senior Sales Executive"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
          />
        </Field>
        <Field htmlFor="nr-desc" label="Description" icon="document">
          <TextArea
            id="nr-desc"
            rows={3}
            placeholder="Describe the responsibilities and scope of this custom role…"
            value={newRoleDescription}
            onChange={(e) => setNewRoleDescription(e.target.value)}
          />
        </Field>

        <FormActions
          cancelHref={ORG_ROLES_PATH}
          busy={creatingRole}
          submitDisabled={!newRoleName.trim()}
          busyLabel="Creating…"
          submitLabel="Create Role"
          submitIcon="plus"
        />
      </form>
    </FormPage>
  );
}
