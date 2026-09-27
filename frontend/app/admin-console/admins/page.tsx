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

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "#475569",
  marginBottom: 6,
};

const fieldInput: React.CSSProperties = {
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

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  role: "super_admin",
  password: "",
};

// Mobile is optional, but when present it must be digits only (an optional
// leading "+" is allowed) and at most 15 digits — E.164's ceiling, and what
// the backend DTO enforces. Sanitising on every keystroke means the field can
// only ever hold a value the API will accept: letters and symbols are dropped
// and extra digits past 15 are truncated as the user types or pastes.
const PLATFORM_PHONE_REGEX = /^\+?\d{1,15}$/;

function sanitizePlatformPhone(raw: string): string {
  const hasPlus = raw.trimStart().startsWith("+");
  const digits = raw.replace(/\D/g, "").slice(0, 15);
  if (!digits) return hasPlus ? "+" : "";
  return `${hasPlus ? "+" : ""}${digits}`;
}

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

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const dateStr = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return { dateStr, timeStr };
}

export default function SuperAdminAdminsPage() {
  const { accessToken, user, hasPermission } = useAuth();
  // Members and Roles are two tabs of one console module — Platform Team —
  // not two separately permissioned modules, so a single set of pills
  // (View/Add/Edit/Delete/Disable) governs both tabs identically.
  const canView = hasPermission("admin_platform_team", "view");
  const canAdd = hasPermission("admin_platform_team", "add");
  const canEdit = hasPermission("admin_platform_team", "edit");
  const canDelete = hasPermission("admin_platform_team", "delete");
  const canDisable = hasPermission("admin_platform_team", "approve");
  // A Super Admin account can only be edited by another Super Admin, and can
  // never be deleted by anyone — mirrors the backend guard in
  // AdminPlatformTeamService (edit/remove), which rejects this even if
  // called directly, not just when the button is hidden.
  const viewerIsSuperAdmin = !!(user?.platformUnrestricted || user?.roleKeys?.includes("super_admin"));
  const [tab, setTab] = useState<"members" | "roles">("members");
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [permEditing, setPermEditing] = useState(false);
  const [search, setSearch] = useState("");

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
      // Normalise the stored value to the same shape the field enforces, so a
      // legacy row can still be saved without forcing the admin to retype it.
      phoneNumber: sanitizePlatformPhone(member.phoneNumber ?? ""),
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
    const phone = form.phoneNumber.trim();
    if (phone && !PLATFORM_PHONE_REGEX.test(phone)) {
      setFormError("Mobile number must contain digits only (max 15).");
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
          phoneNumber: phone || undefined,
          role: form.role,
          ...(form.password.trim() ? { password: form.password.trim() } : {}),
        });
        notify("Platform team member updated");
      } else {
        await createPlatformTeamMember({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phoneNumber: phone || undefined,
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
      notify("Member deleted");
      setConfirmDelete(null);
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleteBusy(false);
    }
  }

  const visibleMembers = members.filter((m) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const name = fullName(m.firstName, m.lastName, m.email).toLowerCase();
    const email = m.email.toLowerCase();
    const role = (m.role?.name || "").toLowerCase();
    return name.includes(q) || email.includes(q) || role.includes(q);
  });

  return (
    <>
      {permEditing ? null : (
        <>
          {/* Breadcrumb */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 13,
              color: "#64748b",
              marginBottom: 16,
            }}
          >
            <Icon name="home" size={14} />
            <span>Platform</span>
            <span style={{ color: "#94a3b8" }}>›</span>
            <span style={{ color: "#0f172a", fontWeight: 600 }}>Platform Team</span>
          </div>

          {/* Hero Header Banner */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #eef2f6",
              borderRadius: 18,
              padding: "20px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
              marginBottom: 20,
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)",
                  border: "1px solid #c7d2fe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#4f46e5",
                  flexShrink: 0,
                }}
              >
                <Icon name="users" size={26} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#059669",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}
                >
                  MANAGE
                </div>
                <h1
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#0f172a",
                    margin: 0,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Platform Team
                </h1>
                <p
                  style={{
                    margin: "4px 0 0",
                    color: "#64748b",
                    fontSize: 13.5,
                    maxWidth: 620,
                    lineHeight: 1.45,
                  }}
                >
                  Create console users and assign platform roles in one place. Manage permissions, access and keep your team organised.
                </p>
              </div>
            </div>

            {/* Stat Box on the right */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "#e0f2fe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0284c7",
                }}
              >
                <Icon name="users" size={22} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#64748b" }}>Total Members</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
                  {members.length}
                </div>
                <div style={{ fontSize: 11.5, color: "#10b981", fontWeight: 600, marginTop: 2 }}>
                  ↑ 0 from last month
                </div>
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 12,
              padding: "12px 18px",
              marginBottom: 20,
              fontSize: 13.5,
              color: "#166534",
            }}
          >
            <div style={{ color: "#16a34a", display: "flex", alignItems: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div>
              Create a <strong style={{ color: "#15803d" }}>role</strong> (console permissions), then <strong style={{ color: "#15803d" }}>create an admin</strong> and assign that role. Organisation CRM/project permissions stay under <strong style={{ color: "#15803d" }}>Organisation roles</strong>.
            </div>
          </div>

          {/* Tabs and Actions bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            {/* Tabs */}
            {canView ? (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 4,
                }}
              >
                <button
                  type="button"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 18px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    background: tab === "members" ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "transparent",
                    color: tab === "members" ? "#ffffff" : "#64748b",
                    transition: "all 0.15s ease",
                  }}
                  onClick={() => setTab("members")}
                >
                  <Icon name="users" size={15} />
                  <span>Members</span>
                </button>
                <button
                  type="button"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 18px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    background: tab === "roles" ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "transparent",
                    color: tab === "roles" ? "#ffffff" : "#64748b",
                    transition: "all 0.15s ease",
                  }}
                  onClick={() => setTab("roles")}
                >
                  <Icon name="shield" size={15} />
                  <span>Roles</span>
                </button>
              </div>
            ) : null}

            {/* Action buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "9px 16px",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "#334155",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onClick={() => void load()}
                disabled={loading}
              >
                <Icon name="refresh" size={15} />
                <span>Refresh</span>
              </button>
              {canAdd ? (
                <button
                  type="button"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: "9px 16px",
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: "#334155",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setTab("roles");
                    setCreateRoleOpen(true);
                  }}
                >
                  <Icon name="plus" size={15} />
                  <span>Create role</span>
                </button>
              ) : null}
              {canAdd ? (
                <button
                  type="button"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 18px",
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: "#fff",
                    boxShadow: "0 2px 6px rgba(37,99,235,0.25)",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setTab("members");
                    openCreate();
                  }}
                >
                  <Icon name="plus" size={16} />
                  <span>Create admin</span>
                </button>
              ) : null}
            </div>
          </div>
        </>
      )}

      {error && tab === "members" ? <div className="form-alert" style={{ marginBottom: 16 }}>{error}</div> : null}

      {(tab === "roles" || permEditing) && canView ? (
        <PlatformRolesPanel
          createOpen={createRoleOpen}
          onCreateOpenChange={setCreateRoleOpen}
          onRolesChanged={() => void load()}
          onPermissionEditing={setPermEditing}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      ) : null}

      {tab === "members" && !permEditing && canView ? (
        <div style={{ background: "#ffffff", border: "1px solid #eef2f6", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.02)", overflow: "hidden" }}>
          <div style={{ padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#4f46e5" }}>
                <Icon name="users" size={16} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Platform Team Members</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ position: "relative", minWidth: 260 }}>
                <input
                  placeholder="Search by name, email or role..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    paddingLeft: 36,
                    paddingRight: 14,
                    height: 38,
                    fontSize: 13,
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    width: "100%",
                  }}
                />
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
                  <Icon name="search" size={15} />
                </span>
              </div>
              <button
                type="button"
                style={{
                  height: 38,
                  padding: "0 14px",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  color: "#475569",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <Icon name="filter" size={14} />
                <span>Filter</span>
                <Icon name="chevron-down" size={12} style={{ color: "#94a3b8" }} />
              </button>
            </div>
          </div>

          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>MEMBER</th>
                  <th>ROLE</th>
                  <th>ACCESS</th>
                  <th>STATUS</th>
                  <th>CREATED</th>
                  <th style={{ textAlign: "right", paddingRight: 24 }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 28, color: "#94a3b8" }}>
                      Loading…
                    </td>
                  </tr>
                ) : visibleMembers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 28, color: "#94a3b8" }}>
                      No team members found.
                    </td>
                  </tr>
                ) : (
                  visibleMembers.map((m, idx) => {
                    const isSuperAdminRow = m.roles.some((r) => r.key === "super_admin");
                    const avBg = isSuperAdminRow ? "#2563eb" : idx === 1 ? "#059669" : "#7c3aed";
                    const dt = formatDateTime(m.createdAt);
                    return (
                      <tr key={m.id}>
                        <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600, fontSize: 12.5 }}>
                          {idx + 1}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                background: avBg,
                                color: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: 13.5,
                                flexShrink: 0,
                              }}
                            >
                              {initials(m.firstName, m.lastName, m.email)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13.5, color: "#0f172a" }}>
                                {fullName(m.firstName, m.lastName, m.email)}
                              </div>
                              <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>
                                {m.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {isSuperAdminRow ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                padding: "4px 10px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                background: "#f3e8ff",
                                color: "#9333ea",
                                border: "1px solid #e9d5ff",
                              }}
                            >
                              <Icon name="crown" size={13} />
                              <span>{m.role?.name || "Super Admin"}</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                padding: "4px 10px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                background: "#ecfdf5",
                                color: "#059669",
                                border: "1px solid #a7f3d0",
                              }}
                            >
                              <Icon name="profile" size={13} />
                              <span>{m.role?.name || "Platform Operator"}</span>
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 500,
                              background: "#f1f5f9",
                              color: "#334155",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            {m.role?.name || "Super Admin"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                background: m.status === "active" ? "#10b981" : "#ef4444",
                              }}
                            />
                            <span
                              style={{
                                fontSize: 12.5,
                                fontWeight: 600,
                                color: m.status === "active" ? "#10b981" : "#ef4444",
                                textTransform: "capitalize",
                              }}
                            >
                              {m.status === "active" ? "Active" : "Disabled"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div>
                            <div style={{ fontSize: 12.5, color: "#334155", fontWeight: 500 }}>{dt.dateStr}</div>
                            <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 1 }}>{dt.timeStr}</div>
                          </div>
                        </td>
                        <td style={{ textAlign: "right", paddingRight: 24 }}>
                          <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                            {canEdit && (!isSuperAdminRow || viewerIsSuperAdmin) ? (
                              <button
                                type="button"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  padding: "6px 12px",
                                  borderRadius: 8,
                                  border: "1px solid #e2e8f0",
                                  background: "#ffffff",
                                  color: "#334155",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                }}
                                onClick={() => openEdit(m)}
                              >
                                <Icon name="edit" size={13} style={{ color: "#64748b" }} /> Edit
                              </button>
                            ) : null}

                            {canDisable && !isSuperAdminRow ? (
                              <button
                                type="button"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  padding: "6px 12px",
                                  borderRadius: 8,
                                  border: "1px solid #e2e8f0",
                                  background: "#ffffff",
                                  color: "#334155",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                                onClick={() => void toggleStatus(m)}
                              >
                                <Icon name="pause" size={13} style={{ color: "#64748b" }} />
                                <span>{m.status === "active" ? "Disable" : "Enable"}</span>
                              </button>
                            ) : null}

                            {canDelete && !isSuperAdminRow && user?.id !== m.id ? (
                              <button
                                type="button"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  padding: "6px 12px",
                                  borderRadius: 8,
                                  border: "1px solid #fee2e2",
                                  background: "#ffffff",
                                  color: "#ef4444",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                                onClick={() => setConfirmDelete(m)}
                              >
                                <Icon name="trash" size={13} style={{ color: "#ef4444" }} /> Delete
                              </button>
                            ) : null}

                            {isSuperAdminRow ? (
                              <button
                                type="button"
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 8,
                                  border: "1px solid #e2e8f0",
                                  background: "#ffffff",
                                  color: "#64748b",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                }}
                              >
                                <Icon name="dots" size={14} />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderTop: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 12.5, color: "#64748b" }}>
              Showing 1 to {visibleMembers.length} of {members.length} members
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  type="button"
                  disabled
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    color: "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "not-allowed",
                  }}
                >
                  <Icon name="chevron-left" size={14} />
                </button>
                <button
                  type="button"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: "none",
                    background: "#2563eb",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  1
                </button>
                <button
                  type="button"
                  disabled
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    color: "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "not-allowed",
                  }}
                >
                  <Icon name="chevron-right" size={14} />
                </button>
              </div>
              <div
                style={{
                  height: 32,
                  padding: "0 10px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  color: "#334155",
                  fontSize: 12.5,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>10 per page</span>
                <Icon name="chevron-down" size={12} style={{ color: "#94a3b8" }} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title={editing ? "Edit platform admin" : "Create platform admin"}
        description={editing ? "Update this team member's profile or role." : "Invite a new admin to the Super Admin console."}
        size="md"
      >
        <form onSubmit={submitForm} style={{ display: "flex", flexDirection: "column", gap: 0, maxHeight: "70vh", overflowY: "auto" }}>
          {formError ? (
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
              <Icon name="alert" size={16} />
              {formError}
            </div>
          ) : null}

          {/* Section: Personal Information */}
          <div style={{ marginBottom: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#eef2ff",
                  color: "#0f1424",
                }}
              >
                <Icon name="users" size={14} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", letterSpacing: "0.01em" }}>
                Personal information
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={fieldLabel}>First name *</label>
                <input
                  style={fieldInput}
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label style={fieldLabel}>Last name *</label>
                <input
                  style={fieldInput}
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "#f1f5f9", margin: "0 0 20px" }} />

          {/* Section: Contact */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#ecfdf5",
                  color: "#0d9488",
                }}
              >
                <Icon name="mail" size={14} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", letterSpacing: "0.01em" }}>
                Contact details
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={fieldLabel}>Email *</label>
                <input
                  style={fieldInput}
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label style={fieldLabel}>Mobile</label>
                <input
                  style={fieldInput}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={16}
                  value={form.phoneNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phoneNumber: sanitizePlatformPhone(e.target.value) }))
                  }
                  placeholder="Optional · digits only"
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "#f1f5f9", margin: "0 0 20px" }} />

          {/* Section: Access */}
          <div style={{ marginBottom: 4 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#fef3c7",
                  color: "#d97706",
                }}
              >
                <Icon name="shield" size={14} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", letterSpacing: "0.01em" }}>
                Role & access
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={fieldLabel}>Platform role *</label>
                <select
                  style={fieldInput}
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  required
                >
                  {roles.length === 0 ? <option value="super_admin">Super Admin</option> : null}
                  {roles.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.name}
                      {r.key === "super_admin" ? " (full access)" : ""}
                    </option>
                  ))}
                </select>
                <div style={{ marginTop: 6, fontSize: 12, color: "#94a3b8", lineHeight: 1.4 }}>
                  Create a role on the Roles tab first for a custom permission set.
                </div>
              </div>
              <div>
                <label style={fieldLabel}>
                  {editing ? "New password" : "Temporary password"}
                  <span style={{ fontWeight: 400, color: "#94a3b8" }}> (auto-generated if empty)</span>
                </label>
                <PasswordInput
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Leave blank to generate"
                  autoComplete="new-password"
                />
              </div>
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
              onClick={() => setModalOpen(false)}
              disabled={submitting}
              style={{
                padding: "9px 18px",
                borderRadius: 10,
                fontSize: 13.5,
                fontWeight: 500,
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                color: "#475569",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.5 : 1,
                transition: "all 0.15s ease",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "9px 20px",
                borderRadius: 10,
                fontSize: 13.5,
                fontWeight: 600,
                border: "none",
                color: "#ffffff",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.5 : 1,
                transition: "all 0.15s ease",
                background: "linear-gradient(135deg, #0f1424, #0f1424)",
                boxShadow: "0 2px 8px -2px rgba(21, 27, 46, 0.4)",
              }}
            >
              {submitting ? "Saving…" : editing ? "Save changes" : "Create admin"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={confirmDelete !== null}
        title="Delete platform team member?"
        message={
          confirmDelete
            ? `${fullName(confirmDelete.firstName, confirmDelete.lastName, confirmDelete.email)} will lose Super Admin console access.`
            : ""
        }
        confirmLabel="Delete"
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
