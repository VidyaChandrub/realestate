"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  deletePlatformTeamMember,
  getPlatformTeamPage,
  updatePlatformTeamMember,
} from "@/lib/api";
import { Icon } from "@/components/icons";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { PlatformTeamMember } from "@/lib/types";
import { PlatformRolesPanel } from "./roles-panel";
import { FLASH_KEY, FLASH_TAB_KEY, LIST_PATH } from "./member-form";

const PAGE_SIZE = 10;

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

/** Page numbers with ellipses, e.g. 1 … 4 5 6 … 12. */
function pageList(current: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

function PagerButton({
  children,
  label,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      style={{
        minWidth: 32,
        height: 32,
        padding: "0 6px",
        borderRadius: 8,
        border: active ? "none" : "1px solid #e2e8f0",
        background: active ? "#2563eb" : "#ffffff",
        color: active ? "#ffffff" : disabled ? "#94a3b8" : "#334155",
        fontWeight: active ? 700 : 500,
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled && !active ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

export default function SuperAdminAdminsPage() {
  const router = useRouter();
  const { accessToken, user, hasPermission } = useAuth();
  // Members and Roles are two tabs of one console module — Platform Team —
  // not two separately permissioned modules, so a single set of pills
  // (View/Add/Edit/Delete/Disable) governs both tabs identically.
  const canView = hasPermission("admin_platform_team", "view");
  const canAdd = hasPermission("admin_platform_team", "add");
  const canEdit = hasPermission("admin_platform_team", "edit");
  const canDelete = hasPermission("admin_platform_team", "delete");
  const canDisable = hasPermission("admin_platform_team", "approve");
  // Super Admin rows show no row actions (edit/disable/delete) for any viewer.
  // The backend still guards edit/remove independently of the hidden buttons.
  const [tab, setTab] = useState<"members" | "roles">("members");
  const [permEditing, setPermEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [members, setMembers] = useState<PlatformTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<PlatformTeamMember | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Guards against out-of-order responses when paging/searching quickly.
  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getPlatformTeamPage({ page, limit: PAGE_SIZE, search: debouncedSearch });
      if (seq !== requestSeq.current) return;
      // A delete (or narrower search) can leave us past the last page.
      const lastPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setMembers(result.data);
      setTotal(result.total);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(err instanceof Error ? err.message : "Failed to load platform team");
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [accessToken, page, debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  // Success message left by the create / edit page before redirecting here.
  // Read in a deferred callback (not the effect body) and cleared only when it
  // fires, so a StrictMode double-mount can't consume it before it shows.
  useEffect(() => {
    const t = window.setTimeout(() => {
      let flash: string | null = null;
      let flashTab: string | null = null;
      try {
        flash = sessionStorage.getItem(FLASH_KEY);
        flashTab = sessionStorage.getItem(FLASH_TAB_KEY);
        sessionStorage.removeItem(FLASH_KEY);
        sessionStorage.removeItem(FLASH_TAB_KEY);
      } catch {
        // Storage unavailable — nothing to show.
      }
      // Back from Create role → land on the Roles tab it was created from.
      if (flashTab === "roles") setTab("roles");
      if (flash) notify(flash);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  // Debounced server-side search; a new query starts from page 1.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

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

  // Search and paging happen on the server; `members` is the current page.
  const visibleMembers = members;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

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
              Create a <strong style={{ color: "#15803d" }}>role</strong> (console permissions), then <strong style={{ color: "#15803d" }}>create a user</strong> and assign that role. Organisation CRM/project permissions stay under <strong style={{ color: "#15803d" }}>Organisation roles</strong>.
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
                  onClick={() => router.push(`${LIST_PATH}/roles/new`)}
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
                    router.push(`${LIST_PATH}/new`);
                  }}
                >
                  <Icon name="plus" size={16} />
                  <span>Create user</span>
                </button>
              ) : null}
            </div>
          </div>
        </>
      )}

      {error && tab === "members" ? <div className="form-alert" style={{ marginBottom: 16 }}>{error}</div> : null}

      {(tab === "roles" || permEditing) && canView ? (
        <PlatformRolesPanel
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
                          {(page - 1) * PAGE_SIZE + idx + 1}
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
                            {/* Super Admin rows get no row actions for any viewer. */}
                            {canEdit && !isSuperAdminRow ? (
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
                                onClick={() => router.push(`${LIST_PATH}/${encodeURIComponent(m.id)}/edit`)}
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

                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer — only when there is more than one page */}
          {totalPages > 1 || page > 1 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderTop: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 12.5, color: "#64748b" }}>
              {total === 0
                ? "No members"
                : `Showing ${rangeStart} to ${rangeEnd} of ${total} member${total === 1 ? "" : "s"}`}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <PagerButton
                label="Previous page"
                disabled={loading || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <Icon name="chevron-left" size={14} />
              </PagerButton>
              {pageList(page, totalPages).map((p, i) =>
                p === "…" ? (
                  <span key={`gap-${i}`} style={{ width: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                    …
                  </span>
                ) : (
                  <PagerButton
                    key={p}
                    label={`Page ${p}`}
                    active={p === page}
                    disabled={loading}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </PagerButton>
                ),
              )}
              <PagerButton
                label="Next page"
                disabled={loading || page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <Icon name="chevron-right" size={14} />
              </PagerButton>
            </div>
          </div>
          ) : null}
        </div>
      ) : null}

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
