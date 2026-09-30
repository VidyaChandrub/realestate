"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon } from "@/components/icons";
import { getMarketingDashboard } from "@/lib/api";
import type { MarketingDashboard } from "@/lib/types";
import { PlatformBrandIcon } from "@/components/org/platform-brand-icon";
import "@/app/org/org.css";

const PLATFORM_COLORS: Record<string, string> = {
  meta: "#1877F2",
  facebook: "#1877F2",
  instagram: "#E1306C",
  google_ads: "#F4B400",
  google: "#F4B400",
  linkedin: "#0A66C2",
  linkedin_ads: "#0A66C2",
  tiktok: "#111111",
  website: "#3B82F6",
  crm: "#8B5CF6",
};

function money(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function pctChange(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return { text: "0%", up: false, flat: true };
  if (n === 0) return { text: "0%", up: false, flat: true };
  const up = n > 0;
  return { text: `${up ? "+" : ""}${Math.round(n)}%`, up, flat: false };
}

function colorFor(key: string) {
  return PLATFORM_COLORS[key.toLowerCase()] ?? "#64748B";
}

function shortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function syncLabel(iso: string | null | undefined) {
  if (!iso) return "Never synced";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Never synced";
  return `Last sync ${d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function statusBadge(status: string, ready: boolean, platformKey?: string) {
  if (!ready && status !== "connected") {
    return <span className="badge b-rose">Coming Soon</span>;
  }
  if (platformKey === "website" && (status === "connected" || status === "tracking")) {
    return <span className="badge b-indigo">Tracking Active</span>;
  }
  if (status === "connected" || status === "tracking") {
    return <span className="badge b-green">Connected</span>;
  }
  if (status === "error") {
    return <span className="badge b-amber">Error</span>;
  }
  return <span className="badge b-rose">Not Connected</span>;
}

function PlatformGlyph({ platformKey }: { platformKey: string }) {
  return <PlatformBrandIcon platformKey={platformKey} size={22} />;
}

function DonutChart({
  rows,
  total,
}: {
  rows: Array<{ key: string; label: string; count: number }>;
  total: number;
}) {
  const size = 140;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const segments = rows.map((row) => {
    const frac = total > 0 ? row.count / total : 0;
    const len = frac * c;
    const seg = {
      ...row,
      dash: `${len} ${c - len}`,
      offset,
      color: colorFor(row.key),
      pct: total > 0 ? Math.round(frac * 100) : 0,
    };
    offset -= len;
    return seg;
  });

  return (
    <div className="mkt-donut-layout">
      <div className="mkt-donut-wrap">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#EEF2F7"
            strokeWidth={stroke}
          />
          {segments.map((s) =>
            s.count > 0 ? (
              <circle
                key={s.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={s.dash}
                strokeDashoffset={s.offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            ) : null,
          )}
        </svg>
        <div className="mkt-donut-hole">
          <b>{total}</b>
          <span className="muted">Leads</span>
        </div>
      </div>
      <div className="mkt-legend">
        {segments.map((s) => (
          <div className="mkt-legend-row" key={s.key}>
            <i style={{ background: s.color }} />
            <span>{s.label}</span>
            <em>{s.pct}%</em>
          </div>
        ))}
        {!segments.length ? (
          <div className="muted" style={{ fontSize: 13 }}>
            No platform data yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function HBarChart({
  rows,
}: {
  rows: Array<{ key: string; label: string; count: number }>;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (!rows.length) {
    return <div className="muted" style={{ padding: "12px 0" }}>No source data yet.</div>;
  }
  return (
    <div className="mkt-hbar">
      {rows.map((r) => {
        const pct = Math.round((r.count / max) * 100);
        return (
          <div className="mkt-hbar-row" key={r.key}>
            <span className="mkt-hbar-label">{r.label}</span>
            <div className="mkt-hbar-track">
              <div
                className="mkt-hbar-fill"
                style={{ width: `${pct}%`, background: colorFor(r.key) }}
              />
            </div>
            <span className="mkt-hbar-val">{r.count}</span>
          </div>
        );
      })}
    </div>
  );
}

function TrendChart({ points }: { points: Array<{ date: string; count: number }> }) {
  const w = 420;
  const h = 160;
  const padX = 28;
  const padY = 20;
  const data =
    points.length > 0
      ? points
      : Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 86400000).toISOString(),
          count: 0,
        }));
  const maxY = Math.max(2, ...data.map((p) => p.count));
  const coords = data.map((p, i) => {
    const x =
      padX + (data.length === 1 ? 0 : (i / (data.length - 1)) * (w - padX * 2));
    const y = h - padY - (p.count / maxY) * (h - padY * 2);
    return { ...p, x, y };
  });
  const line = coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${coords[coords.length - 1].x} ${h - padY} L ${coords[0].x} ${h - padY} Z`;
  const ticks = [0, Math.ceil(maxY / 2), maxY];
  const labelIdx = [
    0,
    Math.floor((coords.length - 1) / 2),
    coords.length - 1,
  ].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="mkt-trend">
      <svg viewBox={`0 0 ${w} ${h}`} className="mkt-trend-svg" preserveAspectRatio="none">
        {ticks.map((t) => {
          const y = h - padY - (t / maxY) * (h - padY * 2);
          return (
            <g key={t}>
              <line
                x1={padX}
                y1={y}
                x2={w - padX}
                y2={y}
                stroke="#F1F5F9"
                strokeWidth="1"
              />
              <text x={padX - 6} y={y + 3} textAnchor="end" fill="#94A3B8" fontSize="10">
                {t}
              </text>
            </g>
          );
        })}
        <path d={area} fill="url(#mktTrendFill)" opacity="0.35" />
        <path d={line} fill="none" stroke="#3B82F6" strokeWidth="2.2" strokeLinejoin="round" />
        {coords.map((p, i) =>
          p.count > 0 ? (
            <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#3B82F6" stroke="#fff" strokeWidth="1.5" />
          ) : null,
        )}
        <defs>
          <linearGradient id="mktTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <div className="mkt-trend-labels">
        {labelIdx.map((i) => (
          <span key={i}>{shortDate(coords[i].date)}</span>
        ))}
      </div>
    </div>
  );
}

function EmptyTable({ message }: { message: string }) {
  return (
    <div className="mkt-empty">
      <div className="mkt-empty-ico">
        <Icon name="flag" size={22} />
      </div>
      <div className="muted">{message}</div>
    </div>
  );
}

export default function OrgMarketingDashboardPage() {
  const [data, setData] = useState<MarketingDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMarketingDashboard()
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load dashboard"),
      )
      .finally(() => setLoading(false));
  }, []);

  const kpis = data?.kpis;
  const apps = data?.connectedApps ?? [];
  const platformRows = data?.leadsByPlatform ?? [];
  const sourceRows = data?.leadsBySource ?? [];
  const trend = data?.leadTrend ?? [];
  const campaigns = data?.campaignPerformance ?? [];
  const topCampaigns = data?.topCampaigns ?? [];

  const kpiCards = useMemo(
    () => [
      {
        key: "leads",
        label: "Total Leads",
        icon: "target" as const,
        value: loading ? "…" : String(kpis?.totalLeads ?? 0),
        change: pctChange(kpis?.totalLeadsChange),
      },
      {
        key: "converted",
        label: "Converted",
        icon: "check" as const,
        value: loading ? "…" : String(kpis?.convertedLeads ?? 0),
        change: pctChange(kpis?.convertedChange),
      },
      {
        key: "spend",
        label: "Spend",
        icon: "reports" as const,
        value: loading ? "…" : money(kpis?.spend ?? 0),
        change: pctChange(kpis?.spendChange),
      },
      {
        key: "clicks",
        label: "Clicks",
        icon: "link" as const,
        value: loading ? "…" : String(kpis?.clicks ?? 0),
        change: pctChange(kpis?.clicksChange),
      },
      {
        key: "impr",
        label: "Impressions",
        icon: "eye" as const,
        value: loading ? "…" : String(kpis?.impressions ?? 0),
        change: pctChange(kpis?.impressionsChange),
      },
      {
        key: "cpl",
        label: "CPL",
        icon: "flag" as const,
        value: loading ? "…" : money(kpis?.cpl ?? 0),
        change: pctChange(kpis?.cplChange),
      },
      {
        key: "conv",
        label: "Conversion",
        icon: "trending" as const,
        value: loading ? "…" : `${kpis?.conversionRate ?? 0}%`,
        change: pctChange(kpis?.conversionChange),
      },
    ],
    [kpis, loading],
  );

  return (
    <>
      <div className="page-head mkt-head">
        <div>
          <div className="eyebrow">
            <Icon name="reports" size={14} /> Marketing
          </div>
          <h1>Marketing Dashboard</h1>
          <div className="sub">
            Facebook Lead Ads capture is live. Spend and full campaign metrics
            sync are still upcoming — manage connections under Connected Apps.
          </div>
          <div className="mkt-status-strip">
            {(apps.length
              ? apps
              : [
                  { key: "meta", name: "Facebook", status: "disconnected", ready: true },
                  { key: "instagram", name: "Instagram", status: "disconnected", ready: true },
                  { key: "whatsapp", name: "WhatsApp", status: "disconnected", ready: true },
                  { key: "google_ads", name: "Google Ads", status: "disconnected", ready: true },
                ]
            ).map((a) => (
              <span
                key={a.key}
                className={`mkt-chip ${
                  a.status === "connected" || a.status === "tracking"
                    ? "is-on"
                    : "is-off"
                }`}
              >
                <PlatformGlyph platformKey={a.key} />
                {a.name}
                <em>
                  {a.status === "connected"
                    ? "Connected"
                    : a.status === "tracking"
                      ? "Connected"
                      : "Not Connected"}
                </em>
              </span>
            ))}
          </div>
        </div>
        <div className="actions">
          <Link className="btn btn-primary" href="/org/marketing/apps">
            + Connected Apps
          </Link>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ color: "#b91c1c", marginBottom: 14 }}>
          <div className="card-b">{error}</div>
        </div>
      ) : null}

      <Reveal delay={1}>
        <div className="mkt-kpi-grid">
          {kpiCards.map((k) => (
            <div className="card mkt-kpi" key={k.key}>
              <div className="card-b">
                <div className="mkt-kpi-top">
                  <span className="mkt-kpi-ico">
                    <Icon name={k.icon} size={14} />
                  </span>
                  <span className="muted">{k.label}</span>
                </div>
                <div className="mkt-kpi-val">{k.value}</div>
                <div
                  className={`mkt-kpi-delta ${
                    k.change.flat ? "is-flat" : k.change.up ? "is-up" : "is-down"
                  }`}
                >
                  {k.change.text}
                  <span> vs previous period</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      <div className="mkt-charts-row">
        <Reveal delay={2}>
          <div className="card">
            <div className="card-h">
              <span className="t">Leads by Platform</span>
            </div>
            <div className="card-b">
              <DonutChart
                rows={platformRows}
                total={platformRows.reduce((s, r) => s + r.count, 0) || (kpis?.totalLeads ?? 0)}
              />
            </div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="card">
            <div className="card-h">
              <span className="t">Leads by Source</span>
            </div>
            <div className="card-b">
              <HBarChart rows={sourceRows} />
            </div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="card">
            <div className="card-h">
              <span className="t">Lead Trend</span>
              <span className="x">Total leads over time</span>
            </div>
            <div className="card-b">
              <TrendChart points={trend} />
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={3}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-h">
            <span className="t">Connected Apps</span>
            <Link className="x" href="/org/marketing/apps" style={{ textDecoration: "none" }}>
              Manage all →
            </Link>
          </div>
          <div className="card-b">
            <div className="mkt-apps-strip">
              {(apps.length ? apps : []).map((app) => {
                const connected =
                  app.status === "connected" || app.status === "tracking";
                return (
                  <div className="mkt-app-card" key={app.key}>
                    <div className="mkt-app-top">
                      <PlatformBrandIcon platformKey={app.key} size={36} />
                      <div>
                        <div className="mkt-app-name">{app.name}</div>
                        {statusBadge(app.status, app.ready, app.key)}
                      </div>
                    </div>
                    <div className="muted mkt-app-sync">{syncLabel(app.lastSyncAt)}</div>
                    <Link
                      className={`btn btn-sm ${connected ? "btn-ghost" : "btn-primary"} ${
                        !app.ready && !connected ? "is-disabled" : ""
                      }`}
                      href={`/org/marketing/apps/${app.key}`}
                      aria-disabled={!app.ready && !connected}
                      onClick={(e) => {
                        if (!app.ready && !connected) e.preventDefault();
                      }}
                    >
                      {connected ? "View Details" : app.ready ? "Connect" : "Connect"}
                    </Link>
                  </div>
                );
              })}
              {!loading && apps.length === 0 ? (
                <div className="muted">No marketing platforms enabled yet.</div>
              ) : null}
            </div>
          </div>
        </div>
      </Reveal>

      <div className="mkt-tables-row">
        <Reveal delay={3}>
          <div className="card">
            <div className="card-h">
              <span className="t">Campaign-wise Leads</span>
              <span className="x">Leads from campaigns across platforms</span>
            </div>
            <div className="card-b" style={{ padding: 0 }}>
              {!loading && campaigns.length === 0 ? (
                <EmptyTable message="No campaign leads yet." />
              ) : (
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Campaign</th>
                        <th>Platform</th>
                        <th>Spend</th>
                        <th>Clicks</th>
                        <th>Impr.</th>
                        <th>Leads</th>
                        <th>CPL</th>
                        <th>Conversion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={8} className="muted">
                            Loading…
                          </td>
                        </tr>
                      ) : (
                        campaigns.map((c) => (
                          <tr key={c.id}>
                            <td>{c.name}</td>
                            <td>
                              <span className="badge b-gray">{c.platformKey}</span>
                            </td>
                            <td>{money(c.spend)}</td>
                            <td>{c.clicks}</td>
                            <td>{c.impressions}</td>
                            <td>{c.leadsCount}</td>
                            <td>{money(c.cpl)}</td>
                            <td>{c.conversion ?? 0}%</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Reveal>

        <Reveal delay={3}>
          <div className="card">
            <div className="card-h">
              <span className="t">Top Performing Campaigns</span>
            </div>
            <div className="card-b" style={{ padding: 0 }}>
              {!loading && topCampaigns.length === 0 ? (
                <EmptyTable message="No data available." />
              ) : (
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Campaign</th>
                        <th>Platform</th>
                        <th>Leads</th>
                        <th>CPL</th>
                        <th>Conversion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="muted">
                            Loading…
                          </td>
                        </tr>
                      ) : (
                        topCampaigns.map((c) => (
                          <tr key={c.id}>
                            <td>{c.name}</td>
                            <td>
                              <span className="badge b-gray">{c.platformKey}</span>
                            </td>
                            <td>{c.leadsCount}</td>
                            <td>{money(c.cpl)}</td>
                            <td>{c.conversion}%</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </>
  );
}
