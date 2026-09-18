"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { DynamicRole } from "@/lib/types";

const PRESETS = [
  { name: "Platform Operator", key: "platform_operator", desc: "Day-to-day Super Admin console: organisations, domains, support" },
  { name: "Platform Support", key: "platform_support", desc: "Helps organisations with onboarding, billing, and access issues" },
];

const roleFieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "#475569",
  marginBottom: 6,
};

const roleFieldInput: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  boxSizing: "border-box" as const,
};

export function PlatformRolesPanel({
  createOpen,
  onCreateOpenChange,
  onRolesChanged,
  onPermissionEditing,
}: {
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  onRolesChanged?: () => void;
  onPermissionEditing?: (active: boolean) => void;
}) {
  const { accessToken } = useAuth();
  const [roles, setRoles] = useState<DynamicRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [createForm, setCreateForm] = useState({ name: "", key: "", description: "" });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);

  const [editing, setEditing] = useState<DynamicRole | null>(null);
  const [editForm, setEditForm] = useState({ name: "", key: "", description: "", status: "active" as "active" | "inactive" });
  const [editError, setEditError] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<DynamicRole | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [permRole, setPermRole] = useState<DynamicRole | null>(null);
  const [permRows, setPermRows] = useState<{
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
  const [savingPermission, setSavingPermission] = useState<string | null>(null);
  const [permError, setPermError] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const load = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    apiFetch<DynamicRole[]>("/admin/platform-roles")
      .then(setRoles)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load platform roles"))
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (createOpen) setCreateError(null);
  }, [createOpen]);

  const visible = useMemo(
    () =>
      roles.filter(
        (r) =>
          !search.trim() ||
          r.name.toLowerCase().includes(search.trim().toLowerCase()) ||
          r.key.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [roles, search],
  );

  async function createRole(e: React.FormEvent) {
    e.preventDefault();
    setCreateBusy(true);
    setCreateError(null);
    try {
      await apiFetch("/admin/platform-roles", {
        method: "POST",
        body: JSON.stringify({
          name: createForm.name,
          key: createForm.key || undefined,
          description: createForm.description,
        }),
      });
      notify("Platform role created");
      onCreateOpenChange(false);
      setCreateForm({ name: "", key: "", description: "" });
      load();
      onRolesChanged?.();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create role");
    } finally {
      setCreateBusy(false);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditBusy(true);
    setEditError(null);
    try {
      await apiFetch(`/admin/platform-roles/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify(editForm),
      });
      notify("Platform role updated");
      setEditing(null);
      load();
      onRolesChanged?.();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setEditBusy(false);
    }
  }

  async function openPerms(role: DynamicRole) {
    setPermRole(role);
    onPermissionEditing?.(true);
    setPermLoading(true);
    setPermError(null);
    try {
      const res = await apiFetch<{ permissions: typeof permRows }>(
        `/admin/platform-roles/${role.id}/permissions`,
      );
      setPermRows(res.permissions || []);
    } catch (err) {
      setPermError(err instanceof Error ? err.message : "Failed to load permissions");
    } finally {
      setPermLoading(false);
    }
  }

  async function togglePerm(
    moduleKey: string,
    action: "canView" | "canAdd" | "canEdit" | "canDelete" | "canApprove",
  ) {
    if (!permRole || permRole.key === "super_admin") return;
    const permissionKey = `${moduleKey}:${action}`;
    const nextRows = permRows.map((item) => {
      if (item.moduleKey !== moduleKey) return item;
      const nextVal = !item[action];
      const updated = { ...item, [action]: nextVal };
      if (nextVal && action !== "canView") updated.canView = true;
      if (!nextVal && action === "canView") {
        updated.canAdd = false;
        updated.canEdit = false;
        updated.canDelete = false;
        updated.canApprove = false;
      }
      return updated;
    });
    const nextValue = nextRows.find((item) => item.moduleKey === moduleKey)?.[action] ?? false;
    const moduleLabel = nextRows.find((item) => item.moduleKey === moduleKey)?.label ?? "module";

    await savePermissionRows(nextRows, permissionKey, `${action.replace("can", "")} permission ${nextValue ? "enabled" : "removed"} for ${moduleLabel}`);
  }

  async function setModulePermissions(moduleKey: string, enabled: boolean) {
    if (!permRole || permRole.key === "super_admin") return;
    const item = permRows.find((row) => row.moduleKey === moduleKey);
    if (!item) return;
    const nextRows = permRows.map((row) =>
      row.moduleKey === moduleKey
        ? { ...row, canView: enabled, canAdd: enabled, canEdit: enabled, canDelete: enabled, canApprove: enabled }
        : row,
    );
    await savePermissionRows(
      nextRows,
      `${moduleKey}:all`,
      `${item.label} permissions ${enabled ? "enabled" : "removed"}`,
    );
  }

  async function savePermissionRows(
    nextRows: typeof permRows,
    permissionKey: string,
    successMessage: string,
  ) {
    if (!permRole) return;
    const previousRows = permRows;
    setPermRows(nextRows);
    setSavingPermission(permissionKey);
    setPermError(null);
    try {
      await apiFetch(`/admin/platform-roles/${permRole.id}/permissions`, {
        method: "PUT",
        body: JSON.stringify({
          permissions: nextRows.map((p) => ({
            moduleKey: p.moduleKey,
            canView: p.canView,
            canAdd: p.canAdd,
            canEdit: p.canEdit,
            canDelete: p.canDelete,
            canApprove: p.canApprove,
          })),
        }),
      });
      notify(successMessage);
    } catch (err) {
      setPermRows(previousRows);
      notify(err instanceof Error ? err.message : "Failed to update permission");
    } finally {
      setSavingPermission(null);
    }
  }

  async function removeRole() {
    if (!confirmDelete) return;
    setDeleteBusy(true);
    try {
      await apiFetch(`/admin/platform-roles/${confirmDelete.id}`, { method: "DELETE" });
      notify("Platform role deleted");
      setConfirmDelete(null);
      load();
      onRolesChanged?.();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleteBusy(false);
    }
  }

  if (!accessToken) return null;

  if (permRole) {
    const locked = permRole.key === "super_admin";
    return (
      <>
        <div className="page-head reveal in">
          <div>
            <div className="eyebrow"><Icon name="lock" size={14} /> Platform console</div>
            <h1>Permissions: {permRole.name}</h1>
            <div className="sub">Super Admin console modules only — these are not organisation CRM/project permissions.</div>
          </div>
          <div className="actions">
            <button className="btn btn-ghost" type="button" onClick={() => { setPermRole(null); onPermissionEditing?.(false); }} disabled={savingPermission !== null}>
              ← Back
            </button>
          </div>
        </div>
        {permError ? <div className="form-alert">{permError}</div> : null}
        {locked ? (
          <div className="help" style={{ marginBottom: 16 }}>
            Super Admin always has full console access. This matrix cannot be reduced.
          </div>
        ) : null}
        <div className="card">
          <div className="platform-permissions-list">
            {permLoading ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>Loading…</div>
            ) : (
              <div>
                <div className="platform-permissions-heading">
                  <span>Console module</span>
                  <span>Permissions</span>
                </div>
                {permRows.map((item) => (
                  <div className="platform-permission-row" key={item.moduleKey}>
                    <div className="platform-permission-module">
                      <div style={{ fontWeight: 700 }}>{item.label}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{item.description}</div>
                    </div>
                    <div className="platform-permission-actions">
                      {(item.moduleKey === "admin_organisations"
                        ? [
                            { key: "canView", permission: "canView", label: "View" },
                            { key: "activate", permission: "canAdd", label: "Activate" },
                            { key: "deactivate", permission: "canApprove", label: "Deactivate" },
                            { key: "canEdit", permission: "canEdit", label: "Edit" },
                            { key: "canDelete", permission: "canDelete", label: "Delete" },
                          ]
                        : [
                            { key: "canView", permission: "canView", label: "View" },
                            { key: "canAdd", permission: "canAdd", label: "Add" },
                            { key: "canEdit", permission: "canEdit", label: "Edit" },
                            { key: "canDelete", permission: "canDelete", label: "Delete" },
                            { key: "canApprove", permission: "canApprove", label: "Approve" },
                          ]
                      ).map(({ key, permission, label }) => {
                        const enabled = locked || item[permission as keyof typeof item];
                        return (
                          <button
                            className={`platform-permission-pill${enabled ? " is-enabled" : ""}`}
                            key={key}
                            type="button"
                            disabled={locked || savingPermission !== null}
                            onClick={() => void togglePerm(item.moduleKey, permission as "canView" | "canAdd" | "canEdit" | "canDelete" | "canApprove")}
                            aria-pressed={enabled}
                            aria-label={`${label} permission for ${item.label}`}
                          >
                            <span className="platform-permission-dot" aria-hidden="true" />
                            {label}
                          </button>
                        );
                      })}
                      <span className="platform-permission-separator" aria-hidden="true" />
                      <button
                        className="platform-permission-bulk"
                        type="button"
                        disabled={locked || savingPermission !== null}
                        onClick={() => void setModulePermissions(item.moduleKey, true)}
                      >
                        All
                      </button>
                      <button
                        className="platform-permission-bulk"
                        type="button"
                        disabled={locked || savingPermission !== null}
                        onClick={() => void setModulePermissions(item.moduleKey, false)}
                      >
                        None
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {toast ? (
          <div className="platform-permission-toast" role="status">
            <span className="platform-permission-toast-icon" aria-hidden="true">✓</span>
            <span>{toast}</span>
            <button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification">×</button>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      {error ? <div className="form-alert">{error}</div> : null}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input className="inp" placeholder="Search roles…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 240 }} />
        <span className="muted" style={{ alignSelf: "center", fontSize: 12 }}>{loading ? "Loading…" : `${visible.length} roles`}</span>
      </div>

      <Reveal delay={1}>
        <div className="card">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Scope</th>
                  <th>Status</th>
                  <th>Assigned</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted" style={{ textAlign: "center", padding: 24 }}>
                      No platform roles yet.
                    </td>
                  </tr>
                ) : visible.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{r.key}{r.description ? ` · ${r.description}` : ""}</div>
                    </td>
                    <td><span className="badge b-indigo">Platform</span></td>
                    <td><span className={`badge ${r.status === "active" ? "b-green" : "b-rose"}`}>{r.status}</span></td>
                    <td>{r._count?.userRoles ?? 0}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => void openPerms(r)}>
                          Permissions
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          type="button"
                          onClick={() => {
                            setEditing(r);
                            setEditForm({
                              name: r.name,
                              key: r.key,
                              description: r.description ?? "",
                              status: r.status,
                            });
                            setEditError(null);
                          }}
                        >
                          Edit
                        </button>
                        {r.key !== "super_admin" ? (
                          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setConfirmDelete(r)}>
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>

      <Modal open={createOpen} onClose={() => onCreateOpenChange(false)} title="Create platform role" description="Define a new role that can be assigned to platform admins." size="md">
        <form onSubmit={createRole} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {createError ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 10,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 20,
              }}
            >
              {createError}
            </div>
          ) : null}

          {/* Quick presets */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Quick start
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setCreateForm({ name: p.name, key: p.key, description: p.desc })}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: createForm.key === p.key ? "1.5px solid #4f46e5" : "1px solid #e2e8f0",
                    background: createForm.key === p.key ? "#eef2ff" : "#ffffff",
                    color: createForm.key === p.key ? "#4f46e5" : "#475569",
                    fontSize: 12.5,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    textAlign: "left" as const,
                    lineHeight: 1.4,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: createForm.key === p.key ? "#6366f1" : "#94a3b8" }}>
                    {p.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: "#f1f5f9", margin: "0 0 20px" }} />

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={roleFieldLabel}>Role name *</label>
              <input
                style={roleFieldInput}
                required
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Platform Operator"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={roleFieldLabel}>Key / slug</label>
                <input
                  style={roleFieldInput}
                  value={createForm.key}
                  onChange={(e) => setCreateForm((f) => ({ ...f, key: e.target.value }))}
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                    color: "#64748b",
                  }}
                >
                  <span style={{ fontSize: 14 }}>🌐</span>
                  Platform scope
                </div>
              </div>
            </div>
            <div>
              <label style={roleFieldLabel}>Description</label>
              <textarea
                style={{ ...roleFieldInput, minHeight: 72, resize: "vertical" as const }}
                rows={3}
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What does this role do?"
              />
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 24,
              paddingTop: 18,
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <button
              type="button"
              onClick={() => onCreateOpenChange(false)}
              disabled={createBusy}
              style={{
                padding: "9px 18px",
                borderRadius: 10,
                fontSize: 13.5,
                fontWeight: 500,
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                color: "#475569",
                cursor: createBusy ? "not-allowed" : "pointer",
                opacity: createBusy ? 0.5 : 1,
                transition: "all 0.15s ease",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createBusy || !createForm.name.trim()}
              style={{
                padding: "9px 20px",
                borderRadius: 10,
                fontSize: 13.5,
                fontWeight: 600,
                border: "none",
                color: "#ffffff",
                cursor: createBusy || !createForm.name.trim() ? "not-allowed" : "pointer",
                opacity: createBusy || !createForm.name.trim() ? 0.5 : 1,
                transition: "all 0.15s ease",
                background: "linear-gradient(135deg, #4f46e5, #4338ca)",
                boxShadow: "0 2px 8px -2px rgba(79, 70, 229, 0.4)",
              }}
            >
              {createBusy ? "Creating…" : "Create role"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={`Edit: ${editing?.name ?? ""}`} size="md">
        <form onSubmit={saveEdit} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {editError ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 10,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 20,
              }}
            >
              {editError}
            </div>
          ) : null}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={roleFieldLabel}>Role name *</label>
              <input
                style={roleFieldInput}
                required
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={roleFieldLabel}>Key</label>
                <input
                  style={roleFieldInput}
                  readOnly={editing?.key === "super_admin"}
                  value={editForm.key}
                  onChange={(e) => setEditForm((f) => ({ ...f, key: e.target.value }))}
                />
              </div>
              <div>
                <label style={roleFieldLabel}>Status</label>
                <select
                  style={roleFieldInput}
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as "active" | "inactive" }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div>
              <label style={roleFieldLabel}>Description</label>
              <textarea
                style={{ ...roleFieldInput, minHeight: 72, resize: "vertical" as const }}
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 24,
              paddingTop: 18,
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <button
              type="button"
              onClick={() => setEditing(null)}
              disabled={editBusy}
              style={{
                padding: "9px 18px",
                borderRadius: 10,
                fontSize: 13.5,
                fontWeight: 500,
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                color: "#475569",
                cursor: editBusy ? "not-allowed" : "pointer",
                opacity: editBusy ? 0.5 : 1,
                transition: "all 0.15s ease",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editBusy}
              style={{
                padding: "9px 20px",
                borderRadius: 10,
                fontSize: 13.5,
                fontWeight: 600,
                border: "none",
                color: "#ffffff",
                cursor: editBusy ? "not-allowed" : "pointer",
                opacity: editBusy ? 0.5 : 1,
                transition: "all 0.15s ease",
                background: "linear-gradient(135deg, #4f46e5, #4338ca)",
                boxShadow: "0 2px 8px -2px rgba(79, 70, 229, 0.4)",
              }}
            >
              {editBusy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={confirmDelete !== null}
        title={`Delete '${confirmDelete?.name}'?`}
        message="This platform role will be removed. Organisation roles are not affected."
        confirmLabel="Delete"
        destructive
        busy={deleteBusy}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => void removeRole()}
      />

      {toast ? (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 500 }}>
          <div
            className="card"
            role="status"
            style={{
              padding: "12px 16px",
              borderLeft: "3px solid #10b981",
              boxShadow: "var(--sh-lg)",
              background: "#ffffff",
            }}
          >
            {toast}
          </div>
        </div>
      ) : null}
    </>
  );
}
