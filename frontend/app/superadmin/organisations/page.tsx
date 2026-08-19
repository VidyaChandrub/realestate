import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Seg } from "@/components/superadmin/seg";

export const metadata: Metadata = {
  title: "Organisations · iPixxel Realty Super Admin",
};

const ORGS = [
  { av: "SD", tone: "", name: "Skyline Developers", sm: "Ahmedabad · admin@skylinedev.com", plan: "b-violet", planTxt: "Agency", users: 14, pages: 9, mrr: "₹24,999", status: "b-green", statusTxt: "Active", joined: "18 Aug 2026" },
  { av: "DP", tone: "a2", name: "Dubai Prime Estates", sm: "Dubai · hello@dubaiprime.ae", plan: "b-violet", planTxt: "Agency", users: 21, pages: 13, mrr: "₹32,000", status: "b-amber", statusTxt: "Trial", joined: "15 Aug 2026" },
  { av: "GA", tone: "a3", name: "Green Acres Realty", sm: "Pune · ops@greenacres.in", plan: "b-indigo", planTxt: "Growth", users: 9, pages: 6, mrr: "₹9,999", status: "b-green", statusTxt: "Active", joined: "16 Aug 2026" },
  { av: "MB", tone: "a4", name: "Marina Bay Realty", sm: "Mumbai · sales@marinabay.in", plan: "b-indigo", planTxt: "Growth", users: 11, pages: 7, mrr: "₹9,999", status: "b-green", statusTxt: "Active", joined: "12 Aug 2026" },
  { av: "UR", tone: "a5", name: "Urban Roots Housing", sm: "Bengaluru · admin@urbanroots.in", plan: "b-gray", planTxt: "Starter", users: 4, pages: 2, mrr: "₹2,999", status: "b-green", statusTxt: "Active", joined: "14 Aug 2026" },
  { av: "AH", tone: "", name: "Al Habtoor Homes", sm: "Abu Dhabi · info@alhabtoorhomes.ae", plan: "b-violet", planTxt: "Agency", users: 18, pages: 11, mrr: "₹28,500", status: "b-green", statusTxt: "Active", joined: "09 Aug 2026" },
  { av: "LP", tone: "a2", name: "Lodha Prime Ventures", sm: "Thane · contact@lodhaprime.in", plan: "b-indigo", planTxt: "Growth", users: 13, pages: 8, mrr: "₹9,999", status: "b-green", statusTxt: "Active", joined: "05 Aug 2026" },
  { av: "EM", tone: "a3", name: "Emaar Living Spaces", sm: "Dubai · team@emaarliving.ae", plan: "b-violet", planTxt: "Agency", users: 26, pages: 15, mrr: "₹36,000", status: "b-green", statusTxt: "Active", joined: "28 Jul 2026" },
  { av: "SH", tone: "a4", name: "Sunrise Habitat", sm: "Jaipur · hello@sunrisehabitat.in", plan: "b-gray", planTxt: "Starter", users: 3, pages: 1, mrr: "₹2,999", status: "b-amber", statusTxt: "Trial", joined: "22 Jul 2026" },
  { av: "PN", tone: "a5", name: "Prestige Nirvana", sm: "Hyderabad · sales@prestigenirvana.in", plan: "b-indigo", planTxt: "Growth", users: 10, pages: 5, mrr: "₹9,999", status: "b-green", statusTxt: "Active", joined: "14 Jul 2026" },
  { av: "DA", tone: "", name: "Damac Signature", sm: "Sharjah · info@damacsignature.ae", plan: "b-gray", planTxt: "Starter", users: 5, pages: 3, mrr: "₹2,999", status: "b-rose", statusTxt: "Suspended", joined: "02 Jul 2026" },
  { av: "CV", tone: "a2", name: "Coastal Vista Realty", sm: "Kochi · admin@coastalvista.in", plan: "b-indigo", planTxt: "Growth", users: 7, pages: 4, mrr: "₹9,999", status: "b-green", statusTxt: "Active", joined: "19 Jun 2026" },
];

export default function SuperAdminOrganisationsPage() {
  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">🏢 Manage</div>
          <h1>Organisations</h1>
          <div className="sub">
            Every developer, agency and brokerage on the iPixxel Realty platform — across India and the Gulf.
          </div>
        </div>
        <div className="actions">
          <button className="btn btn-ghost">⤓ Export</button>
          <Link className="btn btn-primary" href="/superadmin/onboarding">
            ✨ Onboard organisation
          </Link>
        </div>
      </div>

      {/* Controls */}
      <Reveal delay={1}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
          <Seg options={["All", "Active", "Trial", "Suspended"]} defaultIndex={0} />
          <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 340 }}>
            <input className="inp" placeholder="Search by name, city or email…" style={{ paddingLeft: 38 }} />
            <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--faint)" }}>
              🔎
            </span>
          </div>
          <select style={{ maxWidth: 180 }}>
            <option>All plans</option>
            <option>Starter</option>
            <option>Growth</option>
            <option>Agency</option>
          </select>
        </div>
      </Reveal>

      {/* Stat tiles */}
      <div className="grid g4 reveal" style={{ marginBottom: 18 }}>
        <div className="stat">
          <div className="top">
            <span className="label">Total organisations</span>
            <span className="ic ic-indigo">🏢</span>
          </div>
          <div className="value">
            <CountUp value={142} />
          </div>
          <div className="delta up">↑ 8 new this month</div>
        </div>
        <div className="stat">
          <div className="top">
            <span className="label">Active</span>
            <span className="ic ic-green">✅</span>
          </div>
          <div className="value">
            <CountUp value={118} />
          </div>
          <div className="delta up">83% of platform</div>
        </div>
        <div className="stat">
          <div className="top">
            <span className="label">On trial</span>
            <span className="ic ic-amber">✨</span>
          </div>
          <div className="value">
            <CountUp value={16} />
          </div>
          <div className="delta up">↑ 4 converting soon</div>
        </div>
        <div className="stat">
          <div className="top">
            <span className="label">Suspended</span>
            <span className="ic ic-rose">🛑</span>
          </div>
          <div className="value">
            <CountUp value={8} />
          </div>
          <div className="delta down">↓ payment overdue</div>
        </div>
      </div>

      {/* Table */}
      <Reveal delay={3}>
        <div className="card">
          <div className="card-h">
            <span className="t">All organisations</span>
            <span className="muted" style={{ fontSize: 12.5 }}>
              Showing 12 of 142
            </span>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Organisation</th>
                  <th>Plan</th>
                  <th>Users</th>
                  <th>Landing pages</th>
                  <th>MRR</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ORGS.map((o) => (
                  <tr key={o.name}>
                    <td>
                      <Link className="u" href="/superadmin/organisation-detail">
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
                    <td>{o.pages}</td>
                    <td>{o.mrr}</td>
                    <td>
                      <span className={`badge ${o.status}`}>
                        <span className="dot" style={{ background: "currentColor" }} />
                        {o.statusTxt}
                      </span>
                    </td>
                    <td>{o.joined}</td>
                    <td>
                      <Link className="btn btn-ghost btn-sm" href="/superadmin/organisation-detail">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
    </>
  );
}