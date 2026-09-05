"use client";

import { useEffect, useState } from "react";
import { getOrgDomainRequests, reviewOrgDomainRequest } from "@/lib/api";
import type { AdminOrgDomainRequest } from "@/lib/types";

export default function SuperAdminOrgDomainsPage() {
  const [rows, setRows] = useState<AdminOrgDomainRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [kind, setKind] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});

  async function fetchAll() {
    setLoading(true);
    try {
      const res = await getOrgDomainRequests({
        status: filter || undefined,
        kind: kind || undefined,
        limit: 100,
      });
      setRows(res.data ?? []);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to load domain requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchAll();
  }, [filter, kind]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3500);
    return () => clearTimeout(t);
  }, [msg]);

  async function review(id: string, action: "approve" | "reject") {
    if (action === "reject" && !(reason[id] ?? "").trim()) {
      setMsg("Enter a rejection reason first.");
      return;
    }
    try {
      await reviewOrgDomainRequest(id, {
        action,
        reason: action === "reject" ? reason[id] : undefined,
      });
      setMsg(action === "approve" ? "Domain request approved." : "Domain request rejected.");
      void fetchAll();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Review failed.");
    }
  }

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">Admin · Domains</div>
          <h1>Organisation Domain Requests</h1>
          <div className="sub">
            Approve organisation subdomains and custom domains. Landing-page migrations stay under Domain Requests.
          </div>
        </div>
      </div>
      {msg ? <div className="card" style={{ padding: "12px 16px", marginBottom: 12, background: "#eef6ff" }}>{msg}</div> : null}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {["", "pending", "approved", "rejected"].map((s) => (
          <button key={s || "all"} className={`btn ${filter === s ? "btn-primary" : "btn-ghost"} btn-sm`} onClick={() => setFilter(s)}>
            {s || "All statuses"}
          </button>
        ))}
        {["", "subdomain", "custom_domain"].map((k) => (
          <button key={k || "all-kinds"} className={`btn ${kind === k ? "btn-primary" : "btn-ghost"} btn-sm`} onClick={() => setKind(k)}>
            {k === "custom_domain" ? "Custom" : k || "All kinds"}
          </button>
        ))}
        <span className="muted" style={{ marginLeft: "auto", alignSelf: "center", fontSize: 12 }}>
          {loading ? "Loading..." : `${rows.length} requests`}
        </span>
      </div>
      <div className="card">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Organisation</th>
                <th>Kind</th>
                <th>Domain</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="muted">No organisation domain requests.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span style={{ fontWeight: 700 }}>{r.organisation?.name ?? "—"}</span>
                      <br />
                      <span className="muted sm">{r.organisation?.slug}</span>
                    </td>
                    <td><span className="badge b-gray">{r.kind === "custom_domain" ? "Custom" : "Subdomain"}</span></td>
                    <td style={{ fontFamily: "monospace", fontWeight: 700 }}>
                      {r.kind === "custom_domain" ? r.customDomain : r.subdomain}
                    </td>
                    <td><span className="badge b-indigo">{r.status}</span></td>
                    <td className="muted" style={{ fontSize: 12 }}>{new Date(r.requestedAt).toLocaleDateString()}</td>
                    <td style={{ minWidth: 220 }}>
                      {r.status === "pending" ? (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button className="btn btn-success btn-sm" onClick={() => void review(r.id, "approve")}>Approve</button>
                          <input
                            className="inp"
                            placeholder="Reject reason"
                            value={reason[r.id] ?? ""}
                            onChange={(e) => setReason((prev) => ({ ...prev, [r.id]: e.target.value }))}
                            style={{ width: 120, height: 28, fontSize: 12 }}
                          />
                          <button className="btn btn-danger btn-sm" onClick={() => void review(r.id, "reject")}>Reject</button>
                        </div>
                      ) : r.rejectionReason ? (
                        <span className="muted" style={{ fontSize: 11, color: "var(--rose)" }}>{r.rejectionReason}</span>
                      ) : (
                        <span className="muted">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
