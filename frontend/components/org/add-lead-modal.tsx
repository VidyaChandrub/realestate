"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { createCrmLead } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  InventoryBindFields,
  inventoryBindPayload,
  type InventoryBindValue,
} from "@/components/org/inventory-bind-fields";
import type { CrmLead } from "@/lib/types";

export function AddLeadModal({
  open,
  onClose,
  onCreated,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (lead: CrmLead) => void;
  projectId?: string;
}) {
  const { accessToken } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedInventory, setSelectedInventory] = useState<InventoryBindValue>(
    projectId ? { kind: "project", id: projectId } : { kind: "none" },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setPhone("");
    setEmail("");
    setSelectedInventory(projectId ? { kind: "project", id: projectId } : { kind: "none" });
    setError("");
  }, [open, projectId]);

  async function submit() {
    if (!name.trim() && !phone.trim() && !email.trim()) {
      setError("Enter a name, phone, or email.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const inventory = inventoryBindPayload(selectedInventory);
      const lead = await createCrmLead({
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
      onCreated(lead);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lead.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add lead" description="Create a lead in the CRM inbox.">
      <div className="stack" style={{ display: "grid", gap: 12 }}>
        <label className="field">
          <span>Name</span>
          <input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="Lead name" />
        </label>
        <label className="field">
          <span>Phone</span>
          <input className="inp" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
        </label>
        <label className="field">
          <span>Email</span>
          <input className="inp" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        </label>
        {!projectId ? (
          <InventoryBindFields
            accessToken={accessToken}
            value={selectedInventory}
            onChange={setSelectedInventory}
          />
        ) : null}
        {error ? <div className="muted" style={{ color: "#b91c1c" }}>{error}</div> : null}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void submit()} disabled={saving}>
            {saving ? "Saving…" : "Save lead"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
