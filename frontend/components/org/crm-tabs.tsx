import type { ReactNode } from "react";
import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon, type IconName } from "@/components/icons";

type Tab = { key: string; label: string; href: string };

function TabBar({ tabs, active }: { tabs: Tab[]; active: string }) {
  return (
    <Reveal delay={1}>
      <div className="tabs">
        {tabs.map((tab) => (
          <Link key={tab.key} href={tab.href} className={tab.key === active ? "active" : ""}>
            {tab.label}
          </Link>
        ))}
      </div>
    </Reveal>
  );
}

export function CrmPageHead({
  eyebrow,
  icon,
  title,
  sub,
  actions,
}: {
  eyebrow: string;
  icon: IconName;
  title: string;
  sub: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head reveal in">
      <div>
        <div className="eyebrow">
          <Icon name={icon} size={14} /> {eyebrow}
        </div>
        <h1>{title}</h1>
        <div className="sub">{sub}</div>
      </div>
      {actions ? <div className="actions">{actions}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Calling                                                            */
/* ------------------------------------------------------------------ */
const CALLING_TABS: Tab[] = [
  { key: "dashboard", label: "Dashboard", href: "/org/calling" },
  { key: "ai-agents", label: "AI Agents", href: "/org/calling/ai-agents" },
  { key: "campaigns", label: "Campaigns", href: "/org/calling/campaigns" },
  { key: "call-logs", label: "Call Logs", href: "/org/calling/call-logs" },
  { key: "voice-lab", label: "Voice Lab", href: "/org/calling/voice-lab" },
  { key: "automations", label: "Automations", href: "/org/calling/automations" },
  { key: "queue", label: "Call Queue", href: "/org/calling/queue" },
  { key: "numbers", label: "Numbers", href: "/org/calling/numbers" },
  { key: "settings", label: "Settings", href: "/org/calling/settings" },
];

export function CallingTabs({ active }: { active: string }) {
  return <TabBar tabs={CALLING_TABS} active={active} />;
}

export function CallingPageHead({
  active,
  actions,
}: {
  active: string;
  actions?: ReactNode;
}) {
  return (
    <>
      <CrmPageHead
        eyebrow="Communication"
        icon="phone"
        title="Calling Centre"
        sub="AI-powered voice calling to reach, qualify, and book site visits with your leads — around the clock."
        actions={actions}
      />
      <CallingTabs active={active} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* WhatsApp                                                           */
/* ------------------------------------------------------------------ */
const WHATSAPP_TABS: Tab[] = [
  { key: "workflows", label: "Workflows", href: "/org/whatsapp" },
  { key: "ai-agents", label: "AI Agents", href: "/org/whatsapp/ai-agents" },
  { key: "inbox", label: "Inbox", href: "/org/whatsapp/inbox" },
  { key: "automations", label: "Automations", href: "/org/whatsapp/automations" },
  { key: "settings", label: "Settings", href: "/org/whatsapp/settings" },
];

export function WhatsAppTabs({ active }: { active: string }) {
  return <TabBar tabs={WHATSAPP_TABS} active={active} />;
}

export function WhatsAppPageHead({
  active,
  actions,
}: {
  active: string;
  actions?: ReactNode;
}) {
  return (
    <>
      <CrmPageHead
        eyebrow="Communication"
        icon="mail"
        title="WhatsApp"
        sub="Automated, AI-assisted WhatsApp conversations with your leads."
        actions={actions}
      />
      <WhatsAppTabs active={active} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Leads                                                              */
/* ------------------------------------------------------------------ */
const LEADS_TABS: Tab[] = [
  { key: "lead-center", label: "Lead Center", href: "/org/leads" },
];

export function LeadsTabs({ active }: { active: string }) {
  return <TabBar tabs={LEADS_TABS} active={active} />;
}

export function LeadsPageHead({
  active,
  actions,
}: {
  active: string;
  actions?: ReactNode;
}) {
  return (
    <>
      <CrmPageHead
        eyebrow="Sales"
        icon="crm"
        title="Lead Center"
        sub="All leads across projects — captured, assigned and worked to close."
        actions={actions}
      />
      <LeadsTabs active={active} />
    </>
  );
}
