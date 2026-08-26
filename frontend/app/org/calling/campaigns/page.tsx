import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { CallingPageHead } from "@/components/org/crm-tabs";

export const metadata = { title: "iPixxel Realty · Calling Campaigns" };

const CAMPAIGNS = [
  { name: "Dholera Weekend Visits", agent: "b-indigo", agentName: "AI: Aarohi", status: "b-green", statusLabel: "Running", leads: 420, reached: 318, connected: 184, started: "14 Aug 2026" },
  { name: "Palm Residency NRI push", agent: "b-indigo", agentName: "AI: Kabir", status: "b-green", statusLabel: "Running", leads: 260, reached: 171, connected: 96, started: "12 Aug 2026" },
  { name: "Green Vista Towers — Site Visit", agent: "b-indigo", agentName: "AI: Aarohi", status: "b-amber", statusLabel: "Paused", leads: 310, reached: 142, connected: 71, started: "08 Aug 2026" },
  { name: "Marina Bay Dubai — Investor Recall", agent: "b-indigo", agentName: "AI: Meher", status: "b-green", statusLabel: "Running", leads: 145, reached: 103, connected: 58, started: "05 Aug 2026" },
  { name: "Skyline Heights — EOI Follow-up", agent: "b-indigo", agentName: "AI: Kabir", status: "b-gray", statusLabel: "Completed", leads: 512, reached: 489, connected: 261, started: "22 Jul 2026" },
  { name: "Diwali Offer — Cold Database", agent: "b-gray", agentName: "Unassigned", status: "b-gray", statusLabel: "Draft", leads: 1240, reached: 0, connected: 0, started: "" },
];

export default function OrgCallingCampaignsPage() {
  return (
    <>
      <CallingPageHead
        active="campaigns"
        actions={<Link className="btn btn-primary" href="/org/calling/campaigns">＋ New campaign</Link>}
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
        <div className="card">
          <div className="card-h"><span className="t">All campaigns</span><span className="x">6 total</span></div>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Campaign Name</th><th>AI Agent</th><th>Status</th><th>Leads</th><th>Reached</th><th>Connected</th><th>Started</th><th></th></tr></thead>
            <tbody>
              {CAMPAIGNS.map((c) => (
                <tr key={c.name}>
                  <td><b>{c.name}</b></td>
                  <td><span className={`badge ${c.agent}`}>{c.agentName}</span></td>
                  <td><span className={`badge ${c.status}`}>{c.statusLabel}</span></td>
                  <td>{c.leads.toLocaleString()}</td>
                  <td>{c.reached.toLocaleString()}</td>
                  <td>{c.connected.toLocaleString()}</td>
                  <td className={c.started ? "mono" : "muted"}>{c.started || "—"}</td>
                  <td>
                    <Link className="u" href="/org/calling/call-logs" style={{ color: "var(--brand)" }}>
                      {c.statusLabel === "Draft" ? "Edit →" : "Logs →"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </Reveal>
    </>
  );
}
