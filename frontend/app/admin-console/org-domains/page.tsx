"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  getOrgDomainRequests,
  reviewOrgDomainRequest,
} from "@/lib/api";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { subdomainPreviewHost } from "@/lib/domain";
import type {
  AdminOrgDomainRequest,
  AdminOrgDomainRequestListResponse,
  OrgDomainRequest,
} from "@/lib/types";

const LIMIT = 20;

const STATUS_BADGE: Record<string, string> = {
  pending: "b-amber",
  approved: "b-green",
  rejected: "b-rose",
  connected: "b-blue",
};
const KIND_LABEL: Record<string, string> = {
  subdomain: "Subdomain",
  custom_domain: "Custom domain",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function SuperAdminOrgDomainsPage() {
  const router = useRouter();
  const { accessToken, isLoading: authLoading } = useAuth();

  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [docs, setDocs] = useState<AdminOrgDomainRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{
    req: OrgDomainRequest;
    kind: "approve" | "reject";
  } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<OrgDomainRequest | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => {
    if (!authLoading && !accessToken) router.replace("/login");
  }, [authLoading, accessToken, router]);

  const fetch = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    getOrgDomainRequests({
      status: tab === "pending" ? "pending" : undefined,
      page,
      limit: LIMIT,
    })
      .then((res: AdminOrgDomainRequestListResponse) => {
        setDocs(res.data);
        setTotal(res.total);
      })
      .catch((e: any) => notify(e?.message ?? "Failed to load domain requests"))
      .finally(() => setLoading(false));
  }, [accessToken, tab, page]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => setPage(1), [tab]);

  async function doReview() {
    if (!reviewTarget) return;
    setBusy(true);
    try {
      await reviewOrgDomainRequest(reviewTarget.req.id, {
        action: reviewTarget.kind,
      });
      notify(reviewTarget.kind === "approve" ? "Request approved" : "Request rejected");
      setReviewTarget(null);
      fetch();
    } catch (e: any) {
      notify(e?.message ?? "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitReject() {
    const target = rejectTarget;
    if (!target) return;
    if (!reason.trim()) {
      notify("Provide a reason for rejection");
      return;
    }
    setBusy(true);
    try {
      await reviewOrgDomainRequest(target.id, { action: "reject", reason: reason.trim() });
      notify("Request rejected");
      setRejectTarget(null);
      setReason("");
      fetch();
    } catch (e: any) {
      notify(e?.message ?? "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || !accessToken) return null;

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Icon name="globe" size={14} /> Review</div>
          <h1>Org domain requests</h1>
          <div className="sub">
            Organisation subdomain and custom-domain mapping requests awaiting review.
          </div>
        </div>
        <div className="actions">
          <span className="badge b-amber">{total} pending</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button
          className={`btn ${tab === "pending" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setTab("pending")}
        >
          Pending
        </button>
        <button
          className={`btn ${tab === "all" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setTab("all")}
        >
          All
        </button>
      </div>

      <div className="card reveal in">
        <div className="card-h">
          <span className="t">{tab === "pending" ? "Pending requests" : "All requests"}</span>
          <span className="muted" style={{ fontSize: 12.5 }}>
            {loading ? "Loading…" : `${docs.length} shown`}
          </span>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Organisation</th>
                <th>Kind</th>
                <th>Target</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Reviewed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="muted">Loading…</td></tr>
              ) : docs.length === 0 ? (
                <tr><td colSpan={7} className="muted">No domain requests.</td></tr>
              ) : (
                docs.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link className="u" href={`/admin-console/organisation-detail/${r.organisation.id}`}>
                        <span>{r.organisation.name}</span>
                      </Link>
                      <div className="sm muted" style={{ fontSize: 11 }}>@{r.organisation.slug}</div>
                    </td>
                    <td><span className="badge b-indigo">{KIND_LABEL[r.kind] ?? r.kind}</span></td>
                    <td>
                      {r.kind === "subdomain"
                        ? <span className="mono">{subdomainPreviewHost(r.subdomain) ?? r.subdomain}</span>
                        : <span className="mono">{r.customDomain}</span>}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[r.status] ?? "b-gray"}`}>{r.status}</span>
                      {r.status === "rejected" && r.rejectionReason
                        ? <div className="sm muted" style={{ fontSize: 11, maxWidth: 200 }}>{r.rejectionReason}</div>
                        : null}
                    </td>
                    <td>{formatDate(r.requestedAt)}</td>
                    <td>{r.reviewedAt ? formatDate(r.reviewedAt) : "—"}</td>
                    <td>
                      {r.status === "pending" ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => setReviewTarget({ req: r, kind: "approve" })}
                            disabled={busy}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setRejectTarget(r)}
                            disabled={busy}
                          >
                            Reject
                          </button>
                        </div>
                      ) : <span className="muted" style={{ fontSize: 12 }}>—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 ? (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 18px" }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</button>
            <span className="muted" style={{ fontSize: 12.5, alignSelf: "center" }}>Page {page} of {totalPages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next →</button>
          </div>
        ) : null}
      </div>

      <ConfirmModal
        open={reviewTarget !== null}
        title={reviewTarget?.kind === "approve" ? "Approve domain request?" : "Reject domain request?"}
        message={
          reviewTarget
            ? reviewTarget.kind === "approve"
              ? reviewTarget.req.kind === "subdomain"
                ? `Approving activates the subdomain and makes it live.`
                : `Approving allows the organisation to point this domain.`
              : `The organisation will be told this request was rejected.`
            : ""
        }
        confirmLabel={reviewTarget?.kind === "approve" ? "Approve" : "Reject"}
        destructive={reviewTarget?.kind === "reject"}
        busy={busy}
        onConfirm={() => void doReview()}
        onClose={() => { setReviewTarget(null); setReason(""); }}
      />
      {reviewTarget?.kind === "reject" ? (
        <div style={{ padding: "4px 0 0" }}>
          <input
            className="inp"
            placeholder="Reason for rejection (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      ) : null}

      {toast ? (
        <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 500 }}>
          <div className="card" style={{ padding: "12px 16px", boxShadow: "var(--sh-lg)" }}>{toast}</div>
        </div>
      ) : null}
    </>
  );
}
