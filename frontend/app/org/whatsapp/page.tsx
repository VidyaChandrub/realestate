import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Icon } from "@/components/icons";
import { WhatsAppPageHead } from "@/components/org/crm-tabs";

export const metadata = { title: "iPixxel Realty · WhatsApp Workflows" };

const WORKFLOWS = [
  { name: "New Lead — Instant Welcome", project: "Palm Residency", status: "b-green", statusLabel: "Active", trigger: "New lead", perf: "1,240 sent · 148 replies", created: "02 Jun 2026" },
  { name: "Site Visit Reminder — 24h", project: "Green Vista Towers", status: "b-green", statusLabel: "Active", trigger: "Site visit reminder", perf: "860 sent · 214 replies", created: "18 May 2026" },
  { name: "3-Day Follow-up Nudge", project: "All projects", status: "b-green", statusLabel: "Active", trigger: "Follow-up", perf: "3,120 sent · 372 replies", created: "11 Apr 2026" },
  { name: "NRI Broadcast — Marina Bay", project: "Marina Bay Dubai", status: "b-amber", statusLabel: "Paused", trigger: "Broadcast", perf: "2,480 sent · 190 replies", created: "27 Mar 2026" },
  { name: "Price Drop Alert — Dholera", project: "Dholera Greenfield", status: "b-green", statusLabel: "Active", trigger: "Broadcast", perf: "4,780 sent · 512 replies", created: "09 Mar 2026" },
  { name: "Cold Lead Re-engagement", project: "All projects", status: "b-gray", statusLabel: "Draft", trigger: "Follow-up", perf: "Not launched", created: "14 Aug 2026" },
];

export default function OrgWhatsAppWorkflowsPage() {
  return (
    <>
      <WhatsAppPageHead
        active="workflows"
        actions={<Link className="btn btn-primary" href="#">＋ Create workflow</Link>}
      />

      <div className="grid g4" style={{ marginBottom: 18 }}>
        <Reveal delay={1}><div className="stat"><div className="top"><span className="label">Active workflows</span><span className="ic ic-indigo"><Icon name="settings" size={16} /></span></div><div className="value"><CountUp value={5} /></div><div className="delta up">↑ 2 this month</div></div></Reveal>
        <Reveal delay={2}><div className="stat"><div className="top"><span className="label">Messages sent</span><span className="ic ic-sky"><Icon name="sparkles" size={16} /></span></div><div className="value"><CountUp value={12480} /></div><div className="delta up">↑ 18% vs last month</div></div></Reveal>
        <Reveal delay={3}><div className="stat"><div className="top"><span className="label">Delivered</span><span className="ic ic-green"><Icon name="bell" size={16} /></span></div><div className="value"><CountUp value={98} />%</div><div className="delta up">Healthy sender score</div></div></Reveal>
        <Reveal delay={4}><div className="stat"><div className="top"><span className="label">Reply rate</span><span className="ic ic-amber"><Icon name="phone" size={16} /></span></div><div className="value"><CountUp value={12} />%</div><div className="delta up">↑ 3% vs last month</div></div></Reveal>
      </div>

      <Reveal delay={2}>
        <div className="card">
          <div className="card-h"><span className="t">All workflows</span><span className="x">6 total</span></div>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Workflow Name</th><th>Status</th><th>Trigger Type</th><th>Performance</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {WORKFLOWS.map((w) => (
                <tr key={w.name}>
                  <td><b>{w.name}</b><br /><span className="sm muted">{w.project}</span></td>
                  <td><span className={`badge ${w.status}`}>{w.statusLabel}</span></td>
                  <td>{w.trigger}</td>
                  <td className="muted">{w.perf}</td>
                  <td className="mono">{w.created}</td>
                  <td>
                    <Link className="u" href="#">Edit</Link> · <Link className="u" href="#">View</Link>
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
