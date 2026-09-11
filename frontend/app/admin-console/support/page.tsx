"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon } from "@/components/icons";
import { getAdminSupportTickets } from "@/lib/api";
import type { SupportTicketStatus, SupportTicketSummary } from "@/lib/types";

const STATUS_TABS: { label: string; value: SupportTicketStatus | null }[] = [
  { label: "All", value: null },
  { label: "Open", value: "open" },
  { label: "Ongoing", value: "ongoing" },
  { label: "Resolved", value: "resolved" },
];

const STATUS_BADGE: Record<SupportTicketStatus, string> = {
  open: "b-amber",
  ongoing: "b-sky",
  resolved: "b-green",
};
const STATUS_LABEL: Record<SupportTicketStatus, string> = {
  open: "Open",
  ongoing: "Ongoing",
  resolved: "Resolved",
};
const PRIORITY_BADGE: Record<string, string> = {
  normal: "b-gray",
  high: "b-rose",
  urgent: "b-rose",
};
const PRIORITY_LABEL: Record<string, string> = {
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default function AdminSupportPage() {
  const [statusTab, setStatusTab] = useState(0);
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setLoading(true);
    getAdminSupportTickets({
      status: STATUS_TABS[statusTab].value ?? undefined,
      search: search.trim() || undefined,
      limit: 50,
    })
      .then((res) => {
        if (cancelled) return;
        setTickets(res.data);
        setTotal(res.total);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Couldn't load tickets.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [statusTab, search]);

  const openCount = tickets.filter((t) => t.status === "open").length;
  const ongoingCount = tickets.filter((t) => t.status === "ongoing").length;
  const highPriorityCount = tickets.filter(
    (t) => t.priority === "high" || t.priority === "urgent",
  ).length;

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">
            <Icon name="flag" size={14} /> System
          </div>
          <h1>Support Management</h1>
          <div className="sub">
            Every organisation&apos;s support tickets — chat with the org that raised each one.
          </div>
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: 20 }}>
        <Reveal delay={1}>
          <div className="stat">
            <div className="top">
              <span className="label">Total tickets</span>
              <span className="ic ic-indigo"><Icon name="flag" size={17} /></span>
            </div>
            <div className="value">{loading ? "—" : total}</div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="stat">
            <div className="top">
              <span className="label">Open</span>
              <span className="ic ic-amber"><Icon name="alert" size={17} /></span>
            </div>
            <div className="value">{loading ? "—" : openCount}</div>
          </div>
        </Reveal>
        <Reveal delay={3}>
          <div className="stat">
            <div className="top">
              <span className="label">Ongoing</span>
              <span className="ic ic-sky"><Icon name="mail" size={17} /></span>
            </div>
            <div className="value">{loading ? "—" : ongoingCount}</div>
          </div>
        </Reveal>
        <Reveal delay={4}>
          <div className="stat">
            <div className="top">
              <span className="label">High / Urgent</span>
              <span className="ic ic-rose"><Icon name="alert" size={17} /></span>
            </div>
            <div className="value">{loading ? "—" : highPriorityCount}</div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={1}>
        <div className="toolbar" style={{ marginBottom: 18 }}>
          <div className="tb-search search-box">
            <span className="si"><Icon name="search" size={14} /></span>
            <input
              className="inp"
              placeholder="Search by subject or ticket number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="seg">
            {STATUS_TABS.map((tab, i) => (
              <span key={tab.label} className={statusTab === i ? "on" : ""} onClick={() => setStatusTab(i)}>
                {tab.label}
              </span>
            ))}
          </div>
        </div>
      </Reveal>

      {error ? (
        <Reveal delay={2}>
          <div className="form-alert mb-14">{error}</div>
        </Reveal>
      ) : null}

      <Reveal delay={2}>
        <div className="card">
          <div className="card-h">
            <span className="t">Tickets</span>
            <span className="x">{loading ? "Loading…" : `${tickets.length} shown`}</span>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Organisation</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="muted">Loading…</td></tr>
                ) : tickets.length === 0 ? (
                  <tr><td colSpan={7} className="muted">No tickets match this filter.</td></tr>
                ) : (
                  tickets.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                          {t.hasUnread ? (
                            <span
                              className="dot"
                              title="New activity"
                              style={{ background: "var(--rose)", flexShrink: 0 }}
                            />
                          ) : null}
                          <Link href={`/admin-console/support/${t.id}`} className="mono brand-link">
                            #{t.code}
                          </Link>
                        </span>
                      </td>
                      <td>{t.organisation?.name ?? "—"}</td>
                      <td>
                        <Link
                          href={`/admin-console/support/${t.id}`}
                          style={{ color: "inherit", fontWeight: t.hasUnread ? 700 : 400 }}
                        >
                          {t.subject}
                        </Link>
                      </td>
                      <td>{t.category}</td>
                      <td>
                        <span className={`badge ${PRIORITY_BADGE[t.priority]}`}>
                          {PRIORITY_LABEL[t.priority]}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[t.status]}`}>
                          {STATUS_LABEL[t.status]}
                        </span>
                      </td>
                      <td className="muted">{timeAgo(t.updatedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
    </>
  );
}
