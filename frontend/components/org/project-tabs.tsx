"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon } from "@/components/icons";
import type { ProjectStatus } from "@/lib/types";

const TAB_DEFS = [
  { key: "overview", label: "Overview", suffix: "" },
  { key: "units", label: "Units", suffix: "/units" },
  { key: "leads", label: "Leads", suffix: "/leads" },
  { key: "insights", label: "Insights", suffix: "/insights" },
  { key: "integrations", label: "Integrations", suffix: "/integrations" },
  { key: "ai-calling", label: "AI Calling", suffix: "/ai-calling" },
  { key: "knowledge", label: "Knowledge", suffix: "/knowledge" },
] as const;

export type ProjectTabKey = (typeof TAB_DEFS)[number]["key"];

/** Minimal project shape the header needs. Optional everywhere — the static
 *  tabs (Leads/Insights/…) render the chrome without fetching a project. */
export interface ProjectHeaderInfo {
  name: string;
  status?: ProjectStatus;
  location?: string | null;
  reraId?: string | null;
  manager?: string | null;
}

function useProjectId(): string {
  const params = useParams<{ id: string }>();
  return params?.id ?? "";
}

export function ProjectHeader({
  project,
  actions,
}: {
  project?: ProjectHeaderInfo;
  actions?: ReactNode;
}) {
  const subParts = [
    project?.location,
    project?.reraId ? `RERA ${project.reraId}` : null,
    project?.manager ? `Manager: ${project.manager}` : null,
  ].filter(Boolean);

  return (
    <div className="page-head reveal in">
      <div>
        <div className="eyebrow">
          <Icon name="building" size={14} /> Projects
        </div>
        <h1>
          {project?.name ?? "Project"}{" "}
          {project?.status ? (
            <span
              className={`badge ${project.status === "active" ? "b-green" : "b-gray"}`}
            >
              {project.status === "active" ? "Active" : "Inactive"}
            </span>
          ) : null}
        </h1>
        <div className="sub">
          {subParts.length > 0 ? subParts.join(" · ") : "Project workspace"}
        </div>
      </div>
      {actions ? <div className="actions">{actions}</div> : null}
    </div>
  );
}

export function ProjectTabs({ active }: { active: ProjectTabKey }) {
  const id = useProjectId();
  const base = `/org/projects/${id}`;
  return (
    <Reveal delay={1}>
      <div className="tabs">
        {TAB_DEFS.map((tab) => (
          <Link
            key={tab.key}
            href={`${base}${tab.suffix}`}
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
  project,
}: {
  active: ProjectTabKey;
  actions?: ReactNode;
  project?: ProjectHeaderInfo;
}) {
  return (
    <>
      <ProjectHeader project={project} actions={actions} />
      <ProjectTabs active={active} />
    </>
  );
}
