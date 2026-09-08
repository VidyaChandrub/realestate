"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { CrmLeadStatus } from "@/lib/types";

export const LEAD_STATUS_LABEL: Record<CrmLeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  follow_up: "Follow-up",
  site_visit: "Site Visit",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

const ALL_STATUSES = Object.keys(LEAD_STATUS_LABEL) as CrmLeadStatus[];

export function LeadStatusSelect({
  value,
  disabled,
  onConfirm,
}: {
  value: CrmLeadStatus;
  disabled?: boolean;
  onConfirm: (status: CrmLeadStatus, note: string) => Promise<void>;
}) {
  const [pending, setPending] = useState<CrmLeadStatus | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function requestChange(next: CrmLeadStatus) {
    if (next === value || disabled) return;
    setPending(next);
    setNote("");
    setError("");
  }

  async function save() {
    if (!pending) return;
    const text = note.trim();
    if (!text) {
      setError("Add a note explaining this status change.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onConfirm(pending, text);
      setPending(null);
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <select
        className="inp"
        style={{ width: "auto" }}
        value={value}
        disabled={disabled}
        onChange={(e) => requestChange(e.target.value as CrmLeadStatus)}
      >
        {ALL_STATUSES.map((status) => (
          <option key={status} value={status}>
            {LEAD_STATUS_LABEL[status]}
          </option>
        ))}
      </select>
      <Modal
        open={pending != null}
        onClose={() => {
          if (!saving) setPending(null);
        }}
        title="Update pipeline status"
        description={
          pending
            ? `Change from ${LEAD_STATUS_LABEL[value]} to ${LEAD_STATUS_LABEL[pending]}. A note is required and will appear in activity.`
            : undefined
        }
        size="sm"
      >
        <div className="field">
          <label htmlFor="pipeline-status-note">Note</label>
          <textarea
            id="pipeline-status-note"
            className="inp"
            rows={4}
            maxLength={2000}
            value={note}
            placeholder="Why is this lead moving to this stage?"
            onChange={(e) => setNote(e.target.value)}
            disabled={saving}
          />
        </div>
        {error ? (
          <div style={{ color: "var(--rose)", fontSize: 13, marginTop: 8 }}>{error}</div>
        ) : null}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <button className="btn btn-ghost" type="button" disabled={saving} onClick={() => setPending(null)}>
            Cancel
          </button>
          <button className="btn btn-primary" type="button" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save status"}
          </button>
        </div>
      </Modal>
    </>
  );
}
