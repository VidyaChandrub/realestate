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

const TYPE_ICON: Record<string, any> = {
  organisation_registration: "building",
  subdomain_request: "globe",
  custom_domain_request: "link",
  organisation_approved: "check",
  organisation_rejected: "close",
};

const TYPE_BADGE: Record<string, string> = {
  organisation_registration: "b-indigo",
  subdomain_request: "b-teal",
  custom_domain_request: "b-sky",
  organisation_approved: "b-green",
  organisation_rejected: "b-rose",
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

function getNotificationLink(n: AppNotification): string {
  if (n.type === "organisation_registration") {
    return n.entityId ? `/admin-console/organisation-detail/${n.entityId}` : "/admin-console/organisations";
  }
  if (n.type === "custom_domain_request" || n.type === "subdomain_request") return "/admin-console/org-domains";
  if (n.type === "organisation_approved" || n.type === "organisation_rejected") {
    return n.entityId ? `/admin-console/organisation-detail/${n.entityId}` : "/admin-console/organisations";
  }
  return "/admin-console/notifications";
}

export default function SuperAdminNotificationsPage() {
  const router = useRouter();
  const { accessToken, isLoading: authLoading } = useAuth();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "unread" | "registrations" | "domains" | "approvals">("all");
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

  async function handleNotificationClick(n: AppNotification) {
    if (!n.readAt) {
      await markNotificationRead(n.id).catch(() => null);
      setItems((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, readAt: new Date().toISOString() } : item)),
      );
    }
    const link = getNotificationLink(n);
    router.push(link);
  }

  async function handleMarkRead(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await markNotificationRead(id).catch(() => null);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    notify("Marked as read");
  }

  async function markAll() {
    await markAllNotificationsRead().catch(() => null);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    notify("All marked as read");
  }

  if (authLoading || !accessToken) return null;

  const filteredItems = items.filter((n) => {
    if (filter === "unread") return !n.readAt;
    if (filter === "registrations") return n.type === "organisation_registration";
    if (filter === "domains") return n.type === "custom_domain_request" || n.type === "subdomain_request";
    if (filter === "approvals") return n.type === "organisation_approved" || n.type === "organisation_rejected";
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const unreadCount = items.filter((n) => !n.readAt).length;

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Icon name="bell" size={14} /> Inbox</div>
          <h1>Notifications</h1>
          <div className="sub">Organisation registrations, approvals &amp; domain activity.</div>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => void markAll()} disabled={items.every((n) => n.readAt)}>
            Mark all read
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          className={`btn ${filter === "all" ? "btn-primary" : "btn-ghost"} btn-sm`}
          onClick={() => setFilter("all")}
        >
          All ({items.length})
        </button>
        <button
          className={`btn ${filter === "unread" ? "btn-primary" : "btn-ghost"} btn-sm`}
          onClick={() => setFilter("unread")}
        >
          Unread {unreadCount > 0 ? `(${unreadCount})` : ""}
        </button>
        <button
          className={`btn ${filter === "registrations" ? "btn-primary" : "btn-ghost"} btn-sm`}
          onClick={() => setFilter("registrations")}
        >
          Registrations
        </button>
        <button
          className={`btn ${filter === "domains" ? "btn-primary" : "btn-ghost"} btn-sm`}
          onClick={() => setFilter("domains")}
        >
          Domains
        </button>
        <button
          className={`btn ${filter === "approvals" ? "btn-primary" : "btn-ghost"} btn-sm`}
          onClick={() => setFilter("approvals")}
        >
          Approvals
        </button>
      </div>

      <div className="card reveal in">
        <div className="card-h">
          <span className="t">Notifications list</span>
          <span className="muted" style={{ fontSize: 12.5 }}>
            {loading ? "Loading…" : `${filteredItems.length} shown`}
          </span>
        </div>
        <div style={{ display: "grid", gap: 10, padding: 16 }}>
          {loading ? (
            <div className="muted" style={{ padding: 20, textAlign: "center" }}>Loading notifications…</div>
          ) : filteredItems.length === 0 ? (
            <div className="muted" style={{ padding: 30, textAlign: "center" }}>No notifications in this view.</div>
          ) : (
            filteredItems.map((n) => (
              <div
                key={n.id}
                onClick={() => void handleNotificationClick(n)}
                style={{
                  textAlign: "left",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: 16,
                  borderRadius: 14,
                  border: n.readAt ? "1px solid var(--line)" : "1px solid var(--brand-100)",
                  background: n.readAt ? "var(--surface)" : "var(--brand-050)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: n.readAt ? "none" : "0 2px 8px rgba(79, 70, 229, 0.08)",
                }}
              >
                <div style={{ display: "flex", gap: 14, minWidth: 0 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: n.readAt ? "var(--line)" : "var(--brand)",
                      color: n.readAt ? "var(--ink-2)" : "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={TYPE_ICON[n.type] ?? "bell"} size={18} />
                  </div>
                  <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span className={`badge ${n.readAt ? "b-gray" : TYPE_BADGE[n.type] ?? "b-indigo"}`}>
                        {TYPE_LABEL[n.type] ?? n.type}
                      </span>
                      {!n.readAt ? (
                        <span className="badge b-amber" style={{ fontSize: 10, padding: "1px 6px" }}>New</span>
                      ) : null}
                      <span className="muted" style={{ fontSize: 11 }}>{formatDate(n.createdAt)}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{n.title}</div>
                    {n.body ? <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.45 }}>{n.body}</div> : null}
                    {n.organisation ? (
                      <div style={{ fontSize: 12, color: "var(--brand)", fontWeight: 600, marginTop: 2 }}>
                        {n.organisation.name}
                        {n.organisation.subdomain ? ` · ${n.organisation.subdomain}` : ""}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  {!n.readAt ? (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => void handleMarkRead(e, n.id)}
                      title="Mark as read"
                    >
                      Mark read
                    </button>
                  ) : null}
                  <span className="btn btn-ghost btn-sm" style={{ color: "var(--brand)" }}>
                    Open →
                  </span>
                </div>
              </div>
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
