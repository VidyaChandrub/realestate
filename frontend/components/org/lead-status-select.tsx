"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { LEAD_STAGE_ORDER, useLeadStages } from "@/lib/lead-stages";
import type { CrmLeadStatus } from "@/lib/types";

/**
 * The note-required confirm dialog for a pipeline status change. Shared by the
 * inline <LeadStatusSelect> dropdown and the lead edit page's "Mark as Lost"
 * quick action — both drive the same status-update path (a note is mandatory
 * and lands on the activity timeline). There is deliberately no second path.
 */
export function StatusNoteModal({
  open,
  fromStatus,
  toStatus,
  onClose,
  onConfirm,
}: {
  open: boolean;
  fromStatus: CrmLeadStatus;
  toStatus: CrmLeadStatus | null;
  onClose: () => void;
  onConfirm: (status: CrmLeadStatus, note: string) => Promise<void>;
}) {
  const { label } = useLeadStages();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!toStatus) return;
    const text = note.trim();
    if (!text) {
      setError("Add a note explaining this status change.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onConfirm(toStatus, text);
      setNote("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!saving) {
          setNote("");
          setError("");
          onClose();
        }
      }}
      title="Update pipeline status"
      description={
        toStatus
          ? `Change from ${label(fromStatus)} to ${label(toStatus)}. A note is required and will appear in activity.`
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
        <button
          className="btn btn-ghost"
          type="button"
          disabled={saving}
          onClick={() => {
            setNote("");
            setError("");
            onClose();
          }}
        >
          Cancel
        </button>
        <button className="btn btn-primary" type="button" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save status"}
        </button>
      </div>
    </Modal>
  );
}

export function LeadStatusSelect({
  value,
  disabled,
  onConfirm,
}: {
  value: CrmLeadStatus;
  disabled?: boolean;
  onConfirm: (status: CrmLeadStatus, note: string) => Promise<void>;
}) {
  const { label, color } = useLeadStages();
  const currentColor = color(value);
  const [pending, setPending] = useState<CrmLeadStatus | null>(null);

  function requestChange(next: CrmLeadStatus) {
    if (next === value || disabled) return;
    setPending(next);
  }

  return (
    <>
      {/* Native <select> can't paint a per-value background, so the stage
          colour shows as a tinted border + text on the control itself. */}
      <select
        className="inp"
        style={{
          width: "auto",
          borderColor: currentColor,
          color: currentColor,
          fontWeight: 600,
        }}
        value={value}
        disabled={disabled}
        onChange={(e) => requestChange(e.target.value as CrmLeadStatus)}
      >
        {LEAD_STAGE_ORDER.map((status) => (
          <option key={status} value={status} style={{ color: "var(--ink)", fontWeight: 400 }}>
            {label(status)}
          </option>
        ))}
      </select>
      <StatusNoteModal
        open={pending != null}
        fromStatus={value}
        toStatus={pending}
        onClose={() => setPending(null)}
        onConfirm={onConfirm}
      />
    </>
  );
}
