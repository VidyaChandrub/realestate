import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { CallingPageHead } from "@/components/org/crm-tabs";

export const metadata = { title: "iPixxel Realty · Call Logs" };

type Call = {
  time: string;
  name: string;
  agentBadge: string;
  agent: string;
  direction: string;
  duration: string;
  outcomeBadge: string;
  outcome: string;
  recording: boolean;
  summary: string;
};

const CALLS: Call[] = [
  { time: "09:04", name: "Aarav Reddy", agentBadge: "b-indigo", agent: "AI: Aarohi", direction: "Out", duration: "3m 12s", outcomeBadge: "b-green", outcome: "Connected", recording: true, summary: "Interested in 3 BHK, wants weekend site visit at Dholera." },
  { time: "09:11", name: "Meera Iyer", agentBadge: "b-indigo", agent: "AI: Kabir", direction: "Out", duration: "0m 00s", outcomeBadge: "b-amber", outcome: "Voicemail", recording: true, summary: "Left callback message; no pickup." },
  { time: "09:26", name: "Karan Patel", agentBadge: "b-gray", agent: "Vijay Chandel", direction: "Out", duration: "5m 41s", outcomeBadge: "b-green", outcome: "Connected", recording: true, summary: "Budget ₹85L, comparing Palm Residency vs Green Vista." },
  { time: "09:38", name: "Divya Shah", agentBadge: "b-indigo", agent: "AI: Aarohi", direction: "Out", duration: "2m 05s", outcomeBadge: "b-green", outcome: "Connected", recording: true, summary: "Negotiating on floor rise; will confirm by Friday." },
  { time: "09:52", name: "Farhan Sheikh", agentBadge: "b-indigo", agent: "AI: Meher", direction: "Out", duration: "0m 09s", outcomeBadge: "b-gray", outcome: "Busy", recording: false, summary: "Line busy, auto-retry scheduled." },
  { time: "10:07", name: "Ahmed Al-Farsi", agentBadge: "b-indigo", agent: "AI: Meher", direction: "Out", duration: "4m 33s", outcomeBadge: "b-green", outcome: "Connected", recording: true, summary: "NRI investor, keen on Marina Bay Dubai 2 BHK." },
  { time: "10:19", name: "Priya Nair", agentBadge: "b-gray", agent: "Sneha Kulkarni", direction: "In", duration: "6m 18s", outcomeBadge: "b-green", outcome: "Connected", recording: true, summary: "Requested brochure and payment plan for Skyline Heights." },
  { time: "10:34", name: "Rohit Mehta", agentBadge: "b-indigo", agent: "AI: Kabir", direction: "Out", duration: "0m 00s", outcomeBadge: "b-rose", outcome: "Failed", recording: false, summary: "Invalid number, marked for cleanup." },
  { time: "10:48", name: "Sana Qureshi", agentBadge: "b-indigo", agent: "AI: Aarohi", direction: "Out", duration: "1m 47s", outcomeBadge: "b-green", outcome: "Connected", recording: true, summary: "Wants EMI options; forwarded to home-loan desk." },
  { time: "11:02", name: "Vikram Desai", agentBadge: "b-indigo", agent: "AI: Kabir", direction: "Out", duration: "0m 00s", outcomeBadge: "b-amber", outcome: "Voicemail", recording: true, summary: "Voicemail dropped; follow-up SMS sent." },
  { time: "11:15", name: "Neha Kapoor", agentBadge: "b-gray", agent: "Rohit M.", direction: "In", duration: "3m 55s", outcomeBadge: "b-green", outcome: "Connected", recording: true, summary: "Rescheduled site visit to Sunday 11 AM." },
  { time: "11:29", name: "Imran Shaikh", agentBadge: "b-indigo", agent: "AI: Meher", direction: "Out", duration: "0m 06s", outcomeBadge: "b-gray", outcome: "Busy", recording: false, summary: "Busy tone; queued for evening retry." },
];

export default function OrgCallingCallLogsPage() {
  return (
    <>
      <CallingPageHead
        active="call-logs"
        actions={<Link className="btn btn-ghost" href="/org/calling/campaigns">View campaigns</Link>}
      />

      <Reveal delay={1}>
        <div className="card hover" style={{ marginBottom: 20 }}>
          <div className="card-b" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span className="ic ic-amber" style={{ fontSize: 20 }}>⚡</span>
              <div>
                <b style={{ fontSize: 15 }}><CountUp value={1000} /> credits</b>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>~66 mins of AI calling left</div>
              </div>
            </div>
            <Link className="btn btn-primary" href="/org/calling/numbers">Recharge</Link>
          </div>
        </div>
      </Reveal>

      <Reveal delay={2}>
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-b" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div className="tb-search" style={{ flex: 1, minWidth: 220, maxWidth: 340 }}>
              <span className="si">🔎</span><input placeholder="Search by lead or number…" />
            </div>
            <div className="seg"><span className="on">All</span><span>AI</span><span>Manual</span></div>
            <select style={{ maxWidth: 180 }} defaultValue="All outcomes">
              <option>All outcomes</option><option>Connected</option><option>Voicemail</option><option>Busy</option><option>Failed</option>
            </select>
            <input className="inp" type="date" style={{ maxWidth: 170 }} defaultValue="2026-08-18" />
          </div>
        </div>
      </Reveal>

      <Reveal delay={3}>
        <div className="card">
          <div className="card-h"><span className="t">Call history</span><span className="x">Last 24 hours</span></div>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Time</th><th>Lead</th><th>Agent</th><th>Direction</th><th>Duration</th><th>Outcome</th><th>Recording</th><th>AI Summary</th></tr></thead>
            <tbody>
              {CALLS.map((c) => (
                <tr key={c.time + c.name}>
                  <td className="mono">{c.time}</td>
                  <td><Link className="u" href="/org/leads" style={{ textDecoration: "none" }}>{c.name}</Link></td>
                  <td><span className={`badge ${c.agentBadge}`}>{c.agent}</span></td>
                  <td><span className="chip">{c.direction}</span></td>
                  <td>{c.duration}</td>
                  <td><span className={`badge ${c.outcomeBadge}`}>{c.outcome}</span></td>
                  <td>{c.recording ? <a href="#" style={{ color: "var(--brand)" }}>▶ Play</a> : <span className="muted">—</span>}</td>
                  <td className="muted">{c.summary}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </Reveal>
    </>
  );
}
