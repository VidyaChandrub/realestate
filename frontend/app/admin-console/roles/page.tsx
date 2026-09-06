"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
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

function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line-2)",
        borderRadius: 14,
        padding: "14px 16px",
        minWidth: 0,
      }}
    >
      <div
        style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          fontFamily: "monospace",
          color: accent ?? "var(--ink)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      {sub ? (
        <div
          className="muted"
          style={{ fontSize: 11.5, marginTop: 4, wordBreak: "break-word" }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
}

export default function SuperAdminRolesPage() {
  const router = useRouter();
  const { accessToken, isLoading: authLoading } = useAuth();

  const [roles, setRoles] = useState<DynamicRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [scopeFilter, setScopeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

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
    key: "",
    description: "",
    scope: "organisation" as "organisation" | "team",
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

  const SYSTEM_KEYS = ["super_admin", "admin", "manager", "sales", "telecaller"];
  const isSystemRole = (key: string) => SYSTEM_KEYS.includes(key);

  const stats = useMemo(() => {
    let system = 0;
    let custom = 0;
    let assigned = 0;
    for (const r of roles) {
      if (isSystemRole(r.key)) system++;
      else custom++;
      assigned += r._count?.userRoles ?? 0;
    }
    return { total: roles.length, system, custom, assigned };
  }, [roles]);

  const visible = useMemo(
    () =>
      roles.filter(
        (r) =>
          (!scopeFilter || r.scope === scopeFilter) &&
          (!statusFilter || r.status === statusFilter) &&
          (!search.trim() ||
            r.name.toLowerCase().includes(search.trim().toLowerCase()) ||
            r.key.toLowerCase().includes(search.trim().toLowerCase()) ||
            (r.description ?? "").toLowerCase().includes(search.trim().toLowerCase())),
      ),
    [roles, scopeFilter, statusFilter, search],
  );

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

  if (authLoading || !accessToken) return null;

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Icon name="lock" size={14} /> Security & Access</div>
          <h1>Role</h1>
          <div className="sub">
            Manage system and custom roles across the platform. Configured roles can be assigned to organisation members.
          </div>
        </div>
        <div className="actions">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => void fetchRoles()}
            disabled={loading}
            title="Refresh"
          >
            <Icon name="refresh" size={16} />
            <span style={{ marginLeft: 6 }}>Refresh</span>
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              setCreateError(null);
              setCreateModalOpen(true);
            }}
          >
            <Icon name="plus" size={16} />
            <span style={{ marginLeft: 6 }}>Create Role</span>
          </button>
        </div>
      </div>

      {permissionsModalRole ? (
        <Reveal delay={1}>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-h" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPermissionsModalRole(null)}
                  disabled={permSaving}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  ← Back to Role
                </button>
                <div style={{ height: 18, width: 1, background: "var(--line, #e2e8f0)" }} />
                <span className="t" style={{ fontSize: 16 }}>
                  Default Permissions: <strong>{permissionsModalRole.name}</strong>
                </span>
                <span className="badge b-indigo" style={{ textTransform: "capitalize" }}>
                  {permissionsModalRole.scope}
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => setPermissionsModalRole(null)}
                  disabled={permSaving}
                >
                  Cancel
                </button>
                {permissionsModalRole.key !== "super_admin" ? (
                  <button
                    className="btn btn-primary btn-sm"
                    type="button"
                    onClick={handlePermissionsSubmit}
                    disabled={permSaving || permLoading}
                  >
                    {permSaving ? "Saving…" : "Save Default Permissions"}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {permError ? <div className="form-alert">{permError}</div> : null}

              {permissionsModalRole.key === "super_admin" || permissionsModalRole.key === "admin" ? (
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
                  Configure module access and action capabilities granted by default for this role:
                </div>
                {permissionsModalRole.key !== "super_admin" ? (
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
                ) : null}
              </div>

              <div
                style={{
                  border: "1px solid var(--line, #e2e8f0)",
                  borderRadius: "8px",
                  overflowX: "auto",
                }}
              >
                {permLoading ? (
                  <div style={{ padding: 36, textAlign: "center", color: "var(--muted)" }}>
                    Loading module permissions…
                  </div>
                ) : (
                  <table className="tbl" style={{ margin: 0 }}>
                    <thead style={{ position: "sticky", top: 0, background: "var(--surface, #fff)", zIndex: 2 }}>
                      <tr>
                        <th style={{ minWidth: 200 }}>Module</th>
                        <th style={{ textAlign: "center", width: 90 }}>View</th>
                        <th style={{ textAlign: "center", width: 90 }}>Add</th>
                        <th style={{ textAlign: "center", width: 90 }}>Edit</th>
                        <th style={{ textAlign: "center", width: 90 }}>Delete</th>
                        <th style={{ textAlign: "center", width: 90 }}>Approve</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permissionsData.map((item) => (
                        <tr key={item.moduleKey}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{item.label}</div>
                            <div style={{ fontSize: 12, color: "var(--muted, #64748b)" }}>
                              {item.description}
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={permissionsModalRole.key === "super_admin" ? true : item.canView}
                              onChange={() => togglePerm(item.moduleKey, "canView")}
                              disabled={permSaving || permissionsModalRole.key === "super_admin"}
                              style={{ cursor: permissionsModalRole.key === "super_admin" ? "not-allowed" : "pointer", width: 18, height: 18 }}
                            />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={permissionsModalRole.key === "super_admin" ? true : item.canAdd}
                              onChange={() => togglePerm(item.moduleKey, "canAdd")}
                              disabled={permSaving || permissionsModalRole.key === "super_admin"}
                              style={{ cursor: permissionsModalRole.key === "super_admin" ? "not-allowed" : "pointer", width: 18, height: 18 }}
                            />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={permissionsModalRole.key === "super_admin" ? true : item.canEdit}
                              onChange={() => togglePerm(item.moduleKey, "canEdit")}
                              disabled={permSaving || permissionsModalRole.key === "super_admin"}
                              style={{ cursor: permissionsModalRole.key === "super_admin" ? "not-allowed" : "pointer", width: 18, height: 18 }}
                            />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={permissionsModalRole.key === "super_admin" ? true : item.canDelete}
                              onChange={() => togglePerm(item.moduleKey, "canDelete")}
                              disabled={permSaving || permissionsModalRole.key === "super_admin"}
                              style={{ cursor: permissionsModalRole.key === "super_admin" ? "not-allowed" : "pointer", width: 18, height: 18 }}
                            />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={permissionsModalRole.key === "super_admin" ? true : item.canApprove}
                              onChange={() => togglePerm(item.moduleKey, "canApprove")}
                              disabled={permSaving || permissionsModalRole.key === "super_admin"}
                              style={{ cursor: permissionsModalRole.key === "super_admin" ? "not-allowed" : "pointer", width: 18, height: 18 }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
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
                  type="button"
                  onClick={handlePermissionsSubmit}
                  disabled={permSaving || permLoading}
                >
                  {permSaving ? "Saving…" : "Save Default Permissions"}
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      ) : null}

      {/* Summary strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <StatTile label="Total roles" value={stats.total} />
        <StatTile label="System roles" value={stats.system} accent="#4f46e5" />
        <StatTile
          label="Custom roles"
          value={stats.custom}
          accent={stats.custom ? "#10b981" : "var(--ink)"}
        />
        <StatTile label="Assigned users" value={stats.assigned} />
      </div>

      {/* Filter + search toolbar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            background: "var(--surface)",
            border: "1px solid var(--line-2)",
            borderRadius: 12,
            padding: 4,
          }}
        >
          {["", "platform", "organisation", "team"].map((s) => (
            <button
              key={s || "all-scope"}
              className={`btn ${scopeFilter === s ? "btn-primary" : "btn-ghost"} btn-sm`}
              onClick={() => setScopeFilter(s)}
            >
              {s === "organisation"
                ? "Organisation"
                : s === "platform"
                  ? "Platform"
                  : s || "All scopes"}
            </button>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            background: "var(--surface)",
            border: "1px solid var(--line-2)",
            borderRadius: 12,
            padding: 4,
          }}
        >
          {["", "active", "inactive"].map((s) => (
            <button
              key={s || "all-status"}
              className={`btn ${statusFilter === s ? "btn-primary" : "btn-ghost"} btn-sm`}
              onClick={() => setStatusFilter(s)}
            >
              {s || "All statuses"}
            </button>
          ))}
        </div>
        <input
          className="inp"
          placeholder="Search roles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 200, height: 34, fontSize: 13 }}
        />
        <span
          className="muted"
          style={{ marginLeft: "auto", alignSelf: "center", fontSize: 12 }}
        >
          {loading ? "Loading…" : `${visible.length} of ${roles.length} roles`}
        </span>
      </div>

      <Reveal delay={1}>
        <div className="card">
          <div className="card-h">
            <span className="t">Role Catalogue</span>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {loading ? "Loading…" : `${visible.length} roles`}
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
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted">No roles match the current filters.</td>
                  </tr>
                ) : (
                  visible.map((r) => (
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
                          {r.key === "super_admin" ? (
                            <button
                              className="btn btn-ghost btn-sm"
                              type="button"
                              disabled
                              title="Super Admin possesses full system access and permissions cannot be altered"
                              style={{
                                color: "var(--muted, #94a3b8)",
                                cursor: "not-allowed",
                                opacity: 0.65,
                                fontWeight: 500,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Icon name="lock" size={13} /> Full Access (Locked)
                            </button>
                          ) : (
                            <button
                              className="btn btn-ghost btn-sm"
                              type="button"
                              style={{ color: "var(--indigo, #4f46e5)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}
                              onClick={() => openPermissionsModal(r)}
                            >
                              <Icon name="shield" size={13} /> Permissions
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-sm"
                            type="button"
                            onClick={() => {
                              setEditingRole(r);
                              setEditForm({
                                name: r.name,
                                key: r.key,
                                description: r.description ?? "",
                                scope: r.scope === "organisation" ? "organisation" : "team",
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
                              style={{ color: "var(--rose, #e11d48)", fontWeight: 500 }}
                              onClick={() => setConfirmDeleteState(r)}
                            >
                              Delete
                            </button>
                          ) : (
                            <button
                              className="btn btn-ghost btn-sm"
                              type="button"
                              disabled
                              title="System roles are core platform presets and cannot be deleted"
                              style={{ color: "var(--muted, #94a3b8)", cursor: "not-allowed", opacity: 0.5 }}
                            >
                              Delete
                            </button>
                          )}
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
        <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: 18, background: "#ffffff", padding: "4px 0" }}>
          {createError ? <div className="form-alert">{createError}</div> : null}

          {/* Quick Presets with fresh light styling */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span>✨ Quick Presets</span>
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>(Click to pre-fill)</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ROLE_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    padding: "5px 12px",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    color: "#334155",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#6366f1";
                    e.currentTarget.style.color = "#4f46e5";
                    e.currentTarget.style.background = "#eef2ff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.color = "#334155";
                    e.currentTarget.style.background = "#ffffff";
                  }}
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="field">
              <label style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>Role Name *</label>
              <input
                className="inp"
                style={{
                  background: "#ffffff",
                  borderColor: "#cbd5e1",
                  color: "#0f172a",
                }}
                placeholder="e.g. Senior Property Specialist"
                required
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="field">
              <label style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>
                Role Key / Slug{" "}
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>
                  (Auto-generated if empty)
                </span>
              </label>
              <input
                className="inp"
                style={{
                  background: "#ffffff",
                  borderColor: "#cbd5e1",
                  color: "#0f172a",
                }}
                placeholder="e.g. senior_property_specialist"
                value={createForm.key}
                onChange={(e) => setCreateForm((f) => ({ ...f, key: e.target.value }))}
              />
            </div>
          </div>

          {/* Scope selection as light, clean visual cards */}
          <div className="field">
            <label style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>Role Scope *</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "12px",
                  border: createForm.scope === "team" ? "2px solid #6366f1" : "1px solid #e2e8f0",
                  background: createForm.scope === "team" ? "#f5f7ff" : "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: createForm.scope === "team" ? "0 2px 8px rgba(99, 102, 241, 0.12)" : "0 1px 2px rgba(0,0,0,0.02)",
                }}
                onClick={() => setCreateForm((f) => ({ ...f, scope: "team" }))}
              >
                <div style={{ fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6, color: createForm.scope === "team" ? "#4338ca" : "#1e293b" }}>
                  <span>👥 Team Scope</span>
                  {createForm.scope === "team" ? (
                    <span style={{ marginLeft: "auto", fontSize: 11, background: "#e0e7ff", color: "#4338ca", fontWeight: 600, padding: "2px 8px", borderRadius: 6 }}>
                      Selected
                    </span>
                  ) : null}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  Assignable to team members, sales agents, and telecallers.
                </div>
              </div>

              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "12px",
                  border: createForm.scope === "organisation" ? "2px solid #6366f1" : "1px solid #e2e8f0",
                  background: createForm.scope === "organisation" ? "#f5f7ff" : "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: createForm.scope === "organisation" ? "0 2px 8px rgba(99, 102, 241, 0.12)" : "0 1px 2px rgba(0,0,0,0.02)",
                }}
                onClick={() => setCreateForm((f) => ({ ...f, scope: "organisation" }))}
              >
                <div style={{ fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6, color: createForm.scope === "organisation" ? "#4338ca" : "#1e293b" }}>
                  <span>🏢 Organisation Scope</span>
                  {createForm.scope === "organisation" ? (
                    <span style={{ marginLeft: "auto", fontSize: 11, background: "#e0e7ff", color: "#4338ca", fontWeight: 600, padding: "2px 8px", borderRadius: 6 }}>
                      Selected
                    </span>
                  ) : null}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  Organisation-wide scope for admin or executive roles.
                </div>
              </div>
            </div>
          </div>

          <div className="field">
            <label style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>Description</label>
            <textarea
              className="inp"
              style={{
                background: "#ffffff",
                borderColor: "#cbd5e1",
                color: "#0f172a",
              }}
              rows={3}
              placeholder="Describe the responsibilities and access level of this role…"
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
            <button className="btn btn-ghost" type="button" onClick={() => setCreateModalOpen(false)} disabled={createSubmitting}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={createSubmitting || !createForm.name.trim()}
              style={{ padding: "8px 20px" }}
            >
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
        description="Update role settings, scope, and status — same fields as creation."
        size="md"
      >
        <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {editError ? <div className="form-alert">{editError}</div> : null}

          {/* Grid layout for Name & Key */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="field">
              <label style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>Role Name *</label>
              <input
                className="inp"
                style={{
                  background: "#ffffff",
                  borderColor: "#cbd5e1",
                  color: "#0f172a",
                }}
                placeholder="e.g. Senior Property Specialist"
                required
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="field">
              <label style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>
                Role Key / Slug
                {editingRole && isSystemRole(editingRole.key) ? (
                  <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 500, marginLeft: 4 }}>
                    (locked for system roles)
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>(System-role keys are locked)</span>
                )}
              </label>
              <input
                className="inp"
                style={{
                  background: editingRole && isSystemRole(editingRole.key) ? "#f1f5f9" : "#ffffff",
                  borderColor: "#cbd5e1",
                  color: "#0f172a",
                }}
                placeholder="e.g. senior_property_specialist"
                readOnly={editingRole ? isSystemRole(editingRole.key) : false}
                value={editForm.key}
                onChange={(e) => setEditForm((f) => ({ ...f, key: e.target.value }))}
              />
            </div>
          </div>

          {/* Scope selection as light, clean visual cards */}
          <div className="field">
            <label style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>Role Scope *</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "12px",
                  border: editForm.scope === "team" ? "2px solid #6366f1" : "1px solid #e2e8f0",
                  background: editForm.scope === "team" ? "#f5f7ff" : "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: editForm.scope === "team" ? "0 2px 8px rgba(99, 102, 241, 0.12)" : "0 1px 2px rgba(0,0,0,0.02)",
                }}
                onClick={() => setEditForm((f) => ({ ...f, scope: "team" }))}
              >
                <div style={{ fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6, color: editForm.scope === "team" ? "#4338ca" : "#1e293b" }}>
                  <span>👥 Team Scope</span>
                  {editForm.scope === "team" ? (
                    <span style={{ marginLeft: "auto", fontSize: 11, background: "#e0e7ff", color: "#4338ca", fontWeight: 600, padding: "2px 8px", borderRadius: 6 }}>
                      Selected
                    </span>
                  ) : null}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  Assignable to team members, sales agents, and telecallers.
                </div>
              </div>

              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "12px",
                  border: editForm.scope === "organisation" ? "2px solid #6366f1" : "1px solid #e2e8f0",
                  background: editForm.scope === "organisation" ? "#f5f7ff" : "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: editForm.scope === "organisation" ? "0 2px 8px rgba(99, 102, 241, 0.12)" : "0 1px 2px rgba(0,0,0,0.02)",
                }}
                onClick={() => setEditForm((f) => ({ ...f, scope: "organisation" }))}
              >
                <div style={{ fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6, color: editForm.scope === "organisation" ? "#4338ca" : "#1e293b" }}>
                  <span>🏢 Organisation Scope</span>
                  {editForm.scope === "organisation" ? (
                    <span style={{ marginLeft: "auto", fontSize: 11, background: "#e0e7ff", color: "#4338ca", fontWeight: 600, padding: "2px 8px", borderRadius: 6 }}>
                      Selected
                    </span>
                  ) : null}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  Organisation-wide scope for admin or executive roles.
                </div>
              </div>
            </div>
          </div>

          <div className="field">
            <label style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>Description</label>
            <textarea
              className="inp"
              style={{
                background: "#ffffff",
                borderColor: "#cbd5e1",
                color: "#0f172a",
              }}
              rows={3}
              placeholder="Describe the responsibilities and access level of this role…"
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="field">
              <label style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>Status</label>
              <select
                style={{
                  background: "#ffffff",
                  borderColor: "#cbd5e1",
                  color: "#0f172a",
                }}
                value={editForm.status}
                onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as "active" | "inactive" }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="field">
              <label style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>Sort Order</label>
              <input
                className="inp"
                style={{
                  background: "#ffffff",
                  borderColor: "#cbd5e1",
                  color: "#0f172a",
                }}
                type="number"
                value={editForm.sortOrder}
                onChange={(e) => setEditForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
            <button className="btn btn-ghost" type="button" onClick={() => setEditingRole(null)} disabled={editSubmitting}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={editSubmitting}>
              {editSubmitting ? "Saving…" : "Save Changes"}
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
