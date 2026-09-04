"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Icon } from "@/components/icons";
import { Seg } from "@/components/superadmin/seg";
import type { OrgDashboardKpiData } from "@/lib/types";

const PERIOD_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
  { label: "All Time", value: "all" },
] as const;

function formatCurrency(amount: number): string {
  if (!amount || amount <= 0) return "₹0";
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0 mins";
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins % 60}m`;
  }
  return `${mins} mins`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrgDashboardPage() {
  const { accessToken, user } = useAuth();

  const [periodIndex, setPeriodIndex] = useState(2); // default 30d
  const [data, setData] = useState<OrgDashboardKpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    const periodValue = PERIOD_OPTIONS[periodIndex]?.value ?? "30d";
    try {
      const res = await apiFetch<OrgDashboardKpiData>(`/org/dashboard?period=${periodValue}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, periodIndex]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const roleLabel = (r: string) => {
    switch (r) {
      case "super_admin":
        return "Super Admin Overview";
      case "admin":
      case "organisation_admin":
        return "Organisation Executive Dashboard";
      case "manager":
        return "Sales Manager Dashboard";
      case "sales":
        return "Sales Representative Dashboard";
      case "telecaller":
        return "Telecaller & Call Centre Dashboard";
      default:
        return `${r.charAt(0).toUpperCase() + r.slice(1)} Dashboard`;
    }
  };

  const kpis = data?.kpis;
  const pipeline = data?.pipelineBreakdown ?? [];
  const totalPipelineLeads = pipeline.reduce((sum, p) => sum + p.count, 0);

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Icon name="dashboard" size={14} /> Analytics &amp; KPIs</div>
          <h1>{data ? roleLabel(data.role) : "Organisation Dashboard"}</h1>
          <div className="sub">
            Real-time business performance, lead pipeline, calls, site visits, and team revenue metrics.
          </div>
        </div>
        <div className="actions">
          <Seg
            options={PERIOD_OPTIONS.map((p) => p.label)}
            value={periodIndex}
            onChange={(idx) => setPeriodIndex(idx)}
          />
        </div>
      </div>

      {error ? (
        <div className="card" style={{ padding: 16, color: "var(--rose, #e11d48)", marginBottom: 18 }}>
          {error}
        </div>
      ) : null}

      {/* Primary KPI Tiles */}
      <div style={{ marginBottom: 18 }}>
        <Reveal delay={1} className="grid g4">
          <div className="stat">
            <div className="top">
              <span className="label">Total Leads</span>
              <span className="ic ic-indigo"><Icon name="target" size={16} /></span>
            </div>
            <div className="value">
              {loading || !kpis ? "—" : <CountUp value={kpis.totalLeads} />}
            </div>
            <div className="delta" style={{ color: (kpis?.periodChangePercent ?? 0) >= 0 ? "var(--green, #10b981)" : "var(--rose, #e11d48)" }}>
              {kpis ? `${kpis.periodChangePercent >= 0 ? "↑" : "↓"} ${Math.abs(kpis.periodChangePercent)}% vs prev period` : "—"}
            </div>
          </div>

          <div className="stat">
            <div className="top">
              <span className="label">Booked Revenue</span>
              <span className="ic ic-green"><Icon name="billing" size={16} /></span>
            </div>
            <div className="value" style={{ fontSize: 22, fontWeight: 700 }}>
              {loading || !kpis ? "—" : formatCurrency(kpis.wonRevenue)}
            </div>
            <div className="delta">
              {kpis ? `${kpis.wonLeads} closed deals` : "—"}
            </div>
          </div>

          <div className="stat">
            <div className="top">
              <span className="label">Active Pipeline</span>
              <span className="ic ic-amber"><Icon name="building" size={16} /></span>
            </div>
            <div className="value" style={{ fontSize: 22, fontWeight: 700 }}>
              {loading || !kpis ? "—" : formatCurrency(kpis.activePipelineRevenue)}
            </div>
            <div className="delta">
              In-progress deals
            </div>
          </div>

          <div className="stat">
            <div className="top">
              <span className="label">Win Rate</span>
              <span className="ic ic-violet"><Icon name="check" size={16} /></span>
            </div>
            <div className="value">
              {loading || !kpis ? "—" : `${kpis.conversionRate}%`}
            </div>
            <div className="delta">
              Lead conversion %
            </div>
          </div>
        </Reveal>
      </div>

      {/* Secondary Calling & Visit KPIs */}
      <div style={{ marginBottom: 18 }}>
        <Reveal delay={2} className="grid g4">
          <div className="stat">
            <div className="top">
              <span className="label">Total Calls</span>
              <span className="ic ic-teal"><Icon name="phone" size={16} /></span>
            </div>
            <div className="value">
              {loading || !kpis ? "—" : <CountUp value={kpis.totalCalls} />}
            </div>
            <div className="delta">
              {kpis ? `${kpis.callConnectRate}% connect rate` : "—"}
            </div>
          </div>

          <div className="stat">
            <div className="top">
              <span className="label">Connected Calls</span>
              <span className="ic ic-green"><Icon name="check" size={16} /></span>
            </div>
            <div className="value">
              {loading || !kpis ? "—" : <CountUp value={kpis.connectedCalls} />}
            </div>
            <div className="delta">
              Voice conversations
            </div>
          </div>

          <div className="stat">
            <div className="top">
              <span className="label">Total Talk Time</span>
              <span className="ic ic-indigo"><Icon name="phone" size={16} /></span>
            </div>
            <div className="value" style={{ fontSize: 20 }}>
              {loading || !kpis ? "—" : formatDuration(kpis.totalTalkTimeSeconds)}
            </div>
            <div className="delta">
              Calling duration
            </div>
          </div>

          <div className="stat">
            <div className="top">
              <span className="label">Site Visits Booked</span>
              <span className="ic ic-amber"><Icon name="building" size={16} /></span>
            </div>
            <div className="value">
              {loading || !kpis ? "—" : <CountUp value={kpis.siteVisitsBooked} />}
            </div>
            <div className="delta">
              Visits &amp; Negotiations
            </div>
          </div>
        </Reveal>
      </div>

      {/* Pipeline Stage Distribution */}
      <Reveal delay={3}>
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-h">
            <span className="t">Lead Pipeline Stages</span>
            <span className="muted" style={{ fontSize: 12.5 }}>
              Distribution of {totalPipelineLeads} active &amp; closed leads
            </span>
          </div>
          <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pipeline.map((stage) => {
              const pct = totalPipelineLeads > 0 ? Math.round((stage.count / totalPipelineLeads) * 100) : 0;
              let barColor = "var(--indigo, #4f46e5)";
              if (stage.status === "won") barColor = "var(--green, #10b981)";
              if (stage.status === "lost") barColor = "var(--rose, #e11d48)";
              if (stage.status === "site_visit" || stage.status === "negotiation") barColor = "var(--amber, #f59e0b)";

              return (
                <div key={stage.status} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 500 }}>
                    <span>{stage.label}</span>
                    <span className="muted">{stage.count} leads ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, width: "100%", background: "var(--bg-subtle, #f1f5f9)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 4, transition: "width 0.4s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>

      {/* Project Portfolio & Inventory Hub Widget */}
      {data?.inventorySummary && data.inventorySummary.projects.length > 0 ? (
        <Reveal delay={3} style={{ marginBottom: 18 }}>
          <div className="card">
            <div className="card-h">
              <span className="t" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                🏙️ Project Portfolio &amp; Inventory Hub
              </span>
              <Link className="x brand-link" href="/org/projects">
                Manage All Projects ({data.inventorySummary.totalProjects}) →
              </Link>
            </div>
            <div className="card-b col gap-16">
              {/* Portfolio Aggregate KPI Strip */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--surface-2, #f8fafc)", border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 11.5, color: "var(--muted, #64748b)", fontWeight: 600 }}>Total Projects</div>
                  <div style={{ fontSize: 22, fontWeight: 800, marginTop: 3 }}>{data.inventorySummary.totalProjects}</div>
                  <div style={{ fontSize: 11, color: "var(--green, #10b981)", marginTop: 2 }}>{data.inventorySummary.activeProjects} active listings</div>
                </div>

                <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--surface-2, #f8fafc)", border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: 11.5, color: "var(--muted, #64748b)", fontWeight: 600 }}>Total Portfolio Units</div>
                  <div style={{ fontSize: 22, fontWeight: 800, marginTop: 3 }}>{data.inventorySummary.totalUnits}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Planned across projects</div>
                </div>

                <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                  <div style={{ fontSize: 11.5, color: "var(--green, #10b981)", fontWeight: 600 }}>Available Units</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green, #10b981)", marginTop: 3 }}>
                    {data.inventorySummary.unitsAvailable}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Ready for booking</div>
                </div>

                <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.2)" }}>
                  <div style={{ fontSize: 11.5, color: "var(--indigo, #6366f1)", fontWeight: 600 }}>Sold / Booked</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--indigo, #6366f1)", marginTop: 3 }}>
                    {data.inventorySummary.unitsBooked}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                    {data.inventorySummary.portfolioOccupancyRate}% occupancy rate
                  </div>
                </div>

                {data.inventorySummary.inventoryValueAvailable > 0 ? (
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                    <div style={{ fontSize: 11.5, color: "var(--amber, #f59e0b)", fontWeight: 600 }}>Available Inventory Value</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--amber, #f59e0b)", marginTop: 4 }}>
                      {formatCurrency(data.inventorySummary.inventoryValueAvailable)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Unsold stock value</div>
                  </div>
                ) : null}
              </div>

              {/* Dynamic Project Cards Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {data.inventorySummary.projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/org/projects/${p.id}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      border: "1px solid var(--line, #e2e8f0)",
                      borderRadius: 12,
                      padding: "16px",
                      background: "var(--surface, #fff)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "all 0.15s ease",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                        <span className={`badge ${p.status === "active" ? "b-green" : "b-gray"}`} style={{ fontSize: 11 }}>
                          {p.status}
                        </span>
                      </div>

                      <div style={{ fontSize: 12.5, color: "var(--muted, #64748b)", marginBottom: 10 }}>
                        📍 {p.location || "Location not set"}
                        {p.towerCount ? ` · ${p.towerCount} Towers` : ""}
                        {p.floorsDescription ? ` · ${p.floorsDescription}` : ""}
                      </div>

                      {p.configurations ? (
                        <div style={{ fontSize: 12, color: "var(--indigo, #4f46e5)", background: "rgba(99, 102, 241, 0.06)", padding: "4px 8px", borderRadius: 6, display: "inline-block", marginBottom: 12 }}>
                          📐 {p.configurations}
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: "var(--muted)" }}>Occupancy</span>
                        <span style={{ fontWeight: 600 }}>{p.occupancyPct}% sold ({p.unitsBooked}/{p.unitsCreated || p.totalUnitsPlanned || 0})</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "var(--surface-2, #e2e8f0)", overflow: "hidden", marginBottom: 10 }}>
                        <div style={{ height: "100%", width: `${p.occupancyPct}%`, background: "var(--indigo, #6366f1)", borderRadius: 3 }} />
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                        <span style={{ color: "var(--green, #10b981)", fontWeight: 600 }}>
                          {p.unitsAvailable} Available
                        </span>
                        {p.possession ? (
                          <span style={{ color: "var(--muted)", fontSize: 11 }}>
                            Possession: {p.possession}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      ) : null}

      {/* Grid: Projects & Agent Leaderboard */}
      <div className="grid g2" style={{ marginBottom: 18, gap: 18 }}>
        {/* Project Breakdown */}
        <Reveal delay={4}>
          <div className="card" style={{ height: "100%" }}>
            <div className="card-h">
              <span className="t">Project Performance</span>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Leads</th>
                    <th>Won</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {!data || data.projectMetrics.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="muted">No project activity recorded for this period.</td>
                    </tr>
                  ) : (
                    data.projectMetrics.map((p) => (
                      <tr key={p.projectId}>
                        <td style={{ fontWeight: 600 }}>{p.projectName}</td>
                        <td>{p.leadsCount}</td>
                        <td><span className="badge b-green">{p.wonCount}</span></td>
                        <td>{formatCurrency(p.revenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        {/* Call Outcomes Breakdown */}
        <Reveal delay={4}>
          <div className="card" style={{ height: "100%" }}>
            <div className="card-h">
              <span className="t">Call Outcomes</span>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Outcome</th>
                    <th>Calls</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {!data || data.callOutcomes.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="muted">No call logs recorded for this period.</td>
                    </tr>
                  ) : (
                    data.callOutcomes.map((c) => {
                      const totalC = kpis?.totalCalls ?? 1;
                      const share = totalC > 0 ? Math.round((c.count / totalC) * 100) : 0;
                      return (
                        <tr key={c.outcome}>
                          <td style={{ fontWeight: 600 }}>{c.label}</td>
                          <td>{c.count}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: "var(--bg-subtle, #f1f5f9)", borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${share}%`, background: "var(--indigo, #4f46e5)" }} />
                              </div>
                              <span style={{ fontSize: 12, minWidth: 32 }} className="muted">{share}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Leaderboard / Team Performance */}
      <Reveal delay={5}>
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-h">
            <span className="t">Team Leaderboard</span>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Team Member</th>
                  <th>Role</th>
                  <th>Leads Assigned</th>
                  <th>Deals Won</th>
                  <th>Win Rate</th>
                  <th>Revenue Booked</th>
                </tr>
              </thead>
              <tbody>
                {!data || data.agentLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted">No user metrics found for this period.</td>
                  </tr>
                ) : (
                  data.agentLeaderboard.map((a) => (
                    <tr key={a.userId}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{a.name}</div>
                        <div style={{ fontSize: 12, color: "var(--fg-subtle)" }}>{a.email}</div>
                      </td>
                      <td>
                        <span className="badge b-violet">{a.role}</span>
                      </td>
                      <td>{a.leadsCount}</td>
                      <td><span className="badge b-green">{a.wonCount}</span></td>
                      <td>{a.conversionRate}%</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(a.revenue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>

      {/* Recent Activity Stream */}
      <Reveal delay={6}>
        <div className="card">
          <div className="card-h">
            <span className="t">Recent Activity Feed</span>
          </div>
          <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!data || data.recentActivity.length === 0 ? (
              <div className="muted" style={{ padding: 12 }}>No recent activity events logged.</div>
            ) : (
              data.recentActivity.map((act) => (
                <div key={act.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingBottom: 10, borderBottom: "1px solid var(--border-light, #f1f5f9)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, background: "var(--indigo-light, #eef2ff)", color: "var(--indigo, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="check" size={14} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, color: "var(--fg, #0f172a)" }}>{act.text}</div>
                    <div style={{ fontSize: 11.5 }} className="muted">{formatDate(act.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Reveal>
    </>
  );
}

