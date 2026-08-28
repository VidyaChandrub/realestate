import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Icon } from "@/components/icons";
import { CallingPageHead } from "@/components/org/crm-tabs";

export const metadata = { title: "iPixxel Realty · Calling Automations" };

const RULES = [
  { trig: "🎯 New lead from Meta", act: "🤖 AI agent Aarohi calls within 5 min", triggered: "642", connected: "68%", on: true },
  { trig: "📅 Lead marked Follow-up", act: "🤖 Schedule AI call in 1 day", triggered: "318", connected: "59%", on: true },
  { trig: "🏠 Site visit missed", act: "🤖 AI reminder call", triggered: "146", connected: "71%", on: true },
  { trig: "📵 No answer x3", act: "🧑‍💼 Assign to human agent", triggered: "94", connected: "—", on: true },
  { trig: "🌊 New NRI lead — Marina Bay Dubai", act: "🤖 AI agent Vihaan calls (+971 hours)", triggered: "57", connected: "54%", on: false },
];

export default function OrgCallingAutomationsPage() {
  return (
    <>
      <CallingPageHead
        active="automations"
        actions={<Link className="btn btn-primary" href="#">＋ New automation</Link>}
      />

      <div className="bal reveal in" data-delay="1">
        <div className="l">
          <div className="zap">⚡</div>
          <div>
            <div className="cr">1,000 credits <span className="muted" style={{ fontWeight: 500, fontSize: 14 }}>· ~66 mins of AI calling left</span></div>
            <div className="muted" style={{ fontSize: 12.5 }}>Caller ID +91 79 4890 2210 · Aarohi voice active</div>
          </div>
        </div>
        <Link className="btn btn-soft" href="#">＋ Recharge</Link>
      </div>

      <div className="grid g4" style={{ marginBottom: 22 }}>
        <Reveal delay={1}><div className="stat"><div className="top"><span className="label">Active automations</span><span className="ic ic-indigo"><Icon name="settings" size={16} /></span></div><div className="value"><CountUp value={4} /></div><div className="delta up">of 5 rules</div></div></Reveal>
        <Reveal delay={2}><div className="stat"><div className="top"><span className="label">Triggered today</span><span className="ic ic-sky"><Icon name="sparkles" size={16} /></span></div><div className="value"><CountUp value={87} /></div><div className="delta up">↑ 12% vs yesterday</div></div></Reveal>
        <Reveal delay={3}><div className="stat"><div className="top"><span className="label">Avg connect rate</span><span className="ic ic-green"><Icon name="bell" size={16} /></span></div><div className="value"><CountUp value={63} />%</div><div className="delta up">↑ 5% this week</div></div></Reveal>
        <Reveal delay={4}><div className="stat"><div className="top"><span className="label">Calls automated</span><span className="ic ic-amber"><Icon name="phone" size={16} /></span></div><div className="value"><CountUp value={1284} /></div><div className="delta up">this month</div></div></Reveal>
      </div>

      <Reveal delay={2}>
        <div className="card">
          <div className="card-h"><span className="t">Automation rules</span><span className="x">5 rules</span></div>
          <div>
            {RULES.map((r) => (
              <div className="rule" key={r.trig}>
                <div className="flowline">
                  <span className="trig">{r.trig}</span>
                  <span className="arr">→</span>
                  <span className="act">{r.act}</span>
                </div>
                <div className="rstats">
                  <div><div className="n">{r.triggered}</div><div className="k">Triggered</div></div>
                  <div><div className="n">{r.connected}</div><div className="k">Connected</div></div>
                  <div className={`switch ${r.on ? "on" : ""}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </>
  );
}
