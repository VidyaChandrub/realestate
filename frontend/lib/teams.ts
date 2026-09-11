// Shared Teams constants. Teams themselves, members and project
// assignments are real (wired to /org/teams). Module access below has no
// backend yet (TeamModuleAccess is intentionally untouched) — those toggles
// are preview-only until that's built.

import type { TeamMemberRoleValue } from "@/lib/types";

// Matches the backend's TeamMemberRole enum exactly (access schema) — this
// is the canonical per-member seniority label, fully separate from the
// org-wide Role/RBAC system (OrgUserRole). "telecaller" exists
// independently in both by coincidence only; never map between them.
export const TEAM_MEMBER_ROLES: TeamMemberRoleValue[] = [
  "team_lead",
  "sr_agent",
  "sales_agent",
  "telecaller",
  "viewer",
];

export const TEAM_MEMBER_ROLE_LABEL: Record<TeamMemberRoleValue, string> = {
  team_lead: "Team Lead",
  sr_agent: "Sr. Agent",
  sales_agent: "Sales Agent",
  telecaller: "Telecaller",
  viewer: "Viewer",
};

export const ROLE_BADGE_CLASS: Record<TeamMemberRoleValue, string> = {
  team_lead: "b-violet",
  sr_agent: "b-indigo",
  sales_agent: "b-sky",
  telecaller: "b-teal",
  viewer: "b-gray",
};

export interface ModuleDef {
  key: string;
  label: string;
  description: string;
}

/** Module access catalog — matches the org's real module set closely, but
 *  there's no backend wiring behind these toggles yet (TeamModuleAccess is
 *  out of scope). Preview-only until that's built. */
export const MODULE_DEFS: ModuleDef[] = [
  { key: "leads", label: "📇 Leads (CRM)", description: "Work the sales pipeline" },
  { key: "calling", label: "📞 Calling", description: "Dialler, dispositions, follow-ups" },
  { key: "whatsapp", label: "💬 WhatsApp", description: "Inbox & templates" },
  { key: "landing", label: "📄 Landing Pages", description: "Build & publish campaign pages" },
  { key: "reports", label: "📊 Reports", description: "Performance & source analytics" },
];

export interface ChecklistItemDef {
  id: string;
  label: string;
  description: string;
  doneByDefault: boolean;
}

/** Local-only onboarding checklist — a workflow aid for the admin running
 *  through onboarding steps, not a persisted record. */
export const ONBOARDING_CHECKLIST: ChecklistItemDef[] = [
  { id: "invite", label: "Send email invite & set password", description: "Auto-sent to work email", doneByDefault: true },
  { id: "assign", label: "Assign to team & role", description: "Places member in pipeline routing", doneByDefault: true },
  { id: "whatsapp", label: "Add to WhatsApp Business number", description: "So they can reply in the shared inbox", doneByDefault: false },
  { id: "calling", label: "Assign calling credits & extension", description: "Dialler access + monthly minutes", doneByDefault: false },
  { id: "knowledge", label: "Share product knowledge base", description: "Project decks, price sheets, scripts", doneByDefault: false },
  { id: "starter-leads", label: "Assign 5 starter leads", description: "Warm-up leads to practise the flow", doneByDefault: false },
  { id: "training", label: "Book training call with team lead", description: "30-min CRM & process walkthrough", doneByDefault: false },
];
