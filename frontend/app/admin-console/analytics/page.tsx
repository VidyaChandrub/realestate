import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { ProgressBar } from "@/components/superadmin/progress-bar";
import { Seg } from "@/components/superadmin/seg";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Analytics · iPixxel Realty Super Admin",
};

const SIGNUPS = [
  { m: "Sep", h: "34%" },
  { m: "Oct", h: "42%" },
  { m: "Nov", h: "40%" },
  { m: "Dec", h: "52%" },
  { m: "Jan", h: "58%" },
  { m: "Feb", h: "50%" },
  { m: "Mar", h: "66%" },
  { m: "Apr", h: "60%" },
  { m: "May", h: "72%" },
  { m: "Jun", h: "82%" },
  { m: "Jul", h: "90%" },
  { m: "Aug", h: "100%" },
];

const PLANS = [
  { name: "Agency", detail: "46% · ₹1.47L", w: "46%" },
  { name: "Growth", detail: "34% · ₹1.09L", w: "34%" },
  { name: "Starter", detail: "20% · ₹0.64L", w: "20%" },
];

const SOURCES = [
  { name: "Meta Ads", pct: "44%" },
  { name: "Google Ads", pct: "26%" },
  { name: "WhatsApp", pct: "18%" },
  { name: "Landing pages", pct: "12%" },
];

const TOP_ORGS: { name: string; city: string; leads: string; plan: string; planTxt: string }[] = [];

export default function SuperAdminAnalyticsPage() {
  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Icon name="reports" size={14} /> Overview</div>
          <h1>Platform Analytics</h1>
          <div className="sub">
            Lead, revenue and adoption trends across every organisation on iPixxel Realty.
          </div>
        </div>
        <div className="actions">
          <Seg options={["7d", "30d", "90d", "12m"]} defaultIndex={1} />
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <Reveal delay={1}>
          <div className="stat">
            <div className="top">
              <span className="label">Leads processed</span>
              <span className="ic ic-indigo"><Icon name="download" size={14} /></span>
            </div>
            <div className="value">
              <CountUp value={48200} />
            </div>
            <div className="delta up">↑ 14% vs prev 30d</div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="stat">
            <div className="top">
              <span className="label">Active organisations</span>
              <span className="ic ic-green"><Icon name="building" size={16} /></span>
            </div>
            <div className="value">
              <CountUp value={118} />
            </div>
            <div className="delta up">↑ 6 activated</div>
          </div>
        </Reveal>
        <Reveal delay={3}>
          <div className="stat">
            <div className="top">
              <span className="label">Template revenue</span>
              <span className="ic ic-violet"><Icon name="billing" size={16} /></span>
            </div>
            <div className="value">
              <CountUp value={3.2} pre="₹" suf="L" dec={1} />
            </div>
            <div className="delta up">↑ 9% vs prev 30d</div>
          </div>
        </Reveal>
        <Reveal delay={4}>
          <div className="stat">
            <div className="top">
              <span className="label">Avg leads / org</span>
              <span className="ic ic-amber"><Icon name="dashboard" size={16} /></span>
            </div>
            <div className="value">
              <CountUp value={340} />
            </div>
            <div className="delta up">↑ 22 per org</div>
          </div>
        </Reveal>
      </div>

      {/* Signups + revenue by plan */}
      <div className="grid g2" style={{ marginBottom: 18 }}>
        <Reveal delay={1}>
          <div className="card hover">
            <div className="card-h">
              <span className="t">Organisation signups</span>
              <Seg options={["Monthly"]} defaultIndex={0} />
            </div>
            <div className="card-b">
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 200 }}>
                {SIGNUPS.map((s) => (
                  <div
                    key={s.m}
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
                      style={{
                        width: "64%",
                        height: s.h,
                        background:
                          "linear-gradient(180deg,#a5b4fc,#6366f1)",
                        borderRadius: "9px 9px 0 0",
                      }}
                    />
                    <small className="muted" style={{ marginTop: 8 }}>
                      {s.m}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="card">
            <div className="card-h">
              <span className="t">Revenue by plan</span>
              <span className="badge b-indigo">₹3.2L / mo</span>
            </div>
            <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 26 }}>
              {PLANS.map((p) => (
                <div key={p.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <span className="muted">{p.detail}</span>
                  </div>
                  <ProgressBar width={p.w} />
                </div>
              ))}
              <div className="divider" style={{ margin: "6px 0" }} />
              <div className="help">
                Agency plans drive nearly half of platform revenue from just{" "}
                <b>26 organisations</b> — the highest ARPA segment.
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Lead sources + top orgs */}
      <div className="grid g2">
        <Reveal delay={1}>
          <div className="card">
            <div className="card-h">
              <span className="t">Lead sources across platform</span>
              <span className="x muted">Last 30d</span>
            </div>
            <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 24 }}>
              {SOURCES.map((s) => (
                <div key={s.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span className="muted">{s.pct}</span>
                  </div>
                  <ProgressBar width={s.pct} />
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="card">
            <div className="card-h">
              <span className="t">Top organisations by leads</span>
              <Link className="x" href="/admin-console/organisations" style={{ color: "var(--brand)" }}>
                View all →
              </Link>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Organisation</th>
                    <th>Leads</th>
                    <th>Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {TOP_ORGS.length === 0 ? (
                    <tr><td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>No organisations yet.</td></tr>
                  ) : TOP_ORGS.map((o) => (
                    <tr key={o.name}>
                      <td>
                        <span className="nm" style={{ fontWeight: 600 }}>
                          {o.name}
                        </span>
                        <br />
                        <span className="sm muted">{o.city}</span>
                      </td>
                      <td>
                        <b>{o.leads}</b>
                      </td>
                      <td>
                        <span className={`badge ${o.plan}`}>{o.planTxt}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      </div>
    </>
  );
}