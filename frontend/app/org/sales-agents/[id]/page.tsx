"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Icon, type IconName } from "@/components/icons";
import { getSalesAgent } from "@/lib/api";
import type {
  CrmLeadStatus,
  SalesAgent,
  SalesAgentActivityType,
  SalesAgentCall,
  SalesAgentComms,
  SalesAgentDetailResponse,
  SalesAgentRecentLead,
  SalesAgentStats,
} from "@/lib/types";

const TABS = ["Overview", "Leads", "Calls & comms", "Activity"];
const LEADS_SEGMENTS = ["All", "Hot", "Follow-up", "Site visit", "Idle"];

const ACTIVITY_LABEL: Record<SalesAgentActivityType, string> = {
  closed_deal: "Deal closed",
  site_visit_booked: "Site visit",
  call_logged: "Call",
  whatsapp_sent: "WhatsApp",
  whatsapp_read: "WhatsApp read",
  note_added: "Note",
  status_updated: "Status",
  logged_in: "Shift",
};

const ACTIVITY_TONE: Partial<Record<SalesAgentActivityType, string>> = {
  closed_deal: "var(--green)",
  site_visit_booked: "var(--iris)",
  logged_in: "var(--amber)",
  whatsapp_read: "var(--green)",
};

const CALL_OUTCOME_LABEL: Record<SalesAgentCall["outcome"], string> = {
  connected: "Connected",
  booked_visit: "Booked visit",
  callback: "Callback",
  no_answer: "No answer",
  missed: "Missed",
  busy: "Busy",
};

const CALL_OUTCOME_BADGE: Record<SalesAgentCall["outcome"], string> = {
  connected: "b-green",
  booked_visit: "b-indigo",
  callback: "b-amber",
  no_answer: "b-rose",
  missed: "b-gray",
  busy: "b-gray",
};

const AV_MODIFIERS = ["", "a2", "a3", "a4", "a5"];

const STATUS_LABEL: Record<CrmLeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  follow_up: "Follow-up",
  site_visit: "Site Visit",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

const STATUS_BADGE: Record<CrmLeadStatus, string> = {
  new: "b-gray",
  contacted: "b-sky",
  follow_up: "b-amber",
  site_visit: "b-indigo",
  negotiation: "b-violet",
  won: "b-green",
  lost: "b-rose",
};

const SOURCE_BADGE: Record<string, string> = {
  Meta: "b-indigo",
  Google: "b-sky",
  WhatsApp: "b-green",
};

const PIPELINE_LABEL: Record<CrmLeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  follow_up: "Follow-up",
  site_visit: "Site visit",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

const PIPELINE_TONE: Partial<Record<CrmLeadStatus, string>> = {
  site_visit: "var(--iris)",
  negotiation: "var(--violet)",
  won: "var(--green)",
  lost: "var(--rose)",
};

type LeadRow = {
  key: string;
  name: string;
  initials: string;
  av: string;
  source: string | null;
  sourceBadge: string;
  statusLabel: string;
  statusBadge: string;
  value: string;
  when: string;
  hot: boolean;
  idle: boolean;
};

function medallion(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "🏅";
}

function roleLabel(agent: SalesAgent): string {
  return agent.role?.name ?? "Admin";
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avClass(id: string): string {
  const n = id.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return AV_MODIFIERS[n % AV_MODIFIERS.length];
}

function sourceColor(source: string | null): string {
  switch (source) {
    case "Meta":
      return "var(--brand)";
    case "Google":
      return "#0ea5e9";
    case "WhatsApp":
      return "#16a34a";
    default:
      return "#f59e0b";
  }
}

/** Generic conic-gradient donut from a cumulative SourceSlice list. */
function sourceCss(slices: { value: number; color: string }[]): string {
  if (slices.length === 0) return "conic-gradient(#e2e8f0 0 100%)";
  let from = 0;
  const stops = slices.map((s) => {
    const stop = `${s.color} ${from}% ${s.value}%`;
    from = s.value;
    return stop;
  });
  return `conic-gradient(${stops.join(",")})`;
}

/** API source counts → cumulative slices for the donut. */
function sourcesToSlices(
  stats: SalesAgentStats,
): { label: string; value: number; color: string }[] {
  const total = stats.sources.reduce((sum, s) => sum + s.count, 0);
  if (total === 0) return [];
  let cum = 0;
  const slices = stats.sources.map((s) => {
    cum += Math.round((s.count / total) * 100);
    return {
      label: s.source ?? "Other",
      value: cum,
      color: sourceColor(s.source),
    };
  });
  if (slices.length > 0 && slices[slices.length - 1].value < 100) {
    slices[slices.length - 1].value = 100;
  }
  return slices;
}

function apiPipeline(
  stats: SalesAgentStats,
): { label: string; count: number; tone?: string }[] {
  return stats.pipeline.map((s) => ({
    label: PIPELINE_LABEL[s.status] ?? s.status,
    count: s.count,
    tone: PIPELINE_TONE[s.status],
  }));
}

function formatBudget(value: number): string {
  if (value <= 0) return "—";
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
  return `₹${Math.round(value / 1e5)} L`;
}

function formatWhen(date: string): string {
  const d = new Date(date);
  const day = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} · ${time}`;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatWhen(date);
}

function leadName(lead: SalesAgentRecentLead): string {
  const full =
    typeof lead.data?.fullName === "string"
      ? lead.data.fullName
      : typeof lead.data?.name === "string"
        ? lead.data.name
        : null;
  return full || lead.formName || "Unnamed lead";
}

function apiLeadsToRows(leads: SalesAgentRecentLead[]): LeadRow[] {
  return leads.map((lead) => {
    const name = leadName(lead);
    return {
      key: lead.id,
      name,
      initials: initialsFor(name),
      av: avClass(lead.id),
      source: lead.source,
      sourceBadge: SOURCE_BADGE[lead.source ?? ""] ?? "b-amber",
      statusLabel: STATUS_LABEL[lead.status],
      statusBadge: STATUS_BADGE[lead.status],
      value: formatBudget(lead.budget),
      when: formatWhen(lead.createdAt),
      hot: lead.budget >= 1e7,
      idle: lead.status === "new" || lead.status === "contacted",
    };
  });
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function callShort(call: SalesAgentCall): string {
  return call.leadName || "Unknown lead";
}

function activityIcon(type: SalesAgentActivityType): IconName {
  switch (type) {
    case "closed_deal":
      return "star";
    case "site_visit_booked":
      return "map";
    case "call_logged":
      return "phone";
    case "whatsapp_sent":
    case "whatsapp_read":
      return "mail";
    case "note_added":
      return "edit";
    case "status_updated":
      return "target";
    case "logged_in":
      return "arrow-up";
    default:
      return "reports";
  }
}

export default function OrgAgentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [state, setState] = useState<{
    id: string;
    response: SalesAgentDetailResponse | null;
    error: boolean;
  } | null>(null);
  const [tab, setTab] = useState(0);
  const [seg, setSeg] = useState("All");

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    getSalesAgent(id)
      .then((res) => {
        if (mounted) setState({ id, response: res, error: false });
      })
      .catch(() => {
        if (mounted) setState({ id, response: null, error: true });
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  const current = state && state.id === id ? state : null;
  const detail = current?.response ?? null;
  const error = current?.error ?? false;

  const pipeline = useMemo(
    () => (detail && detail.agent.id === id ? apiPipeline(detail.agent.stats) : []),
    [detail, id],
  );
  const slices = useMemo(
    () => (detail && detail.agent.id === id ? sourcesToSlices(detail.agent.stats) : []),
    [detail, id],
  );
  const leads = useMemo(
    () => (detail && detail.agent.id === id ? apiLeadsToRows(detail.recentLeads) : []),
    [detail, id],
  );

  const calls = detail && detail.agent.id === id ? detail.calls : [];
  const activity = detail && detail.agent.id === id ? detail.activity : [];
  const comms: SalesAgentComms | null =
    detail && detail.agent.id === id ? detail.comms : null;

  const agent = detail && detail.agent.id === id ? detail.agent : null;

  const revenueCr =
    Math.round(((agent?.stats.revenueBooked ?? 0) / 1e7) * 10) / 10;
  const maxStage = Math.max(...pipeline.map((s) => s.count));

  const targets = detail && detail.agent.id === id ? detail.targets : null;
  const activity14 = detail && detail.agent.id === id ? detail.activity14 : [];

  // Target progress % (0–100+, clamped visually), so a bar that overshoots its
  // goal stretches past full width instead of clipping.
  const targetPct = (current: number, goal: number) =>
    goal > 0 ? Math.min(100, Math.max(0, Math.round((current / goal) * 100))) : 0;

  // 14-day chart normalised to stacked bars (leads + calls share the same
  // vertical scale), mirroring the original "Leads worked vs Calls made" axes.
  const chartMax = Math.max(1, ...activity14.map((c) => Math.max(c.leads, c.calls)));
  const chartPct = (v: number) => Math.max(v > 0 ? 4 : 0, Math.round((v / chartMax) * 100));

  const visibleLeads = leads.filter((l) => {
    if (seg === "All") return true;
    if (seg === "Hot") return l.hot;
    if (seg === "Follow-up") return l.statusLabel === "Follow-up";
    if (seg === "Site visit") return l.statusLabel === "Site Visit";
    if (seg === "Idle") return l.idle;
    return true;
  });

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <Link
              href="/org/sales-agents"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              <Icon name="users" size={14} /> Sales Agents
            </Link>{" "}
            · Agent
          </div>
          {agent ? (
            <>
              <h1>
                {agent.name}{" "}
                <span className="badge b-green">
                  <span
                    className="dot"
                    style={{ background: agent.online ? "var(--green)" : "var(--faint)" }}
                  ></span>
                  {agent.online ? "Online" : "Offline"}
                </span>
              </h1>
              <div className="sub">
                {roleLabel(agent)} · {agent.email} · {agent.phoneNumber ?? "—"}
              </div>
            </>
          ) : (
            <h1>{error ? "Agent not found" : "Loading agent…"}</h1>
          )}
        </div>
        <div className="actions">
          <Link className="btn btn-ghost" href="/org/sales-agents">
            ← Back
          </Link>
          <button className="btn btn-ghost">
            <Icon name="mail" size={15} /> Message
          </button>
          <button className="btn btn-primary">
            <Icon name="edit" size={15} /> Edit agent
          </button>
        </div>
      </div>

      <Reveal delay={1}>
        <div className="help" style={{ marginBottom: 18 }}>
          👤 <b>Live performance dashboard.</b> Figures come straight from your
          CRM — leads assigned, closures, revenue booked and pipeline. Agents see
          their own view; managers &amp; admins can open any agent from the Sales
          Agents list.
        </div>
      </Reveal>

      {error && !agent ? (
        <div className="card">
          <div className="card-b" style={{ padding: "24px 20px" }}>
            Couldn&apos;t load this agent. It may not belong to your organisation
            or the API is unreachable.
          </div>
        </div>
      ) : null}

      {agent ? (
        <>
          <div className="grid g4" style={{ marginBottom: 22 }}>
            <Reveal delay={1}>
              <div className="stat">
                <div className="top">
                  <span className="label">Leads assigned</span>
                  <span className="ic ic-indigo"><Icon name="users" size={17} /></span>
                </div>
                <div className="value">
                  <CountUp value={agent.stats.leadsAssigned} />
                </div>
                <div className="delta up">{agent.stats.activeLeads} active</div>
              </div>
            </Reveal>
            <Reveal delay={2}>
              <div className="stat">
                <div className="top">
                  <span className="label">Closures</span>
                  <span className="ic ic-green"><Icon name="star" size={17} /></span>
                </div>
                <div className="value">
                  <CountUp value={agent.stats.closures} />
                </div>
                <div className="delta up">this month</div>
              </div>
            </Reveal>
            <Reveal delay={3}>
              <div className="stat">
                <div className="top">
                  <span className="label">Revenue booked</span>
                  <span className="ic ic-violet"><Icon name="reports" size={17} /></span>
                </div>
                <div className="value">
                  <CountUp value={revenueCr} pre="₹" suf=" Cr" dec={1} />
                </div>
                <div className="delta up">from won leads</div>
              </div>
            </Reveal>
            <Reveal delay={4}>
              <div className="stat">
                <div className="top">
                  <span className="label">Conversion</span>
                  <span className="ic ic-amber"><Icon name="target" size={17} /></span>
                </div>
                <div className="value">
                  <CountUp value={agent.stats.conversion} suf="%" />
                </div>
                <div className="delta up">of leads assigned</div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={2}>
            <div className="lt-tabs">
              {TABS.map((t, i) => (
                <button key={t} className={tab === i ? "on" : ""} onClick={() => setTab(i)}>
                  {t}
                </button>
              ))}
            </div>
          </Reveal>

          <Reveal delay={2}>
            {/* Overview */}
            <div className={`lt-pane ${tab === 0 ? "on" : ""}`}>
              <div className="ad-grid">
                <div className="ad-col">
                  <div className="card">
                    <div className="card-h">
                      <span className="t">Targets — this month</span>
                      <span className="x">vs monthly goal</span>
                    </div>
                    <div className="card-b">
                      <div className="agoal">
                        <div className="agt">
                          <b>💰 Revenue booked</b>
                          <span className="v">
                            ₹{targets?.revenueCr ?? 0} Cr / ₹{targets?.revenueTargetCr ?? 0} Cr
                          </span>
                        </div>
                        <div className="bar">
                          <i
                            data-w={`${targetPct(targets?.revenueCr ?? 0, targets?.revenueTargetCr ?? 1)}%`}
                            style={{ width: `${targetPct(targets?.revenueCr ?? 0, targets?.revenueTargetCr ?? 1)}%` }}
                          ></i>
                        </div>
                      </div>
                      <div className="agoal">
                        <div className="agt">
                          <b>🏆 Closures</b>
                          <span className="v">{targets?.closures ?? 0} / {targets?.targetClosures ?? 0}</span>
                        </div>
                        <div className="bar">
                          <i
                            data-w={`${targetPct(targets?.closures ?? 0, targets?.targetClosures ?? 1)}%`}
                            style={{
                              width: `${targetPct(targets?.closures ?? 0, targets?.targetClosures ?? 1)}%`,
                              background: "linear-gradient(90deg,#16a34a,#15803d)",
                            }}
                          ></i>
                        </div>
                      </div>
                      <div className="agoal">
                        <div className="agt">
                          <b>📌 Site visits</b>
                          <span className="v">{targets?.siteVisits ?? 0} / {targets?.siteVisitTarget ?? 0}</span>
                        </div>
                        <div className="bar">
                          <i
                            data-w={`${targetPct(targets?.siteVisits ?? 0, targets?.siteVisitTarget ?? 1)}%`}
                            style={{
                              width: `${targetPct(targets?.siteVisits ?? 0, targets?.siteVisitTarget ?? 1)}%`,
                              background: "linear-gradient(90deg,#6366f1,#4f46e5)",
                            }}
                          ></i>
                        </div>
                      </div>
                      <div className="agoal">
                        <div className="agt">
                          <b>📞 Leads worked</b>
                          <span className="v">{targets?.leadsWorked ?? 0} / {targets?.leadsWorkedTarget ?? 0}</span>
                        </div>
                        <div className="bar">
                          <i
                            data-w={`${targetPct(targets?.leadsWorked ?? 0, targets?.leadsWorkedTarget ?? 1)}%`}
                            style={{
                              width: `${targetPct(targets?.leadsWorked ?? 0, targets?.leadsWorkedTarget ?? 1)}%`,
                              background: "linear-gradient(90deg,#f59e0b,#f97316)",
                            }}
                          ></i>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-h">
                      <span className="t">Activity — last 14 days</span>
                      <span className="x">Leads worked vs calls made</span>
                    </div>
                    <div className="card-b">
                      <div className="adchart">
                        {activity14.map((c, i) => (
                          <div className="col" key={i}>
                            <div className="bars">
                              <i className="a" style={{ height: `${chartPct(c.leads)}%` }}></i>
                              <i className="b" style={{ height: `${chartPct(c.calls)}%` }}></i>
                            </div>
                            <small>{c.day}</small>
                          </div>
                        ))}
                      </div>
                      <div className="legend">
                        <span><i style={{ background: "var(--brand)" }}></i> Leads worked</span>
                        <span><i style={{ background: "#c7d2fe" }}></i> Calls made</span>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-h">
                      <span className="t">My pipeline</span>
                      <span className="x">{agent.stats.leadsAssigned} assigned by stage</span>
                    </div>
                    <div className="card-b">
                      {pipeline.map((stage) => {
                        const w =
                          maxStage > 0
                            ? Math.max(4, Math.round((stage.count / maxStage) * 100))
                            : 0;
                        const tone = stage.tone
                          ? { background: `linear-gradient(90deg, ${stage.tone}, ${stage.tone})` }
                          : {};
                        return (
                          <div className="agoal" key={stage.label}>
                            <div className="agt">
                              <span>{stage.label}</span>
                              <b className="v">{stage.count}</b>
                            </div>
                            <div className="bar">
                              <i data-w={`${w}%`} style={{ width: `${w}%`, ...tone }}></i>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="ad-col">
                  <div className="card">
                    <div className="card-h"><span className="t">Lead sources</span></div>
                    <div className="card-b">
                      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                        <div className="adonut-wrap">
                          <div className="adonut" style={{ background: sourceCss(slices) }}></div>
                          <div className="adonut-hole">
                            <div>
                              <b>{agent.stats.leadsAssigned}</b>
                              <div className="muted">leads</div>
                            </div>
                          </div>
                        </div>
                        <div className="adlist">
                          {slices.map((s, i) => {
                            const prev = i === 0 ? 0 : slices[i - 1].value;
                            return (
                              <div className="r" key={s.label}>
                                <i style={{ background: s.color }}></i>
                                {s.label}
                                <span className="v">{s.value - prev}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-h"><span className="t">Ranking</span></div>
                    <div className="card-b">
                      <div className="rankbadge">
                        <span className="n">{medallion(agent.rank)}</span>
                        <div>
                          <b>#{agent.rank} of {detail?.totalAgents}</b>
                          <div className="muted" style={{ fontSize: 12 }}>
                            in your organisation
                          </div>
                        </div>
                      </div>
                      <div className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
                        Ranked by closures this month.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

{/* Leads */}
              <div className={`lt-pane ${tab === 1 ? "on" : ""}`}>
                <div className="seg" style={{ marginBottom: 16 }}>
                  {LEADS_SEGMENTS.map((s) => (
                    <span key={s} className={seg === s ? "on" : ""} onClick={() => setSeg(s)}>
                      {s}
                    </span>
                  ))}
                </div>
                <div className="card">
                  <div className="card-h">
                    <span className="t">Assigned leads</span>
                    <span className="x">{visibleLeads.length} shown</span>
                  </div>
                  <div className="tbl-wrap">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Lead</th>
                          <th>Source</th>
                          <th>Status</th>
                          <th>Value</th>
                          <th>Captured</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleLeads.map((l) => (
                          <tr key={l.key}>
                            <td>
                              <div className="u">
                                <span className={`av ${l.av}`}>{l.initials}</span>
                                <span className="nm">{l.name}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${l.sourceBadge}`}>
                                {l.source ?? "—"}
                              </span>
                            </td>
                            <td><span className={`badge ${l.statusBadge}`}>{l.statusLabel}</span></td>
                            <td>{l.value}</td>
                            <td className="muted">{l.when}</td>
                            <td>
                              <Link className="btn btn-ghost btn-sm" href="/org/leads">
                                Open
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Calls & comms */}
              <div className={`lt-pane ${tab === 2 ? "on" : ""}`}>
                {/* Comms KPI strip */}
                <div className="grid g4" style={{ marginBottom: 18 }}>
                  <div className="stat">
                    <div className="top">
                      <span className="label">Calls made</span>
                      <span className="ic ic-sky"><Icon name="phone" size={17} /></span>
                    </div>
                    <div className="value"><CountUp value={comms?.callsMade ?? 0} /></div>
                    <div className="delta up">{comms?.connected ?? 0} connected</div>
                  </div>
                  <div className="stat">
                    <div className="top">
                      <span className="label">Connect rate</span>
                      <span className="ic ic-green"><Icon name="check" size={17} /></span>
                    </div>
                    <div className="value"><CountUp value={comms?.connectRate ?? 0} suf="%" /></div>
                    <div className="delta up">of calls answered</div>
                  </div>
                  <div className="stat">
                    <div className="top">
                      <span className="label">Talk time</span>
                      <span className="ic ic-violet"><Icon name="reports" size={17} /></span>
                    </div>
                    <div className="value">
                      <CountUp value={Math.round((comms?.talkSeconds ?? 0) / 60)} suf="m" />
                    </div>
                    <div className="delta up">avg {comms?.avgCallSeconds ?? 0}s per call</div>
                  </div>
                  <div className="stat">
                    <div className="top">
                      <span className="label">WhatsApp</span>
                      <span className="ic ic-green"><Icon name="mail" size={17} /></span>
                    </div>
                    <div className="value"><CountUp value={comms?.whatsappSent ?? 0} /></div>
                    <div className="delta up">
                      {comms?.whatsappReadPct ?? 0}% read
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-h">
                    <span className="t">Recent calls</span>
                    <span className="x">{calls.length} shown</span>
                  </div>
                  <div className="tbl-wrap">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Lead</th>
                          <th>Direction</th>
                          <th>Outcome</th>
                          <th>Duration</th>
                          <th>When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calls.map((call) => (
                          <tr key={call.id}>
                            <td>
                              <div className="u">
                                <span className={`av ${avClass(call.id)}`}>
                                  {initialsFor(callShort(call))}
                                </span>
                                <span className="nm">{callShort(call)}</span>
                              </div>
                            </td>
                            <td>
                              <span className="badge b-gray">
                                {call.direction === "incoming" ? "Incoming" : "Outgoing"}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${CALL_OUTCOME_BADGE[call.outcome]}`}>
                                {CALL_OUTCOME_LABEL[call.outcome]}
                              </span>
                            </td>
                            <td>{formatDuration(call.durationSeconds)}</td>
                            <td className="muted">{timeAgo(call.createdAt)}</td>
                          </tr>
                        ))}
                        {calls.length === 0 ? (
                          <tr>
                            <td className="muted" colSpan={5}>No calls yet.</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Activity */}
              <div className={`lt-pane ${tab === 3 ? "on" : ""}`}>
                <div className="card">
                  <div className="card-h">
                    <span className="t">Activity feed</span>
                    <span className="x">{activity.length} events</span>
                  </div>
                  <div className="card-b">
                    {activity.length > 0 ? (
                      <ul className="timeline">
                        {activity.map((event) => (
                          <li key={event.id}>
                            <span
                              className="td"
                              style={
                                ACTIVITY_TONE[event.type]
                                  ? { background: ACTIVITY_TONE[event.type] }
                                  : { background: "var(--brand)" }
                              }
                            ></span>
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "flex-start",
                              }}
                            >
                              <Icon
                                name={activityIcon(event.type)}
                                size={15}
                                style={{
                                  marginTop: 2,
                                  color: ACTIVITY_TONE[event.type] ?? "var(--brand)",
                                }}
                              />
                              <div>
                                <div style={{ fontSize: 13.5 }}>{event.text}</div>
                                <div className="tt">
                                  {ACTIVITY_LABEL[event.type]} · {timeAgo(event.createdAt)}
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="muted" style={{ padding: "8px 4px" }}>
                        No activity yet.
                      </div>
                    )}
                  </div>
</div>
            </div>
          </Reveal>
        </>
      ) : null}

      {!agent && !error ? (
        <Reveal delay={1}>
          <div className="card">
            <div className="card-b" style={{ padding: "24px 20px", color: "var(--muted)" }}>
              Loading agent dashboard…
            </div>
          </div>
        </Reveal>
      ) : null}
    </>
  );
}