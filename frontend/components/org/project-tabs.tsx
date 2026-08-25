import type { ReactNode } from "react";
import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon } from "@/components/icons";

const BASE = "/org/projects/palm-residency";

const TABS = [
  { key: "overview", label: "Overview", href: BASE },
  { key: "units", label: "Units", href: `${BASE}/units` },
  { key: "leads", label: "Leads", href: `${BASE}/leads` },
  { key: "insights", label: "Insights", href: `${BASE}/insights` },
  { key: "integrations", label: "Integrations", href: `${BASE}/integrations` },
  { key: "ai-calling", label: "AI Calling", href: `${BASE}/ai-calling` },
  { key: "knowledge", label: "Knowledge", href: `${BASE}/knowledge` },
] as const;

export type ProjectTabKey = (typeof TABS)[number]["key"];

export function ProjectHeader({ actions }: { actions?: ReactNode }) {
  return (
    <div className="page-head reveal in">
      <div>
        <div className="eyebrow">
          <Icon name="building" size={14} /> Projects
        </div>
        <h1>
          Palm Residency <span className="badge b-green">Active</span>
        </h1>
        <div className="sub">
          SG Highway, Ahmedabad · RERA PR/GJ/AHM/2026/00842 · Manager: Vijay Chandel
        </div>
      </div>
      {actions ? <div className="actions">{actions}</div> : null}
    </div>
  );
}

export function ProjectTabs({ active }: { active: ProjectTabKey }) {
  return (
    <Reveal delay={1}>
      <div className="tabs">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={tab.key === active ? "active" : ""}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </Reveal>
  );
}

export function ProjectPageHead({
  active,
  actions,
}: {
  active: ProjectTabKey;
  actions?: ReactNode;
}) {
  return (
    <>
      <ProjectHeader actions={actions} />
      <ProjectTabs active={active} />
    </>
  );
}
