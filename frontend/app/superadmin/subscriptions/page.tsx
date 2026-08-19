import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Seg } from "@/components/superadmin/seg";

export const metadata: Metadata = {
  title: "Subscriptions · iPixxel Realty Super Admin",
};

const SUBS = [
  { av: "SD", tone: "", name: "Skyline Developers", sm: "Ahmedabad", plan: "b-violet", planTxt: "Agency", amt: "₹60,000/yr", cycle: "b-indigo", cycleTxt: "Annual", status: "b-green", statusTxt: "Active", renew: "14 Feb 2027", mrr: "₹5,000" },
  { av: "GA", tone: "a2", name: "Green Acres Realty", sm: "Pune", plan: "b-indigo", planTxt: "Growth", amt: "₹4,500/mo", cycle: "b-gray", cycleTxt: "Monthly", status: "b-green", statusTxt: "Active", renew: "16 Sep 2026", mrr: "₹4,500" },
  { av: "DP", tone: "a3", name: "Dubai Prime Estates", sm: "Dubai", plan: "b-violet", planTxt: "Agency", amt: "₹60,000/yr", cycle: "b-indigo", cycleTxt: "Annual", status: "b-green", statusTxt: "Active", renew: "03 Jun 2027", mrr: "₹5,000" },
  { av: "UR", tone: "a4", name: "Urban Roots Housing", sm: "Bengaluru", plan: "b-gray", planTxt: "Starter", amt: "₹3,000/mo", cycle: "b-gray", cycleTxt: "Monthly", status: "b-rose", statusTxt: "Past due", renew: "10 Aug 2026", mrr: "₹3,000" },
  { av: "MB", tone: "a5", name: "Marina Bay Realty", sm: "Mumbai", plan: "b-indigo", planTxt: "Growth", amt: "₹4,999/mo", cycle: "b-gray", cycleTxt: "Monthly", status: "b-green", statusTxt: "Active", renew: "12 Sep 2026", mrr: "₹4,999" },
  { av: "AH", tone: "", name: "Al Habtoor Homes", sm: "Abu Dhabi", plan: "b-violet", planTxt: "Agency", amt: "₹60,000/yr", cycle: "b-indigo", cycleTxt: "Annual", status: "b-green", statusTxt: "Active", renew: "28 Nov 2026", mrr: "₹5,000" },
  { av: "PN", tone: "a2", name: "Prestige Nest Realty", sm: "Hyderabad", plan: "b-indigo", planTxt: "Growth", amt: "₹4,200/mo", cycle: "b-gray", cycleTxt: "Monthly", status: "b-green", statusTxt: "Active", renew: "20 Sep 2026", mrr: "₹4,200" },
  { av: "EG", tone: "a3", name: "Emaar Gardens LLC", sm: "Dubai", plan: "b-violet", planTxt: "Agency", amt: "₹60,000/yr", cycle: "b-indigo", cycleTxt: "Annual", status: "b-green", statusTxt: "Active", renew: "07 Jan 2027", mrr: "₹5,000" },
  { av: "LV", tone: "a4", name: "Lodha Vista Homes", sm: "Thane", plan: "b-gray", planTxt: "Starter", amt: "₹3,500/mo", cycle: "b-gray", cycleTxt: "Monthly", status: "b-rose", statusTxt: "Past due", renew: "05 Aug 2026", mrr: "₹3,500" },
  { av: "SR", tone: "a5", name: "Sobha Riverside", sm: "Kochi", plan: "b-indigo", planTxt: "Growth", amt: "₹4,800/mo", cycle: "b-gray", cycleTxt: "Monthly", status: "b-green", statusTxt: "Active", renew: "22 Sep 2026", mrr: "₹4,800" },
  { av: "DL", tone: "", name: "Damac Lagoon Realty", sm: "Sharjah", plan: "b-violet", planTxt: "Agency", amt: "₹60,000/yr", cycle: "b-indigo", cycleTxt: "Annual", status: "b-green", statusTxt: "Active", renew: "18 Apr 2027", mrr: "₹5,000" },
  { av: "KP", tone: "a2", name: "Kalpataru Pinnacle", sm: "Nagpur", plan: "b-indigo", planTxt: "Growth", amt: "₹4,000/mo", cycle: "b-gray", cycleTxt: "Monthly", status: "b-green", statusTxt: "Active", renew: "25 Sep 2026", mrr: "₹4,000" },
];

export default function SuperAdminSubscriptionsPage() {
  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">💳 Billing</div>
          <h1>Subscriptions &amp; Revenue</h1>
          <div className="sub">
            Track recurring revenue, plan mix and renewals across every organisation on the platform.
          </div>
        </div>
        <div className="actions">
          <button className="btn btn-ghost">⤓ Export CSV</button>
          <button className="btn btn-primary">＋ Create invoice</button>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <Reveal delay={1}>
          <div className="stat">
            <div className="top">
              <span className="label">Monthly recurring (MRR)</span>
              <span className="ic ic-indigo">💳</span>
            </div>
            <div className="value">
              <CountUp value={6.4} pre="₹" suf="L" dec={1} />
            </div>
            <div className="delta up">↑ 12% vs last month</div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="stat">
            <div className="top">
              <span className="label">Annual run-rate (ARR)</span>
              <span className="ic ic-violet">📈</span>
            </div>
            <div className="value">
              <CountUp value={76.8} pre="₹" suf="L" dec={1} />
            </div>
            <div className="delta up">↑ 14% YoY</div>
          </div>
        </Reveal>
        <Reveal delay={3}>
          <div className="stat">
            <div className="top">
              <span className="label">Active plans</span>
              <span className="ic ic-green">✅</span>
            </div>
            <div className="value">
              <CountUp value={118} />
            </div>
            <div className="delta up">↑ 6 new this month</div>
          </div>
        </Reveal>
        <Reveal delay={4}>
          <div className="stat">
            <div className="top">
              <span className="label">Churn rate</span>
              <span className="ic ic-rose">📉</span>
            </div>
            <div className="value">
              <CountUp value={2.1} suf="%" dec={1} />
            </div>
            <div className="delta down">↓ 0.4% vs last month</div>
          </div>
        </Reveal>
      </div>

      {/* Filters */}
      <div className="card reveal">
        <div className="card-h" style={{ flexWrap: "wrap", gap: 14 }}>
          <Seg options={["All", "Monthly", "Annual", "Past due"]} defaultIndex={0} />
          <div className="tb-search" style={{ maxWidth: 300, flex: 1 }}>
            <span className="si">🔎</span>
            <input placeholder="Search organisation or plan…" />
          </div>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Organisation</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Cycle</th>
                <th>Status</th>
                <th>Next renewal</th>
                <th>MRR</th>
              </tr>
            </thead>
            <tbody>
              {SUBS.map((s) => (
                <tr key={s.name}>
                  <td>
                    <Link className="u" href="/superadmin/organisation-detail">
                      <span className={`av ${s.tone}`}>{s.av}</span>
                      <span>
                        <span className="nm">{s.name}</span>
                        <br />
                        <span className="sm">{s.sm}</span>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <span className={`badge ${s.plan}`}>{s.planTxt}</span>
                  </td>
                  <td>{s.amt}</td>
                  <td>
                    <span className={`badge ${s.cycle}`}>{s.cycleTxt}</span>
                  </td>
                  <td>
                    <span className={`badge ${s.status}`}>
                      <span className="dot" style={{ background: "currentColor" }} />
                      {s.statusTxt}
                    </span>
                  </td>
                  <td>{s.renew}</td>
                  <td>{s.mrr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}