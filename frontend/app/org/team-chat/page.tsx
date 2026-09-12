"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/ui/modal";
import {
  TeamsSubNav,
  initialsFor,
  avClass,
  displayName,
  useOrgUsersList,
  useTeamsList,
} from "@/components/org/team-fields";
import {
  getTeamChatOverview,
  getTeamChannel,
  createTeamChannel,
  createTeamDm,
  sendTeamMessage,
  getCrmLeads,
} from "@/lib/api";
import type {
  CrmLead,
  TeamChatOverview,
  TeamChatDetail,
  TeamChatChannelSummary,
  TeamChatMessage,
  TeamChatLeadCard,
} from "@/lib/types";
import { leadDisplayName, leadDisplayPhone } from "@/lib/lead-display";

function threadLabel(t: TeamChatChannelSummary): string {
  return t.kind === "dm" ? (t.otherUser?.name ?? "Direct message") : t.name;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, now)) return "Today";
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (same(d, y)) return "Yesterday";
  return d.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" as const } : {}),
  });
}

/** Escape the body, then glow every @Name mention Slack-style. */
function mentionHtml(body: string): string {
  const esc = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return esc.replace(/@([A-Za-z0-9_.+-]+(?: [A-Za-z0-9_.+-]+)*)/g, (m) => {
    const name = m.replace(/^@/, "").trim();
    return `<span class="mention">@${name}</span>`;
  });
}

function upsertLead(
  list: TeamChatLeadCard[],
  lead: TeamChatLeadCard,
): TeamChatLeadCard[] {
  return [lead, ...list.filter((l) => l.id !== lead.id)];
}

function upsertOverview(
  o: TeamChatOverview,
  channelId: string,
  msg: TeamChatMessage,
): TeamChatOverview {
  const patch = (list: TeamChatChannelSummary[]) =>
    list.map((c) =>
      c.id === channelId
        ? {
            ...c,
            unread: 0,
            lastMessagePreview: `${msg.sender.name}: ${msg.body.slice(0, 90)}`,
            lastMessageAt: msg.createdAt,
          }
        : c,
    );
  return { channels: patch(o.channels), dms: patch(o.dms) };
}

function clearUnread(o: TeamChatOverview, channelId: string): TeamChatOverview {
  const patch = (list: TeamChatChannelSummary[]) =>
    list.map((c) => (c.id === channelId ? { ...c, unread: 0 } : c));
  return { channels: patch(o.channels), dms: patch(o.dms) };
}

function LeadCard({
  lead,
  assignedTo,
}: {
  lead: TeamChatLeadCard;
  assignedTo: string | null;
}) {
  return (
    <div className="leadcard">
      <div className="lh">
        <span className={`av ${avClass(lead.id)}`}>{initialsFor(lead.name)}</span>
        <div style={{ minWidth: 0 }}>
          <b>{lead.name}</b>
          <div className="muted">{lead.phone ?? "No phone"}</div>
        </div>
      </div>
      <div className="lk">
        {lead.project ? (
          <span>
            Project <b>{lead.project}</b>
          </span>
        ) : null}
        {lead.interest ? (
          <span>
            Interest <b>{lead.interest}</b>
          </span>
        ) : null}
        <span>
          Status <b>{lead.status ?? "New"}</b>
        </span>
      </div>
      <div className="la">
        <b style={{ color: "var(--brand)", fontSize: 11.5 }}>
          {assignedTo ? `Assigned: ${assignedTo}` : "Unassigned"}
        </b>
        {lead.email ? <span className="muted">{lead.email}</span> : null}
      </div>
    </div>
  );
}

function ThreadRow({
  t,
  active,
  onClick,
}: {
  t: TeamChatChannelSummary;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`ch${active ? " on" : ""}`}
      onClick={onClick}
      title={t.lastMessagePreview || t.name}
    >
      {t.kind === "dm" ? <span className="pdot" /> : <span className="hash">#</span>}
      <span className="inner">{threadLabel(t)}</span>
      {t.unread > 0 ? <span className="un">{t.unread > 99 ? "99+" : t.unread}</span> : null}
    </button>
  );
}

export default function OrgTeamChatPage() {
  const { users } = useOrgUsersList();
  const { teams } = useTeamsList();

  const [overview, setOverview] = useState<TeamChatOverview | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TeamChatDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [leadQuery, setLeadQuery] = useState("");
  const [leadResults, setLeadResults] = useState<CrmLead[]>([]);
  const [pendingLead, setPendingLead] = useState<{ id: string; name: string } | null>(
    null,
  );

  const [showChannel, setShowChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelTeam, setNewChannelTeam] = useState("");
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [showDm, setShowDm] = useState(false);

  const msgsRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);
  const autoPickedRef = useRef(false);
  const teamParamRef = useRef<string | null>(null);

  const selectThread = useCallback((id: string | null) => {
    activeIdRef.current = id;
    setActiveId(id);
    setDetail(null);
    if (id) {
      setOverview((o) => (o ? clearUnread(o, id) : o));
    }
  }, []);

  // `?team=<id>` from the team detail page's "Open team chat" button.
  useEffect(() => {
    teamParamRef.current = new URLSearchParams(window.location.search).get("team");
  }, []);

  // First load: fetch the overview, then auto-pick a thread (prefer the
  // channel linked to `?team=`, else the first channel, else first DM).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getTeamChatOverview();
        if (cancelled) return;
        setOverview(data);
        if (!autoPickedRef.current) {
          autoPickedRef.current = true;
          const requested = teamParamRef.current
            ? data.channels.find((c) => c.teamId === teamParamRef.current)
            : undefined;
          const target = requested ?? data.channels[0] ?? data.dms[0] ?? null;
          selectThread(target ? target.id : null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load chat.");
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectThread]);

  // Fetch the active thread (marks it read on the server). `detail` is
  // cleared by selectThread so a stale thread never flashes while loading.
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    (async () => {
      try {
        const d = await getTeamChannel(activeId);
        if (cancelled) return;
        setDetail(d);
        setOverview((o) => (o ? clearUnread(o, activeId) : o));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load thread.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  // Polling: keep the rail + open thread fresh (plain REST, no websockets).
  useEffect(() => {
    if (!loaded) return;
    const t = setInterval(async () => {
      try {
        const data = await getTeamChatOverview();
        setOverview(data);
      } catch {
        // silent — next tick retries
      }
      const id = activeIdRef.current;
      if (id) {
        try {
          const d = await getTeamChannel(id);
          setDetail(d);
        } catch {
          // silent
        }
      }
    }, 8000);
    return () => clearInterval(t);
  }, [loaded]);

  // Lead search for the tag picker. Results stay mounted but are only shown
  // while there's a query — no synchronous clears needed.
  useEffect(() => {
    if (!pickerOpen || !leadQuery.trim()) return;
    const t = setTimeout(async () => {
      try {
        const res = await getCrmLeads({ search: leadQuery.trim(), limit: 8 });
        setLeadResults(res.data);
      } catch {
        setLeadResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [pickerOpen, leadQuery]);

  const showLeadResults = pickerOpen && leadQuery.trim() ? leadResults : [];

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = msgsRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeId, detail?.messages.length, scrollToBottom]);

  const dayMarked = useMemo(() => {
    if (!detail) return [];
    const out: Array<
      | { type: "day"; label: string; key: string }
      | { type: "msg"; msg: TeamChatMessage }
    > = [];
    let lastDay = "";
    for (const m of detail.messages) {
      const label = dayLabel(m.createdAt);
      if (label !== lastDay) {
        lastDay = label;
        out.push({ type: "day", label, key: `d-${m.id}` });
      }
      out.push({ type: "msg", msg: m });
    }
    return out;
  }, [detail]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !detail || sending) return;
    setSending(true);
    try {
      const assignedTo =
        detail.channel.kind === "dm"
          ? (detail.channel.otherUser?.name ?? "DM")
          : `#${detail.channel.name}`;
      const msg = await sendTeamMessage(detail.channel.id, {
        body,
        leadId: pendingLead?.id,
        assignedTo: pendingLead ? assignedTo : undefined,
      });
      setDraft("");
      setPendingLead(null);
      setPickerOpen(false);
      setDetail((d) =>
        d
          ? {
              ...d,
              messages: [...d.messages, msg],
              sharedLeads: msg.lead ? upsertLead(d.sharedLeads, msg.lead) : d.sharedLeads,
            }
          : d,
      );
      setOverview((o) => (o ? upsertOverview(o, detail.channel.id, msg) : o));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const onCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newChannelName.trim();
    if (!name || creatingChannel) return;
    setCreatingChannel(true);
    try {
      const slug =
        name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "") || name;
      const created = await createTeamChannel({
        name: slug,
        teamId: newChannelTeam || undefined,
      });
      setShowChannel(false);
      setNewChannelName("");
      setNewChannelTeam("");
      setOverview((o) => (o ? { ...o, channels: [created, ...o.channels] } : o));
      selectThread(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create channel.");
    } finally {
      setCreatingChannel(false);
    }
  };

  const onCreateDm = async (userId: string) => {
    setShowDm(false);
    try {
      const d = await createTeamDm(userId);
      setOverview((o) => {
        if (!o) return o;
        const exists = o.dms.some((dm) => dm.id === d.channel.id);
        const summary: TeamChatChannelSummary = {
          id: d.channel.id,
          kind: d.channel.kind,
          name: d.channel.name,
          teamId: d.channel.teamId,
          otherUser: d.channel.otherUser,
          unread: 0,
          lastMessagePreview: "",
          lastMessageAt: "",
          memberCount: d.channel.memberCount,
        };
        return {
          ...o,
          dms: exists
            ? o.dms.map((dm) => (dm.id === summary.id ? summary : dm))
            : [summary, ...o.dms],
        };
      });
      selectThread(d.channel.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start the conversation.");
    }
  };

  const assignedForInfo =
    detail && detail.channel.kind === "dm"
      ? detail.channel.otherUser?.name
      : detail?.channel.name ?? null;

  return (
    <div>
      <div className="page-head">
        <Reveal>
          <div className="eyebrow">Team Chat</div>
          <h1>Team Chat</h1>
          <p>
            Internal chat for your teams — discuss deals, and tag any lead to a
            teammate to hand it over.
          </p>
        </Reveal>
        <Reveal delay={2}>
          <div className="actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowDm(true)}
            >
              <Icon name="mail" size={14} /> New message
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowChannel(true)}
            >
              <Icon name="plus" size={15} /> New channel
            </button>
          </div>
        </Reveal>
      </div>

      <TeamsSubNav active="chat" />

      {error ? (
        <div
          style={{
            marginTop: 4,
            padding: "11px 15px",
            borderRadius: 12,
            fontSize: 13.5,
            background: "var(--rose-050)",
            border: "1px solid var(--rose-100)",
            color: "var(--rose)",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          {error}
          <button
            type="button"
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontWeight: 600,
              flexShrink: 0,
            }}
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <Reveal delay={2}>
        <div className="tc-shell">
          {/* Left rail — channels + DMs */}
          <aside className="tc-side">
            <div className="sh">
              Channels
              <a onClick={() => setShowChannel(true)} title="New channel">
                ＋
              </a>
            </div>
            {overview && overview.channels.length > 0 ? (
              overview.channels.map((c) => (
                <ThreadRow
                  key={c.id}
                  t={c}
                  active={activeId === c.id}
                  onClick={() => selectThread(c.id)}
                />
              ))
            ) : (
              <div className="empty">No channels yet — create one to start.</div>
            )}
            <div className="sh">
              Direct messages
              <a onClick={() => setShowDm(true)} title="New message">
                ＋
              </a>
            </div>
            {overview && overview.dms.length > 0 ? (
              overview.dms.map((d) => (
                <ThreadRow
                  key={d.id}
                  t={d}
                  active={activeId === d.id}
                  onClick={() => selectThread(d.id)}
                />
              ))
            ) : (
              <div className="empty">No direct messages yet.</div>
            )}
          </aside>

          {/* Center — active thread */}
          <section className="tc-main">
            {detail ? (
              <>
                <header className="tc-head">
                  {detail.channel.kind === "dm" ? (
                    <span className="pdot" style={{ width: 10, height: 10 }} />
                  ) : (
                    <span className="hash" style={{ fontSize: 18, fontWeight: 700 }}>
                      #
                    </span>
                  )}
                  <b>{detail.channel.name}</b>
                  <span className="muted">
                    {detail.channel.memberCount} member
                    {detail.channel.memberCount === 1 ? "" : "s"}
                    {detail.channel.teamName ? ` · ${detail.channel.teamName}` : ""}
                  </span>
                  <span style={{ flex: 1 }} />
                  <button type="button" className="tc-ib" title="Members">
                    <Icon name="users" size={16} />
                  </button>
                  <button type="button" className="tc-ib" title="Pinned">
                    <Icon name="pin" size={16} />
                  </button>
                </header>

                <div className="tc-msgs" ref={msgsRef}>
                  {dayMarked.length === 0 ? (
                    <div className="tc-empty">
                      No messages yet in {detail.channel.kind === "dm" ? "this chat" : `#${detail.channel.name}`}.{" "}
                      Say hi and kick things off.
                    </div>
                  ) : (
                    dayMarked.map((item) =>
                      item.type === "day" ? (
                        <div key={item.key} className="day">
                          {item.label}
                        </div>
                      ) : (
                        <div key={item.msg.id} className="msg">
                          <span className={`av ${avClass(item.msg.sender.id)}`}>
                            {initialsFor(item.msg.sender.name)}
                          </span>
                          <div className="body">
                            <div className="hd">
                              <b>{item.msg.sender.name}</b>
                              <span className="tm">{fmtTime(item.msg.createdAt)}</span>
                            </div>
                            <div
                              className="tx"
                              dangerouslySetInnerHTML={{ __html: mentionHtml(item.msg.body) }}
                            />
                            {item.msg.lead ? (
                              <LeadCard lead={item.msg.lead} assignedTo={item.msg.assignedTo} />
                            ) : null}
                          </div>
                        </div>
                      ),
                    )
                  )}
                </div>

                <form className="tc-comp" onSubmit={(e) => { e.preventDefault(); send(); }}>
                  <div className="tc-cbar">
                    <button type="button" className="tc-ib" title="Attach">
                      <Icon name="link" size={16} />
                    </button>
                    <button
                      type="button"
                      className={`tc-ib tc-tag-btn${pickerOpen ? " tc-tag-armed" : ""}`}
                      title="Tag a lead to hand it over"
                      onClick={() => setPickerOpen((p) => !p)}
                    >
                      {pendingLead ? `Tagging: ${pendingLead.name}` : "Tag lead"}
                    </button>
                    <input
                      className="inp"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                      placeholder={`Message ${detail.channel.kind === "dm" ? detail.channel.name : "#" + detail.channel.name}`}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={sending || !draft.trim()}
                    >
                      {sending ? "Sending…" : "Send"}
                    </button>
                  </div>

                  <div className={`picker${pickerOpen ? " on" : ""}`}>
                    <div className="ps">
                      <input
                        autoFocus
                        placeholder="Search leads…"
                        value={leadQuery}
                        onChange={(e) => setLeadQuery(e.target.value)}
                      />
                    </div>
                    {showLeadResults.length === 0 ? (
                      <div className="empty" style={{ padding: "14px 10px" }}>
                        {leadQuery.trim()
                          ? "No matching leads."
                          : "Type to search your leads — tag one to hand it over to the team."}
                      </div>
                    ) : (
                      showLeadResults.map((lead) => (
                        <button
                          key={lead.id}
                          type="button"
                          className="pk-item"
                          onClick={() => {
                            setPendingLead({ id: lead.id, name: leadDisplayName(lead) });
                            setPickerOpen(false);
                          }}
                        >
                          <span className={`av ${avClass(lead.id)}`}>
                            {initialsFor(leadDisplayName(lead))}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <b>{leadDisplayName(lead)}</b>
                            <div className="muted">{leadDisplayPhone(lead) || "—"}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </form>
              </>
            ) : (
              <div className="tc-msgs">
                <div className="tc-empty">
                  {overview &&
                  overview.channels.length === 0 &&
                  overview.dms.length === 0
                    ? "No conversations yet. “New channel” gives your team a room, or “New message” starts a private chat."
                    : "Pick a thread from the left to start chatting."}
                </div>
              </div>
            )}
          </section>

          {/* Right rail — context for the open thread */}
          <aside className="tc-info">
            <div className="lbl">Pinned</div>
            {detail && detail.messages.length > 0 ? (
              <>
                <div className="pinned">
                  <b>💬 {detail.messages[0].sender.name}</b> · {fmtTime(detail.messages[0].createdAt)}
                  <div style={{ marginTop: 4, color: "var(--muted)" }}>
                    {detail.messages[0].body.slice(0, 80)}
                    {detail.messages[0].body.length > 80 ? "…" : ""}
                  </div>
                </div>
                <div className="pinned" style={{ fontSize: 11.5, color: "var(--faint)" }}>
                  Pin messages from the ⋯ menu to keep deals on top.
                </div>
              </>
            ) : (
              <div className="pinned" style={{ fontSize: 12, color: "var(--muted)" }}>
                Pin a message to keep an important deal update visible here.
              </div>
            )}

            <div className="lbl">Members</div>
            {detail
              ? detail.members.map((m, i) => {
                  const seed = m.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
                  return (
                    <div key={m.id} className="mem">
                      <span className={`av ${avClass(m.id)}`} style={{ width: 28, height: 28, fontSize: 11 }}>
                        {initialsFor(m.name)}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.name}
                      </span>
                      <span
                        className="pdot"
                        style={{ background: seed % 5 === 0 ? "#22c55e" : "#cbd5e1" }}
                        title={i === 0 ? "online" : "offline"}
                      />
                    </div>
                  );
                })
              : null}

            <div className="lbl">Shared leads</div>
            {detail && detail.sharedLeads.length > 0 ? (
              detail.sharedLeads.map((l) => (
                <div key={l.id}>
                  <LeadCard lead={l} assignedTo={assignedForInfo} />
                </div>
              ))
            ) : (
              <div className="pinned" style={{ fontSize: 12, color: "var(--muted)" }}>
                Leads tagged in this thread appear here with their status and the
                team member they&apos;re handed to.
              </div>
            )}
          </aside>
        </div>
      </Reveal>

      {/* New channel modal */}
      <Modal
        open={showChannel}
        onClose={() => setShowChannel(false)}
        title="New channel"
        description="Name a room for your team — link it to a team to auto-add its members."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setShowChannel(false)}>
              Cancel
            </button>
            <button
              type="submit"
              form="tc-new-channel"
              className="btn btn-primary"
              disabled={creatingChannel || !newChannelName.trim()}
            >
              {creatingChannel ? "Creating…" : "Create channel"}
            </button>
          </>
        }
      >
        <form
          id="tc-new-channel"
          onSubmit={onCreateChannel}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) e.preventDefault();
          }}
        >
          <div className="field">
            <label>Channel name</label>
            <input
              className="inp"
              autoFocus
              placeholder="e.g. sales-north"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
            />
            <div className="hint">Lowercase letters, numbers and dashes — “#” is added automatically.</div>
          </div>
          <div className="field">
            <label>Link to a team (optional)</label>
            <select
              className="inp"
              value={newChannelTeam}
              onChange={(e) => setNewChannelTeam(e.target.value)}
            >
              <option value="">No team — ad-hoc room</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <div className="hint">Choosing a team auto-joins everyone already on it.</div>
          </div>
        </form>
      </Modal>

      {/* New message modal */}
      <Modal
        open={showDm}
        onClose={() => setShowDm(false)}
        title="New message"
        description="Start a private chat with anyone in your organisation."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {users.length === 0 ? (
            <div className="hint">Loading teammates…</div>
          ) : (
            users.map((u) => {
              const full = displayName(u);
              return (
                <button
                  key={u.id}
                  type="button"
                  className="pk-item"
                  style={{ padding: "10px 12px" }}
                  onClick={() => onCreateDm(u.id)}
                >
                  <span className={`av ${avClass(u.id)}`}>{initialsFor(full)}</span>
                  <div style={{ minWidth: 0 }}>
                    <b>{full}</b>
                    <div className="muted">{u.email}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </Modal>
    </div>
  );
}