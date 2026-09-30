"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCrmLead } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { setFlash } from "@/lib/flash";
import {
  InventoryBindFields,
  inventoryBindPayload,
  type InventoryBindValue,
} from "@/components/org/inventory-bind-fields";
import {
  Field,
  FormActions,
  FormAlert,
  FormGrid,
  FormPage,
  TextInput,
  formPageStyles,
} from "@/components/forms/form-page";

// Add lead — full page (was AddLeadModal). Same fields, validation and
// createCrmLead payload; used from the Lead Center and a project's Leads tab.

export const LEADS_FLASH_KEY = "orgLeads.flash";

export function AddLeadForm({
  projectId,
  backHref,
  backLabel,
}: {
  /** When set, the lead is bound to this project and the picker is hidden. */
  projectId?: string;
  backHref: string;
  backLabel: string;
}) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedInventory, setSelectedInventory] = useState<InventoryBindValue>(
    projectId ? { kind: "project", id: projectId } : { kind: "none" },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!name.trim() && !phone.trim() && !email.trim()) {
      setError("Enter a name, phone, or email.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const inventory = inventoryBindPayload(selectedInventory);
      await createCrmLead({
        ...inventory,
        formName: "Manual lead",
        source: "crm",
        data: {
          fullName: name.trim(),
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
        },
      });
      setFlash(LEADS_FLASH_KEY, { message: "Lead added" });
      router.push(backHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lead.");
      setSaving(false);
    }
  }

  return (
    <FormPage
      eyebrow="CRM · Leads"
      title="Add lead"
      subtitle="Create a lead in the CRM inbox."
      backHref={backHref}
      backLabel={backLabel}
    >
      <form className={formPageStyles.panel} onSubmit={submit}>
        <FormAlert message={error || null} />

        <Field htmlFor="al-name" label="Name" icon="profile">
          <TextInput
            id="al-name"
            icon="profile"
            value={name}
            placeholder="Lead name"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <FormGrid>
          <Field htmlFor="al-phone" label="Phone" icon="phone">
            <TextInput
              id="al-phone"
              icon="phone"
              value={phone}
              placeholder="Phone number"
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Field htmlFor="al-email" label="Email" icon="mail">
            <TextInput
              id="al-email"
              icon="mail"
              value={email}
              placeholder="Email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
        </FormGrid>

        {!projectId ? (
          <Field htmlFor="al-inventory" label="Project or standalone unit" icon="building">
            <InventoryBindFields
              accessToken={accessToken}
              value={selectedInventory}
              onChange={setSelectedInventory}
              hideLabel
            />
          </Field>
        ) : null}

        <FormActions cancelHref={backHref} busy={saving} busyLabel="Saving…" submitLabel="Save lead" submitIcon="user-plus" />
      </form>
    </FormPage>
  );
}
