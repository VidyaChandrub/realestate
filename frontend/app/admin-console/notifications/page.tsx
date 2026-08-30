"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api";
import { Icon } from "@/components/icons";
import type { AppNotification } from "@/lib/types";

const LIMIT = 25;

const TYPE_LABEL: Record<string, string> = {
  organisation_registration: "New registration",
  subdomain_request: "Subdomain",
  custom_domain_request: "Custom domain",
  organisation_approved: "Approval",
  organisation_rejected: "Rejection",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SuperAdminNotificationsPage() {
  const router = useRouter();
  const { accessToken, isLoading: authLoading } = useAuth();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2400);
  };

  useEffect(() => {
    if (!authLoading && !accessToken) router.replace("/login");
  }, [authLoading, accessToken, router]);

  const fetch = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    getNotifications({ page, limit: LIMIT })
      .then((res) => {
        setItems(res.data);
        setTotal(res.total);
      })
      .catch((e: any) => notify(e?.message ?? "Failed to load notifications"))
      .finally(() => setLoading(false));
  }, [accessToken, page]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  async function markRead(id: string) {
    await markNotificationRead(id).catch(() => null);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
  }

  async function markAll() {
    await markAllNotificationsRead().catch(() => null);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
  }

  if (authLoading || !accessToken) return null;

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Icon name="bell" size={14} /> Inbox</div>
          <h1>Notifications</h1>
          <div className="sub">Organisation registrations, approvals &amp; domain requests.</div>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => void markAll()} disabled={items.every((n) => n.readAt)}>
            Mark all read
          </button>
        </div>
      </div>

      <div className="card reveal in">
        <div className="card-h">
          <span className="t">All notifications</span>
          <span className="muted" style={{ fontSize: 12.5 }}>
            {loading ? "Loading…" : `${total} total`}
          </span>
        </div>
        <div style={{ display: "grid", gap: 10, padding: 16 }}>
          {loading ? (
            <div className="muted">Loading…</div>
          ) : items.length === 0 ? (
            <div className="muted">No notifications.</div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => void markRead(n.id)}
                style={{
                  textAlign: "left",
                  display: "grid",
                  gap: 4,
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid var(--line)",
                  background: n.readAt ? "transparent" : "var(--surface-2)",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span className={`badge ${n.readAt ? "b-gray" : "b-indigo"}`}>
                    {TYPE_LABEL[n.type] ?? n.type}
                  </span>
                  <span className="muted" style={{ fontSize: 11 }}>{formatDate(n.createdAt)}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{n.title}</div>
                {n.body ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{n.body}</div> : null}
                {n.organisation ? (
                  <div style={{ fontSize: 11, color: "var(--faint)" }}>
                    {n.organisation.name}
                    {n.organisation.subdomain ? ` · ${n.organisation.subdomain}` : ""}
                  </div>
                ) : null}
              </button>
            ))
          )}
        </div>
        {totalPages > 1 ? (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "0 16px 16px" }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</button>
            <span className="muted" style={{ fontSize: 12.5, alignSelf: "center" }}>Page {page} of {totalPages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next →</button>
          </div>
        ) : null}
      </div>

      {toast ? (
        <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 500 }}>
          <div className="card" style={{ padding: "12px 16px", boxShadow: "var(--sh-lg)" }}>{toast}</div>
        </div>
      ) : null}
    </>
  );
}
