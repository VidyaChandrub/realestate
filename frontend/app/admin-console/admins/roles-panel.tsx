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
  const [permSaving, setPermSaving] = useState(false);
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

  function togglePerm(
    moduleKey: string,
    action: "canView" | "canAdd" | "canEdit" | "canDelete" | "canApprove",
  ) {
    setPermRows((prev) =>
      prev.map((item) => {
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
      }),
    );
  }

  async function savePerms() {
    if (!permRole) return;
    setPermSaving(true);
    setPermError(null);
    try {
      await apiFetch(`/admin/platform-roles/${permRole.id}/permissions`, {
        method: "PUT",
        body: JSON.stringify({
          permissions: permRows.map((p) => ({
            moduleKey: p.moduleKey,
            canView: p.canView,
            canAdd: p.canAdd,
            canEdit: p.canEdit,
            canDelete: p.canDelete,
            canApprove: p.canApprove,
          })),
        }),
      });
      notify(`Console permissions saved for ${permRole.name}`);
      setPermRole(null);
      onPermissionEditing?.(false);
    } catch (err) {
      setPermError(err instanceof Error ? err.message : "Failed to save permissions");
    } finally {
      setPermSaving(false);
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
            <button className="btn btn-ghost" type="button" onClick={() => { setPermRole(null); onPermissionEditing?.(false); }} disabled={permSaving}>
              ← Back
            </button>
            {!locked ? (
              <button className="btn btn-primary" type="button" onClick={() => void savePerms()} disabled={permSaving || permLoading}>
                {permSaving ? "Saving…" : "Save permissions"}
              </button>
            ) : null}
          </div>
        </div>
        {permError ? <div className="form-alert">{permError}</div> : null}
        {locked ? (
          <div className="help" style={{ marginBottom: 16 }}>
            Super Admin always has full console access. This matrix cannot be reduced.
          </div>
        ) : null}
        <div className="card">
          <div className="tbl-wrap">
            {permLoading ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>Loading…</div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Console module</th>
                    <th style={{ textAlign: "center" }}>View</th>
                    <th style={{ textAlign: "center" }}>Add</th>
                    <th style={{ textAlign: "center" }}>Edit</th>
                    <th style={{ textAlign: "center" }}>Delete</th>
                    <th style={{ textAlign: "center" }}>Approve</th>
                  </tr>
                </thead>
                <tbody>
                  {permRows.map((item) => (
                    <tr key={item.moduleKey}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.label}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{item.description}</div>
                      </td>
                      {(["canView", "canAdd", "canEdit", "canDelete", "canApprove"] as const).map((action) => (
                        <td key={action} style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={locked ? true : item[action]}
                            disabled={locked || permSaving}
                            onChange={() => togglePerm(item.moduleKey, action)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
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

      <Modal open={createOpen} onClose={() => onCreateOpenChange(false)} title="Create platform role" description="This role can be assigned when you create a platform admin. Permissions are Super Admin console modules only." size="md">
        <form onSubmit={createRole} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {createError ? <div className="form-alert">{createError}</div> : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setCreateForm({ name: p.name, key: p.key, description: p.desc })}
              >
                ＋ {p.name}
              </button>
            ))}
          </div>
          <div className="field">
            <label>Role name *</label>
            <input className="inp" required value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="field">
            <label>Key / slug</label>
            <input className="inp" value={createForm.key} onChange={(e) => setCreateForm((f) => ({ ...f, key: e.target.value }))} placeholder="Auto if empty" />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea className="inp" rows={3} value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="help">Scope is locked to 🌐 Platform. Organisation module permissions are not used here.</div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn btn-ghost" type="button" onClick={() => onCreateOpenChange(false)} disabled={createBusy}>Cancel</button>
            <button className="btn btn-primary" type="submit" disabled={createBusy || !createForm.name.trim()}>
              {createBusy ? "Creating…" : "Create role"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={`Edit: ${editing?.name ?? ""}`} size="md">
        <form onSubmit={saveEdit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {editError ? <div className="form-alert">{editError}</div> : null}
          <div className="field">
            <label>Role name *</label>
            <input className="inp" required value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="field">
            <label>Key</label>
            <input className="inp" readOnly={editing?.key === "super_admin"} value={editForm.key} onChange={(e) => setEditForm((f) => ({ ...f, key: e.target.value }))} />
          </div>
          <div className="field">
            <label>Status</label>
            <select className="inp" value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as "active" | "inactive" }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="field">
            <label>Description</label>
            <textarea className="inp" rows={3} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn btn-ghost" type="button" onClick={() => setEditing(null)} disabled={editBusy}>Cancel</button>
            <button className="btn btn-primary" type="submit" disabled={editBusy}> {editBusy ? "Saving…" : "Save"} </button>
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
        <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 500 }}>
          <div className="card" style={{ padding: "12px 16px" }}>{toast}</div>
        </div>
      ) : null}
    </>
  );
}
