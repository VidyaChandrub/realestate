"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Icon } from "@/components/icons";
import {
  AGENTS,
  AGENT_ACTIVITY,
  AGENT_CALLS,
  AGENT_LEADS,
  agentChartBars,
  getAgentBySlug,
  initialsFor,
  type Agent,
  type AgentRole,
  type PipelineStage,
  type SourceSlice,
} from "@/lib/mock/agents";
import { getSalesAgent } from "@/lib/api";
import type {
  CrmLeadStatus,
  SalesAgent,
  SalesAgentDetailResponse,
  SalesAgentRecentLead,
  SalesAgentStats,
} from "@/lib/types";

const TABS = ["Overview", "Leads", "Calls & comms", "Activity"];
const LEADS_SEGMENTS = ["All", "Hot", "Follow-up", "Site visit", "Idle"];

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
  project: string;
  interest: string;
  statusLabel: string;
  badge: string;
  value: string;
  hot: boolean;
  idle: boolean;
};

function medallion(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "🏅";
}

function splitActivity(text: string): { title: string; detail: string } {
  const idx = text.indexOf(" — ");
  if (idx === -1) return { title: text, detail: "" };
  return { title: text.slice(0, idx), detail: text.slice(idx + 3) };
}

function roleLabel(api: SalesAgent): AgentRole {
  switch (api.role?.key) {
    case "manager":
      return "Manager";
    case "sales":
      return "Sales";
    default:
      return "Admin";
  }
}

function avClass(id: string): string {
  const n = id.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return AV_MODIFIERS[n % AV_MODIFIERS.length];
}

function formatAdded(date: string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
function sourceCss(slices: SourceSlice[]): string {
  if (slices.length === 0) return "conic-gradient(#e2e8f0 0 100%)";
  let from = 0;
  const stops = slices.map((s) => {
    const stop = `${s.color} ${from}% ${s.value}%`;
    from = s.value;
    return stop;
  });
  return `conic-gradient(${stops.join(",")})`;
}

/** API source counts → cumulative SourceSlice list for the donut. */
function sourcesToSlices(stats: SalesAgentStats): SourceSlice[] {
  const total = stats.sources.reduce((sum, s) => sum + s.count, 0);
  if (total === 0) return [];
  let cum = 0;
  const slices = stats.sources.map((s) => {
    const pct = Math.round((s.count / total) * 100);
    cum += pct;
    return { label: s.source ?? "Other", value: cum, color: sourceColor(s.source) };
  });
  if (slices.length > 0 && slices[slices.length - 1].value < 100) {
    slices[slices.length - 1].value = 100;
  }
  return slices;
}

function apiPipeline(stats: SalesAgentStats): PipelineStage[] {
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

function leadName(lead: SalesAgentRecentLead): string {
  const full =
    typeof lead.data?.fullName === "string"
      ? lead.data.fullName
      : typeof lead.data?.name === "string"
        ? lead.data.name
        : null;
  return full || lead.formName || "Unnamed lead";
}

function leadProject(lead: SalesAgentRecentLead): string {
  const project =
    typeof lead.data?.project === "string"
      ? lead.data.project
      : typeof lead.data?.projectName === "string"
        ? lead.data.projectName
        : null;
  return project || "—";
}

function apiLeadsToRows(leads: SalesAgentRecentLead[]): LeadRow[] {
  return leads.map((lead) => {
    const name = leadName(lead);
    return {
      key: lead.id,
      name,
      initials: initialsFor(name),
      av: avClass(lead.id),
      project: leadProject(lead),
      interest: "—",
      statusLabel: STATUS_LABEL[lead.status],
      badge: STATUS_BADGE[lead.status],
      value: formatBudget(lead.budget),
      hot: lead.budget >= 1e7,
      idle: lead.status === "new" || lead.status === "contacted",
    };
  });
}

function mockLeadsToRows(
  rows: (typeof AGENT_LEADS)[number][],
): LeadRow[] {
  return rows.map((l) => ({
    key: l.lead,
    name: l.lead,
    initials: l.initials,
    av: l.av,
    project: l.project,
    interest: l.interest,
    statusLabel: l.status,
    badge: l.badge,
    value: l.value,
    hot: l.value.includes("Cr"),
    idle: l.status.startsWith("Idle"),
  }));
}

/** Merge API stats onto the prototype Agent shape; anything without a backend
 *  column (targets, calls, activity, efficiency) stays as prototype data. */
function toAgent(api: SalesAgent, fallback: Agent): Agent {
  return {
    ...fallback,
    slug: api.id,
    name: api.name,
    email: api.email,
    phone: api.phoneNumber ?? "—",
    role: roleLabel(api),
    online: api.online,
    bridgeMissing: api.bridgeMissing,
    assignment: api.status === "active" ? "Active" : "Paused",
    added: formatAdded(api.joinedAt),
    leadsAssigned: api.stats.leadsAssigned,
    activeLeads: api.stats.activeLeads,
    closures: api.stats.closures,
    closuresDelta: 0,
    revenueCr: Math.round((api.stats.revenueBooked / 1e7) * 10) / 10,
    conversion: api.stats.conversion,
    pipeline: apiPipeline(api.stats),
    sources: sourcesToSlices(api.stats),
    rank: api.rank,
  };
}

export default function OrgAgentDetailPage() {
  const params = useParams<{ id: string }>();
  const fallback = getAgentBySlug("priya-sharma")!;
  const mockAgent = params?.id ? getAgentBySlug(params.id) : undefined;

  const [tab, setTab] = useState(0);
  const [seg, setSeg] = useState("All");
  const [apiDetail, setApiDetail] = useState<SalesAgentDetailResponse | null>(null);

  useEffect(() => {
    // Mock slug → prototype data; UUID → real org dashboard.
    if (mockAgent || !params?.id) return;
    let mounted = true;
    getSalesAgent(params.id)
      .then((detail) => {
        if (mounted) setApiDetail(detail);
      })
      .catch(() => {}); // no backend / no session → keep the prototype view
    return () => {
      mounted = false;
    };
  }, [params?.id, mockAgent]);

  const agent: Agent = useMemo(
    () => (apiDetail ? toAgent(apiDetail.agent, fallback) : mockAgent ?? fallback),
    [apiDetail, mockAgent, fallback],
  );

  const fromApi = apiDetail !== null;
  const rankCount = apiDetail?.totalAgents ?? AGENTS.length;

  const leads: LeadRow[] = useMemo(
    () =>
      apiDetail
        ? apiLeadsToRows(apiDetail.recentLeads)
        : mockLeadsToRows(AGENT_LEADS),
    [apiDetail],
  );

  const revenuePct = Math.round((agent.revenueCr / agent.revenueTargetCr) * 100);
  const closuresPct = Math.round(
    (agent.closures / agent.targetClosures) * 100,
  );
  const visitsPct = Math.round((agent.siteVisits / agent.siteVisitTarget) * 100);
  const workedPct = Math.round(
    (agent.leadsWorked / agent.leadsWorkedTarget) * 100,
  );
  const connectRate = Math.round((agent.connected / agent.callsMade) * 100);
  const conversionOk = agent.conversion >= agent.conversionTarget;
  const maxStage = Math.max(...agent.pipeline.map((s) => s.count));
  const first = agent.name.split(" ")[0] ?? "This agent";
  const chart = agentChartBars(agent.chartSeed);

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
            {agent.role} · {agent.team} · {agent.email} · {agent.phone}
          </div>
        </div>
        <div className="actions">
          <Link className="btn btn-ghost" href="/org/sales-agents">
            ← Back
          </Link>
          <select className="inp" defaultValue="This month" style={{ width: "auto" }}>
            <option>This month</option>
            <option>Last month</option>
            <option>This quarter</option>
            <option>This year</option>
          </select>
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
          👤 <b>This is {first}&apos;s performance dashboard.</b> Agents see their
          own view when they sign in; managers &amp; admins can open any agent&apos;s
          dashboard from the Sales Agents list.
          {fromApi
            ? " Targets, calls &amp; activity are prototype benchmarks until their modules ship."
            : null}
        </div>
      </Reveal>

      <div className="grid g4" style={{ marginBottom: 22 }}>
        <Reveal delay={1}>
          <div className="stat">
            <div className="top">
              <span className="label">Leads assigned</span>
              <span className="ic ic-indigo"><Icon name="users" size={17} /></span>
            </div>
            <div className="value">
              <CountUp value={agent.leadsAssigned} />
            </div>
            <div className="delta up">{agent.activeLeads} active</div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="stat">
            <div className="top">
              <span className="label">Closures</span>
              <span className="ic ic-green"><Icon name="star" size={17} /></span>
            </div>
            <div className="value">
              <CountUp value={agent.closures} />
            </div>
            <div className="delta up">
              {fromApi ? "this month" : `↑ ${agent.closuresDelta} vs last month`}
            </div>
          </div>
        </Reveal>
        <Reveal delay={3}>
          <div className="stat">
            <div className="top">
              <span className="label">Revenue booked</span>
              <span className="ic ic-violet"><Icon name="reports" size={17} /></span>
            </div>
            <div className="value">
              <CountUp value={agent.revenueCr} pre="₹" suf=" Cr" dec={1} />
            </div>
            <div className="delta up">{revenuePct}% of target</div>
          </div>
        </Reveal>
        <Reveal delay={4}>
          <div className="stat">
            <div className="top">
              <span className="label">Conversion</span>
              <span className="ic ic-amber"><Icon name="target" size={17} /></span>
            </div>
            <div className="value">
              <CountUp value={agent.conversion} suf="%" />
            </div>
            <div className={`delta ${conversionOk ? "up" : "down"}`}>
              {conversionOk ? "above" : "below"} {agent.conversionTarget}% target
            </div>
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
                  <span className="x">27 of 30 days</span>
                </div>
                <div className="card-b">
                  <div className="agoal">
                    <div className="agt">
                      <b>💰 Revenue booked</b>
                      <span className="v">₹{agent.revenueCr} Cr / ₹{agent.revenueTargetCr} Cr</span>
                    </div>
                    <div className="bar"><i data-w={`${revenuePct}%`} style={{ width: `${revenuePct}%` }}></i></div>
                  </div>
                  <div className="agoal">
                    <div className="agt">
                      <b>🏆 Closures</b>
                      <span className="v">{agent.closures} / {agent.targetClosures}</span>
                    </div>
                    <div className="bar"><i data-w={`${closuresPct}%`} style={{ width: `${closuresPct}%`, background: "linear-gradient(90deg,#16a34a,#15803d)" }}></i></div>
                  </div>
                  <div className="agoal">
                    <div className="agt">
                      <b>📅 Site visits</b>
                      <span className="v">{agent.siteVisits} / {agent.siteVisitTarget}</span>
                    </div>
                    <div className="bar"><i data-w={`${visitsPct}%`} style={{ width: `${visitsPct}%`, background: "linear-gradient(90deg,#6366f1,#4f46e5)" }}></i></div>
                  </div>
                  <div className="agoal">
                    <div className="agt">
                      <b>📇 Leads worked</b>
                      <span className="v">{agent.leadsWorked} / {agent.leadsWorkedTarget}</span>
                    </div>
                    <div className="bar"><i data-w={`${workedPct}%`} style={{ width: `${workedPct}%`, background: "linear-gradient(90deg,#f59e0b,#f97316)" }}></i></div>
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
                    {chart.map((c, i) => (
                      <div className="col" key={i}>
                        <div className="bars">
                          <i className="a" style={{ height: `${c.leads}%` }}></i>
                          <i className="b" style={{ height: `${c.calls}%` }}></i>
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
                  <span className="x">{agent.activeLeads} active leads by stage</span>
                </div>
                <div className="card-b">
                  {agent.pipeline.map((stage) => {
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
                      <div className="adonut" style={{ background: sourceCss(agent.sources) }}></div>
                      <div className="adonut-hole">
                        <div>
                          <b>{agent.leadsAssigned}</b>
                          <div className="muted">leads</div>
                        </div>
                      </div>
                    </div>
                    <div className="adlist">
                      {agent.sources.map((s, i) => {
                        const prev = i === 0 ? 0 : agent.sources[i - 1].value;
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
                <div className="card-h"><span className="t">Efficiency</span></div>
                <div className="card-b" style={{ paddingTop: 4, paddingBottom: 4 }}>
                  {agent.efficiency.map((e) => (
                    <div className="stat-mini" key={e.label}>
                      <span className="muted">{e.label}</span>
                      <span className="v" style={{ color: e.tone === "green" ? "var(--green)" : e.tone === "rose" ? "var(--rose)" : undefined }}>
                        {e.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-h"><span className="t">Ranking</span></div>
                <div className="card-b">
                  <div className="rankbadge">
                    <span className="n">{medallion(agent.rank)}</span>
                    <div>
                      <b>#{agent.rank} of {rankCount}</b>
                      <div className="muted" style={{ fontSize: 12 }}>
                        in {agent.team}
                      </div>
                    </div>
                  </div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
                    Top performer: {agent.topPerformer}
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
              <span className="x">
                {visibleLeads.length} active{fromApi ? "" : " · prototype"}
              </span>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Project</th>
                    <th>Interest</th>
                    <th>Status</th>
                    <th>Value</th>
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
                      <td>{l.project}</td>
                      <td>{l.interest}</td>
                      <td><span className={`badge ${l.badge}`}>{l.statusLabel}</span></td>
                      <td>{l.value}</td>
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
          <div className="grid g4" style={{ marginBottom: 18 }}>
            <div className="stat">
              <div className="top"><span className="label">Calls made</span><span className="ic ic-indigo"><Icon name="phone" size={17} /></span></div>
              <div className="value"><CountUp value={agent.callsMade} /></div>
              <div className="delta up">this month</div>
            </div>
            <div className="stat">
              <div className="top"><span className="label">Connected</span><span className="ic ic-green"><Icon name="check" size={17} /></span></div>
              <div className="value"><CountUp value={agent.connected} /></div>
              <div className="delta">{connectRate}% rate</div>
            </div>
            <div className="stat">
              <div className="top"><span className="label">Talk time</span><span className="ic ic-sky"><Icon name="calendar" size={17} /></span></div>
              <div className="value"><CountUp value={agent.talkHours} suf="h" /></div>
              <div className="delta">avg {agent.avgCall}</div>
            </div>
            <div className="stat">
              <div className="top"><span className="label">WhatsApp sent</span><span className="ic ic-violet"><Icon name="mail" size={17} /></span></div>
              <div className="value"><CountUp value={agent.whatsappSent} /></div>
              <div className="delta up">{agent.whatsappRead}% read</div>
            </div>
          </div>
          <div className="card">
            <div className="card-h"><span className="t">Recent calls</span></div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Type</th>
                    <th>Duration</th>
                    <th>Outcome</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {AGENT_CALLS.map((c) => (
                    <tr key={c.lead + c.when}>
                      <td>{c.lead}</td>
                      <td>{c.type}</td>
                      <td>{c.duration}</td>
                      <td><span className={`badge ${c.badge}`}>{c.outcome}</span></td>
                      <td>{c.when}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Activity */}
        <div className={`lt-pane ${tab === 3 ? "on" : ""}`}>
          <div className="card">
            <div className="card-b">
              <ul className="timeline">
                {AGENT_ACTIVITY.map((a, i) => {
                  const { title, detail } = splitActivity(a.text);
                  return (
                    <li key={i}>
                      <b>{a.icon} {title}</b>
                      {detail ? ` — ${detail}` : null}
                      <div className="tt">{a.time}</div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </Reveal>
    </>
  );
}