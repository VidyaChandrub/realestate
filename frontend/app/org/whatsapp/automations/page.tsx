import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Icon } from "@/components/icons";
import { WhatsAppPageHead } from "@/components/org/crm-tabs";

export const metadata = { title: "iPixxel Realty · WhatsApp Automations" };

type Rule = {
  tgClass: string;
  tgIcon: string;
  from: string;
  to: string;
  sent: string;
  metricLabel: string;
  metric: string;
  on: boolean;
};

const RULES: Rule[] = [
  { tgClass: "ic-indigo", tgIcon: "🎉", from: "New lead", to: "Send welcome + brochure", sent: "1,204", metricLabel: "replied", metric: "58%", on: true },
  { tgClass: "ic-amber", tgIcon: "⏰", from: "No reply in 24h", to: "Send nudge", sent: "742", metricLabel: "replied", metric: "34%", on: true },
  { tgClass: "ic-sky", tgIcon: "📍", from: "Site visit tomorrow", to: "Send reminder + location", sent: "318", metricLabel: "confirmed", metric: "81%", on: true },
  { tgClass: "ic-green", tgIcon: "🏆", from: "Lead marked Won", to: "Send thank-you", sent: "96", metricLabel: "replied", metric: "72%", on: true },
  { tgClass: "ic-violet", tgIcon: "🌙", from: "Message after hours", to: "Send away reply + callback", sent: "624", metricLabel: "auto", metric: "—", on: false },
];

export default function OrgWhatsAppAutomationsPage() {
  return (
    <>
      <WhatsAppPageHead
        active="automations"
        actions={<button className="btn btn-primary">＋ New automation</button>}
      />

      <div className="grid g4" style={{ marginBottom: 20 }}>
        <Reveal delay={1}><div className="stat"><div className="top"><span className="label">Active rules</span><span className="ic ic-indigo"><Icon name="sparkles" size={16} /></span></div><div className="value"><CountUp value={5} /></div><div className="delta up">All healthy</div></div></Reveal>
        <Reveal delay={2}><div className="stat"><div className="top"><span className="label">Messages sent (30d)</span><span className="ic ic-green"><Icon name="bell" size={16} /></span></div><div className="value"><CountUp value={3184} /></div><div className="delta up">↑ 12% MoM</div></div></Reveal>
        <Reveal delay={3}><div className="stat"><div className="top"><span className="label">Reply rate</span><span className="ic ic-sky"><Icon name="phone" size={16} /></span></div><div className="value"><CountUp value={47} />%</div><div className="delta up">↑ 6 pts</div></div></Reveal>
        <Reveal delay={4}><div className="stat"><div className="top"><span className="label">Visits booked</span><span className="ic ic-amber"><Icon name="calendar" size={16} /></span></div><div className="value"><CountUp value={61} /></div><div className="delta up">via automations</div></div></Reveal>
      </div>

      <Reveal delay={1}>
        <div className="card">
          <div className="card-h"><span className="t">Automation rules</span><span className="x">5 rules</span></div>
          <div>
            {RULES.map((r, i) => (
              <div className="rule" key={r.from} style={{ borderBottom: i < RULES.length - 1 ? "1px solid var(--line)" : "none" }}>
                <div className={`tg ${r.tgClass}`}>{r.tgIcon}</div>
                <div className="flow">
                  <span className="step">{r.from}</span>
                  <span className="arr">→</span>
                  <span className="step">{r.to}</span>
                </div>
                <div className="stats">
                  <div><div className="n">{r.sent}</div><div className="l">sent</div></div>
                  <div><div className="n">{r.metric}</div><div className="l">{r.metricLabel}</div></div>
                </div>
                <div className={`switch ${r.on ? "on" : ""}`} />
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </>
  );
}
