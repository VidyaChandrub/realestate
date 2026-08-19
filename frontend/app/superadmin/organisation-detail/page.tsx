import type { Metadata } from "next";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";

export const metadata: Metadata = {
  title: "Organisation · iPixxel Realty Super Admin",
};

const TEAMS = [
  { name: "Sales Team North", members: 6, mods: ["Leads", "Call Centre"], templates: 2 },
  { name: "Telecalling Team", members: 5, mods: ["Call Centre", "Reports"], templates: 1 },
  { name: "Digital Campaign Team", members: 3, mods: ["Landing Pages", "Leads"], templates: 4 },
];

const ACTIVITY = [
  { color: undefined, title: "Landing page published", tt: "Palm Residency · 2h ago" },
  { color: "var(--green)", title: "Template activated", tt: "Township Landing (paid) · yesterday" },
  { color: "var(--amber)", title: "New user invited", tt: "Sneha K. (Sales) · 2 days ago" },
  { color: "var(--violet)", title: "Subscription upgraded", tt: "Growth → Agency · 4 days ago" },
];

export default function SuperAdminOrganisationDetailPage() {
  return (
    <>
      <div className="page-head reveal in">
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span className="av" style={{ width: 58, height: 58, borderRadius: 16, fontSize: 20 }}>
            SD
          </span>
          <div>
            <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
              Skyline Developers{" "}
              <span className="badge b-green">
                <span className="dot" style={{ background: "currentColor" }} />
                Active
              </span>{" "}
              <span className="badge b-violet">Agency</span>
            </h1>
            <div className="sub" style={{ marginTop: 4 }}>
              Ahmedabad, India · <span className="mono">skyline-developers</span> · onboarded 18 Aug 2026
            </div>
          </div>
        </div>
        <div className="actions">
          <button className="btn btn-ghost">✉️ Message admin</button>
          <button className="btn btn-ghost">⏸ Suspend</button>
          <button className="btn btn-primary">Manage subscription</button>
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: 20 }}>
        <Reveal delay={1}>
          <div className="stat">
            <div className="top">
              <span className="label">Users</span>
              <span className="ic ic-indigo">👤</span>
            </div>
            <div className="value">
              <CountUp value={14} />
            </div>
            <div className="delta up">3 teams</div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="stat">
            <div className="top">
              <span className="label">Landing pages</span>
              <span className="ic ic-sky">📄</span>
            </div>
            <div className="value">
              <CountUp value={9} />
            </div>
            <div className="delta up">7 published</div>
          </div>
        </Reveal>
        <Reveal delay={3}>
          <div className="stat">
            <div className="top">
              <span className="label">Leads captured</span>
              <span className="ic ic-green">📇</span>
            </div>
            <div className="value">
              <CountUp value={1284} />
            </div>
            <div className="delta up">↑ 214 this month</div>
          </div>
        </Reveal>
        <Reveal delay={4}>
          <div className="stat">
            <div className="top">
              <span className="label">Plan value</span>
              <span className="ic ic-violet">💳</span>
            </div>
            <div className="value">
              <CountUp value={60000} pre="₹" />
            </div>
            <div className="delta up">Annual · renews Aug 2027</div>
          </div>
        </Reveal>
      </div>

      <div className="tabs reveal in">
        <a className="active">Overview</a>
        <a>Users &amp; Teams</a>
        <a>Templates</a>
        <a>Subscription</a>
        <a>Activity</a>
      </div>

      <div className="grid g-2-1">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Reveal delay={2}>
            <div className="card">
              <div className="card-h">
                <span className="t">Organisation details</span>
                <button className="btn btn-ghost btn-sm">Edit</button>
              </div>
              <div className="card-b">
                <div className="grid g2" style={{ gap: 14 }}>
                  <div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Admin
                    </div>
                    <b>Rohan Shah</b>
                    <div className="sm muted">admin@skylinedev.com</div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Phone
                    </div>
                    <b>+91 98250 12345</b>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      City
                    </div>
                    <b>Ahmedabad, Gujarat</b>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Subdomain root
                    </div>
                    <b className="mono">skylinedev.in</b>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Plan
                    </div>
                    <b>Agency (Annual)</b>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Status
                    </div>
                    <span className="badge b-green">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={3}>
            <div className="card">
              <div className="card-h">
                <span className="t">Teams</span>
                <span className="x">3 teams · 14 members</span>
              </div>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>Members</th>
                      <th>Modules</th>
                      <th>Templates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TEAMS.map((t) => (
                      <tr key={t.name}>
                        <td>
                          <b>{t.name}</b>
                        </td>
                        <td>{t.members}</td>
                        <td>
                          {t.mods.map((m) => (
                            <span className="chip" key={m}>
                              {m}
                            </span>
                          ))}
                        </td>
                        <td>{t.templates}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Reveal delay={2}>
            <div className="card">
              <div className="card-h">
                <span className="t">Activity</span>
              </div>
              <div className="card-b">
                <ul className="timeline">
                  {ACTIVITY.map((a) => (
                    <li key={a.title}>
                      <span className="td" style={a.color ? { background: a.color } : undefined} />
                      <b style={{ fontSize: 13 }}>{a.title}</b>
                      <div className="tt">{a.tt}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
          <Reveal delay={3}>
            <div className="card">
              <div className="card-h">
                <span className="t">Danger zone</span>
              </div>
              <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button className="btn btn-ghost btn-block">⏸ Suspend organisation</button>
                <button className="btn btn-ghost btn-block" style={{ color: "var(--rose)", borderColor: "var(--rose-050)" }}>
                  🗑 Delete organisation
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </>
  );
}