"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { apiFetch, createCrmLead } from "@/lib/api";
import type { CrmLead, ProjectsListResponse } from "@/lib/types";

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
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(projectId ?? "");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setPhone("");
    setEmail("");
    setSelectedProjectId(projectId ?? "");
    setError("");
    if (!projectId) {
      apiFetch<ProjectsListResponse>("/org/projects?page=1&limit=100")
        .then((res) => setProjects(res.data.map((p) => ({ id: p.id, name: p.name }))))
        .catch(() => setProjects([]));
    }
  }, [open, projectId]);

  async function submit() {
    if (!name.trim() && !phone.trim() && !email.trim()) {
      setError("Enter a name, phone, or email.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const lead = await createCrmLead({
        projectId: selectedProjectId || undefined,
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
          <label className="field">
            <span>Project</span>
            <select className="inp" value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
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
