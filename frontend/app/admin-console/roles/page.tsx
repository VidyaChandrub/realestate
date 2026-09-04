"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { DynamicRole } from "@/lib/types";

const ROLE_PRESETS = [
  { name: "Senior Telecaller", key: "senior_telecaller", scope: "team" as const, desc: "Manages lead qualification, calling, and follow-ups" },
  { name: "Sales Team Lead", key: "sales_team_lead", scope: "team" as const, desc: "Oversees sales agent pipeline, assignment, and site visits" },
  { name: "Site Visit Manager", key: "site_visit_manager", scope: "team" as const, desc: "Coordinates property site tours and customer feedback" },
  { name: "Project Admin", key: "project_admin", scope: "organisation" as const, desc: "Manages real estate project listings, units, and inventory" },
];

export default function SuperAdminRolesPage() {
  const router = useRouter();
  const { accessToken, isLoading: authLoading } = useAuth();

  const [roles, setRoles] = useState<DynamicRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    key: "",
    description: "",
    scope: "team" as "organisation" | "team",
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [editingRole, setEditingRole] = useState<DynamicRole | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    status: "active" as "active" | "inactive",
    sortOrder: 0,
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [confirmDeleteState, setConfirmDeleteState] = useState<DynamicRole | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Default permissions configuration modal state
  const [permissionsModalRole, setPermissionsModalRole] = useState<DynamicRole | null>(null);
  const [permissionsData, setPermissionsData] = useState<{
    moduleKey: string;
    label: string;
    description: string;
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canApprove: boolean;
  }[]>([]);
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    if (!authLoading && !accessToken) {
      router.replace("/login");
    }
  }, [authLoading, accessToken, router]);

  const fetchRoles = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    apiFetch<DynamicRole[]>("/admin/roles", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(setRoles)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load roles"))
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    if (!createForm.name) {
      setCreateError("Role name is required");
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await apiFetch("/admin/roles", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(createForm),
      });
      notify("Role created successfully");
      setCreateModalOpen(false);
      setCreateForm({ name: "", key: "", description: "", scope: "team" });
      fetchRoles();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create role");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !editingRole) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      await apiFetch(`/admin/roles/${editingRole.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(editForm),
      });
      notify("Role updated successfully");
      setEditingRole(null);
      fetchRoles();
    } catch (err: any) {
      setEditError(err.message || "Failed to update role");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!accessToken || !confirmDeleteState) return;
    setDeleteBusy(true);
    try {
      await apiFetch(`/admin/roles/${confirmDeleteState.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      notify("Role deleted successfully");
      setConfirmDeleteState(null);
      fetchRoles();
    } catch (err: any) {
      notify(err.message || "Failed to delete role");
    } finally {
      setDeleteBusy(false);
    }
  };

  const openPermissionsModal = async (role: DynamicRole) => {
    if (!accessToken) return;
    setPermissionsModalRole(role);
    setPermLoading(true);
    setPermError(null);
    try {
      const res = await apiFetch<{
        permissions: {
          moduleKey: string;
          label: string;
          description: string;
          canView: boolean;
          canAdd: boolean;
          canEdit: boolean;
          canDelete: boolean;
          canApprove: boolean;
        }[];
      }>(`/admin/roles/${role.id}/permissions`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setPermissionsData(res.permissions || []);
    } catch (err: any) {
      setPermError(err.message || "Failed to load default permissions for role");
    } finally {
      setPermLoading(false);
    }
  };

  const togglePerm = (moduleKey: string, action: "canView" | "canAdd" | "canEdit" | "canDelete" | "canApprove") => {
    setPermissionsData((prev) =>
      prev.map((item) => {
        if (item.moduleKey !== moduleKey) return item;
        const nextVal = !item[action];
        const updated = { ...item, [action]: nextVal };
        // If enabling add, edit, delete, or approve, ensure canView is also true
        if (nextVal && action !== "canView") {
          updated.canView = true;
        }
        // If disabling canView, disable other actions too
        if (!nextVal && action === "canView") {
          updated.canAdd = false;
          updated.canEdit = false;
          updated.canDelete = false;
          updated.canApprove = false;
        }
        return updated;
      }),
    );
  };

  const setAllPerms = (grantAll: boolean, viewOnly: boolean = false) => {
    setPermissionsData((prev) =>
      prev.map((item) => ({
        ...item,
        canView: grantAll || viewOnly,
        canAdd: grantAll && !viewOnly,
        canEdit: grantAll && !viewOnly,
        canDelete: grantAll && !viewOnly,
        canApprove: grantAll && !viewOnly,
      })),
    );
  };

  const handlePermissionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !permissionsModalRole) return;
    setPermSaving(true);
    setPermError(null);
    try {
      await apiFetch(`/admin/roles/${permissionsModalRole.id}/permissions`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          permissions: permissionsData.map((p) => ({
            moduleKey: p.moduleKey,
            canView: p.canView,
            canAdd: p.canAdd,
            canEdit: p.canEdit,
            canDelete: p.canDelete,
            canApprove: p.canApprove,
          })),
        }),
      });
      notify(`Default module permissions updated for ${permissionsModalRole.name}`);
      setPermissionsModalRole(null);
    } catch (err: any) {
      setPermError(err.message || "Failed to save permissions");
    } finally {
      setPermSaving(false);
    }
  };

  const isSystemRole = (key: string) =>
    ["super_admin", "admin", "manager", "sales", "telecaller"].includes(key);

  if (authLoading || !accessToken) return null;

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Icon name="lock" size={14} /> Security & Access</div>
          <h1>Dynamic Roles</h1>
          <div className="sub">
            Manage system and custom roles across the platform. Configured roles can be assigned to organisation members.
          </div>
        </div>
        <div className="actions">
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              setCreateError(null);
              setCreateModalOpen(true);
            }}
          >
            ＋ Create Role
          </button>
        </div>
      </div>

      <Reveal delay={1}>
        <div className="card">
          <div className="card-h">
            <span className="t">Database Roles Catalogue</span>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {loading ? "Loading…" : `${roles.length} total roles`}
            </span>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Role Name</th>
                  <th>Key / Slug</th>
                  <th>Scope</th>
                  <th>Description</th>
                  <th>Assigned Users</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {error ? (
                  <tr>
                    <td colSpan={7} className="muted">{error}</td>
                  </tr>
                ) : loading ? (
                  <tr>
                    <td colSpan={7} className="muted">Loading roles…</td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted">No roles found.</td>
                  </tr>
                ) : (
                  roles.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                        {isSystemRole(r.key) ? (
                          <span className="badge b-gray" style={{ fontSize: 11, marginTop: 2 }}>System Role</span>
                        ) : (
                          <span className="badge b-indigo" style={{ fontSize: 11, marginTop: 2 }}>Custom Role</span>
                        )}
                      </td>
                      <td><code>{r.key}</code></td>
                      <td>
                        <span className="badge b-violet" style={{ textTransform: "capitalize" }}>{r.scope}</span>
                      </td>
                      <td style={{ maxWidth: 260, fontSize: 13, color: "var(--fg-subtle)" }}>
                        {r.description || "—"}
                      </td>
                      <td>{r._count?.userRoles ?? 0} users</td>
                      <td>
                        <span className={`badge ${r.status === "active" ? "b-green" : "b-rose"}`}>
                          {r.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            type="button"
                            style={{ color: "var(--indigo, #4f46e5)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}
                            onClick={() => openPermissionsModal(r)}
                          >
                            <Icon name="shield" size={13} /> Permissions
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            type="button"
                            onClick={() => {
                              setEditingRole(r);
                              setEditForm({
                                name: r.name,
                                description: r.description ?? "",
                                status: r.status,
                                sortOrder: r.sortOrder ?? 0,
                              });
                              setEditError(null);
                            }}
                          >
                            Edit
                          </button>
                          {!isSystemRole(r.key) ? (
                            <button
                              className="btn btn-ghost btn-sm"
                              type="button"
                              style={{ color: "var(--rose, #e11d48)" }}
                              onClick={() => setConfirmDeleteState(r)}
                            >
                              Delete
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
      </Reveal>

      {/* Create Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Custom Role"
        description="Add a new role definition that organisations can assign to their team members."
        size="lg"
      >
        <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {createError ? <div className="form-alert">{createError}</div> : null}

          {/* Quick Presets */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted, #64748b)", marginBottom: 6 }}>
              Quick Presets (Click to pre-fill):
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ROLE_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 12, padding: "3px 10px", background: "var(--surface-2, #f8fafc)", border: "1px solid var(--line, #e2e8f0)" }}
                  onClick={() =>
                    setCreateForm({
                      name: p.name,
                      key: p.key,
                      scope: p.scope,
                      description: p.desc,
                    })
                  }
                >
                  ＋ {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Grid layout for Name & Key */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Role Name *</label>
              <input
                className="inp"
                placeholder="e.g. Senior Property Specialist"
                required
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="field">
              <label>
                Role Key / Slug{" "}
                <span style={{ fontSize: 11, color: "var(--muted, #64748b)", fontWeight: 400 }}>
                  (Auto-generated if empty)
                </span>
              </label>
              <input
                className="inp"
                placeholder="e.g. senior_property_specialist"
                value={createForm.key}
                onChange={(e) => setCreateForm((f) => ({ ...f, key: e.target.value }))}
              />
            </div>
          </div>

          {/* Scope selection as visual cards */}
          <div className="field">
            <label style={{ marginBottom: 6 }}>Role Scope *</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: createForm.scope === "team" ? "2px solid #6366f1" : "1px solid var(--line, #e2e8f0)",
                  background: createForm.scope === "team" ? "rgba(99, 102, 241, 0.05)" : "var(--surface, #fff)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onClick={() => setCreateForm((f) => ({ ...f, scope: "team" }))}
              >
                <div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6, color: createForm.scope === "team" ? "#4f46e5" : "inherit" }}>
                  <span>👥 Team Scope</span>
                  {createForm.scope === "team" ? <span style={{ marginLeft: "auto", fontSize: 11, background: "#6366f1", color: "#fff", padding: "1px 6px", borderRadius: 4 }}>Selected</span> : null}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted, #64748b)", marginTop: 2 }}>
                  Assignable to team members, sales agents, and telecallers.
                </div>
              </div>

              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: createForm.scope === "organisation" ? "2px solid #6366f1" : "1px solid var(--line, #e2e8f0)",
                  background: createForm.scope === "organisation" ? "rgba(99, 102, 241, 0.05)" : "var(--surface, #fff)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onClick={() => setCreateForm((f) => ({ ...f, scope: "organisation" }))}
              >
                <div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6, color: createForm.scope === "organisation" ? "#4f46e5" : "inherit" }}>
                  <span>🏢 Organisation Scope</span>
                  {createForm.scope === "organisation" ? <span style={{ marginLeft: "auto", fontSize: 11, background: "#6366f1", color: "#fff", padding: "1px 6px", borderRadius: 4 }}>Selected</span> : null}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted, #64748b)", marginTop: 2 }}>
                  Organisation-wide scope for admin or executive roles.
                </div>
              </div>
            </div>
          </div>

          <div className="field">
            <label>Description</label>
            <textarea
              className="inp"
              rows={3}
              placeholder="Describe the responsibilities and access level of this role…"
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
            <button className="btn btn-ghost" type="button" onClick={() => setCreateModalOpen(false)} disabled={createSubmitting}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={createSubmitting || !createForm.name.trim()}>
              {createSubmitting ? "Creating…" : "Create Role"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editingRole !== null}
        onClose={() => setEditingRole(null)}
        title={`Edit Role: ${editingRole?.name ?? ""}`}
        description="Update role settings and status."
        size="md"
      >
        <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {editError ? <div className="form-alert">{editError}</div> : null}

          <div className="field">
            <label>Role Name *</label>
            <input
              className="inp"
              required
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="field">
            <label>Description</label>
            <textarea
              className="inp"
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="row2">
            <div className="field">
              <label>Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as "active" | "inactive" }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="field">
              <label>Sort Order</label>
              <input
                className="inp"
                type="number"
                value={editForm.sortOrder}
                onChange={(e) => setEditForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
            <button className="btn btn-ghost" type="button" onClick={() => setEditingRole(null)} disabled={editSubmitting}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={editSubmitting}>
              {editSubmitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Permissions Matrix Modal */}
      <Modal
        open={permissionsModalRole !== null}
        onClose={() => setPermissionsModalRole(null)}
        title={`Default Module Permissions: ${permissionsModalRole?.name ?? ""}`}
        description="Configure default module access and actions granted automatically when this role is assigned to team members across organisations."
        size="lg"
      >
        <form onSubmit={handlePermissionsSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {permError ? <div className="form-alert">{permError}</div> : null}

          {permissionsModalRole?.key === "super_admin" || permissionsModalRole?.key === "admin" ? (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(99, 102, 241, 0.08)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                fontSize: 13,
                color: "var(--fg)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Icon name="shield" size={16} />
              <span>
                <strong>System Note:</strong> The <code>{permissionsModalRole.name}</code> role inherently possesses unrestricted access across all modules and actions.
              </span>
            </div>
          ) : null}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 13, color: "var(--muted, #64748b)" }}>
              Check modules and capabilities that should be available by default:
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 12, padding: "3px 8px" }}
                onClick={() => setAllPerms(true, false)}
                disabled={permLoading || permSaving}
              >
                Grant All
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 12, padding: "3px 8px" }}
                onClick={() => setAllPerms(false, true)}
                disabled={permLoading || permSaving}
              >
                View Only
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 12, padding: "3px 8px", color: "var(--rose, #e11d48)" }}
                onClick={() => setAllPerms(false, false)}
                disabled={permLoading || permSaving}
              >
                Clear All
              </button>
            </div>
          </div>

          <div
            style={{
              maxHeight: "440px",
              overflowY: "auto",
              border: "1px solid var(--line, #e2e8f0)",
              borderRadius: "8px",
            }}
          >
            {permLoading ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
                Loading module permissions…
              </div>
            ) : (
              <table className="tbl" style={{ margin: 0 }}>
                <thead style={{ position: "sticky", top: 0, background: "var(--surface, #fff)", zIndex: 2 }}>
                  <tr>
                    <th style={{ minWidth: 160 }}>Module</th>
                    <th style={{ textAlign: "center", width: 70 }}>View</th>
                    <th style={{ textAlign: "center", width: 70 }}>Add</th>
                    <th style={{ textAlign: "center", width: 70 }}>Edit</th>
                    <th style={{ textAlign: "center", width: 70 }}>Delete</th>
                    <th style={{ textAlign: "center", width: 70 }}>Approve</th>
                  </tr>
                </thead>
                <tbody>
                  {permissionsData.map((item) => (
                    <tr key={item.moduleKey}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{item.label}</div>
                        <div style={{ fontSize: 11.5, color: "var(--muted, #64748b)" }}>
                          {item.description}
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={item.canView}
                          onChange={() => togglePerm(item.moduleKey, "canView")}
                          disabled={permSaving}
                          style={{ cursor: "pointer", width: 16, height: 16 }}
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={item.canAdd}
                          onChange={() => togglePerm(item.moduleKey, "canAdd")}
                          disabled={permSaving}
                          style={{ cursor: "pointer", width: 16, height: 16 }}
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={item.canEdit}
                          onChange={() => togglePerm(item.moduleKey, "canEdit")}
                          disabled={permSaving}
                          style={{ cursor: "pointer", width: 16, height: 16 }}
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={item.canDelete}
                          onChange={() => togglePerm(item.moduleKey, "canDelete")}
                          disabled={permSaving}
                          style={{ cursor: "pointer", width: 16, height: 16 }}
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={item.canApprove}
                          onChange={() => togglePerm(item.moduleKey, "canApprove")}
                          disabled={permSaving}
                          style={{ cursor: "pointer", width: 16, height: 16 }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setPermissionsModalRole(null)}
              disabled={permSaving}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={permSaving || permLoading}
            >
              {permSaving ? "Saving…" : "Save Default Permissions"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        open={confirmDeleteState !== null}
        title={`Delete role '${confirmDeleteState?.name}'?`}
        message="This will permanently delete the custom role definition."
        confirmLabel="Delete Role"
        destructive
        busy={deleteBusy}
        onConfirm={handleDeleteConfirm}
        onClose={() => setConfirmDeleteState(null)}
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
