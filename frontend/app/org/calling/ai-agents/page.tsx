import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon } from "@/components/icons";
import { CallingPageHead } from "@/components/org/crm-tabs";

export const metadata = { title: "iPixxel Realty · AI Voice Agents" };

type Agent = {
  face: string;
  faceStyle?: string;
  name: string;
  role: string;
  status: "active" | "draft";
  language: string;
  calls: string;
  connect: string;
  visits: string;
};

const AGENTS: Agent[] = [
  { face: "👩🏻", name: "Aarohi", role: "Site Visit Booker", status: "active", language: "🎙️ Hindi / EN", calls: "1,284", connect: "61%", visits: "148" },
  { face: "🧑🏽", faceStyle: "linear-gradient(135deg,#0ea5e9,#0d9488)", name: "Vihaan", role: "Lead Qualifier", status: "active", language: "🎙️ Tamil", calls: "962", connect: "54%", visits: "87" },
  { face: "👩🏽", faceStyle: "linear-gradient(135deg,#7c3aed,#db2777)", name: "Meera", role: "Follow-up Caller", status: "active", language: "🎙️ English", calls: "2,041", connect: "49%", visits: "112" },
  { face: "🧑🏻", faceStyle: "linear-gradient(135deg,#f59e0b,#ef4444)", name: "Kabir", role: "Cold Outreach", status: "draft", language: "🎙️ Hindi / EN", calls: "0", connect: "—", visits: "0" },
];

export default function OrgCallingAiAgentsPage() {
  return (
    <>
      <CallingPageHead
        active="ai-agents"
        actions={
          <Link className="btn btn-primary" href="/org/calling/voice-lab">＋ Create AI agent</Link>
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

      <div className="help reveal in" style={{ marginBottom: 22 }}>
        🤖 AI agents call leads in a human-like voice, qualify them, book site visits, and hand off hot leads to your team.
      </div>

      <div className="grid g3">
        {AGENTS.map((a, i) => (
          <Reveal key={a.name} delay={i + 1}>
            <div className="card hover">
              <div className="card-b">
                <div className="agent-top">
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div className="agent-face" style={a.faceStyle ? { background: a.faceStyle } : undefined}>{a.face}</div>
                    <div>
                      <h3 style={{ margin: 0 }}>{a.name}</h3>
                      <div className="muted" style={{ fontSize: 12.5 }}>{a.role}</div>
                    </div>
                  </div>
                  {a.status === "active" ? (
                    <span className="badge b-green"><span className="dot" style={{ background: "var(--green)" }} />Active</span>
                  ) : (
                    <span className="badge b-gray"><span className="dot" style={{ background: "var(--muted)" }} />Draft</span>
                  )}
                </div>
                <span className="chip">{a.language}</span>
                <div className="agent-stats">
                  <div className="as"><b>{a.calls}</b><span>Calls made</span></div>
                  <div className="as"><b>{a.connect}</b><span>Connect</span></div>
                  <div className="as"><b>{a.visits}</b><span>Visits booked</span></div>
                </div>
                <div className="agent-btns">
                  <Link className="btn btn-ghost btn-sm btn-block" href="/org/calling/voice-lab">Edit</Link>
                  <Link className="btn btn-soft btn-sm btn-block" href="/org/calling/voice-lab">▶ Test call</Link>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </>
  );
}
