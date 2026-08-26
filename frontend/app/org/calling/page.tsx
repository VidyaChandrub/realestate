import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Icon } from "@/components/icons";
import { CallingPageHead } from "@/components/org/crm-tabs";

export const metadata = { title: "iPixxel Realty · Calling Dashboard" };

const RECENT = [
  { initials: "AR", avClass: "", name: "Aarav Reddy", phone: "+91 98220 41567", agent: "b-violet", agentName: "AI Aarohi", duration: "2:41", badge: "b-green", outcome: "Connected", time: "2 min ago" },
  { initials: "MI", avClass: "a2", name: "Meera Iyer", phone: "+91 99870 22314", agent: "b-gray", agentName: "Priya S.", duration: "3:58", badge: "b-green", outcome: "Connected", time: "14 min ago" },
  { initials: "KP", avClass: "a5", name: "Karan Patel", phone: "+91 97250 88109", agent: "b-violet", agentName: "AI Aarohi", duration: "0:12", badge: "b-sky", outcome: "Voicemail", time: "28 min ago" },
  { initials: "DS", avClass: "a4", name: "Divya Shah", phone: "+91 98980 33471", agent: "b-gray", agentName: "Vijay Chandel", duration: "1:47", badge: "b-green", outcome: "Connected", time: "41 min ago" },
  { initials: "FS", avClass: "a3", name: "Farhan Sheikh", phone: "+971 50 442 8817", agent: "b-violet", agentName: "AI Aarohi", duration: "0:00", badge: "b-amber", outcome: "Busy", time: "1 hr ago" },
  { initials: "NG", avClass: "a2", name: "Nikhil Gupta", phone: "+91 90040 55129", agent: "b-gray", agentName: "Sneha K.", duration: "0:00", badge: "b-rose", outcome: "Failed", time: "1 hr ago" },
];

export default function OrgCallingDashboardPage() {
  return (
    <>
      <CallingPageHead
        active="dashboard"
        actions={
          <>
            <Link className="btn btn-ghost" href="/org/calling/call-logs">📋 Call logs</Link>
            <Link className="btn btn-primary" href="/org/calling/campaigns">＋ New calling campaign</Link>
          </>
        }
      />

      <div className="balance-card reveal in">
        <div className="bl">
          <span className="zap">⚡</span>
          <div>
            <b>1,000 credits</b> <span className="muted">· ~66 mins of AI calling left</span>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>Auto-recharge is off · Plan: Growth</div>
          </div>
        </div>
        <Link className="btn btn-primary" href="/org/calling/settings">Recharge</Link>
      </div>

      <div className="grid g4" style={{ marginBottom: 18 }}>
        <Reveal delay={1}><div className="stat">
          <div className="top"><span className="label">Calls today</span><span className="ic ic-indigo"><Icon name="phone" size={16} /></span></div>
          <div className="value"><CountUp value={128} /></div>
          <div className="delta up">↑ 18% vs yesterday</div>
        </div></Reveal>
        <Reveal delay={2}><div className="stat">
          <div className="top"><span className="label">Connected</span><span className="ic ic-green"><Icon name="bell" size={16} /></span></div>
          <div className="value"><CountUp value={74} /></div>
          <div className="delta up">58% connect rate</div>
        </div></Reveal>
        <Reveal delay={3}><div className="stat">
          <div className="top"><span className="label">Avg duration</span><span className="ic ic-sky"><Icon name="calendar" size={16} /></span></div>
          <div className="value">2:14</div>
          <div className="delta up">↑ 9s vs last week</div>
        </div></Reveal>
        <Reveal delay={4}><div className="stat">
          <div className="top"><span className="label">AI minutes used</span><span className="ic ic-violet"><Icon name="sparkles" size={16} /></span></div>
          <div className="value"><CountUp value={42} /></div>
          <div className="delta down">24 mins remaining today</div>
        </div></Reveal>
      </div>

      <div className="grid g2" style={{ marginBottom: 18 }}>
        <Reveal delay={1}><div className="card">
          <div className="card-h"><span className="t">Calls — last 7 days</span><span className="x">Aug 12 – Aug 18</span></div>
          <div className="card-b">
            <div className="chart7">
              <div className="col"><span className="vl">86</span><div className="bar7" style={{ height: "52%" }} /><span className="dl">Tue</span></div>
              <div className="col"><span className="vl">104</span><div className="bar7" style={{ height: "63%" }} /><span className="dl">Wed</span></div>
              <div className="col"><span className="vl">72</span><div className="bar7" style={{ height: "44%" }} /><span className="dl">Thu</span></div>
              <div className="col"><span className="vl">118</span><div className="bar7" style={{ height: "72%" }} /><span className="dl">Fri</span></div>
              <div className="col"><span className="vl">64</span><div className="bar7" style={{ height: "39%" }} /><span className="dl">Sat</span></div>
              <div className="col"><span className="vl">41</span><div className="bar7" style={{ height: "25%" }} /><span className="dl">Sun</span></div>
              <div className="col"><span className="vl">128</span><div className="bar7" style={{ height: "100%" }} /><span className="dl">Mon</span></div>
            </div>
          </div>
        </div></Reveal>
        <Reveal delay={2}><div className="card">
          <div className="card-h"><span className="t">Outcome breakdown</span><span className="x">Last 7 days</span></div>
          <div className="card-b obar">
            <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><b>✅ Connected</b><span className="muted">58%</span></div><div className="bar"><i data-w="58%" style={{ background: "linear-gradient(90deg,#16a34a,#0d9488)" }} /></div></div>
            <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><b>📩 Voicemail</b><span className="muted">20%</span></div><div className="bar"><i data-w="20%" style={{ background: "linear-gradient(90deg,#0ea5e9,#0d9488)" }} /></div></div>
            <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><b>📵 Busy</b><span className="muted">14%</span></div><div className="bar"><i data-w="14%" style={{ background: "linear-gradient(90deg,#f59e0b,#f97316)" }} /></div></div>
            <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><b>⚠️ Failed</b><span className="muted">8%</span></div><div className="bar"><i data-w="8%" style={{ background: "linear-gradient(90deg,#e11d48,#db2777)" }} /></div></div>
          </div>
        </div></Reveal>
      </div>

      <Reveal delay={1}>
        <div className="card">
          <div className="card-h"><span className="t">Recent calls</span><Link className="x" href="/org/calling/call-logs" style={{ color: "var(--brand)" }}>View all →</Link></div>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Lead</th><th>Agent</th><th>Duration</th><th>Outcome</th><th>Time</th></tr></thead>
            <tbody>
              {RECENT.map((c) => (
                <tr key={c.phone + c.time}>
                  <td>
                    <Link className="u" href="/org/leads" style={{ textDecoration: "none" }}>
                      <span className={`av ${c.avClass}`}>{c.initials}</span>
                      <span><span className="nm">{c.name}</span><br /><span className="sm">{c.phone}</span></span>
                    </Link>
                  </td>
                  <td><span className={`badge ${c.agent}`}>🤖 {c.agentName}</span></td>
                  <td className="mono">{c.duration}</td>
                  <td><span className={`badge ${c.badge}`}>{c.outcome}</span></td>
                  <td className="muted">{c.time}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </Reveal>
    </>
  );
}
