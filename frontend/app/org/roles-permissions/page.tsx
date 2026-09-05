"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon } from "@/components/icons";
import { Seg } from "@/components/superadmin/seg";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { OrgUsersListResponse, OrgUser } from "@/lib/types";

interface ModuleDef {
  key: string;
  label: string;
  description: string;
  actions: string[];
}

interface RoleDef {
  key: string;
  name: string;
  scope: string;
  locked: boolean;
  custom?: boolean;
  id?: string;
}

interface PermissionsCatalogResponse {
  actions: string[];
  modules: ModuleDef[];
  roles: RoleDef[];
}

interface ModulePermissionRow {
  moduleKey: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

interface RolePermissionState {
  roleKey: string;
  roleName: string;
  locked: boolean;
  permissions: Record<string, ModulePermissionRow>;
}

interface UserPermissionState {
  userId: string;
  userName: string;
  role: string | null;
  permissions: Record<string, { view: boolean; add: boolean; edit: boolean; delete: boolean; approve: boolean }>;
  userOverrides: Record<string, Partial<Record<string, boolean | null>>>;
}

const TABS = ["Role Permissions Matrix", "User Permission Overrides"] as const;
const ACTIONS = ["view", "add", "edit", "delete", "approve"] as const;

export default function OrgRolesPermissionsPage() {
  const { accessToken, isOrgAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (accessToken && !isOrgAdmin()) {
      router.replace("/org");
    }
  }, [accessToken, isOrgAdmin, router]);

  const [tabIndex, setTabIndex] = useState(0);
  const [catalog, setCatalog] = useState<PermissionsCatalogResponse | null>(null);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionState[]>([]);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>("manager");

  const [users, setUsers] = useState<OrgUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userPermissionState, setUserPermissionState] = useState<UserPermissionState | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showNewRoleModal, setShowNewRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [creatingRole, setCreatingRole] = useState(false);
  const [createRoleError, setCreateRoleError] = useState<string | null>(null);

  const [confirmDeleteRole, setConfirmDeleteRole] = useState<RoleDef | null>(null);
  const [deletingRole, setDeletingRole] = useState(false);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const loadCatalogAndRoles = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [catRes, rolesRes] = await Promise.all([
        apiFetch<PermissionsCatalogResponse>("/org/permissions/modules", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        apiFetch<any[]>("/org/permissions", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      setCatalog(catRes);

      const parsedRoles: RolePermissionState[] = catRes.roles.map((r) => {
        const found = rolesRes.find((item) => item.roleKey === r.key);
        const permMap: Record<string, ModulePermissionRow> = {};
        for (const m of catRes.modules) {
          const modRow = found?.permissions?.find((p: any) => p.moduleKey === m.key);
          permMap[m.key] = {
            moduleKey: m.key,
            canView: modRow?.canView ?? false,
            canAdd: modRow?.canAdd ?? false,
            canEdit: modRow?.canEdit ?? false,
            canDelete: modRow?.canDelete ?? false,
            canApprove: modRow?.canApprove ?? false,
          };
        }
        return {
          roleKey: r.key,
          roleName: r.name,
          locked: r.locked,
          permissions: permMap,
        };
      });

      setRolePermissions(parsedRoles);

      const firstNonAdminRole = catRes.roles.find((r) => !r.locked)?.key ?? catRes.roles[0]?.key ?? "manager";
      setSelectedRoleKey(firstNonAdminRole);
    } catch (err: any) {
      setError(err.message || "Failed to load permissions catalog.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const loadUsers = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await apiFetch<OrgUsersListResponse>("/org/users?limit=100", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setUsers(res.data);
      if (res.data.length > 0) {
        setSelectedUserId(res.data[0].id);
      }
    } catch {
      // Ignore
    }
  }, [accessToken]);

  const loadUserPermissions = useCallback(async (userId: string) => {
    if (!accessToken || !userId) return;
    try {
      const res = await apiFetch<any>(`/org/permissions/users/${userId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const selectedUserObj = users.find((u) => u.id === userId);
      const name = selectedUserObj
        ? [selectedUserObj.firstName, selectedUserObj.lastName].filter(Boolean).join(" ") || selectedUserObj.email
        : userId;

      const permMap: Record<string, { view: boolean; add: boolean; edit: boolean; delete: boolean; approve: boolean }> = {};
      const overrideMap: Record<string, Partial<Record<string, boolean | null>>> = {};

      if (res.permissions) {
        for (const [modKey, actions] of Object.entries(res.permissions as Record<string, any>)) {
          permMap[modKey] = {
            view: !!actions.view,
            add: !!actions.add,
            edit: !!actions.edit,
            delete: !!actions.delete,
            approve: !!actions.approve,
          };
        }
      }

      if (res.userPermissions) {
        for (const item of res.userPermissions as any[]) {
          overrideMap[item.moduleKey] = {
            view: item.canView,
            add: item.canAdd,
            edit: item.canEdit,
            delete: item.canDelete,
            approve: item.canApprove,
          };
        }
      }

      setUserPermissionState({
        userId,
        userName: name,
        role: res.role ?? selectedUserObj?.role?.key ?? null,
        permissions: permMap,
        userOverrides: overrideMap,
      });
    } catch (err: any) {
      notify(err.message || "Failed to load user permissions.");
    }
  }, [accessToken, users]);

  useEffect(() => {
    loadCatalogAndRoles();
    loadUsers();
  }, [loadCatalogAndRoles, loadUsers]);

  useEffect(() => {
    if (tabIndex === 1 && selectedUserId) {
      loadUserPermissions(selectedUserId);
    }
  }, [tabIndex, selectedUserId, loadUserPermissions]);

  const handleToggleRolePerm = (moduleKey: string, action: keyof ModulePermissionRow) => {
    setRolePermissions((prev) =>
      prev.map((rp) => {
        if (rp.roleKey !== selectedRoleKey) return rp;
        const currentMod = rp.permissions[moduleKey] ?? {
          moduleKey,
          canView: false,
          canAdd: false,
          canEdit: false,
          canDelete: false,
          canApprove: false,
        };
        const updatedMod = {
          ...currentMod,
          [action]: !currentMod[action],
        };
        return {
          ...rp,
          permissions: {
            ...rp.permissions,
            [moduleKey]: updatedMod,
          },
        };
      }),
    );
  };

  const handleSaveRolePermissions = async () => {
    if (!accessToken || !selectedRoleKey) return;
    const activeRoleState = rolePermissions.find((r) => r.roleKey === selectedRoleKey);
    if (!activeRoleState) return;

    if (activeRoleState.locked) {
      notify("Organisation Admin role always has full access and cannot be restricted.");
      return;
    }

    setSaving(true);
    try {
      const payload = Object.values(activeRoleState.permissions).map((p) => ({
        moduleKey: p.moduleKey,
        canView: p.canView,
        canAdd: p.canAdd,
        canEdit: p.canEdit,
        canDelete: p.canDelete,
        canApprove: p.canApprove,
      }));

      await apiFetch(`/org/permissions/roles/${selectedRoleKey}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ permissions: payload }),
      });
      notify(`Role permissions saved for '${activeRoleState.roleName}'`);
    } catch (err: any) {
      notify(err.message || "Failed to save role permissions.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateOrgRole = async () => {
    if (!accessToken || !newRoleName.trim()) return;
    setCreatingRole(true);
    setCreateRoleError(null);
    try {
      await apiFetch("/org/permissions/org-roles", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name: newRoleName.trim(), description: newRoleDescription.trim() || undefined }),
      });
      notify(`Role '${newRoleName.trim()}' created`);
      setShowNewRoleModal(false);
      setNewRoleName("");
      setNewRoleDescription("");
      await loadCatalogAndRoles();
    } catch (err: any) {
      setCreateRoleError(err.message || "Failed to create role.");
    } finally {
      setCreatingRole(false);
    }
  };

  const handleDeleteOrgRole = async () => {
    if (!accessToken || !confirmDeleteRole?.id) return;
    setDeletingRole(true);
    try {
      await apiFetch(`/org/permissions/org-roles/${confirmDeleteRole.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      notify(`Role '${confirmDeleteRole.name}' deleted`);
      if (selectedRoleKey === confirmDeleteRole.key) {
        setSelectedRoleKey(catalog?.roles.find((r) => r.key !== confirmDeleteRole.key)?.key ?? "manager");
      }
      setConfirmDeleteRole(null);
      await loadCatalogAndRoles();
    } catch (err: any) {
      notify(err.message || "Failed to delete role.");
    } finally {
      setDeletingRole(false);
    }
  };

  const handleUserOverrideChange = (moduleKey: string, action: string, value: boolean | null) => {
    if (!userPermissionState) return;
    const currentOverrides = { ...userPermissionState.userOverrides };
    const modOverride = { ...(currentOverrides[moduleKey] ?? {}) };

    if (value === null) {
      delete modOverride[action];
    } else {
      modOverride[action] = value;
    }

    if (Object.keys(modOverride).length === 0) {
      delete currentOverrides[moduleKey];
    } else {
      currentOverrides[moduleKey] = modOverride;
    }

    setUserPermissionState({
      ...userPermissionState,
      userOverrides: currentOverrides,
    });
  };

  const handleSaveUserOverrides = async () => {
    if (!accessToken || !selectedUserId || !userPermissionState) return;
    setSaving(true);
    try {
      const payload: { moduleKey: string; view?: boolean | null; add?: boolean | null; edit?: boolean | null; delete?: boolean | null; approve?: boolean | null }[] = [];

      for (const [modKey, actions] of Object.entries(userPermissionState.userOverrides)) {
        if (Object.keys(actions).length > 0) {
          payload.push({
            moduleKey: modKey,
            view: actions.view ?? null,
            add: actions.add ?? null,
            edit: actions.edit ?? null,
            delete: actions.delete ?? null,
            approve: actions.approve ?? null,
          });
        }
      }

      await apiFetch(`/org/permissions/users/${selectedUserId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ permissions: payload }),
      });

      notify(`User permission overrides saved for '${userPermissionState.userName}'`);
      loadUserPermissions(selectedUserId);
    } catch (err: any) {
      notify(err.message || "Failed to save user overrides.");
    } finally {
      setSaving(false);
    }
  };

  const currentRoleState = rolePermissions.find((r) => r.roleKey === selectedRoleKey);

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Icon name="lock" size={14} /> Security</div>
          <h1>Roles &amp; Permissions</h1>
          <div className="sub">
            Control page and action access per role and configure individual member overrides across your organisation.
          </div>
        </div>
      </div>

      <Reveal delay={1}>
        <div style={{ marginBottom: 18 }}>
          <Seg
            options={[...TABS]}
            value={tabIndex}
            onChange={(i) => setTabIndex(i)}
          />
        </div>
      </Reveal>

      {error ? (
        <div className="card" style={{ padding: 16, color: "var(--rose, #e11d48)", marginBottom: 16 }}>{error}</div>
      ) : null}

      {/* Tab 0: Role Matrix */}
      {tabIndex === 0 && catalog ? (
        <Reveal delay={2}>
          <div className="card">
            <div className="card-h" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span className="muted" style={{ fontSize: 13 }}>Select Role:</span>
                {catalog.roles.map((r) => (
                  <span key={r.key} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${selectedRoleKey === r.key ? "btn-primary" : "btn-ghost"}`}
                      onClick={() => setSelectedRoleKey(r.key)}
                    >
                      {r.name} {r.locked ? "(Admin)" : ""}
                    </button>
                    {r.custom ? (
                      <button
                        type="button"
                        title={`Delete '${r.name}'`}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: "2px 6px", color: "var(--rose, #e11d48)" }}
                        onClick={() => setConfirmDeleteRole(r)}
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    ) : null}
                  </span>
                ))}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowNewRoleModal(true)}
                >
                  <Icon name="plus" size={13} /> Create Role
                </button>
              </div>
              <div>
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={saving || currentRoleState?.locked}
                  onClick={handleSaveRolePermissions}
                >
                  {saving ? "Saving…" : "Save Role Permissions"}
                </button>
              </div>
            </div>

            {currentRoleState?.locked ? (
              <div style={{ padding: "12px 18px", background: "var(--amber-light, #fffbeb)", color: "var(--amber-dark, #92400e)", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                🔒 The <strong>{currentRoleState.roleName}</strong> role always has full access across all modules and cannot be restricted.
              </div>
            ) : null}

            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Module</th>
                    <th style={{ textAlign: "center", width: 90 }}>View</th>
                    <th style={{ textAlign: "center", width: 90 }}>Add</th>
                    <th style={{ textAlign: "center", width: 90 }}>Edit</th>
                    <th style={{ textAlign: "center", width: 90 }}>Delete</th>
                    <th style={{ textAlign: "center", width: 90 }}>Approve</th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.modules.map((m) => {
                    const permRow = currentRoleState?.permissions[m.key] ?? {
                      moduleKey: m.key,
                      canView: false,
                      canAdd: false,
                      canEdit: false,
                      canDelete: false,
                      canApprove: false,
                    };

                    const isLocked = currentRoleState?.locked ?? false;

                    return (
                      <tr key={m.key}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{m.label}</div>
                          <div style={{ fontSize: 12, color: "var(--fg-subtle)" }}>{m.description}</div>
                        </td>
                        {(["canView", "canAdd", "canEdit", "canDelete", "canApprove"] as const).map((act) => (
                          <td key={act} style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={isLocked ? true : permRow[act]}
                              disabled={isLocked}
                              onChange={() => handleToggleRolePerm(m.key, act)}
                              style={{ width: 18, height: 18, cursor: isLocked ? "not-allowed" : "pointer" }}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      ) : null}

      {/* Tab 1: User Overrides */}
      {tabIndex === 1 && catalog ? (
        <Reveal delay={2}>
          <div className="card">
            <div className="card-h" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span className="muted" style={{ fontSize: 13 }}>Target Member:</span>
                <select
                  style={{ minWidth: 240 }}
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email} ({u.role?.name ?? "No Role"})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={saving || !userPermissionState || userPermissionState.role === "admin"}
                  onClick={handleSaveUserOverrides}
                >
                  {saving ? "Saving…" : "Save User Overrides"}
                </button>
              </div>
            </div>

            {userPermissionState?.role === "admin" ? (
              <div style={{ padding: "12px 18px", background: "var(--amber-light, #fffbeb)", color: "var(--amber-dark, #92400e)", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                🔒 Organisation Admins always have unrestricted full access. Overrides cannot be set for this user.
              </div>
            ) : null}

            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Module</th>
                    {ACTIONS.map((act) => (
                      <th key={act} style={{ textAlign: "center", width: 120, textTransform: "capitalize" }}>
                        {act}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catalog.modules.map((m) => {
                    const modOverrides = userPermissionState?.userOverrides[m.key] ?? {};
                    const effectiveMod = userPermissionState?.permissions[m.key] ?? {
                      view: false,
                      add: false,
                      edit: false,
                      delete: false,
                      approve: false,
                    };
                    const isAdminUser = userPermissionState?.role === "admin";

                    return (
                      <tr key={m.key}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{m.label}</div>
                          <div style={{ fontSize: 12, color: "var(--fg-subtle)" }}>{m.description}</div>
                        </td>
                        {ACTIONS.map((act) => {
                          const overrideVal = modOverrides[act];
                          const isEffective = isAdminUser ? true : effectiveMod[act];

                          let selectVal = "inherit";
                          if (overrideVal === true) selectVal = "grant";
                          if (overrideVal === false) selectVal = "deny";

                          return (
                            <td key={act} style={{ textAlign: "center" }}>
                              <select
                                disabled={isAdminUser}
                                value={selectVal}
                                style={{
                                  fontSize: 12,
                                  padding: "3px 6px",
                                  fontWeight: selectVal !== "inherit" ? 600 : 400,
                                  borderColor: selectVal === "grant" ? "#10b981" : selectVal === "deny" ? "#f43f5e" : undefined,
                                }}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "grant") handleUserOverrideChange(m.key, act, true);
                                  else if (val === "deny") handleUserOverrideChange(m.key, act, false);
                                  else handleUserOverrideChange(m.key, act, null);
                                }}
                              >
                                <option value="inherit">Inherit ({isEffective ? "Allowed" : "Denied"})</option>
                                <option value="grant">Explicit Grant</option>
                                <option value="deny">Explicit Deny</option>
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      ) : null}

      {toast ? (
        <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 500 }}>
          <div className="card" style={{ padding: "12px 16px", boxShadow: "var(--sh-lg)" }}>
            {toast}
          </div>
        </div>
      ) : null}

      {showNewRoleModal ? (
        <Modal
          open={showNewRoleModal}
          onClose={() => !creatingRole && setShowNewRoleModal(false)}
          title="Create Custom Role"
          description={`Add a role specific to your organisation. You can then configure its module permissions in the matrix.`}
          size="md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateOrgRole();
            }}
            style={{ display: "flex", flexDirection: "column", gap: 18, background: "#ffffff", padding: "4px 0" }}
          >
            {createRoleError ? <div className="form-alert">{createRoleError}</div> : null}

            {/* Quick Presets */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <span>✨ Quick Presets</span>
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>(Click to pre-fill)</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[
                  { name: "Senior Telecaller", desc: "Manages lead qualification, calling, and follow-ups" },
                  { name: "Sales Team Lead", desc: "Oversees sales agent pipeline, assignment, and site visits" },
                  { name: "Site Visit Executive", desc: "Coordinates property site tours and customer feedback" },
                  { name: "Accounts & Billing", desc: "Handles customer payment schedules and invoices" },
                ].map((preset) => (
                  <button
                    key={preset.name}
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
                    onClick={() => {
                      setNewRoleName(preset.name);
                      setNewRoleDescription(preset.desc);
                    }}
                  >
                    ＋ {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>Role Name *</label>
              <input
                className="inp"
                style={{
                  background: "#ffffff",
                  borderColor: "#cbd5e1",
                  color: "#0f172a",
                }}
                placeholder="e.g. Senior Sales Executive"
                required
                autoFocus
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
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
                placeholder="Describe the responsibilities and scope of this custom role…"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setShowNewRoleModal(false)}
                disabled={creatingRole}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={creatingRole || !newRoleName.trim()}
                style={{ padding: "8px 20px" }}
              >
                {creatingRole ? "Creating…" : "Create Role"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      <ConfirmModal
        open={confirmDeleteRole !== null}
        title={`Delete role '${confirmDeleteRole?.name}'?`}
        message="This will permanently delete this custom role definition. Users currently assigned to it must be reassigned first."
        confirmLabel="Delete Role"
        destructive
        busy={deletingRole}
        onConfirm={handleDeleteOrgRole}
        onClose={() => setConfirmDeleteRole(null)}
      />
    </>
  );
}
