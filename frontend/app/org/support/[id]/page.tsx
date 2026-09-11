"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  addSupportMessage,
  createSupportUploadUrl,
  getSupportTicket,
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

async function uploadSupportFile(file: File): Promise<string> {
  const { uploadUrl, publicUrl } = await createSupportUploadUrl({
    filename: file.name,
    contentType: file.type,
    size: file.size,
  });
  const put = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!put.ok) throw new Error(`Upload failed (${put.status}).`);
  return publicUrl;
}

export default function OrgSupportTicketPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { accessToken } = useAuth();

  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [reply, setReply] = useState("");
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (silent: boolean) => {
      if (!accessToken || !id) return;
      if (!silent) setLoading(true);
      try {
        const res = await getSupportTicket(id);
        setTicket(res.ticket);
        setMessages(res.messages);
        setNotFound(false);
      } catch {
        if (!silent) setNotFound(true);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [accessToken, id],
  );

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    void load(false);
  }, [load]);

  // Plain-REST polling — no websockets — so a reply from the iPixxel team
  // shows up without a manual refresh.
  useEffect(() => {
    if (!accessToken || !id) return;
    const timer = window.setInterval(() => void load(true), POLL_MS);
    return () => window.clearInterval(timer);
  }, [accessToken, id, load]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const urls: string[] = [];
      const names: string[] = [];
      for (const file of Array.from(files).slice(0, 10 - attachmentUrls.length)) {
        urls.push(await uploadSupportFile(file));
        names.push(file.name);
      }
      setAttachmentUrls((prev) => [...prev, ...urls]);
      setAttachmentNames((prev) => [...prev, ...names]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attachment upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeAttachment(index: number) {
    setAttachmentUrls((prev) => prev.filter((_, i) => i !== index));
    setAttachmentNames((prev) => prev.filter((_, i) => i !== index));
  }

  async function send() {
    if (!reply.trim() && attachmentUrls.length === 0) return;
    setSending(true);
    setError(null);
    try {
      const message = await addSupportMessage(id, {
        body: reply.trim() || "(attachment)",
        attachmentUrls: attachmentUrls.length ? attachmentUrls : undefined,
      });
      setMessages((prev) => [...prev, message]);
      setReply("");
      setAttachmentUrls([]);
      setAttachmentNames([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  if (notFound) {
    return (
      <div className="card">
        <div className="card-b">
          <p className="muted">Ticket not found.</p>
          <Link href="/org/support" className="btn btn-ghost btn-sm">← Back to Support</Link>
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
            <Link href="/org/support" style={{ color: "inherit", textDecoration: "none" }}>
              <Icon name="flag" size={14} /> Support
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
            {ticket.category} · Raised by {ticket.raisedBy.name} · {formatWhen(ticket.createdAt)}
          </div>
        </div>
        <div className="actions">
          <Link href="/org/support" className="btn btn-ghost">← Back</Link>
        </div>
      </div>

      {ticket.status === "resolved" ? (
        <Reveal delay={1}>
          <div className="help" style={{ marginBottom: 18 }}>
            ✅ <b>Resolved</b> by {ticket.closedBy?.name ?? "the iPixxel team"}
            {ticket.closedAt ? ` on ${formatWhen(ticket.closedAt)}` : ""}. This conversation is now
            read-only — raise a new ticket if you need further help.
          </div>
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
              const mine = m.side === "org";
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
                    {mine ? m.sender.name : "iPixxel Support"} · {formatWhen(m.createdAt)}
                  </div>
                </div>
              );
            })}
            {messages.length === 0 ? <div className="muted">No messages yet.</div> : null}
            <div ref={threadEndRef} />
          </div>
          <div className="card-b" style={{ borderTop: "1px solid var(--line)" }}>
            {error ? <div className="form-alert mb-14">{error}</div> : null}
            {ticket.status === "resolved" ? (
              <div className="muted" style={{ fontSize: 13 }}>
                This ticket is resolved — replies are disabled. Raise a new ticket from the Support &amp; Help page if you need further help.
              </div>
            ) : (
              <>
                <textarea
                  rows={3}
                  placeholder="Type a reply…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,application/pdf"
                  style={{ display: "none" }}
                  onChange={(e) => void handleFiles(e.target.files)}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Icon name="upload" size={13} /> {uploading ? "Uploading…" : "Attach"}
                  </button>
                  {attachmentNames.map((name, i) => (
                    <span key={`${name}-${i}`} className="chip">
                      {name}
                      <button type="button" className="x-btn" aria-label={`Remove ${name}`} onClick={() => removeAttachment(i)}>
                        ✕
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ marginLeft: "auto" }}
                    disabled={sending || uploading || (!reply.trim() && attachmentUrls.length === 0)}
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
