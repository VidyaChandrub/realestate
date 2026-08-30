"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  getNotifications,
  getUnreadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api";
import type { AppNotification } from "@/lib/types";
import { Icon } from "@/components/icons";

const TYPE_LABEL: Record<string, string> = {
  organisation_registration: "New registration",
  subdomain_request: "Subdomain",
  custom_domain_request: "Custom domain",
  organisation_approved: "Approval",
  organisation_rejected: "Rejection",
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

export function NotificationsBell({ accessToken }: { accessToken: string | null }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function refresh() {
    if (!accessToken) return;
    const [count, list] = await Promise.all([
      getUnreadNotifications().catch(() => ({ count: 0 })),
      getNotifications({ limit: 8 }).catch(() => ({ data: [] })),
    ]);
    setUnread(count.count ?? 0);
    setItems(list.data ?? []);
  }

  useEffect(() => {
    if (accessToken) {
      void refresh();
      const id = window.setInterval(() => void refresh(), 30000);
      return () => window.clearInterval(id);
    }
  }, [accessToken]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function openPanel() {
    setLoading(true);
    await refresh();
    setLoading(false);
    setOpen((v) => !v);
  }

  async function markRead(id: string) {
    await markNotificationRead(id).catch(() => null);
    await refresh();
  }

  async function markAll() {
    await markAllNotificationsRead().catch(() => null);
    await refresh();
  }

  return (
    <div className="nb-wrap" ref={ref}>
      <button className="icon-btn" onClick={openPanel} aria-label="Notifications">
        <Icon name="bell" size={16} />
        {unread > 0 ? <span className="nb-count">{unread > 9 ? "9+" : unread}</span> : null}
      </button>
      {open ? (
        <div className="nb-panel">
          <div className="nb-head">
            <b>Notifications</b>
            <button
              className="nb-link"
              onClick={markAll}
              disabled={unread === 0}
            >
              Mark all read
            </button>
          </div>
          <div className="nb-list">
            {loading ? (
              <div className="nb-empty">Loading…</div>
            ) : items.length === 0 ? (
              <div className="nb-empty">No notifications</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  className={`nb-item${n.readAt ? "" : " unread"}`}
                  onClick={() => void markRead(n.id)}
                >
                  <div className="nb-item-top">
                    <span className={`nb-type ${n.readAt ? "" : " unread"}`}>
                      {TYPE_LABEL[n.type] ?? n.type}
                    </span>
                    {!n.readAt ? <span className="nb-dot" /> : null}
                  </div>
                  <div className="nb-title">{n.title}</div>
                  {n.body ? <div className="nb-body">{n.body}</div> : null}
                  <div className="nb-meta">{relativeTime(n.createdAt)}</div>
                </button>
              ))
            )}
          </div>
          <div className="nb-foot">
            <Link href="/admin-console/notifications" onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
