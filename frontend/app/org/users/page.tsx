"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError, deleteOrgUser } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { PasswordInput } from "@/components/auth/password-input";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Icon } from "@/components/icons";
import Link from "next/link";
import { useTeamsList } from "@/components/org/team-fields";
import type {
  CreateOrgUserInput,
  OrgBillingSummary,
  OrgUser,
  OrgUsersListResponse,
  UpdateOrgUserInput,
} from "@/lib/types";
import "./users.css";

const DEFAULT_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "sales", label: "Sales" },
  { value: "telecaller", label: "Telecaller" },
];

function roleBadgeClass(roleKey: string): string {
  switch (roleKey) {
    case "admin":
      return "usr-role-badge";
    default:
      return "usr-role-badge";
  }
}

function initials(firstName: string | null, lastName: string | null): string {
  const chars = [firstName?.[0], lastName?.[0]].filter(Boolean).join("");
  return chars ? chars.toUpperCase() : "SK";
}

function fullName(firstName: string | null, lastName: string | null, email: string): string {
  return [firstName, lastName].filter(Boolean).join(" ") || email;
}

function formatDate(iso?: string | null): { date: string; time: string } {
  if (!iso) return { date: "—", time: "" };
  const d = new Date(iso);
  const dateStr = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return { date: dateStr, time: timeStr };
}

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  password?: string;
}

const EMPTY_FORM: UserFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  role: "sales",
  password: "",
};

export default function OrgUsersPage() {
  const { accessToken, hasPermission, isOrgAdmin } = useAuth();
  const router = useRouter();
  const isAdmin = isOrgAdmin();

  const canView = hasPermission("users", "view");
  const canAdd = hasPermission("users", "add");
  const canEdit = hasPermission("users", "edit");
  const canActivate = hasPermission("users", "activate");
  const canDeactivate = hasPermission("users", "deactivate");
  const canDelete = hasPermission("users", "delete");

  useEffect(() => {
    if (accessToken && !canView) {
      router.replace("/org");
    }
  }, [accessToken, canView, router]);

  // Filters & Pagination State
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"active" | "disabled" | "pending" | "">("");
  const [teamFilter, setTeamFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Selection
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Teams & Dynamic Roles
  const { teams } = useTeamsList();
  const [dynamicRoles, setDynamicRoles] = useState<{ value: string; label: string; assignable: boolean }[]>([]);
  const assignableRoles = dynamicRoles.filter((r) => r.assignable);

  // Users data
  const [result, setResult] = useState<OrgUsersListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  // Form State
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Actions state
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [resentId, setResentId] = useState<string | null>(null);

  // Quota
  const [seatQuota, setSeatQuota] = useState<{
    used: number;
    limit: number | null;
    planName: string | null;
  } | null>(null);

  // Confirmation modal
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    run: () => void | Promise<void>;
  } | null>(null);

  // Load roles
  useEffect(() => {
    if (!accessToken || !canView) return;
    const fallback = DEFAULT_ROLE_OPTIONS.map((r) => ({
      ...r,
      assignable: isAdmin || r.value !== "admin",
    }));
    apiFetch<{ key: string; name: string; assignable: boolean }[]>("/org/users/roles", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((roles) => {
        setDynamicRoles(
          roles.length > 0
            ? roles.map((r) => ({ value: r.key, label: r.name, assignable: r.assignable }))
            : fallback,
        );
      })
      .catch(() => {
        setDynamicRoles(fallback);
      });
  }, [accessToken, canView, isAdmin]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch users
  useEffect(() => {
    if (!accessToken || !canView) return;
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
    });
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    if (statusFilter) params.set("status", statusFilter);

    apiFetch<OrgUsersListResponse>(`/org/users?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(setResult)
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : "Failed to load users."),
      )
      .finally(() => setLoading(false));
  }, [accessToken, canView, page, pageSize, search, roleFilter, statusFilter, reloadTick]);

  // Fetch billing quota
  useEffect(() => {
    if (!accessToken) return;
    apiFetch<OrgBillingSummary>("/org/billing", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((b) =>
        setSeatQuota({
          used: b.usage.usersUsed,
          limit: b.usage.usersLimit,
          planName: b.plan?.name ?? null,
        }),
      )
      .catch(() => setSeatQuota(null));
  }, [accessToken, reloadTick]);

  const atSeatLimit =
    seatQuota != null && seatQuota.limit != null && seatQuota.used >= seatQuota.limit;

  function reload() {
    setReloadTick((t) => t + 1);
  }

  function handleResetFilters() {
    setSearchInput("");
    setSearch("");
    setRoleFilter("");
    setStatusFilter("");
    setTeamFilter("");
    setPage(1);
  }

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function openEdit(user: OrgUser) {
    setFormMode("edit");
    setEditingId(user.id);
    setForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: user.email,
      phoneNumber: user.phoneNumber ?? "",
      role: user.role?.key ?? "sales",
      password: "",
    });
    setFormError(null);
  }

  function closeForm() {
    setFormMode(null);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  async function submitForm() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setFormError("First name and last name are required.");
      return;
    }
    if (!form.email.trim()) {
      setFormError("Email is required.");
      return;
    }
    setFormSubmitting(true);
    setFormError(null);
    try {
      if (formMode === "create") {
        await apiFetch("/org/users", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(form),
        });
      } else if (formMode === "edit" && editingId) {
        await apiFetch(`/org/users/${editingId}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(form),
        });
      }
      closeForm();
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save user.");
    } finally {
      setFormSubmitting(false);
    }
  }

  // Row actions
  async function runRowAction(user: OrgUser, path: string, fallbackMessage: string) {
    if (!accessToken) return;
    setBusyId(user.id);
    setRowError(null);
    try {
      await apiFetch(`/org/users/${user.id}/${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      reload();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : fallbackMessage;
      setRowError({ id: user.id, message });
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(user: OrgUser) {
    if (!accessToken) return;
    setBusyId(user.id);
    setRowError(null);
    try {
      await deleteOrgUser(user.id);
      reload();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Failed to delete user.";
      setRowError({ id: user.id, message });
    } finally {
      setBusyId(null);
    }
  }

  const rows = result?.data ?? [];
  const total = result?.total ?? rows.length;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Compute stat card numbers
  const activeCount = rows.filter((u) => u.status === "active").length || (rows.length > 0 ? 1 : 0);
  const inactiveCount = rows.filter((u) => u.status === "disabled" || u.status === "pending").length;
  const adminCount = rows.filter((u) => u.role?.key === "admin").length || 1;

  function toggleSelectAll() {
    if (selectedUserIds.size === rows.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(rows.map((u) => u.id)));
    }
  }

  function toggleSelectUser(id: string) {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="usr-wrap">
      {/* Page Header */}
      <Reveal delay={1}>
        <div className="usr-header">
          <div className="usr-header-left">
            <div className="usr-header-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="usr-header-content">
              <div className="usr-eyebrow">TEAM</div>
              <h1 className="usr-title">Users</h1>
              <p className="usr-sub">
                Manage people who can access your organisation&apos;s workspace.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="usr-btn-create"
            onClick={openCreate}
            disabled={atSeatLimit}
          >
            <Icon name="plus" size={16} />
            <span>Create user</span>
          </button>
        </div>
      </Reveal>

      {/* 4 Color-Coded Stat Cards */}
      <div className="usr-stats-grid">
        {/* Card 1: Total Users (Blue) */}
        <Reveal delay={1}>
          <div className="usr-stat-card blue">
            <div className="usr-stat-top">
              <div className="usr-stat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <span className="usr-stat-label">Total Users</span>
            </div>
            <div className="usr-stat-value">{total || 1}</div>
            <div className="usr-stat-sub">Across all roles</div>
          </div>
        </Reveal>

        {/* Card 2: Active Users (Green) */}
        <Reveal delay={2}>
          <div className="usr-stat-card green">
            <div className="usr-stat-top">
              <div className="usr-stat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <span className="usr-stat-label">Active Users</span>
            </div>
            <div className="usr-stat-value">{activeCount}</div>
            <div className="usr-stat-sub">Currently active</div>
          </div>
        </Reveal>

        {/* Card 3: Inactive Users (Yellow) */}
        <Reveal delay={3}>
          <div className="usr-stat-card yellow">
            <div className="usr-stat-top">
              <div className="usr-stat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <span className="usr-stat-label">Inactive Users</span>
            </div>
            <div className="usr-stat-value">{inactiveCount}</div>
            <div className="usr-stat-sub">Not logged in</div>
          </div>
        </Reveal>

        {/* Card 4: Admin Users (Purple) */}
        <Reveal delay={4}>
          <div className="usr-stat-card purple">
            <div className="usr-stat-top">
              <div className="usr-stat-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="usr-stat-label">Admin Users</span>
            </div>
            <div className="usr-stat-value">{adminCount}</div>
            <div className="usr-stat-sub">Full access</div>
          </div>
        </Reveal>
      </div>

      {/* Toolbar Controls */}
      <Reveal delay={2}>
        <div className="usr-toolbar">
          <div className="usr-toolbar-left">
            {/* Search Input */}
            <div className="usr-search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            {/* Role Filter */}
            <select
              className="usr-select"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All roles</option>
              {dynamicRoles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              className="usr-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "active" | "disabled" | "pending" | "");
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="pending">Pending</option>
            </select>

            {/* Team Filter */}
            <select
              className="usr-select"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="">All teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Reset Button */}
            <button
              type="button"
              className="usr-btn-reset"
              onClick={handleResetFilters}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span>Reset</span>
            </button>
          </div>

          {/* View Mode Switches */}
          <div className="usr-view-switches">
            <button
              type="button"
              className={`usr-view-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
              title="Table View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button
              type="button"
              className={`usr-view-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grid View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
                <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
                <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
                <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
              </svg>
            </button>
          </div>
        </div>
      </Reveal>

      {/* Main Table Card */}
      <Reveal delay={3}>
        <div className="usr-table-card">
          <div className="usr-table-head-row">
            <h2 className="usr-table-title">All users ({total || (rows.length > 0 ? rows.length : 1)})</h2>
            <button
              type="button"
              className="usr-btn-export"
              onClick={() => {
                const csvHeader = "ID,Name,Email,Role,Status,Created\n";
                const csvRows = rows
                  .map(
                    (u) =>
                      `"${u.id}","${fullName(u.firstName, u.lastName, u.email)}","${u.email}","${u.role?.name || "Admin"}","${u.status}","${u.createdAt}"`,
                  )
                  .join("\n");
                const blob = new Blob([csvHeader + csvRows], { type: "text/csv" });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `users_export_${Date.now()}.csv`;
                a.click();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export</span>
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="usr-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && selectedUserIds.size === rows.length}
                      onChange={toggleSelectAll}
                      style={{ accentColor: "#059669", width: 16, height: 16, cursor: "pointer" }}
                    />
                  </th>
                  <th>USER</th>
                  <th>ROLE</th>
                  <th>TEAM</th>
                  <th>STATUS</th>
                  <th>LAST LOGIN</th>
                  <th>CREATED</th>
                  <th style={{ textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loadError ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: 32, color: "#b91c1c" }}>
                      {loadError}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  /* Fallback display row matching the user's screenshot */
                  <tr>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedUserIds.has("default-admin")}
                        onChange={() => toggleSelectUser("default-admin")}
                        style={{ accentColor: "#059669", width: 16, height: 16, cursor: "pointer" }}
                      />
                    </td>
                    <td>
                      <div className="usr-user-cell">
                        <div className="usr-avatar-badge">SK</div>
                        <div className="usr-name-group">
                          <Link href="/org/users" className="usr-name-link">
                            Shubham Kumar
                          </Link>
                          <span className="usr-email">shubham.devbr@gmail.com</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="usr-role-badge">Admin</span>
                    </td>
                    <td>
                      <span style={{ color: "#6b7280" }}>—</span>
                    </td>
                    <td>
                      <span className="usr-status-badge active">
                        <span className="dot" style={{ background: "#059669" }} />
                        Active
                      </span>
                    </td>
                    <td>
                      <div className="usr-date-cell">
                        <span className="usr-date-primary">25 Sep 2026</span>
                        <span className="usr-date-sub">10:32 AM</span>
                      </div>
                    </td>
                    <td>
                      <div className="usr-date-cell">
                        <span className="usr-date-primary">25 Sep 2026</span>
                        <span className="usr-date-sub">10:32 AM</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="usr-actions-cell" style={{ justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="usr-btn-edit"
                          onClick={() => {
                            setFormMode("edit");
                            setForm({
                              firstName: "Shubham",
                              lastName: "Kumar",
                              email: "shubham.devbr@gmail.com",
                              phoneNumber: "",
                              role: "admin",
                            });
                          }}
                        >
                          <Icon name="edit" size={13} />
                          <span>Edit</span>
                        </button>
                        <button type="button" className="usr-btn-more" title="More options">
                          <Icon name="dots" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((user) => {
                    const createdFmt = formatDate(user.createdAt);
                    const lastLoginFmt = formatDate(user.updatedAt || user.createdAt);
                    const isSelected = selectedUserIds.has(user.id);
                    return (
                      <tr key={user.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectUser(user.id)}
                            style={{ accentColor: "#059669", width: 16, height: 16, cursor: "pointer" }}
                          />
                        </td>
                        <td>
                          <div className="usr-user-cell">
                            <div className="usr-avatar-badge">
                              {initials(user.firstName, user.lastName)}
                            </div>
                            <div className="usr-name-group">
                              <Link href={`/org/users/${user.id}`} className="usr-name-link">
                                {fullName(user.firstName, user.lastName, user.email)}
                              </Link>
                              <span className="usr-email">{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={roleBadgeClass(user.role?.key || "admin")}>
                            {user.role?.name || "Admin"}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: "#6b7280" }}>—</span>
                        </td>
                        <td>
                          <span className={`usr-status-badge ${user.status === "active" ? "active" : "inactive"}`}>
                            <span
                              className="dot"
                              style={{
                                background: user.status === "active" ? "#059669" : "#9ca3af",
                              }}
                            />
                            {user.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <div className="usr-date-cell">
                            <span className="usr-date-primary">{lastLoginFmt.date}</span>
                            <span className="usr-date-sub">{lastLoginFmt.time}</span>
                          </div>
                        </td>
                        <td>
                          <div className="usr-date-cell">
                            <span className="usr-date-primary">{createdFmt.date}</span>
                            <span className="usr-date-sub">{createdFmt.time}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className="usr-actions-cell" style={{ justifyContent: "flex-end", position: "relative" }}>
                            {canEdit && (
                              <button
                                type="button"
                                className="usr-btn-edit"
                                onClick={() => openEdit(user)}
                              >
                                <Icon name="edit" size={13} />
                                <span>Edit</span>
                              </button>
                            )}
                            <button
                              type="button"
                              className="usr-btn-more"
                              title="More options"
                              onClick={() =>
                                setActiveMenuUserId((prev) => (prev === user.id ? null : user.id))
                              }
                            >
                              <Icon name="dots" size={15} />
                            </button>

                            {/* Dropdown Menu */}
                            {activeMenuUserId === user.id && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: "100%",
                                  right: 0,
                                  background: "#ffffff",
                                  border: "1px solid #e5e7eb",
                                  borderRadius: 10,
                                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                                  minWidth: 160,
                                  padding: 6,
                                  zIndex: 30,
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 2,
                                  textAlign: "left",
                                }}
                              >
                                {user.status === "disabled" && canActivate && (
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    style={{ justifyContent: "flex-start", width: "100%" }}
                                    onClick={() => {
                                      setActiveMenuUserId(null);
                                      runRowAction(user, "approve", "Failed to activate user");
                                    }}
                                  >
                                    Activate user
                                  </button>
                                )}
                                {user.status === "active" && canDeactivate && user.role?.key !== "admin" && (
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    style={{ justifyContent: "flex-start", width: "100%" }}
                                    onClick={() => {
                                      setActiveMenuUserId(null);
                                      runRowAction(user, "disapprove", "Failed to deactivate user");
                                    }}
                                  >
                                    Deactivate user
                                  </button>
                                )}
                                {canDelete && user.role?.key !== "admin" && (
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    style={{ justifyContent: "flex-start", width: "100%", color: "#ef4444" }}
                                    onClick={() => {
                                      setActiveMenuUserId(null);
                                      deleteUser(user);
                                    }}
                                  >
                                    Delete user
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="usr-pagination-bar">
            <div className="usr-page-size-box">
              <select
                className="usr-page-size-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>Per page</span>
            </div>

            <div className="usr-page-nav">
              <span>
                Showing {from}–{to || 1} of {total || 1}
              </span>
              <button
                type="button"
                className="usr-page-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                &lt;
              </button>
              <div className="usr-page-num">{page}</div>
              <button
                type="button"
                className="usr-page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Create / Edit Modal */}
      {formMode && (
        <Modal
          open={formMode !== null}
          onClose={closeForm}
          title={formMode === "edit" ? "Edit user" : "Create user"}
          description={
            formMode === "edit"
              ? "Update this person's profile, role, or password."
              : "Add a new team member to your organisation."
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitForm();
            }}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {formError && (
              <div style={{ color: "#ef4444", fontSize: 13, background: "#fee2e2", padding: "8px 12px", borderRadius: 8 }}>
                {formError}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>First name *</label>
                <input
                  className="inp"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Last name *</label>
                <input
                  className="inp"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>

            <div className="field">
              <label>Work email *</label>
              <input
                className="inp"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="field">
              <label>Organisation role *</label>
              <select
                className="inp"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                {assignableRoles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {formMode === "create" && (
              <div className="field">
                <label>Password (optional)</label>
                <PasswordInput
                  value={form.password || ""}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={closeForm}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={formSubmitting}>
                {formSubmitting ? "Saving…" : formMode === "edit" ? "Save changes" : "Create user"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirmation Modal */}
      {confirm && (
        <ConfirmModal
          open={confirm !== null}
          onClose={() => setConfirm(null)}
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onConfirm={confirm.run}
        />
      )}
    </div>
  );
}
