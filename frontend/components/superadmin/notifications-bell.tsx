"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getNotifications,
  getUnreadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api";
import type { AppNotification } from "@/lib/types";
import { Icon } from "@/components/icons";

const PAGE_SIZE = 25;

const TYPE_LABEL: Record<string, string> = {
  organisation_registration: "New registration",
  subdomain_request: "Subdomain",
  custom_domain_request: "Custom domain",
  organisation_approved: "Approval",
  organisation_rejected: "Rejection",
};

const TYPE_ICON: Record<string, string> = {
  organisation_registration: "building",
  subdomain_request: "globe",
  custom_domain_request: "link",
  organisation_approved: "check",
  organisation_rejected: "close",
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function getNotificationLink(n: AppNotification): string {
  if (n.type === "organisation_registration") {
    return n.entityId ? `/admin-console/organisation-detail/${n.entityId}` : "/admin-console/organisations";
  }
  if (n.type === "custom_domain_request" || n.type === "subdomain_request") return "/admin-console/org-domains";
  if (n.type === "organisation_approved" || n.type === "organisation_rejected") {
    return n.entityId ? `/admin-console/organisation-detail/${n.entityId}` : "/admin-console/organisations";
  }
  return "/admin-console";
}

export function NotificationsBell({ accessToken }: { accessToken: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function loadPage(nextPage: number, replace: boolean) {
    if (!accessToken) return;
    const list = await getNotifications({
      page: nextPage,
      limit: PAGE_SIZE,
      unreadOnly: filter === "unread",
    }).catch(() => ({ data: [] as AppNotification[], total: 0 }));
    setTotal(list.total ?? list.data.length);
    setItems((prev) => (replace ? list.data ?? [] : [...prev, ...(list.data ?? [])]));
    setPage(nextPage);
  }

  async function refreshCount() {
    if (!accessToken) return;
    const count = await getUnreadNotifications().catch(() => ({ count: 0 }));
    setUnread(count.count ?? 0);
  }

  useEffect(() => {
    if (!accessToken) return;
    void refreshCount();
    const id = window.setInterval(() => void refreshCount(), 30000);
    return () => window.clearInterval(id);
  }, [accessToken]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function openPanel() {
    if (open) {
      setOpen(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    await Promise.all([refreshCount(), loadPage(1, true)]);
    setLoading(false);
  }

  async function changeFilter(next: "all" | "unread") {
    setFilter(next);
    setLoading(true);
    const list = await getNotifications({
      page: 1,
      limit: PAGE_SIZE,
      unreadOnly: next === "unread",
    }).catch(() => ({ data: [] as AppNotification[], total: 0 }));
    setTotal(list.total ?? list.data.length);
    setItems(list.data ?? []);
    setPage(1);
    setLoading(false);
  }

  async function handleItemClick(n: AppNotification) {
    if (!n.readAt) {
      await markNotificationRead(n.id).catch(() => null);
      setItems((prev) => prev.map((item) => (item.id === n.id ? { ...item, readAt: new Date().toISOString() } : item)));
      setUnread((prev) => Math.max(0, prev - 1));
    }
    setOpen(false);
    router.push(getNotificationLink(n));
  }

  async function markAll() {
    await markAllNotificationsRead().catch(() => null);
    setItems((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    setUnread(0);
  }

  const canLoadMore = items.length < total;

  return (
    <div className="nb-wrap" ref={ref}>
      <button className="icon-btn" onClick={() => void openPanel()} aria-label="Notifications" title="Notifications">
        <Icon name="bell" size={16} />
        {unread > 0 ? <span className="nb-count">{unread > 9 ? "9+" : unread}</span> : null}
      </button>
      {open ? (
        <div className="nb-panel">
          <div className="nb-head">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <b>Notifications</b>
              {unread > 0 ? (
                <span className="badge b-amber" style={{ fontSize: 10.5, padding: "1px 6px" }}>
                  {unread} new
                </span>
              ) : null}
            </div>
            <button className="nb-link" onClick={() => void markAll()} disabled={unread === 0}>
              Mark all read
            </button>
          </div>
          <div style={{ display: "flex", gap: 6, padding: "8px 14px", borderBottom: "1px solid var(--line)" }}>
            <button
              type="button"
              className={`btn btn-sm ${filter === "all" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => void changeFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filter === "unread" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => void changeFilter("unread")}
            >
              Unread
            </button>
          </div>
          <div className="nb-list">
            {loading && items.length === 0 ? (
              <div className="nb-empty">Loading…</div>
            ) : items.length === 0 ? (
              <div className="nb-empty">No notifications</div>
            ) : (
              <>
                {items.map((n) => (
                  <button
                    key={n.id}
                    className={`nb-item${n.readAt ? "" : " unread"}`}
                    onClick={() => void handleItemClick(n)}
                  >
                    <div className="nb-item-top">
                      <span className={`nb-type ${n.readAt ? "" : " unread"}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Icon name={TYPE_ICON[n.type] ?? "bell"} size={11} />
                        {TYPE_LABEL[n.type] ?? n.type}
                      </span>
                      <span className="nb-meta">{relativeTime(n.createdAt)}</span>
                    </div>
                    <div className="nb-title">{n.title}</div>
                    {n.body ? <div className="nb-body">{n.body}</div> : null}
                  </button>
                ))}
                {canLoadMore ? (
                  <button
                    type="button"
                    className="nb-link"
                    style={{ padding: "12px 16px", width: "100%", textAlign: "center" }}
                    onClick={() => void loadPage(page + 1, false)}
                    disabled={loading}
                  >
                    {loading ? "Loading…" : "Load more"}
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
