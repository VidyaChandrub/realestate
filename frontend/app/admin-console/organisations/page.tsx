"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import type {
  OrganisationListResponse,
  OrganisationListRow,
  OrganisationSummary,
  PendingSignupListResponse,
  PendingSignupRow,
} from "@/lib/types";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { RowActionsMenu, type RowAction } from "@/components/superadmin/row-actions-menu";
import { ReasonInfoPopover } from "@/components/superadmin/reason-info-popover";

// The "Rejected / Disabled" pill's status param covers both admin-disabled and
// rejected orgs (see the backend's list() query) — labelled to match.
// "Draft" is a separate bucket for abandoned self-serve signups and any
// Super-Admin-precreated org never assigned an admin. Drafts also appear in
// "All" so incomplete onboarding attempts remain visible to Super Admin.
const LIMIT = 20;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
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

const STATUS_PILLS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "disabled", label: "Rejected / Disabled" },
  { value: "draft", label: "Draft" },
];

// Not an Organisation.status value — a separate mode entirely. These rows
// have no orgId, so they can never be one of the OrganisationListRow above
// (a fake org id would enable organisation actions against something that
// isn't one). Kept as its own statusFilter value purely so the existing
// pill-row UI can drive it, not because it's actually a status.
const PENDING_SIGNUPS_FILTER = "pending_signups";

function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export default function SuperAdminOrganisationsPage() {
  const router = useRouter();
  const { accessToken, isLoading: authLoading } = useAuth();

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [summary, setSummary] = useState<OrganisationSummary | null>(null);
  const [result, setResult] = useState<OrganisationListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    run: () => Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Pending signups — a separate dataset entirely (Users, not
  // Organisations), fetched only while that filter is selected.
  const [pendingSignupsResult, setPendingSignupsResult] = useState<PendingSignupListResponse | null>(null);
  const [pendingSignupsLoading, setPendingSignupsLoading] = useState(false);
  const [pendingSignupsError, setPendingSignupsError] = useState<string | null>(null);
  const [signupDrawer, setSignupDrawer] = useState<PendingSignupRow | null>(null);
  const [deletingSignupId, setDeletingSignupId] = useState<string | null>(null);

  const notify = (m:string)=>{ setToast(m); setTimeout(()=>setToast(null),2500); };

  useEffect(() => {
    if (!authLoading && !accessToken) {
      router.replace("/login");
    }
  }, [authLoading, accessToken, router]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchSummary = useCallback(()=>{
    if (!accessToken) return;
    apiFetch<OrganisationSummary>("/admin/organisations/summary", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(setSummary).catch(() => setSummary(null));
  },[accessToken]);

  const fetchList = useCallback(()=>{
    // Pending signups aren't organisations — status isn't even a valid
    // value for this endpoint (see ORG_LIST_STATUS_VALUES) — fetchPendingSignups
    // below owns that dataset instead.
    if (!accessToken || statusFilter === PENDING_SIGNUPS_FILTER) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
      status: statusFilter,
    });
    if (search) params.set("search", search);
    apiFetch<OrganisationListResponse>(`/admin/organisations?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(setResult).catch((err) => setError(err instanceof Error ? err.message : "Failed to load organisations.")).finally(() => setLoading(false));
  },[accessToken, statusFilter, search, page]);

  const fetchPendingSignups = useCallback(() => {
    if (!accessToken || statusFilter !== PENDING_SIGNUPS_FILTER) return;
    setPendingSignupsLoading(true);
    setPendingSignupsError(null);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (search) params.set("search", search);
    apiFetch<PendingSignupListResponse>(`/admin/organisations/pending-signups?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(setPendingSignupsResult)
      .catch((err) => setPendingSignupsError(err instanceof Error ? err.message : "Failed to load pending signups."))
      .finally(() => setPendingSignupsLoading(false));
  }, [accessToken, statusFilter, search, page]);

  useEffect(()=>{ fetchSummary(); },[fetchSummary]);
  useEffect(()=>{ fetchList(); },[fetchList]);
  useEffect(()=>{ fetchPendingSignups(); },[fetchPendingSignups]);

  const handleApprove = async (id:string) => {
    if (!accessToken) return;
    setActionBusy(id);
    try{
      await apiFetch(`/admin/organisations/${id}/approve`, { method:"POST", headers:{ Authorization:`Bearer ${accessToken}` }, body: JSON.stringify({}) });
      notify("Approved");
      fetchList(); fetchSummary();
    } catch(e:any){ notify(e.message||"Approve failed"); }
    finally{ setActionBusy(null); }
  };
  const handleReject = (id:string, name:string) => {
    if (!accessToken) return;
    setRejectReason("");
    setRejectError(null);
    setRejectModal({ id, name });
  };
  const submitReject = async () => {
    if (!accessToken || !rejectModal) return;
    const reason = rejectReason.trim();
    if (reason.length === 0) {
      setRejectError("Please enter a reason before rejecting this organisation.");
      return;
    }
    if (reason.length < 3) {
      setRejectError("Reason must be at least 3 characters.");
      return;
    }
    setRejectError(null);
    const { id } = rejectModal;
    setRejectSubmitting(true);
    setActionBusy(id);
    try{
      await apiFetch(`/admin/organisations/${id}/reject`, { method:"POST", headers:{ Authorization:`Bearer ${accessToken}` }, body: JSON.stringify({ reason }) });
      notify("Rejected");
      setRejectModal(null);
      setRejectReason("");
      fetchList(); fetchSummary();
    } catch(e:any){ notify(e.message||"Reject failed"); }
    finally{ setRejectSubmitting(false); setActionBusy(null); }
  };
  const handleActivate = async (id:string) => {
    if (!accessToken) return;
    setActionBusy(id);
    try{
      await apiFetch(`/admin/organisations/${id}/status`, { method:"PATCH", headers:{ Authorization:`Bearer ${accessToken}` }, body: JSON.stringify({ status:"active"}) });
      notify("Activated");
      fetchList(); fetchSummary();
    } catch(e:any){ notify(e.message||"Activate failed");}
    finally{ setActionBusy(null);}
  };
  const handleDeactivate = (id:string) => {
    if (!accessToken) return;
    setConfirmState({
      title: "Deactivate organisation?",
      message: "The organisation will be marked disabled. You can reactivate it later.",
      run: async () => {
        setActionBusy(id);
        try{
          await apiFetch(`/admin/organisations/${id}/status`, { method:"PATCH", headers:{ Authorization:`Bearer ${accessToken}` }, body: JSON.stringify({ status:"disabled"}) });
          notify("Deactivated");
          fetchList(); fetchSummary();
        } catch(e:any){ notify(e.message||"Deactivate failed");}
        finally{ setActionBusy(null);}
      },
    });
  };
  const handleDelete = (id:string) => {
    if (!accessToken) return;
    setConfirmState({
      title: "Delete organisation permanently?",
      message: "This cannot be undone.",
      run: async () => {
        setActionBusy(id);
        try{
          await apiFetch(`/admin/organisations/${id}`, { method:"DELETE", headers:{ Authorization:`Bearer ${accessToken}` } });
          notify("Deleted");
          fetchList(); fetchSummary();
        } catch(e:any){ notify(e.message||"Delete failed");}
        finally{ setActionBusy(null);}
      },
    });
  };

  // Hard delete, not a status flip — see AdminOrganisationsService.deletePendingSignup
  // for why (a disabled row would permanently squat on that email/phone).
  const handleDeleteSignup = (row: PendingSignupRow) => {
    if (!accessToken) return;
    setConfirmState({
      title: "Delete this signup permanently?",
      message: `${row.email} will be removed entirely — they can sign up again with the same email or phone number afterwards. This cannot be undone.`,
      run: async () => {
        setDeletingSignupId(row.id);
        try {
          await apiFetch(`/admin/organisations/pending-signups/${row.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          notify("Deleted");
          setSignupDrawer(null);
          fetchPendingSignups();
          fetchSummary();
        } catch (e: any) {
          notify(e.message || "Delete failed");
        } finally {
          setDeletingSignupId(null);
        }
      },
    });
  };

  // Same handlers as before, just surfaced through the row's kebab menu
  // instead of a row of buttons — approve/reject/activate/deactivate/delete
  // behaviour is unchanged, only the presentation moved.
  const rowActionsFor = (o: OrganisationListRow): RowAction[] => {
    const rowBusy = actionBusy === o.id;
    // A draft never went through review — not a real org yet — so the
    // only thing worth doing here is deleting it (or reaching out using
    // the contact details already shown in the row).
    if (o.status === "draft") {
      return [{ key: "delete", label: "Delete", danger: true, onClick: () => handleDelete(o.id), disabled: rowBusy }];
    }
    const actions: RowAction[] = [];
    if (o.status === "pending") {
      actions.push({ key: "approve", label: "Approve", onClick: () => handleApprove(o.id), disabled: rowBusy });
      actions.push({ key: "reject", label: "Reject", onClick: () => handleReject(o.id, o.name), disabled: rowBusy });
    } else if (o.status === "active") {
      actions.push({ key: "deactivate", label: "Deactivate", onClick: () => handleDeactivate(o.id), disabled: rowBusy });
    } else {
      actions.push({ key: "activate", label: "Activate", onClick: () => handleActivate(o.id), disabled: rowBusy });
    }
    actions.push({
      key: "view",
      label: o.status === "pending" ? "Edit" : "View",
      onClick: () => router.push(`/admin-console/organisation-detail/${o.id}`),
    });
    actions.push({ key: "delete", label: "Delete", danger: true, onClick: () => handleDelete(o.id), disabled: rowBusy });
    return actions;
  };

  if (authLoading || !accessToken) {
    return null;
  }

  const isPendingSignupsView = statusFilter === PENDING_SIGNUPS_FILTER;
  const rows = result?.data ?? [];
  const total = result?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to = Math.min(page * LIMIT, total);
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const signupRows = pendingSignupsResult?.data ?? [];
  const signupTotal = pendingSignupsResult?.total ?? 0;
  const signupFrom = signupTotal === 0 ? 0 : (page - 1) * LIMIT + 1;
  const signupTo = Math.min(page * LIMIT, signupTotal);
  const signupTotalPages = Math.max(1, Math.ceil(signupTotal / LIMIT));

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Icon name="building" size={14} /> Manage</div>
          <h1>Organisations</h1>
          <div className="sub">
            Every developer, agency and brokerage on the iPixxel Realty platform. Direct creation, approve/reject/activate/deactivate/delete.
          </div>
        </div>
      </div>

      {/* Summary strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <StatTile label="Total organisations" value={summary ? <CountUp value={summary.total} /> : "—"} />
        <StatTile label="Active" value={summary ? <CountUp value={summary.active} /> : "—"} accent="#10b981" />
        <StatTile
          label="Pending approval"
          value={summary ? <CountUp value={summary.pending ?? 0} /> : "—"}
          accent={summary && (summary.pending ?? 0) > 0 ? "#f59e0b" : "var(--ink)"}
          sub="Awaiting review"
        />
        <StatTile
          label="Rejected / Disabled"
          value={summary ? <CountUp value={summary.disabled ?? 0} /> : "—"}
          accent={summary && (summary.disabled ?? 0) > 0 ? "#f43f5e" : "var(--ink)"}
          sub="Rejected + disabled orgs"
        />
        <StatTile
          label="Draft signups"
          value={summary ? <CountUp value={summary.draft ?? 0} /> : "—"}
          accent="#8b5cf6"
          sub="Abandoned mid-signup"
        />
        <StatTile
          label="Pending signups"
          value={summary ? <CountUp value={summary.pendingSignups ?? 0} /> : "—"}
          accent="#0ea5e9"
          sub="Verified, no organisation yet"
        />
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
          {STATUS_PILLS.map((p) => (
            <button
              key={p.value}
              className={`btn ${statusFilter === p.value ? "btn-primary" : "btn-ghost"} btn-sm`}
              onClick={() => {
                setStatusFilter(p.value);
                setPage(1);
              }}
            >
              {p.label}
            </button>
          ))}
          {/* Separate from the pills above on purpose — these rows have no
              orgId, so mixing them into the same "Organisations" table
              would either need a fake org id (enabling organisation actions
              against something that isn't one) or special-casing every row
              action. Own tab, own count, own table below. */}
          <button
            className={`btn ${isPendingSignupsView ? "btn-primary" : "btn-ghost"} btn-sm`}
            onClick={() => {
              setStatusFilter(PENDING_SIGNUPS_FILTER);
              setPage(1);
            }}
          >
            Pending signups ({summary?.pendingSignups ?? 0})
          </button>
        </div>
        <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 340 }}>
          <input
            className="inp"
            placeholder={isPendingSignupsView ? "Search by name, email or phone…" : "Search by name, city or email…"}
            style={{ paddingLeft: 38, height: 34, fontSize: 13 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--faint)" }}>
            <Icon name="search" size={14} />
          </span>
        </div>
        <span
          className="muted"
          style={{ marginLeft: "auto", alignSelf: "center", fontSize: 12 }}
        >
          {isPendingSignupsView
            ? pendingSignupsLoading
              ? "Loading…"
              : `${signupTotal} signup${signupTotal === 1 ? "" : "s"}`
            : loading
              ? "Loading…"
              : `${total} organisation${total === 1 ? "" : "s"}`}
        </span>
      </div>

      {/* Table */}
      {isPendingSignupsView ? (
      <Reveal delay={3}>
        <div className="card">
          <div className="card-h">
            <span className="t">Pending Signups</span>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {pendingSignupsLoading ? "Loading…" : `Showing ${signupFrom}–${signupTo} of ${signupTotal}`}
            </span>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Step 1</th>
                  <th>Email verification</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Age</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingSignupsError ? (
                  <tr>
                    <td colSpan={9} className="muted">{pendingSignupsError}</td>
                  </tr>
                ) : !pendingSignupsLoading && signupRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="muted">No pending signups right now.</td>
                  </tr>
                ) : (
                  signupRows.map((s) => {
                    const name = [s.firstName, s.lastName].filter(Boolean).join(" ") || "—";
                    return (
                      <tr key={s.id}>
                        <td>
                          <button
                            type="button"
                            className="u"
                            style={{ cursor: "pointer", background: "none", border: "none", padding: 0, textAlign: "left" }}
                            onClick={() => setSignupDrawer(s)}
                          >
                            <span className="av">{initials(name === "—" ? s.email : name)}</span>
                            <span>
                              <span className="nm">{name}</span>
                              <br />
                              <span className="sm">Signup draft</span>
                            </span>
                          </button>
                        </td>
                        <td>{s.email}</td>
                        <td>{s.phoneNumber ?? "—"}</td>
                        <td><span className="badge b-green">Complete</span></td>
                        <td><span className="badge b-green">Verified</span></td>
                        <td><span className="badge b-gray">Active · No organisation</span></td>
                        <td>{formatDate(s.createdAt)}</td>
                        <td>{daysAgo(s.createdAt)}</td>
                        <td>
                          <RowActionsMenu
                            actions={[
                              { key: "view", label: "View", onClick: () => setSignupDrawer(s) },
                              {
                                key: "delete",
                                label: "Delete",
                                danger: true,
                                onClick: () => handleDeleteSignup(s),
                                disabled: deletingSignupId === s.id,
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {signupTotalPages > 1 ? (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 18px" }}>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              <span className="muted" style={{ fontSize: 12.5, alignSelf: "center" }}>
                Page {page} of {signupTotalPages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                disabled={page >= signupTotalPages}
                onClick={() => setPage((p) => Math.min(signupTotalPages, p + 1))}
              >
                Next →
              </button>
            </div>
          ) : null}
        </div>
      </Reveal>
      ) : (
      <Reveal delay={3}>
        <div className="card">
          <div className="card-h">
            <span className="t">Organisation Catalogue</span>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {loading ? "Loading…" : `Showing ${from}–${to} of ${total}`}
            </span>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Organisation</th>
                  <th>Domain</th>
                  <th>Admin</th>
                  <th>Plan</th>
                  <th>Users</th>
                  <th>Templates</th>
                  <th>MRR</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {error ? (
                  <tr>
                    <td colSpan={10} className="muted">
                      {error}
                    </td>
                  </tr>
                ) : !loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="muted">
                      No organisations match this filter.
                    </td>
                  </tr>
                ) : (
                  rows.map((o) => (
                    <tr key={o.id}>
                      <td>
                        {o.status === "draft" ? (
                          // Drafts have no detail page (getById 404s on
                          // them server-side) — plain text, not a dead link.
                          <span className="u" style={{ cursor: "default" }}>
                            <span className="av">{initials(o.name)}</span>
                            <span>
                              <span className="nm">{o.name}</span>
                              <br />
                              <span className="sm">{o.city} · {o.slug}</span>
                            </span>
                          </span>
                        ) : (
                          <Link className="u" href={`/admin-console/organisation-detail/${o.id}`}>
                            <span className="av">{initials(o.name)}</span>
                            <span>
                              <span className="nm">{o.name}</span>
                              <br />
                              <span className="sm">{o.city} · {o.slug}</span>
                            </span>
                          </Link>
                        )}
                      </td>
                      <td>
                        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                          <span className="sm" style={{ fontSize:11 }}>{o.subdomain ? (o.subdomainHost ?? o.subdomain) : "—"}</span>
                          {o.customDomain ? <span className="sm" style={{ fontSize:11, color:"var(--muted)" }}>{o.customDomain}</span> : null}
                          {o.subdomainStatus && o.subdomainStatus !== "none" ? (
                            <span className={`badge ${o.subdomainStatus === "active" ? "b-green" : o.subdomainStatus === "pending" ? "b-amber" : o.subdomainStatus === "rejected" ? "b-rose" : "b-gray"}`} style={{ fontSize: 10 }}>
                              {o.subdomainStatus}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <div style={{ display:"flex", flexDirection:"column", gap:2}}>
                          <span style={{ fontWeight:600, fontSize:13}}>{o.adminName ?? "—"}</span>
                          <span className="sm" style={{ fontSize:11}}>{o.adminEmail ?? "—"}</span>
                          <span className="sm" style={{ fontSize:11, color:"var(--muted)"}}>{o.adminPhone ?? ""}</span>
                        </div>
                      </td>
                      <td>{o.plan ? <span className={`badge ${o.plan.badge || "b-indigo"}`}>{o.plan.name}</span> : <span className="badge b-gray">No plan</span>}</td>
                      <td>{o.userCount}<span className="sm" style={{ color:"var(--muted)"}}> · {o.teamCount} teams</span></td>
                      <td>{o.templatesCount}</td>
                      <td>{o.mrr ? `₹${o.mrr.toLocaleString("en-IN")}` : "—"}</td>
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span className={`badge ${o.status === "active" ? "b-green" : o.status === "pending" ? "b-amber" : o.status === "draft" ? "b-gray" : "b-rose"}`}>
                            <span className="dot" style={{ background: "currentColor" }} />
                            {o.status === "active" ? "Active" : o.status === "pending" ? "Pending" : o.status === "rejected" ? "Rejected" : o.status === "draft" ? "Draft" : "Disabled"}
                          </span>
                          {o.status === "rejected" && o.rejectionReason ? (
                            <ReasonInfoPopover reason={o.rejectionReason} />
                          ) : null}
                        </div>
                      </td>
                      <td>{formatDate(o.createdAt)}</td>
                      <td>
                        <RowActionsMenu actions={rowActionsFor(o)} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 ? (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 18px" }}>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              <span className="muted" style={{ fontSize: 12.5, alignSelf: "center" }}>
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
      )}
      {toast ? <div style={{ position:"fixed", right:20, bottom:20, zIndex:500}}><div className="card" style={{ padding:"12px 16px", boxShadow:"var(--sh-lg)"}}>{toast}</div></div> : null}
      <ConfirmModal
        open={confirmState !== null}
        title={confirmState?.title ?? ""}
        message={confirmState?.message}
        confirmLabel="Confirm"
        destructive
        busy={confirmBusy}
        onConfirm={async () => {
          if (!confirmState) return;
          setConfirmBusy(true);
          try {
            await confirmState.run();
          } finally {
            setConfirmBusy(false);
            setConfirmState(null);
          }
        }}
        onClose={() => setConfirmState(null)}
      />
      <Modal
        open={!!rejectModal}
        onClose={() => {
          if (!rejectSubmitting) { setRejectModal(null); setRejectReason(""); setRejectError(null); }
        }}
        title="Reject organisation?"
        description={
          rejectModal ? (
            <>
              <strong>&quot;{rejectModal.name}&quot;</strong> will be marked rejected. A reason is required
              — it&apos;s saved with the organisation and shown to super admins on the organisations list.
            </>
          ) : undefined
        }
        closeDisabled={rejectSubmitting}
        footer={
          <>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => { setRejectModal(null); setRejectReason(""); setRejectError(null); }}
              disabled={rejectSubmitting}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              type="button"
              onClick={() => void submitReject()}
              disabled={rejectSubmitting}
            >
              {rejectSubmitting ? "Rejecting…" : "Reject organisation"}
            </button>
          </>
        }
      >
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)", marginBottom: 6 }}>
              Rejection reason <span style={{ color: "var(--rose)" }}>*</span>
            </label>
            <textarea
              style={{ minHeight: 90, resize: "vertical", ...(rejectError ? { borderColor: "var(--rose)" } : {}) }}
              placeholder="Why is this organisation being rejected?"
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                if (rejectError) setRejectError(null);
              }}
              disabled={rejectSubmitting}
              autoFocus
              maxLength={500}
              aria-invalid={rejectError ? true : undefined}
            />
            <div style={{ marginTop: 6, fontSize: 11.5, color: rejectError ? "var(--rose)" : "var(--faint)", fontWeight: rejectError ? 600 : 400 }}>
              {rejectError ?? `${rejectReason.length}/500`}
            </div>
      </Modal>

      {/* Pending signup detail drawer — account info + onboarding state
          only. No password field anywhere: there is nothing to show (it's
          a hash) and nothing here should ever let a Super Admin set one on
          someone else's still-forming account. */}
      <Modal
        open={!!signupDrawer}
        onClose={() => setSignupDrawer(null)}
        title="Signup draft"
        description={signupDrawer ? signupDrawer.email : undefined}
        size="sm"
        footer={
          signupDrawer ? (
            <button
              className="btn btn-danger"
              type="button"
              onClick={() => handleDeleteSignup(signupDrawer)}
              disabled={deletingSignupId === signupDrawer.id}
            >
              {deletingSignupId === signupDrawer.id ? "Deleting…" : "Delete signup"}
            </button>
          ) : undefined
        }
      >
        {signupDrawer ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div className="muted" style={{ fontSize: 11.5, marginBottom: 2 }}>Name</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {[signupDrawer.firstName, signupDrawer.lastName].filter(Boolean).join(" ") || "—"}
              </div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11.5, marginBottom: 2 }}>Email</div>
              <div style={{ fontSize: 13.5 }}>{signupDrawer.email}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11.5, marginBottom: 2 }}>Phone</div>
              <div style={{ fontSize: 13.5 }}>{signupDrawer.phoneNumber ?? "—"}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11.5, marginBottom: 2 }}>Country</div>
              <div style={{ fontSize: 13.5 }}>{signupDrawer.country ?? "—"}</div>
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              <div>
                <div className="muted" style={{ fontSize: 11.5, marginBottom: 4 }}>Step 1</div>
                <span className="badge b-green">Complete</span>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 11.5, marginBottom: 4 }}>Email verification</div>
                <span className="badge b-green">Verified</span>
              </div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11.5, marginBottom: 4 }}>Status</div>
              <span className="badge b-gray">Active · No organisation</span>
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              <div>
                <div className="muted" style={{ fontSize: 11.5, marginBottom: 2 }}>Created</div>
                <div style={{ fontSize: 13 }}>{formatDate(signupDrawer.createdAt)}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 11.5, marginBottom: 2 }}>Age</div>
                <div style={{ fontSize: 13 }}>{daysAgo(signupDrawer.createdAt)}</div>
              </div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11.5, marginBottom: 2 }}>Verified</div>
              <div style={{ fontSize: 13 }}>{formatDate(signupDrawer.emailVerifiedAt)}</div>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}