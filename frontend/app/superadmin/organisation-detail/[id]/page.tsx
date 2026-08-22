"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import type {
  OrganisationActivityRow,
  OrganisationDetail,
  OrganisationUserRow,
} from "@/lib/types";

const TABS = ["Overview", "Users & Teams", "Subscription", "Activity"] as const;
type Tab = (typeof TABS)[number];

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
  const [users, setUsers] = useState<OrganisationUserRow[] | null>(null);
  const [activity, setActivity] = useState<OrganisationActivityRow[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
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
      apiFetch<OrganisationUserRow[]>(`/admin/organisations/${params.id}/users`, { headers }),
      apiFetch<OrganisationActivityRow[]>(`/admin/organisations/${params.id}/activity`, { headers }),
    ])
      .then(([orgRes, usersRes, activityRes]) => {
        setOrg(orgRes);
        setUsers(usersRes);
        setActivity(activityRes);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [accessToken, params.id]);

  function startEdit() {
    if (!org) return;
    setEditName(org.name);
    setEditCity(org.city);
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
        body: JSON.stringify({ name: editName, city: editCity }),
      });
      setOrg((prev) => (prev ? { ...prev, name: editName, city: editCity } : prev));
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
                      <div className="field">
                        <label>Organisation name</label>
                        <input
                          className="inp"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label>City</label>
                        <input
                          className="inp"
                          required
                          value={editCity}
                          onChange={(e) => setEditCity(e.target.value)}
                        />
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
              <div className="card">
                <div className="card-h">
                  <span className="t">Users</span>
                  <span className="x">
                    {org.userCount} users · {org.teamCount} teams
                  </span>
                </div>
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Teams</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!users || users.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="muted">
                            No users found.
                          </td>
                        </tr>
                      ) : (
                        users.map((u) => (
                          <tr key={u.email}>
                            <td>
                              <b>{[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}</b>
                            </td>
                            <td>{u.email}</td>
                            <td className="mono">{u.role ?? "—"}</td>
                            <td>
                              {u.teams.length === 0
                                ? "—"
                                : u.teams.map((team) => (
                                    <span className="chip" key={team}>
                                      {team}
                                    </span>
                                  ))}
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
