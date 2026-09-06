"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Seg } from "@/components/superadmin/seg";
import { Icon } from "@/components/icons";
import { useAuth } from "@/lib/auth-context";
import { getAdminDashboard } from "@/lib/api";
import type { AdminDashboardResponse } from "@/lib/types";

export default function SuperAdminDashboardPage() {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [revenueMetric, setRevenueMetric] = useState<"MRR" | "Total">("Total");

  useEffect(() => {
    if (authLoading) return;
    if (!accessToken || user?.role !== "super_admin") {
      setLoading(false);
      return;
    }
    loadDashboard();
  }, [authLoading, accessToken, user]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const res = await getAdminDashboard();
      setData(res);
    } catch (err) {
      console.error("Failed to load Super Admin dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  const firstName = user?.first_name || (user?.email ? user.email.split("@")[0] : "Admin");

  const stats = data?.stats ?? {
    totalOrgs: 0,
    activeOrgs: 0,
    newOrgsThisMonth: 0,
    newOrgsLastMonth: 0,
    activeSubscriptions: 0,
    paidPercentage: 0,
    platformMrr: 0,
    platformMrrLakhs: 0,
    templatesLive: 0,
    templatesTotal: 0,
    pendingTemplatesCount: 0,
  };

  const revenueTimeline = data?.revenueTimeline ?? [];
  const recentOrgs = data?.recentOrganisations ?? [];
  const pendingRequests = data?.pendingRequests ?? [];

  // Calculate dynamic bar heights based on selected metric (MRR or Total)
  const maxRevVal = Math.max(
    ...revenueTimeline.map((r) => (revenueMetric === "MRR" ? r.mrr : r.total)),
    1000,
  );

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">▲ Platform overview</div>
          <h1>Welcome back, {firstName}</h1>
          <div className="sub">
            Here&apos;s how the iPixxel Realty platform is performing across all organisations today.
          </div>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" onClick={loadDashboard} disabled={loading}>
            <Icon name="refresh" size={14} /> Refresh
          </button>
          <Link className="btn btn-primary" href="/admin-console/organisations">
            <Icon name="building" size={14} /> Organisations
          </Link>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <Reveal delay={1}>
          <div className="stat">
            <div className="top">
              <span className="label">Organisations</span>
              <span className="ic ic-indigo"><Icon name="building" size={16} /></span>
            </div>
            <div className="value">
              <CountUp value={stats.totalOrgs} />
            </div>
            <div className="delta up">
              ↑ {stats.newOrgsThisMonth} new this month
            </div>
          </div>
        </Reveal>

        <Reveal delay={2}>
          <div className="stat">
            <div className="top">
              <span className="label">Active subscriptions</span>
              <span className="ic ic-green"><Icon name="billing" size={16} /></span>
            </div>
            <div className="value">
              <CountUp value={stats.activeSubscriptions} />
            </div>
            <div className="delta up">
              ↑ {stats.paidPercentage}% of orgs paid
            </div>
          </div>
        </Reveal>

        <Reveal delay={3}>
          <div className="stat">
            <div className="top">
              <span className="label">Platform MRR</span>
              <span className="ic ic-violet"><Icon name="reports" size={16} /></span>
            </div>
            <div className="value">
              {stats.platformMrr >= 100000 ? (
                <CountUp value={stats.platformMrrLakhs} pre="₹" suf="L" dec={1} />
              ) : (
                <CountUp value={stats.platformMrr} pre="₹" />
              )}
            </div>
            <div className="delta up">
              {stats.activeSubscriptions > 0 ? "↑ Active recurring" : "No active subs"}
            </div>
          </div>
        </Reveal>

        <Reveal delay={4}>
          <div className="stat">
            <div className="top">
              <span className="label">Templates live</span>
              <span className="ic ic-amber"><Icon name="puzzle" size={16} /></span>
            </div>
            <div className="value">
              <CountUp value={stats.templatesLive} />
            </div>
            <div className="delta up">
              {stats.pendingTemplatesCount} draft / scheduled
            </div>
          </div>
        </Reveal>
      </div>

      {/* Revenue + quick actions */}
      <div className="grid g-2-1" style={{ marginBottom: 18 }}>
        <Reveal delay={1}>
          <div className="card hover">
            <div className="card-h">
              <span className="t">Revenue — last 6 months</span>
              <Seg
                options={["MRR", "Total"]}
                defaultIndex={revenueMetric === "MRR" ? 0 : 1}
                onChange={(idx) => setRevenueMetric(idx === 0 ? "MRR" : "Total")}
              />
            </div>
            <div className="card-b">
              {loading && revenueTimeline.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 190, color: "var(--muted)" }}>
                  Loading revenue analytics...
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 190 }}>
                  {revenueTimeline.map((r) => {
                    const val = revenueMetric === "MRR" ? r.mrr : r.total;
                    const heightPct = Math.max(12, Math.round((val / maxRevVal) * 100));
                    return (
                      <div
                        key={r.m}
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "flex-end",
                          alignItems: "center",
                          height: "100%",
                        }}
                      >
                        <div
                          className="bar"
                          title={`${r.m}: ₹${val.toLocaleString()}`}
                          style={{
                            width: "70%",
                            height: `${heightPct}%`,
                            background: r.g,
                            borderRadius: "10px 10px 0 0",
                            transition: "height 0.4s ease",
                            cursor: "pointer",
                          }}
                        />
                        <small className="muted" style={{ marginTop: 8 }}>
                          {r.m}
                        </small>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Reveal>

        <Reveal delay={2}>
          <div className="card">
            <div className="card-h">
              <span className="t">Quick actions</span>
            </div>
            <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link className="btn btn-soft btn-block" href="/admin-console/organisations">
                <Icon name="building" size={14} /> Manage organisations
              </Link>
              <Link className="btn btn-ghost btn-block" href="/admin-console/org-domains">
                <Icon name="globe" size={14} /> Manage domain requests
              </Link>
              <Link className="btn btn-ghost btn-block" href="/admin-console/templates">
                <Icon name="puzzle" size={14} /> Template studio
              </Link>
              <Link className="btn btn-ghost btn-block" href="/admin-console/email">
                <Icon name="mail" size={14} /> Email &amp; SMTP delivery
              </Link>
              <Link className="btn btn-ghost btn-block" href="/admin-console/subscriptions">
                <Icon name="billing" size={14} /> Manage subscriptions
              </Link>
              <div className="divider" />
              <div className="help">
                Organisations onboarded via <b>/register</b> can be managed directly in{" "}
                <Link href="/admin-console/organisations" style={{ color: "var(--brand)", fontWeight: 600 }}>
                  Organisations →
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Recent orgs + approvals */}
      <div className="grid g-2-1">
        <Reveal delay={1}>
          <div className="card">
            <div className="card-h">
              <span className="t">Recently onboarded organisations</span>
              <Link className="x" href="/admin-console/organisations" style={{ color: "var(--brand)" }}>
                View all →
              </Link>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Organisation</th>
                    <th>Plan</th>
                    <th>Users</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrgs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>
                        {loading ? "Loading organisations..." : "No organisations yet — onboard your first organisation."}
                      </td>
                    </tr>
                  ) : (
                    recentOrgs.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link className="u" href={`/admin-console/organisation-detail/${o.id}`}>
                            <span className={`av ${o.tone}`}>{o.av}</span>
                            <span>
                              <span className="nm">{o.name}</span>
                              <br />
                              <span className="sm">{o.sm}</span>
                            </span>
                          </Link>
                        </td>
                        <td>
                          <span className={`badge ${o.plan}`}>{o.planTxt}</span>
                        </td>
                        <td>{o.users}</td>
                        <td>
                          <span className={`badge ${o.status}`}>
                            <span className="dot" style={{ background: "currentColor" }} />
                            {o.statusTxt}
                          </span>
                        </td>
                        <td>{o.joined}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        <Reveal delay={2}>
          <div className="card">
            <div className="card-h">
              <span className="t">Pending domain approvals</span>
              <span className="badge b-amber">{pendingRequests.length}</span>
            </div>
            <div className="card-b" style={{ padding: "8px 8px" }}>
              {pendingRequests.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>
                  {loading ? "Checking requests..." : "No pending domain requests."}
                </div>
              ) : (
                pendingRequests.map((p, i) => (
                  <div key={p.id}>
                    <div className="hov" style={{ padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <b>{p.name}</b>
                        <span className="badge b-amber">{p.amt}</span>
                      </div>
                      <div className="muted" style={{ fontSize: 12.5, margin: "3px 0 8px" }}>
                        {p.desc}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Link href={`/admin-console/org-domains`} className="btn btn-success btn-sm">
                          Review &amp; Verify
                        </Link>
                        <Link href={`/admin-console/organisation-detail/${p.orgId}`} className="btn btn-ghost btn-sm">
                          Org
                        </Link>
                      </div>
                    </div>
                    {i < pendingRequests.length - 1 && <div className="divider" style={{ margin: "6px 0" }} />}
                  </div>
                ))
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </>
  );
}