"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  createPlatformTeamMember,
  deletePlatformTeamMember,
  getPlatformTeam,
  getPlatformTeamRoles,
  updatePlatformTeamMember,
} from "@/lib/api";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { PasswordInput } from "@/components/auth/password-input";
import type { PlatformTeamMember, PlatformTeamRole } from "@/lib/types";
import { PlatformRolesPanel } from "./roles-panel";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  role: "super_admin",
  password: "",
};

function initials(firstName: string | null, lastName: string | null, email: string): string {
  const chars = [firstName?.[0], lastName?.[0]].filter(Boolean).join("");
  if (chars) return chars.toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

function fullName(firstName: string | null, lastName: string | null, email: string): string {
  return [firstName, lastName].filter(Boolean).join(" ") || email;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function SuperAdminAdminsPage() {
  const { accessToken, user } = useAuth();
  const [tab, setTab] = useState<"members" | "roles">("members");
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [permEditing, setPermEditing] = useState(false);

  const [members, setMembers] = useState<PlatformTeamMember[]>([]);
  const [roles, setRoles] = useState<PlatformTeamRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformTeamMember | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<PlatformTeamMember | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const load = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [team, assignable] = await Promise.all([
        getPlatformTeam(),
        getPlatformTeamRoles(),
      ]);
      setMembers(team);
      setRoles(assignable);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load platform team");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      role: roles.find((r) => r.key === "super_admin")?.key ?? roles[0]?.key ?? "super_admin",
    });
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(member: PlatformTeamMember) {
    setEditing(member);
    setForm({
      firstName: member.firstName ?? "",
      lastName: member.lastName ?? "",
      email: member.email,
      phoneNumber: member.phoneNumber ?? "",
      role: member.role?.key ?? "super_admin",
      password: "",
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setFormError("First and last name are required");
      return;
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError("Please enter a valid email address");
      return;
    }
    if (!form.role) {
      setFormError("Select a Super Admin / platform role");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await updatePlatformTeamMember(editing.id, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phoneNumber: form.phoneNumber.trim() || undefined,
          role: form.role,
          ...(form.password.trim() ? { password: form.password.trim() } : {}),
        });
        notify("Platform team member updated");
      } else {
        await createPlatformTeamMember({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phoneNumber: form.phoneNumber.trim() || undefined,
          role: form.role,
          ...(form.password.trim() ? { password: form.password.trim() } : {}),
        });
        notify("Platform team member created — credentials emailed");
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(member: PlatformTeamMember) {
    const next = member.status === "active" ? "disabled" : "active";
    try {
      await updatePlatformTeamMember(member.id, { status: next });
      notify(next === "active" ? "Member re-enabled" : "Member disabled");
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Status update failed");
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleteBusy(true);
    try {
      await deletePlatformTeamMember(confirmDelete.id);
      notify("Member removed");
      setConfirmDelete(null);
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      {permEditing ? null : (
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">
            <Icon name="users" size={14} /> Manage
          </div>
          <h1>Platform Team</h1>
          <div className="sub">Create console users and the platform roles you assign to them — in one place.</div>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" type="button" onClick={() => void load()} disabled={loading}>
            <Icon name="refresh" size={16} />
            <span style={{ marginLeft: 6 }}>Refresh</span>
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => { setTab("roles"); setCreateRoleOpen(true); }}>
            + Create role
          </button>
          <button className="btn btn-primary" type="button" onClick={() => { setTab("members"); openCreate(); }}>
            + Create admin
          </button>
        </div>
      </div>
      )}

      {permEditing ? null : (
      <>
      <div className="help reveal" style={{ marginBottom: 16 }}>
        <Icon name="shield" size={14} /> Create a <b>role</b> (console permissions), then <b>create an admin</b> and assign that role.
        Organisation CRM/project permissions stay under <b>Organisation roles</b>.
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 16,
          background: "var(--surface)",
          border: "1px solid var(--line-2)",
          borderRadius: 12,
          padding: 4,
          width: "fit-content",
        }}
      >
        <button
          type="button"
          className={`btn btn-sm ${tab === "members" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setTab("members")}
        >
          Members
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === "roles" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setTab("roles")}
        >
          Roles
        </button>
      </div>
      </>
      )}

      {error && tab === "members" ? <div className="form-alert" style={{ marginBottom: 16 }}>{error}</div> : null}

      {tab === "roles" || permEditing ? (
        <PlatformRolesPanel
          createOpen={createRoleOpen}
          onCreateOpenChange={setCreateRoleOpen}
          onRolesChanged={() => void load()}
          onPermissionEditing={setPermEditing}
        />
      ) : null}

      {tab === "members" && !permEditing ? (
      <div className="card reveal">
        <div className="card-h">
          <span className="t">Internal team members</span>
          <span className="badge b-gray">{members.length} members</span>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Access</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
                    Loading…
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
                    No team members — create your first Super Admin.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="u">
                        <span className="av">{initials(m.firstName, m.lastName, m.email)}</span>
                        <span>
                          <span className="nm">{fullName(m.firstName, m.lastName, m.email)}</span>
                          <br />
                          <span className="sm">{m.email}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${m.role?.key === "super_admin" ? "b-indigo" : "b-violet"}`}>
                        {m.role?.name ?? "—"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {(m.roles.length ? m.roles : []).map((r) => (
                          <span className="chip" key={r.key}>
                            {r.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${m.status === "active" ? "b-green" : "b-rose"}`}>
                        <span className="dot" style={{ background: "currentColor" }} />
                        {m.status === "active" ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td>{formatDate(m.createdAt)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => openEdit(m)}>
                          Edit
                        </button>
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => void toggleStatus(m)}>
                          {m.status === "active" ? "Disable" : "Enable"}
                        </button>
                        {user?.id !== m.id ? (
                          <button
                            className="btn btn-ghost btn-sm"
                            type="button"
                            onClick={() => setConfirmDelete(m)}
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title={editing ? "Edit platform admin" : "Create platform admin"}
        description="Assign a Super Admin–related platform role. They sign in at /admin-login."
        size="md"
      >
        <form onSubmit={submitForm} style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: "70vh", overflowY: "auto" }}>
          {formError ? <div className="form-alert" style={{ position: "sticky", top: 0, zIndex: 1 }}>{formError}</div> : null}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>First name *</label>
              <input
                className="inp"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label>Last name *</label>
              <input
                className="inp"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="field">
            <label>Email *</label>
            <input
              className="inp"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>

          <div className="field">
            <label>Mobile</label>
            <input
              className="inp"
              value={form.phoneNumber}
              onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              placeholder="Optional"
            />
          </div>

          <div className="field">
            <label>Super Admin / platform role *</label>
            <select
              className="inp"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              required
            >
              {roles.length === 0 ? <option value="super_admin">Super Admin</option> : null}
              {roles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name}
                  {r.key === "super_admin" ? " (full console access)" : ""}
                </option>
              ))}
            </select>
            <div className="hint" style={{ marginTop: 6 }}>
              Create a role on the Roles tab first if you need a custom permission set.
            </div>
          </div>

          <div className="field">
            <label>
              {editing ? "New password" : "Temporary password"}{" "}
              <span style={{ fontWeight: 400, color: "var(--muted)" }}>(auto-generated if empty)</span>
            </label>
            <PasswordInput
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Leave blank to generate"
              autoComplete="new-password"
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <button className="btn btn-ghost" type="button" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Save changes" : "Create admin"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={confirmDelete !== null}
        title="Remove platform team member?"
        message={
          confirmDelete
            ? `${fullName(confirmDelete.firstName, confirmDelete.lastName, confirmDelete.email)} will lose Super Admin console access.`
            : ""
        }
        confirmLabel="Remove"
        destructive
        busy={deleteBusy}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => void handleDelete()}
      />

      {toast ? (
        <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 500 }}>
          <div className="card" style={{ padding: "12px 16px", boxShadow: "var(--sh-lg)" }}>
            {toast}
          </div>
        </div>
      ) : null}
    </>
  );
}
