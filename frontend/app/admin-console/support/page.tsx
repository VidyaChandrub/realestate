"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Reveal } from "@/components/superadmin/reveal";
import { ReasonInfoPopover } from "@/components/superadmin/reason-info-popover";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import {
  assignAdminSupportTicket,
  getAdminSupportTickets,
  getPlatformTeam,
} from "@/lib/api";
import type {
  PlatformTeamMember,
  SupportTicketStatus,
  SupportTicketSummary,
} from "@/lib/types";

const STATUS_TABS: { label: string; value: SupportTicketStatus | null }[] = [
  { label: "All", value: null },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "ongoing" },
  { label: "On Hold", value: "on_hold" },
  { label: "Resolved", value: "resolved" },
];

const STATUS_BADGE: Record<SupportTicketStatus, string> = {
  open: "b-amber",
  ongoing: "b-sky",
  on_hold: "b-violet",
  resolved: "b-green",
};
const STATUS_LABEL: Record<SupportTicketStatus, string> = {
  open: "Open",
  ongoing: "In Progress",
  on_hold: "On Hold",
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
  const { user } = useAuth();
  const { toast } = useToast();
  // Only the system Super Admin role can assign tickets (enforced again
  // server-side) — every other Platform Team member's list is already
  // scoped to their own assigned tickets, so the column is read-only for them.
  const canAssign = Boolean(user?.platformUnrestricted);

  const [statusTab, setStatusTab] = useState(0);
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platformTeam, setPlatformTeam] = useState<PlatformTeamMember[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    if (!canAssign) return;
    getPlatformTeam()
      .then((members) => setPlatformTeam(members.filter((m) => m.status === "active")))
      .catch(() => {
        // Non-fatal — the dropdown just falls back to "Unassigned only" if
        // this fails; the list itself doesn't depend on it.
      });
  }, [canAssign]);

  const assignTicket = useCallback(
    async (ticketId: string, assigneeId: string | null) => {
      setAssigningId(ticketId);
      try {
        const res = await assignAdminSupportTicket(ticketId, { assigneeId });
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, assignedTo: res.ticket.assignedTo ?? null } : t)),
        );
      } catch (err) {
        toast({
          title: "Couldn't assign ticket",
          description: err instanceof Error ? err.message : undefined,
          variant: "error",
        });
      } finally {
        setAssigningId(null);
      }
    },
    [toast],
  );

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
              <span className="label">In Progress</span>
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
                  <th>Assignee</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="muted">Loading…</td></tr>
                ) : tickets.length === 0 ? (
                  <tr><td colSpan={8} className="muted">No tickets match this filter.</td></tr>
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
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span className={`badge ${STATUS_BADGE[t.status]}`}>
                            {STATUS_LABEL[t.status]}
                          </span>
                          {t.status === "on_hold" && t.holdReason ? (
                            <ReasonInfoPopover reason={t.holdReason} label="On-hold reason" />
                          ) : null}
                        </span>
                      </td>
                      <td>
                        {canAssign ? (
                          <select
                            value={t.assignedTo?.id ?? ""}
                            disabled={assigningId === t.id}
                            onChange={(e) => void assignTicket(t.id, e.target.value || null)}
                            style={{ fontSize: 12.5, maxWidth: 160 }}
                          >
                            <option value="">Unassigned</option>
                            {platformTeam.map((m) => (
                              <option key={m.id} value={m.id}>
                                {[m.firstName, m.lastName].filter(Boolean).join(" ") || m.email}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="muted">{t.assignedTo?.name ?? "Unassigned"}</span>
                        )}
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
