"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { PasswordInput } from "@/components/auth/password-input";
import { Modal } from "@/components/ui/modal";
import { Icon } from "@/components/icons";
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

function statusBadgeClass(status: OrgUser["status"]): string {
  switch (status) {
    case "active":
      return "b-green";
    case "pending":
      return "b-amber";
    default:
      return "b-rose";
  }
}

function statusLabel(user: Pick<OrgUser, "status" | "approvedAt">): string {
  if (user.status === "active") return "Active";
  if (user.status === "disabled") return "Disabled";
  return user.approvedAt ? "Awaiting first login" : "Pending";
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

// Mobile number: digits only, an optional single leading "+", at most 15
// digits (E.164) — the same rule the backend DTO enforces. Sanitising on
// every keystroke/paste means the field can only ever hold an acceptable
// value: letters and punctuation are dropped, extra digits past 15 truncated.
const PHONE_NUMBER_REGEX = /^\+?\d{1,15}$/;

function sanitizePhone(raw: string): string {
  const hasPlus = raw.trimStart().startsWith("+");
  const digits = raw.replace(/\D/g, "").slice(0, 15);
  if (!digits) return hasPlus ? "+" : "";
  return `${hasPlus ? "+" : ""}${digits}`;
}

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

  // Per-action gating for the Users module. `view` (checked above) lets a
  // member open this page; each write action then needs its own grant.
  // Org admins are unrestricted. "Approve" covers the whole activate/
  // deactivate pair — approving a pending member and deactivating an active
  // one are two directions of the same control.
  const isAdmin = isOrgAdmin();
  const canAdd = isAdmin || hasPermission("users", "add");
  const canEdit = isAdmin || hasPermission("users", "edit");
  const canApprove = isAdmin || hasPermission("users", "approve");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<
    "active" | "disabled" | "pending" | ""
  >("");
  const [page, setPage] = useState(1);
  const [dynamicRoles, setDynamicRoles] = useState<{ value: string; label: string }[]>([]);

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
        } else {
          setDynamicRoles(DEFAULT_ROLE_OPTIONS);
        }
      })
      .catch(() => {
        setDynamicRoles(DEFAULT_ROLE_OPTIONS);
      });
  }, [accessToken]);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const [resentId, setResentId] = useState<string | null>(null);

  // Confirmation dialog for sensitive actions (approve / disapprove /
  // deactivate / admin password reset).
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    run: () => void | Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

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
      // Normalise a stored value to the shape the field now enforces, so a
      // legacy row stays editable without forcing a retype.
      phoneNumber: sanitizePhone(user.phoneNumber ?? ""),
      role: user.role?.key ?? "sales",
    });
    setFormError(null);
  }

  function closeForm() {
    setFormMode(null);
    setEditingId(null);
    setFormError(null);
  }

  async function submitForm(opts?: { confirmed?: boolean }) {
    if (!accessToken || !formMode) return;

    const email = form.email.trim();
    const phoneNumber = form.phoneNumber.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Please enter a valid email address.");
      return;
    }
    if (!phoneNumber) {
      setFormError("Mobile number is required.");
      return;
    }
    if (!PHONE_NUMBER_REGEX.test(phoneNumber)) {
      setFormError("Mobile number must contain digits only (max 15).");
      return;
    }
    const phoneDigits = phoneNumber.replace(/\D/g, "");
    if (phoneDigits.length < 7) {
      setFormError("Please enter a valid mobile number.");
      return;
    }

    // Changing a user's password from the edit form is a sensitive action —
    // confirm before it ends their sessions and forces a re-login.
    if (
      formMode === "edit" &&
      (form.password ?? "").trim() &&
      !opts?.confirmed
    ) {
      setConfirm({
        title: "Change this user's password?",
        message:
          "They'll be signed out everywhere and must set a new password the next time they sign in. An email with the new temporary password will be sent to them.",
        confirmLabel: "Change password",
        danger: true,
        run: () => submitForm({ confirmed: true }),
      });
      return;
    }

    setFormSubmitting(true);
    setFormError(null);
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

  async function runRowAction(
    user: OrgUser,
    path: string,
    fallbackMessage: string,
  ) {
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
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : fallbackMessage;
      setRowError({ id: user.id, message });
    } finally {
      setBusyId(null);
    }
  }

  function askApprove(user: OrgUser) {
    setConfirm({
      title: "Approve user?",
      message: `${fullName(user.firstName, user.lastName, user.email)} will be able to sign in and will be asked to set a new password on first login.`,
      confirmLabel: "Approve",
      run: () => runRowAction(user, "approve", "Failed to approve user."),
    });
  }

  function askDisapprove(user: OrgUser) {
    const isActive = user.status === "active";
    setConfirm({
      title: isActive ? "Deactivate user?" : "Disapprove user?",
      message: `${fullName(user.firstName, user.lastName, user.email)} will be signed out on their next action and won't be able to log in until re-approved.`,
      confirmLabel: isActive ? "Deactivate" : "Disapprove",
      danger: true,
      run: () =>
        runRowAction(user, "disapprove", "Failed to update user access."),
    });
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
        {canAdd ? (
          <div className="actions">
            <button
              className="btn btn-primary"
              type="button"
              onClick={openCreate}
            >
              <Icon name="plus" size={15} /> Create user
            </button>
          </div>
        ) : null}
      </div>

      <Modal
        open={formMode !== null}
        onClose={closeForm}
        size="lg"
        title={formMode === "edit" ? "Edit user" : "Create user"}
        description={
          formMode === "edit"
            ? "Update this person’s profile, role, or password."
            : "Add a person who can sign in to this organisation."
        }
      >
        <form
          className="stack"
          style={{ display: "grid", gap: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            void submitForm();
          }}
        >
          {formError ? <div className="form-alert">{formError}</div> : null}
          <div className="row2">
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="user-first-name">First name</label>
              <input
                id="user-first-name"
                className="inp"
                name="firstName"
                autoComplete="given-name"
                placeholder="e.g. Ananya"
                value={form.firstName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, firstName: e.target.value }))
                }
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="user-last-name">Last name</label>
              <input
                id="user-last-name"
                className="inp"
                name="lastName"
                autoComplete="family-name"
                placeholder="e.g. Sharma"
                value={form.lastName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lastName: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="row2">
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="user-email">Email <span aria-hidden="true">*</span></label>
              <input
                id="user-email"
                className="inp"
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="name@company.com"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="user-phone">Mobile number <span aria-hidden="true">*</span></label>
              <input
                id="user-phone"
                className="inp"
                type="tel"
                name="phone"
                required
                autoComplete="tel"
                inputMode="numeric"
                maxLength={16}
                placeholder="+919876543210"
                value={form.phoneNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phoneNumber: sanitizePhone(e.target.value) }))
                }
              />
            </div>
          </div>
          <div className="row2">
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="user-role">Role</label>
              <select
                id="user-role"
                className="inp"
                name="role"
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    role: e.target.value,
                  }))
                }
              >
                {dynamicRoles.length === 0 ? (
                  <option value="">Select a role</option>
                ) : null}
                {dynamicRoles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="user-password">
                {formMode === "edit" ? "New password (optional)" : "Password (optional)"}
              </label>
              <PasswordInput
                id="user-password"
                autoComplete="new-password"
                placeholder={
                  formMode === "edit"
                    ? "Leave blank to keep current password"
                    : "Leave blank to email a temporary password"
                }
                value={form.password ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </div>
          </div>
          <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
            Role controls what they can do. Permissions come from organisation roles.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={closeForm}
              disabled={formSubmitting}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={formSubmitting}
            >
              {formSubmitting
                ? "Saving…"
                : formMode === "edit"
                  ? "Save changes"
                  : "Create user"}
            </button>
          </div>
        </form>
      </Modal>

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
                setStatusFilter(
                  e.target.value as "active" | "disabled" | "pending" | "",
                );
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </Reveal>

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
                            className={`badge ${statusBadgeClass(user.status)}`}
                          >
                            <span
                              className="dot"
                              style={{ background: "currentColor" }}
                            />
                            {statusLabel(user)}
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
                            {canEdit ? (
                              <button
                                className="btn btn-ghost btn-sm"
                                type="button"
                                onClick={() => openEdit(user)}
                              >
                                Edit
                              </button>
                            ) : null}
                            {canApprove &&
                            (user.status === "pending" ||
                              user.status === "disabled") ? (
                              <button
                                className="btn btn-ghost btn-sm"
                                type="button"
                                disabled={busyId === user.id}
                                onClick={() => askApprove(user)}
                              >
                                Approve
                              </button>
                            ) : null}
                            {canApprove &&
                            (user.status === "pending" ||
                              user.status === "active") &&
                            !(
                              user.role?.key === "admin" &&
                              user.status === "active"
                            ) ? (
                              <button
                                className="btn btn-ghost btn-sm"
                                type="button"
                                disabled={busyId === user.id}
                                onClick={() => askDisapprove(user)}
                              >
                                {user.status === "active"
                                  ? "Deactivate"
                                  : "Disapprove"}
                              </button>
                            ) : null}
                            {canEdit &&
                            user.status !== "active" &&
                            user.mustChangePassword ? (
                              <button
                                className="btn btn-ghost btn-sm"
                                type="button"
                                disabled={busyId === user.id}
                                onClick={() => void resendInvite(user)}
                              >
                                {resentId === user.id ? "Sent " : "Resend Mail"}
                              </button>
                            ) : null}
                            {!canEdit && !canApprove ? (
                              <span className="muted" style={{ fontSize: 12 }}>
                                View only
                              </span>
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

      {confirm ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => (confirmBusy ? null : setConfirm(null))}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 80,
            padding: 20,
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 440, width: "100%" }}
          >
            <div className="card-h">
              <span className="t">{confirm.title}</span>
            </div>
            <div className="card-b">
              <p style={{ margin: 0, lineHeight: 1.55 }}>{confirm.message}</p>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button
                  className={`btn ${confirm.danger ? "btn-danger" : "btn-primary"}`}
                  type="button"
                  disabled={confirmBusy}
                  onClick={async () => {
                    setConfirmBusy(true);
                    try {
                      await confirm.run();
                      setConfirm(null);
                    } finally {
                      setConfirmBusy(false);
                    }
                  }}
                >
                  {confirmBusy ? "Working…" : confirm.confirmLabel}
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  disabled={confirmBusy}
                  onClick={() => setConfirm(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
