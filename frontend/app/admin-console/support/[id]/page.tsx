"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  addAdminSupportMessage,
  closeAdminSupportTicket,
  getAdminSupportTicket,
} from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon } from "@/components/icons";
import type { SupportMessage, SupportTicketDetail } from "@/lib/types";

const STATUS_BADGE: Record<string, string> = {
  open: "b-amber",
  ongoing: "b-sky",
  resolved: "b-green",
};
const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  ongoing: "Ongoing",
  resolved: "Resolved",
};
const PRIORITY_BADGE: Record<string, string> = {
  normal: "b-gray",
  high: "b-rose",
  urgent: "b-rose",
};

const POLL_MS = 15000;

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function AdminSupportTicketPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (silent: boolean) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const res = await getAdminSupportTicket(id);
      setTicket(res.ticket);
      setMessages(res.messages);
      setNotFound(false);
    } catch {
      if (!silent) setNotFound(true);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    void load(false);
  }, [load]);

  useEffect(() => {
    if (!id) return;
    const timer = window.setInterval(() => void load(true), POLL_MS);
    return () => window.clearInterval(timer);
  }, [id, load]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send() {
    if (!reply.trim()) return;
    setSending(true);
    setError(null);
    try {
      const message = await addAdminSupportMessage(id, { body: reply.trim() });
      setMessages((prev) => [...prev, message]);
      setReply("");
      // A reply to a still-`open` ticket moves it to `ongoing` server-side.
      setTicket((prev) => (prev && prev.status === "open" ? { ...prev, status: "ongoing" } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  async function close() {
    setClosing(true);
    setError(null);
    try {
      const res = await closeAdminSupportTicket(id);
      setTicket(res.ticket);
      setMessages(res.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close ticket.");
    } finally {
      setClosing(false);
    }
  }

  if (notFound) {
    return (
      <div className="card">
        <div className="card-b">
          <p className="muted">Ticket not found.</p>
          <Link href="/admin-console/support" className="btn btn-ghost btn-sm">← Back to Support Management</Link>
        </div>
      </div>
    );
  }

  if (loading || !ticket) {
    return (
      <div className="card">
        <div className="card-b"><p className="muted">Loading…</p></div>
      </div>
    );
  }

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">
            <Link href="/admin-console/support" style={{ color: "inherit", textDecoration: "none" }}>
              <Icon name="flag" size={14} /> Support Management
            </Link>{" "}
            · #{ticket.code}
          </div>
          <h1>
            {ticket.subject}{" "}
            <span className={`badge ${STATUS_BADGE[ticket.status]}`}>{STATUS_LABEL[ticket.status]}</span>{" "}
            <span className={`badge ${PRIORITY_BADGE[ticket.priority]}`}>
              {ticket.priority === "normal" ? "Normal" : ticket.priority === "high" ? "High" : "Urgent"}
            </span>
          </h1>
          <div className="sub">
            {ticket.organisation.name} · {ticket.category} · Raised by {ticket.raisedBy.name} ({ticket.raisedBy.email}) · {formatWhen(ticket.createdAt)}
          </div>
        </div>
        <div className="actions">
          <Link href="/admin-console/support" className="btn btn-ghost">← Back</Link>
          {ticket.status !== "resolved" ? (
            <button className="btn btn-primary" type="button" disabled={closing} onClick={() => void close()}>
              {closing ? "Closing…" : "✅ Close ticket"}
            </button>
          ) : null}
        </div>
      </div>

      {ticket.status === "resolved" ? (
        <Reveal delay={1}>
          <div className="help" style={{ marginBottom: 18 }}>
            ✅ <b>Resolved</b> by {ticket.closedBy?.name ?? "you"}
            {ticket.closedAt ? ` on ${formatWhen(ticket.closedAt)}` : ""}. The organisation now sees this
            ticket as Resolved.
          </div>
        </Reveal>
      ) : null}

      {error ? (
        <Reveal delay={1}>
          <div className="form-alert mb-14">{error}</div>
        </Reveal>
      ) : null}

      <Reveal delay={2}>
        <div className="card">
          <div className="card-h"><span className="t">Conversation</span></div>
          <div
            className="card-b"
            style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: 480, overflowY: "auto" }}
          >
            {messages.map((m) => {
              const mine = m.side === "platform";
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: mine ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "75%",
                      padding: "10px 14px",
                      borderRadius: 14,
                      background: mine ? "var(--brand)" : "var(--surface-2)",
                      color: mine ? "#fff" : "var(--fg, inherit)",
                      fontSize: 13.5,
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {m.body}
                    {m.attachmentUrls.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                        {m.attachmentUrls.map((url) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: mine ? "#fff" : "var(--brand)", textDecoration: "underline", fontSize: 12.5 }}
                          >
                            📎 Attachment
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                    {mine ? m.sender.name : `${m.sender.name} · ${ticket.organisation.name}`} · {formatWhen(m.createdAt)}
                  </div>
                </div>
              );
            })}
            {messages.length === 0 ? <div className="muted">No messages yet.</div> : null}
            <div ref={threadEndRef} />
          </div>
          <div className="card-b" style={{ borderTop: "1px solid var(--line)" }}>
            {ticket.status === "resolved" ? (
              <div className="muted" style={{ fontSize: 13 }}>
                This ticket is resolved — replies are disabled for both sides. The conversation stays visible as a record.
              </div>
            ) : (
              <>
                <textarea
                  rows={3}
                  placeholder="Reply to this organisation…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={sending || !reply.trim()}
                    onClick={() => void send()}
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </Reveal>
    </>
  );
}
