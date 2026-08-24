"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import type {
  CreateOrgUserInput,
  OrganisationActivityRow,
  OrganisationDetail,
  OrgUser,
  OrgUserAssignableRole,
  OrgUsersListResponse,
} from "@/lib/types";

const TABS = ["Overview", "Users & Teams", "Subscription", "Activity"] as const;
type Tab = (typeof TABS)[number];

const ROLE_OPTIONS: { value: OrgUserAssignableRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "sales", label: "Sales" },
];

const ROLE_BADGE_CLASS: Record<OrgUserAssignableRole, string> = {
  admin: "b-indigo",
  manager: "b-violet",
  sales: "b-teal",
};

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: OrgUserAssignableRole;
}

const EMPTY_USER_FORM: UserFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  role: "sales",
};

interface EditForm {
  name: string;
  city: string;
  timezone: string;
  currency: string;
  defaultLanguage: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  state: string;
  postalCode: string;
  country: string;
  logoUrl: string;
  faviconUrl: string;
  brandColour: string;
}

const EMPTY_EDIT_FORM: EditForm = {
  name: "",
  city: "",
  timezone: "",
  currency: "",
  defaultLanguage: "",
  website: "",
  addressLine1: "",
  addressLine2: "",
  state: "",
  postalCode: "",
  country: "",
  logoUrl: "",
  faviconUrl: "",
  brandColour: "",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatActionLabel(action: string): string {
  return action
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function SuperAdminOrganisationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, isLoading: authLoading } = useAuth();

  const [tab, setTab] = useState<Tab>("Overview");
  const [org, setOrg] = useState<OrganisationDetail | null>(null);
  const [users, setUsers] = useState<OrgUser[] | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersReloadTick, setUsersReloadTick] = useState(0);
  const [activity, setActivity] = useState<OrganisationActivityRow[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const [userFormOpen, setUserFormOpen] = useState(false);
  const [userForm, setUserForm] = useState<UserFormData>(EMPTY_USER_FORM);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [userFormSubmitting, setUserFormSubmitting] = useState(false);
  const [userStatusBusyId, setUserStatusBusyId] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !accessToken) {
      router.replace("/login");
    }
  }, [authLoading, accessToken, router]);

  useEffect(() => {
    if (!accessToken || !params.id) return;
    const headers = { Authorization: `Bearer ${accessToken}` };
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setNotFound(false);
    /* eslint-enable react-hooks/set-state-in-effect */

    Promise.all([
      apiFetch<OrganisationDetail>(`/admin/organisations/${params.id}`, { headers }),
      apiFetch<OrganisationActivityRow[]>(`/admin/organisations/${params.id}/activity`, { headers }),
    ])
      .then(([orgRes, activityRes]) => {
        setOrg(orgRes);
        setActivity(activityRes);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [accessToken, params.id]);

  useEffect(() => {
    if (!accessToken || !params.id) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setUsersLoading(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    apiFetch<OrgUsersListResponse>(`/admin/organisations/${params.id}/users?limit=100`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => setUsers(res.data))
      .catch(() => setUsers(null))
      .finally(() => setUsersLoading(false));
  }, [accessToken, params.id, usersReloadTick]);

  function openCreateUser() {
    setUserForm(EMPTY_USER_FORM);
    setUserFormError(null);
    setUserFormOpen(true);
  }

  async function submitCreateUser() {
    if (!accessToken || !params.id) return;
    setUserFormSubmitting(true);
    setUserFormError(null);
    try {
      const body: CreateOrgUserInput = {
        firstName: userForm.firstName,
        lastName: userForm.lastName,
        email: userForm.email,
        phoneNumber: userForm.phoneNumber || undefined,
        role: userForm.role,
      };
      await apiFetch(`/admin/organisations/${params.id}/users`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });
      setUserFormOpen(false);
      setUsersReloadTick((t) => t + 1);
    } catch (err) {
      setUserFormError(err instanceof Error ? err.message : "Failed to create user.");
    } finally {
      setUserFormSubmitting(false);
    }
  }

  async function toggleUserStatus(user: OrgUser) {
    if (!accessToken || !params.id) return;
    const nextStatus = user.status === "active" ? "disabled" : "active";
    setUserStatusBusyId(user.id);
    try {
      await apiFetch(`/admin/organisations/${params.id}/users/${user.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status: nextStatus }),
      });
      setUsersReloadTick((t) => t + 1);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to update user status.");
    } finally {
      setUserStatusBusyId(null);
    }
  }

  function startEdit() {
    if (!org) return;
    setEditForm({
      name: org.name,
      city: org.city,
      timezone: org.timezone,
      currency: org.currency,
      defaultLanguage: org.defaultLanguage,
      website: org.website ?? "",
      addressLine1: org.addressLine1 ?? "",
      addressLine2: org.addressLine2 ?? "",
      state: org.state ?? "",
      postalCode: org.postalCode ?? "",
      country: org.country ?? "",
      logoUrl: org.logoUrl ?? "",
      faviconUrl: org.faviconUrl ?? "",
      brandColour: org.brandColour ?? "",
    });
    setEditError(null);
    setEditing(true);
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!org || !accessToken) return;
    setEditError(null);
    setEditSubmitting(true);
    try {
      await apiFetch(`/admin/organisations/${org.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(editForm),
      });
      setOrg((prev) => (prev ? { ...prev, ...editForm } : prev));
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function confirmToggleStatus() {
    if (!org || !accessToken) return;
    const next = org.status === "active" ? "disabled" : "active";

    setStatusSubmitting(true);
    try {
      await apiFetch(`/admin/organisations/${org.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status: next }),
      });
      setOrg((prev) => (prev ? { ...prev, status: next } : prev));
      setStatusModalOpen(false);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setStatusSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!org || !accessToken) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await apiFetch(`/admin/organisations/${org.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      router.push("/superadmin/organisations");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete organisation.");
      setDeleting(false);
    }
  }

  if (authLoading || !accessToken || loading) {
    return null;
  }

  if (notFound || !org) {
    return (
      <div className="card">
        <div className="card-b">
          <p className="muted">Organisation not found.</p>
        </div>
      </div>
    );
  }

  const adminName = org.admin
    ? [org.admin.firstName, org.admin.lastName].filter(Boolean).join(" ") || "—"
    : "—";

  return (
    <>
      <div className="page-head reveal in">
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span className="av" style={{ width: 58, height: 58, borderRadius: 16, fontSize: 20 }}>
            {initials(org.name)}
          </span>
          <div>
            <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {org.name}{" "}
              <span className={`badge ${org.status === "active" ? "b-green" : "b-rose"}`}>
                <span className="dot" style={{ background: "currentColor" }} />
                {org.status === "active" ? "Active" : "Disabled"}
              </span>
            </h1>
            <div className="sub" style={{ marginTop: 4 }}>
              {org.city} · <span className="mono">{org.slug}</span> · onboarded {formatDate(org.createdAt)}
            </div>
          </div>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" disabled title="Coming soon">
            ✉️ Message admin
          </button>
          <button className="btn btn-ghost" onClick={() => setStatusModalOpen(true)} disabled={statusSubmitting}>
            {org.status === "active" ? "⏸ Suspend" : "▶ Reactivate"}
          </button>
          <button className="btn btn-primary" disabled title="Coming soon">
            Manage subscription
          </button>
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: 20 }}>
        <Reveal delay={1}>
          <div className="stat">
            <div className="top">
              <span className="label">Users</span>
              <span className="ic ic-indigo">👤</span>
            </div>
            <div className="value">
              <CountUp value={org.userCount} />
            </div>
            <div className="delta">{org.teamCount} teams</div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="stat">
            <div className="top">
              <span className="label">Sites</span>
              <span className="ic ic-sky">📄</span>
            </div>
            <div className="value">—</div>
            <div className="delta">—</div>
          </div>
        </Reveal>
        <Reveal delay={3}>
          <div className="stat">
            <div className="top">
              <span className="label">Leads captured</span>
              <span className="ic ic-green">📇</span>
            </div>
            <div className="value">—</div>
            <div className="delta">—</div>
          </div>
        </Reveal>
        <Reveal delay={4}>
          <div className="stat">
            <div className="top">
              <span className="label">Plan value</span>
              <span className="ic ic-violet">💳</span>
            </div>
            <div className="value">—</div>
            <div className="delta">—</div>
          </div>
        </Reveal>
      </div>

      <div className="tabs reveal in">
        {TABS.map((t) => (
          <a key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t}
          </a>
        ))}
      </div>

      <div className="grid g-2-1">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {tab === "Overview" ? (
            <Reveal delay={2}>
              <div className="card">
                <div className="card-h">
                  <span className="t">Organisation details</span>
                  {!editing ? (
                    <button className="btn btn-ghost btn-sm" onClick={startEdit}>
                      Edit
                    </button>
                  ) : null}
                </div>
                <div className="card-b">
                  {editing ? (
                    <form onSubmit={handleEditSubmit}>
                      <div className="row2">
                        <div className="field">
                          <label>Organisation name</label>
                          <input
                            className="inp"
                            required
                            value={editForm.name}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          />
                        </div>
                        <div className="field">
                          <label>City</label>
                          <input
                            className="inp"
                            required
                            value={editForm.city}
                            onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="row2">
                        <div className="field">
                          <label>Timezone</label>
                          <input
                            className="inp"
                            value={editForm.timezone}
                            onChange={(e) => setEditForm((f) => ({ ...f, timezone: e.target.value }))}
                          />
                        </div>
                        <div className="field">
                          <label>Currency</label>
                          <input
                            className="inp"
                            value={editForm.currency}
                            onChange={(e) => setEditForm((f) => ({ ...f, currency: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="row2">
                        <div className="field">
                          <label>Default language</label>
                          <input
                            className="inp"
                            value={editForm.defaultLanguage}
                            onChange={(e) => setEditForm((f) => ({ ...f, defaultLanguage: e.target.value }))}
                          />
                        </div>
                        <div className="field">
                          <label>Website</label>
                          <input
                            className="inp"
                            placeholder="https://…"
                            value={editForm.website}
                            onChange={(e) => setEditForm((f) => ({ ...f, website: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="row2">
                        <div className="field">
                          <label>Address line 1</label>
                          <input
                            className="inp"
                            value={editForm.addressLine1}
                            onChange={(e) => setEditForm((f) => ({ ...f, addressLine1: e.target.value }))}
                          />
                        </div>
                        <div className="field">
                          <label>Address line 2</label>
                          <input
                            className="inp"
                            value={editForm.addressLine2}
                            onChange={(e) => setEditForm((f) => ({ ...f, addressLine2: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="row2">
                        <div className="field">
                          <label>State</label>
                          <input
                            className="inp"
                            value={editForm.state}
                            onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value }))}
                          />
                        </div>
                        <div className="field">
                          <label>Postal code</label>
                          <input
                            className="inp"
                            value={editForm.postalCode}
                            onChange={(e) => setEditForm((f) => ({ ...f, postalCode: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="row2">
                        <div className="field">
                          <label>Country</label>
                          <input
                            className="inp"
                            value={editForm.country}
                            onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value }))}
                          />
                        </div>
                        <div className="field">
                          <label>Brand colour</label>
                          <input
                            className="inp mono"
                            placeholder="#4f46e5"
                            value={editForm.brandColour}
                            onChange={(e) => setEditForm((f) => ({ ...f, brandColour: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="row2">
                        <div className="field">
                          <label>Logo URL</label>
                          <input
                            className="inp"
                            placeholder="https://…"
                            value={editForm.logoUrl}
                            onChange={(e) => setEditForm((f) => ({ ...f, logoUrl: e.target.value }))}
                          />
                        </div>
                        <div className="field">
                          <label>Favicon URL</label>
                          <input
                            className="inp"
                            placeholder="https://…"
                            value={editForm.faviconUrl}
                            onChange={(e) => setEditForm((f) => ({ ...f, faviconUrl: e.target.value }))}
                          />
                        </div>
                      </div>
                      {editError ? <div className="form-alert">{editError}</div> : null}
                      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setEditing(false)}
                          disabled={editSubmitting}
                        >
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={editSubmitting}>
                          {editSubmitting ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid g2" style={{ gap: 14 }}>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Admin
                        </div>
                        <b>{adminName}</b>
                        <div className="sm muted">{org.admin?.email ?? "—"}</div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Phone
                        </div>
                        <b>{org.admin?.phoneNumber ?? "—"}</b>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          City
                        </div>
                        <b>{org.city}</b>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Subdomain root
                        </div>
                        <b className="mono">{org.slug}</b>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Timezone
                        </div>
                        <b>{org.timezone}</b>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Currency
                        </div>
                        <b>{org.currency}</b>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Default language
                        </div>
                        <b>{org.defaultLanguage}</b>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Website
                        </div>
                        <b>{org.website ?? "—"}</b>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Address
                        </div>
                        <b>
                          {[org.addressLine1, org.addressLine2, org.state, org.postalCode, org.country]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </b>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Brand colour
                        </div>
                        {org.brandColour ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: 4,
                                background: org.brandColour,
                                display: "inline-block",
                              }}
                            />
                            <b className="mono">{org.brandColour}</b>
                          </span>
                        ) : (
                          <b>—</b>
                        )}
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Plan
                        </div>
                        <b>—</b>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Status
                        </div>
                        <span className={`badge ${org.status === "active" ? "b-green" : "b-rose"}`}>
                          {org.status === "active" ? "Active" : "Disabled"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Reveal>
          ) : null}

          {tab === "Users & Teams" ? (
            <Reveal delay={2}>
              {userFormOpen ? (
                <div className="card" style={{ marginBottom: 18 }}>
                  <div className="card-h">
                    <span className="t">Create user</span>
                  </div>
                  <div className="card-b">
                    {userFormError ? <div className="form-alert">{userFormError}</div> : null}
                    <div className="row2">
                      <div className="field">
                        <label>First name</label>
                        <input
                          className="inp"
                          value={userForm.firstName}
                          onChange={(e) => setUserForm((f) => ({ ...f, firstName: e.target.value }))}
                        />
                      </div>
                      <div className="field">
                        <label>Last name</label>
                        <input
                          className="inp"
                          value={userForm.lastName}
                          onChange={(e) => setUserForm((f) => ({ ...f, lastName: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="row2">
                      <div className="field">
                        <label>Email</label>
                        <input
                          className="inp"
                          type="email"
                          value={userForm.email}
                          onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                        />
                      </div>
                      <div className="field">
                        <label>Phone (optional)</label>
                        <input
                          className="inp"
                          value={userForm.phoneNumber}
                          onChange={(e) => setUserForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>Role</label>
                      <select
                        value={userForm.role}
                        onChange={(e) =>
                          setUserForm((f) => ({ ...f, role: e.target.value as OrgUserAssignableRole }))
                        }
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
                        Role determines what this person can do. They&apos;ll get access to modules (Leads, Call
                        Centre, Landing Pages, Reports) once they&apos;re added to a team.
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                      <button
                        className="btn btn-primary"
                        type="button"
                        disabled={userFormSubmitting}
                        onClick={() => void submitCreateUser()}
                      >
                        {userFormSubmitting ? "Saving…" : "Create user"}
                      </button>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        disabled={userFormSubmitting}
                        onClick={() => setUserFormOpen(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="card">
                <div className="card-h">
                  <span className="t">Users</span>
                  <span className="x" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {org.userCount} users · {org.teamCount} teams
                    {!userFormOpen ? (
                      <button className="btn btn-primary btn-sm" type="button" onClick={openCreateUser}>
                        ＋ Create user
                      </button>
                    ) : null}
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
                      {usersLoading && !users ? (
                        <tr>
                          <td colSpan={5} className="muted">
                            Loading…
                          </td>
                        </tr>
                      ) : !users || users.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="muted">
                            No users found.
                          </td>
                        </tr>
                      ) : (
                        users.map((u) => (
                          <tr key={u.id}>
                            <td>
                              <span className="u">
                                <span className="av">{initials([u.firstName, u.lastName].filter(Boolean).join(" "))}</span>
                                <span>
                                  <span className="nm">{[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}</span>
                                  <br />
                                  <span className="sm">{u.email}</span>
                                </span>
                              </span>
                            </td>
                            <td>
                              {u.role ? (
                                <span className={`badge ${ROLE_BADGE_CLASS[u.role.key]}`}>{u.role.name}</span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>
                              <span className={`badge ${u.status === "active" ? "b-green" : "b-rose"}`}>
                                <span className="dot" style={{ background: "currentColor" }} />
                                {u.status === "active" ? "Active" : "Disabled"}
                              </span>
                            </td>
                            <td>{formatDate(u.createdAt)}</td>
                            <td>
                              <button
                                className="btn btn-ghost btn-sm"
                                type="button"
                                disabled={userStatusBusyId === u.id}
                                onClick={() => void toggleUserStatus(u)}
                              >
                                {u.status === "active" ? "Deactivate" : "Activate"}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Reveal>
          ) : null}

          {tab === "Subscription" ? (
            <Reveal delay={2}>
              <div className="card">
                <div className="card-h">
                  <span className="t">Subscription</span>
                </div>
                <div className="card-b">
                  <p className="muted">Coming soon — billing and plans aren&apos;t built yet.</p>
                </div>
              </div>
            </Reveal>
          ) : null}

          {tab === "Activity" ? (
            <Reveal delay={2}>
              <div className="card">
                <div className="card-h">
                  <span className="t">All activity</span>
                </div>
                <div className="card-b">
                  {!activity || activity.length === 0 ? (
                    <p className="muted">No activity yet.</p>
                  ) : (
                    <ul className="timeline">
                      {activity.map((entry) => (
                        <li key={entry.id}>
                          <span className="td" />
                          <b style={{ fontSize: 13 }}>{formatActionLabel(entry.action)}</b>
                          <div className="tt">
                            {entry.entity ?? "—"} · {formatDateTime(entry.createdAt)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Reveal>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Reveal delay={2}>
            <div className="card">
              <div className="card-h">
                <span className="t">Activity</span>
              </div>
              <div className="card-b">
                {!activity || activity.length === 0 ? (
                  <p className="muted">No activity yet.</p>
                ) : (
                  <ul className="timeline">
                    {activity.slice(0, 5).map((entry) => (
                      <li key={entry.id}>
                        <span className="td" />
                        <b style={{ fontSize: 13 }}>{formatActionLabel(entry.action)}</b>
                        <div className="tt">
                          {entry.entity ?? "—"} · {formatDateTime(entry.createdAt)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Reveal>
          <Reveal delay={3}>
            <div className="card">
              <div className="card-h">
                <span className="t">Danger zone</span>
              </div>
              <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  className="btn btn-ghost btn-block"
                  onClick={() => setStatusModalOpen(true)}
                  disabled={statusSubmitting}
                >
                  {org.status === "active" ? "⏸ Suspend organisation" : "▶ Reactivate organisation"}
                </button>
                <button
                  className="btn btn-ghost btn-block"
                  style={{ color: "var(--rose)", borderColor: "var(--rose-050)" }}
                  onClick={() => setDeleteModalOpen(true)}
                >
                  🗑 Delete organisation
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {statusModalOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 400,
            padding: 20,
          }}
          onClick={() => {
            if (!statusSubmitting) setStatusModalOpen(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 32,
              width: 440,
              maxWidth: "100%",
              boxShadow: "0 24px 80px rgba(15,23,42,.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "var(--amber-050)",
                  color: "var(--amber)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 18,
                }}
              >
                {org.status === "active" ? "⏸" : "▶"}
              </span>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>
                {org.status === "active" ? "Suspend organisation?" : "Reactivate organisation?"}
              </h2>
            </div>
            <p style={{ margin: "0 0 6px", color: "var(--ink-2)", fontSize: 13.5, lineHeight: 1.6 }}>
              {org.status === "active" ? (
                <>
                  <strong>&quot;{org.name}&quot;</strong> will be marked disabled. No data is deleted — you
                  can reactivate any time.
                </>
              ) : (
                <>
                  <strong>&quot;{org.name}&quot;</strong> will be marked active again.
                </>
              )}
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 24,
                paddingTop: 20,
                borderTop: "1px solid var(--line)",
              }}
            >
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setStatusModalOpen(false)}
                disabled={statusSubmitting}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => void confirmToggleStatus()}
                disabled={statusSubmitting}
              >
                {statusSubmitting
                  ? "Saving…"
                  : org.status === "active"
                    ? "Suspend organisation"
                    : "Reactivate organisation"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteModalOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 400,
            padding: 20,
          }}
          onClick={() => {
            if (!deleting) setDeleteModalOpen(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 32,
              width: 440,
              maxWidth: "100%",
              boxShadow: "0 24px 80px rgba(15,23,42,.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "var(--rose-050)",
                  color: "var(--rose)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 18,
                }}
              >
                🗑
              </span>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>
                Delete organisation?
              </h2>
            </div>
            <p style={{ margin: "0 0 6px", color: "var(--ink-2)", fontSize: 13.5, lineHeight: 1.6 }}>
              <strong>&quot;{org.name}&quot;</strong> and its {org.userCount} user
              {org.userCount === 1 ? "" : "s"} will be permanently deleted.
            </p>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>This action cannot be undone.</p>

            {deleteError ? (
              <div
                style={{
                  color: "var(--rose)",
                  fontSize: 13,
                  marginTop: 12,
                  background: "var(--rose-050)",
                  padding: "8px 12px",
                  borderRadius: 8,
                }}
              >
                {deleteError}
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 24,
                paddingTop: 20,
                borderTop: "1px solid var(--line)",
              }}
            >
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button className="btn btn-danger" type="button" onClick={() => void handleDelete()} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete organisation"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
