import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Seg } from "@/components/superadmin/seg";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Dashboard · iPixxel Realty Super Admin",
};

const REVENUE = [
  { m: "Mar", h: "48%", g: "linear-gradient(180deg,#a5b4fc,#6366f1)" },
  { m: "Apr", h: "58%", g: "linear-gradient(180deg,#a5b4fc,#6366f1)" },
  { m: "May", h: "66%", g: "linear-gradient(180deg,#a5b4fc,#6366f1)" },
  { m: "Jun", h: "74%", g: "linear-gradient(180deg,#818cf8,#4f46e5)" },
  { m: "Jul", h: "86%", g: "linear-gradient(180deg,#818cf8,#4f46e5)" },
  { m: "Aug", h: "100%", g: "linear-gradient(180deg,#6366f1,#4338ca)" },
];

const ORGS: { av: string; tone: string; name: string; sm: string; plan: string; planTxt: string; users: number; status: string; statusTxt: string; joined: string }[] = [];

const PAYMENTS: { name: string; amt: string; desc: string }[] = [];

export default function SuperAdminDashboardPage() {
  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">▲ Platform overview</div>
          <h1>Welcome back, Pranab</h1>
          <div className="sub">
            Here&apos;s how the iPixxel Realty platform is performing across all organisations today.
          </div>
        </div>
        <div className="actions">
          <button className="btn btn-ghost">⤓ Export</button>
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
              <CountUp value={0} />
            </div>
            <div className="delta up">↑ 8 new this month</div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="stat">
            <div className="top">
              <span className="label">Active subscriptions</span>
              <span className="ic ic-green"><Icon name="billing" size={16} /></span>
            </div>
            <div className="value">
              <CountUp value={0} />
            </div>
            <div className="delta up">↑ 83% of orgs paid</div>
          </div>
        </Reveal>
        <Reveal delay={3}>
          <div className="stat">
            <div className="top">
              <span className="label">Platform MRR</span>
              <span className="ic ic-violet"><Icon name="reports" size={16} /></span>
            </div>
            <div className="value">
              <CountUp value={0} pre="₹" suf="L" dec={1} />
            </div>
            <div className="delta up">↑ 12% vs last month</div>
          </div>
        </Reveal>
        <Reveal delay={4}>
          <div className="stat">
            <div className="top">
              <span className="label">Templates live</span>
              <span className="ic ic-amber"><Icon name="puzzle" size={16} /></span>
            </div>
            <div className="value">
              <CountUp value={0} />
            </div>
            <div className="delta up">3 pending activation</div>
          </div>
        </Reveal>
      </div>

      {/* Revenue + quick actions */}
      <div className="grid g-2-1" style={{ marginBottom: 18 }}>
        <Reveal delay={1}>
          <div className="card hover">
            <div className="card-h">
              <span className="t">Revenue — last 6 months</span>
              <Seg options={["MRR", "Total"]} defaultIndex={1} />
            </div>
            <div className="card-b">
              <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 190 }}>
                {REVENUE.map((r) => (
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
                      style={{
                        width: "70%",
                        height: r.h,
                        background: r.g,
                        borderRadius: "10px 10px 0 0",
                      }}
                    />
                    <small className="muted" style={{ marginTop: 8 }}>
                      {r.m}
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
              <span className="t">Quick actions</span>
            </div>
            <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link className="btn btn-soft btn-block" href="/admin-console/organisations">
                <Icon name="building" size={14} /> Manage organisations
              </Link>
              <Link className="btn btn-ghost btn-block" href="/admin-console/domains">
                <Icon name="globe" size={14} /> Manage domain requests
              </Link>
              <Link className="btn btn-ghost btn-block" href="/admin-console/templates">
                <Icon name="puzzle" size={14} /> Create a template
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
                  {ORGS.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>No organisations yet — onboard your first organisation.</td></tr>
                  ) : ORGS.map((o) => (
                    <tr key={o.name}>
                      <td>
                        <Link className="u" href="/admin-console/organisations">
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="card">
            <div className="card-h">
              <span className="t">Pending template payments</span>
              <span className="badge b-amber">3</span>
            </div>
            <div className="card-b" style={{ padding: "8px 8px" }}>
              {PAYMENTS.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>No pending payments.</div>
                ) : PAYMENTS.map((p, i) => (
                <div key={p.name}>
                  <div className="hov" style={{ padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <b>{p.name}</b>
                      <span className="badge b-amber">{p.amt}</span>
                    </div>
                    <div className="muted" style={{ fontSize: 12.5, margin: "3px 0 8px" }}>
                      {p.desc}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-success btn-sm">Verify &amp; activate</button>
                      <button className="btn btn-ghost btn-sm">View</button>
                    </div>
                  </div>
                  {i < PAYMENTS.length - 1 && <div className="divider" style={{ margin: "6px 0" }} />}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </>
  );
}