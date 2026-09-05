"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { PasswordInput } from "@/components/auth/password-input";
import type {
  CreateOrgUserInput,
  OrgUser,
  OrgUsersListResponse,
  UpdateOrgUserInput,
} from "@/lib/types";

const LIMIT = 20;

const DEFAULT_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "sales", label: "Sales" },
  { value: "telecaller", label: "Telecaller" },
];

function roleBadgeClass(roleKey: string): string {
  switch (roleKey) {
    case "admin":
      return "b-indigo";
    case "manager":
      return "b-violet";
    case "sales":
      return "b-teal";
    case "telecaller":
      return "b-amber";
    default:
      return "b-gray";
  }
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

function initials(firstName: string | null, lastName: string | null): string {
  const chars = [firstName?.[0], lastName?.[0]].filter(Boolean).join("");
  return chars ? chars.toUpperCase() : "—";
}

// Invited users have no name until they set one themselves at first login
// (see the registration-wizard Invite step) — fall back to their email
// rather than rendering blank.
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

export default function OrgUsersPage() {
  const { accessToken, hasPermission, isOrgAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (accessToken && !isOrgAdmin() && !hasPermission("users", "view")) {
      router.replace("/org");
    }
  }, [accessToken, hasPermission, isOrgAdmin, router]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"active" | "disabled" | "">("");
  const [page, setPage] = useState(1);
  const [dynamicRoles, setDynamicRoles] = useState<{ value: string; label: string }[]>(DEFAULT_ROLE_OPTIONS);

  const [result, setResult] = useState<OrgUsersListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<{ roles: { key: string; name: string }[] }>("/org/permissions/modules", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (res.roles && res.roles.length > 0) {
          setDynamicRoles(res.roles.map((r) => ({ value: r.key, label: r.name })));
        }
      })
      .catch(() => {});
  }, [accessToken]);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const [resentId, setResentId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!accessToken) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setLoadError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    const params = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
    });
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    if (statusFilter) params.set("status", statusFilter);

    apiFetch<OrgUsersListResponse>(`/org/users?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(setResult)
      .catch((err) =>
        setLoadError(
          err instanceof Error ? err.message : "Failed to load users.",
        ),
      )
      .finally(() => setLoading(false));
  }, [accessToken, page, search, roleFilter, statusFilter, reloadTick]);

  function reload() {
    setReloadTick((t) => t + 1);
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
    });
    setFormError(null);
  }

  function closeForm() {
    setFormMode(null);
    setEditingId(null);
    setFormError(null);
  }

  async function submitForm() {
    if (!accessToken || !formMode) return;
    setFormSubmitting(true);
    setFormError(null);
    const email = form.email.trim();
    const phoneNumber = form.phoneNumber.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Please enter a valid email address.");
      setFormSubmitting(false);
      return;
    }
    if (!phoneNumber) {
      setFormError("Mobile number is required.");
      setFormSubmitting(false);
      return;
    }
    const phoneDigits = phoneNumber.replace(/\D/g, "");
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      setFormError("Please enter a valid mobile number.");
      setFormSubmitting(false);
      return;
    }
    try {
      if (formMode === "create") {
        const body: CreateOrgUserInput = {
          firstName: form.firstName,
          lastName: form.lastName,
          email,
          phoneNumber,
          role: form.role,
          password: form.password || undefined,
        };
        await apiFetch("/org/users", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(body),
        });
        setPage(1);
      } else if (editingId) {
        const body: UpdateOrgUserInput = {
          firstName: form.firstName,
          lastName: form.lastName,
          email,
          phoneNumber,
          role: form.role,
          password: form.password || undefined,
        };
        await apiFetch(`/org/users/${editingId}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(body),
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

  async function toggleStatus(user: OrgUser) {
    if (!accessToken) return;
    setBusyId(user.id);
    setRowError(null);
    const nextStatus = user.status === "active" ? "disabled" : "active";
    try {
      await apiFetch(`/org/users/${user.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status: nextStatus }),
      });
      reload();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to update status.";
      setRowError({ id: user.id, message });
    } finally {
      setBusyId(null);
    }
  }

  async function resendInvite(user: OrgUser) {
    if (!accessToken) return;
    setBusyId(user.id);
    setRowError(null);
    try {
      await apiFetch(`/org/users/${user.id}/resend-invite`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setResentId(user.id);
      setTimeout(() => setResentId((id) => (id === user.id ? null : id)), 3000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to resend invite.";
      setRowError({ id: user.id, message });
    } finally {
      setBusyId(null);
    }
  }

  const rows = result?.data ?? [];
  const total = result?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to = Math.min(page * LIMIT, total);
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const isFiltered = Boolean(search || roleFilter || statusFilter);

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"> Team</div>
          <h1>Users</h1>
          <div className="sub">
            People who can sign in to your organisation&apos;s workspace.
          </div>
        </div>
        <div className="actions">
          <button
            className="btn btn-primary"
            type="button"
            onClick={openCreate}
          >
            ＋ Create user
          </button>
        </div>
      </div>

      {formMode ? (
        <Reveal delay={1}>
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card-h">
              <span className="t">
                {formMode === "create" ? "Create user" : "Edit user"}
              </span>
            </div>
            <div className="card-b">
              {formError ? <div className="form-alert">{formError}</div> : null}
              <div className="row2">
                <div className="field">
                  <label>First name</label>
                  <input
                    className="inp"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, firstName: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Last name</label>
                  <input
                    className="inp"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lastName: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="row2">
                <div className="field">
                  <label>Email <span aria-hidden="true">*</span></label>
                  <input
                    className="inp"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Mobile Number <span aria-hidden="true">*</span></label>
                  <input
                    className="inp"
                    required
                    value={form.phoneNumber}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phoneNumber: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="row2">
                <div className="field">
                  <label>Role</label>
                  <select
                    value={form.role}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        role: e.target.value,
                      }))
                    }
                  >
                    {dynamicRoles.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>{formMode === "create" ? "Password (optional)" : "New Password (optional)"}</label>
                  <PasswordInput
                    placeholder={formMode === "create" ? "Auto-generates temp password if blank" : "Leave blank to keep current password"}
                    value={form.password ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, password: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                Role determines what this person can do. Access to features and pages is governed by organisation dynamic roles & permissions.
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={formSubmitting}
                  onClick={() => void submitForm()}
                >
                  {formSubmitting
                    ? "Saving…"
                    : formMode === "create"
                      ? "Create user"
                      : "Save changes"}
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={closeForm}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      ) : null}

      {!formMode ? (
        <Reveal delay={1}>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                position: "relative",
                flex: 1,
                minWidth: 220,
                maxWidth: 340,
              }}
            >
              <input
                className="inp"
                placeholder="Search by name or email…"
                style={{ paddingLeft: 38 }}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <span
                style={{
                  position: "absolute",
                  left: 13,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--faint)",
                }}
              >
                
              </span>
            </div>
            <select
              style={{ width: 160, flexShrink: 0 }}
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
            <select
              style={{ width: 160, flexShrink: 0 }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "active" | "disabled" | "");
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </Reveal>
      ) : null}

      {!formMode ? (
        <Reveal delay={2}>
          <div className="card">
            <div className="card-h">
              <span className="t">All users</span>
              <span className="muted" style={{ fontSize: 12.5 }}>
                {loading ? "Loading…" : `Showing ${from}–${to} of ${total}`}
              </span>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadError ? (
                    <tr>
                      <td colSpan={5} className="muted">
                        {loadError}
                      </td>
                    </tr>
                  ) : !loading && rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="muted">
                        {isFiltered
                          ? "No users match this filter."
                          : "No users yet — create one to get started."}
                      </td>
                    </tr>
                  ) : (
                    rows.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <span className="u">
                            <span className="av">
                              {initials(user.firstName, user.lastName)}
                            </span>
                            <span>
                              <span className="nm">
                                {fullName(user.firstName, user.lastName, user.email)}
                              </span>
                              <br />
                              <span className="sm">{user.email}</span>
                            </span>
                          </span>
                        </td>
                        <td>
                          {user.role ? (
                            <span
                              className={`badge ${roleBadgeClass(user.role.key)}`}
                            >
                              {user.role.name}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge ${user.status === "active" ? "b-green" : "b-rose"}`}
                          >
                            <span
                              className="dot"
                              style={{ background: "currentColor" }}
                            />
                            {user.status === "active" ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td>{formatDate(user.createdAt)}</td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              flexWrap: "wrap",
                              alignItems: "center",
                            }}
                          >
                            <button
                              className="btn btn-ghost btn-sm"
                              type="button"
                              onClick={() => openEdit(user)}
                            >
                              Edit
                            </button>
                            {user.role?.key === "admin" && user.status === "active" ? null : (
                              <button
                                className="btn btn-ghost btn-sm"
                                type="button"
                                disabled={busyId === user.id}
                                onClick={() => void toggleStatus(user)}
                              >
                                {user.status === "active" ? "Deactivate" : "Activate"}
                              </button>
                            )}
                            {user.mustChangePassword ? (
                              <button
                                className="btn btn-ghost btn-sm"
                                type="button"
                                disabled={busyId === user.id}
                                onClick={() => void resendInvite(user)}
                              >
                                {resentId === user.id ? "Sent " : "Resend"}
                              </button>
                            ) : null}
                          </div>
                          {rowError?.id === user.id ? (
                            <div
                              style={{
                                color: "var(--rose)",
                                fontSize: 12,
                                marginTop: 4,
                              }}
                            >
                              {rowError.message}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  padding: "14px 18px",
                }}
              >
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Prev
                </button>
                <span
                  className="muted"
                  style={{ fontSize: 12.5, alignSelf: "center" }}
                >
                  Page {page} of {totalPages}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next →
                </button>
              </div>
            ) : null}
          </div>
        </Reveal>
      ) : null}
    </>
  );
}
