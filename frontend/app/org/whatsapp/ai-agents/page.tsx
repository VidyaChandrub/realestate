import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { WhatsAppPageHead } from "@/components/org/crm-tabs";

export const metadata = { title: "iPixxel Realty · WhatsApp AI Agents" };

type WaAgent = {
  icon: string;
  name: string;
  scope: string;
  status: "active" | "paused";
  chats: string;
  resolved: string;
  handoff: string;
};

const AGENTS: WaAgent[] = [
  { icon: "🏠", name: "Property Q&A Bot", scope: "Palm Residency · Green Vista", status: "active", chats: "4,820", resolved: "86", handoff: "14" },
  { icon: "📅", name: "Site Visit Scheduler", scope: "All projects", status: "active", chats: "2,160", resolved: "72", handoff: "28" },
  { icon: "💰", name: "Price & Brochure Bot", scope: "Marina Bay Dubai", status: "active", chats: "3,540", resolved: "81", handoff: "19" },
  { icon: "🔁", name: "Re-engagement Bot", scope: "Dholera Greenfield", status: "paused", chats: "1,290", resolved: "64", handoff: "36" },
];

export default function OrgWhatsAppAiAgentsPage() {
  return (
    <>
      <WhatsAppPageHead
        active="ai-agents"
        actions={<Link className="btn btn-primary" href="#">＋ Create agent</Link>}
      />

      <div className="help reveal in" data-delay="1" style={{ marginBottom: 20 }}>
        AI agents auto-reply on WhatsApp, answer property questions, share brochures, book visits, and hand off hot chats to a human.
      </div>

      <div className="grid g3 wa-agent">
        {AGENTS.map((a, i) => (
          <Reveal key={a.name} delay={i + 1}>
            <div className="card hover">
              <div className="card-b">
                <div className="a-head">
                  <div className="a-ic">{a.icon}</div>
                  <div><b>{a.name}</b><br /><span className="sm muted">{a.scope}</span></div>
                </div>
                <div>
                  {a.status === "active" ? (
                    <span className="badge b-green">Active</span>
                  ) : (
                    <span className="badge b-amber">Paused</span>
                  )}
                </div>
                <div className="a-stats">
                  <div className="cell"><b><CountUp value={Number(a.chats.replace(",", ""))} /></b><span>Chats handled</span></div>
                  <div className="cell"><b><CountUp value={Number(a.resolved)} />%</b><span>Auto-resolved</span></div>
                  <div className="cell"><b><CountUp value={Number(a.handoff)} />%</b><span>Handoff</span></div>
                </div>
                <div className="a-foot">
                  <Link className="btn btn-ghost" href="#">Edit</Link>
                  <Link className="btn btn-primary" href="#">Test</Link>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </>
  );
}
