/* ============================================================
   Sales Agents — prototype data.
   Ported from the static HTML mockups (team.html, agent-detail.html).
   Static placeholder figures until the org API exposes real
   agent performance data.
   ============================================================ */

export type AgentRole = "Admin" | "Manager" | "Sales";

export type PipelineStage = {
  label: string;
  count: number;
  tone?: string;
};

export type SourceSlice = {
  label: string;
  value: number; // cumulative percentage used in the conic-gradient
  color: string;
};

export type EfficiencyRow = {
  label: string;
  value: string;
  tone?: "green" | "rose";
};

export type Agent = {
  slug: string;
  name: string;
  email: string;
  phone: string;
  role: AgentRole;
  av: string; // gradient modifier "" | "a2" | "a3" | "a4" | "a5"
  online: boolean;
  bridgeMissing: boolean;
  assignment: string;
  added: string;
  team: string;
  // headline tiles
  leadsAssigned: number;
  activeLeads: number;
  closures: number;
  closuresDelta: number;
  revenueCr: number;
  revenueTargetCr: number;
  conversion: number;
  conversionTarget: number;
  // monthly targets
  targetClosures: number;
  siteVisits: number;
  siteVisitTarget: number;
  leadsWorked: number;
  leadsWorkedTarget: number;
  pipeline: PipelineStage[];
  sources: SourceSlice[];
  efficiency: EfficiencyRow[];
  rank: number;
  topPerformer: string;
  // comms
  callsMade: number;
  connected: number;
  talkHours: number;
  avgCall: string;
  whatsappSent: number;
  whatsappRead: number;
  chartSeed: number;
};

const SOURCES: SourceSlice[] = [
  { label: "Meta", value: 46, color: "var(--brand)" },
  { label: "Google", value: 71, color: "#0ea5e9" },
  { label: "WhatsApp", value: 89, color: "#16a34a" },
  { label: "Portals", value: 100, color: "#f59e0b" },
];

const SOURCE_TINTS: string[][] = [
  ["0 46%"],
  ["46% 71%"],
  ["71% 89%"],
  ["89% 100%"],
];

export function sourceDonutCss(sources: SourceSlice[]): string {
  const stops = sources
    .map((s, i) => `${s.color} ${SOURCE_TINTS[i][0]}`)
    .join(",");
  return `conic-gradient(${stops})`;
}

const EFFICIENCY: EfficiencyRow[] = [
  { label: "Avg first response", value: "4 min", tone: "green" },
  { label: "Lead → visit rate", value: "41%" },
  { label: "Visit → close rate", value: "36%" },
  { label: "Avg deal size", value: "₹1.6 Cr" },
  { label: "Idle leads (7d+)", value: "3", tone: "rose" },
];

export const AGENTS: Agent[] = [
  {
    slug: "rohan-shah",
    name: "Rohan Shah",
    email: "rohan@skylinedev.in",
    phone: "+91 98250 11020",
    role: "Admin",
    av: "",
    online: true,
    bridgeMissing: false,
    assignment: "Active in all projects",
    added: "12 Jan 2025",
    team: "Sales Team North",
    leadsAssigned: 410,
    activeLeads: 60,
    closures: 12,
    closuresDelta: 3,
    revenueCr: 5.8,
    revenueTargetCr: 6,
    conversion: 24,
    conversionTarget: 19,
    targetClosures: 12,
    siteVisits: 24,
    siteVisitTarget: 20,
    leadsWorked: 52,
    leadsWorkedTarget: 50,
    pipeline: [
      { label: "New", count: 15 },
      { label: "Contacted", count: 13 },
      { label: "Follow-up", count: 17 },
      { label: "Site visit", count: 9, tone: "var(--iris)" },
      { label: "Negotiation", count: 4, tone: "var(--violet)" },
      { label: "Won", count: 2, tone: "var(--green)" },
    ],
    sources: SOURCES,
    efficiency: EFFICIENCY,
    rank: 1,
    topPerformer: "You lead the team this month 🎉",
    callsMade: 420,
    connected: 305,
    talkHours: 24,
    avgCall: "3m 40s",
    whatsappSent: 610,
    whatsappRead: 92,
    chartSeed: 0,
  },
  {
    slug: "priya-sharma",
    name: "Priya Sharma",
    email: "priya@skylinedev.in",
    phone: "+91 99870 34412",
    role: "Manager",
    av: "a4",
    online: true,
    bridgeMissing: false,
    assignment: "Active in all projects",
    added: "18 Feb 2025",
    team: "Sales Team North",
    leadsAssigned: 361,
    activeLeads: 48,
    closures: 8,
    closuresDelta: 2,
    revenueCr: 4.2,
    revenueTargetCr: 5,
    conversion: 22,
    conversionTarget: 19,
    targetClosures: 10,
    siteVisits: 22,
    siteVisitTarget: 20,
    leadsWorked: 48,
    leadsWorkedTarget: 50,
    pipeline: [
      { label: "New", count: 12 },
      { label: "Contacted", count: 10 },
      { label: "Follow-up", count: 14 },
      { label: "Site visit", count: 7, tone: "var(--iris)" },
      { label: "Negotiation", count: 3, tone: "var(--violet)" },
      { label: "Won", count: 2, tone: "var(--green)" },
    ],
    sources: SOURCES,
    efficiency: EFFICIENCY,
    rank: 2,
    topPerformer: "Priya Nair (12 closures)",
    callsMade: 312,
    connected: 214,
    talkHours: 18,
    avgCall: "3m 20s",
    whatsappSent: 486,
    whatsappRead: 88,
    chartSeed: 2,
  },
  {
    slug: "vijay-chandel",
    name: "Vijay Chandel",
    email: "vijay@skylinedev.in",
    phone: "+91 97250 88109",
    role: "Sales",
    av: "a2",
    online: true,
    bridgeMissing: false,
    assignment: "Active in all projects",
    added: "03 Mar 2025",
    team: "Sales Team North",
    leadsAssigned: 298,
    activeLeads: 42,
    closures: 7,
    closuresDelta: 1,
    revenueCr: 3.6,
    revenueTargetCr: 5,
    conversion: 19,
    conversionTarget: 19,
    targetClosures: 10,
    siteVisits: 18,
    siteVisitTarget: 20,
    leadsWorked: 40,
    leadsWorkedTarget: 50,
    pipeline: [
      { label: "New", count: 11 },
      { label: "Contacted", count: 9 },
      { label: "Follow-up", count: 13 },
      { label: "Site visit", count: 5, tone: "var(--iris)" },
      { label: "Negotiation", count: 3, tone: "var(--violet)" },
      { label: "Won", count: 1, tone: "var(--green)" },
    ],
    sources: SOURCES,
    efficiency: EFFICIENCY,
    rank: 3,
    topPerformer: "Priya Nair (12 closures)",
    callsMade: 289,
    connected: 190,
    talkHours: 16,
    avgCall: "3m 12s",
    whatsappSent: 430,
    whatsappRead: 84,
    chartSeed: 4,
  },
  {
    slug: "rohit-mehta",
    name: "Rohit Mehta",
    email: "rohit@skylinedev.in",
    phone: "+971 50 442 1180",
    role: "Sales",
    av: "a5",
    online: true,
    bridgeMissing: false,
    assignment: "Active in all projects",
    added: "21 Mar 2025",
    team: "Sales Team North",
    leadsAssigned: 265,
    activeLeads: 36,
    closures: 6,
    closuresDelta: 1,
    revenueCr: 2.9,
    revenueTargetCr: 4,
    conversion: 17,
    conversionTarget: 19,
    targetClosures: 8,
    siteVisits: 15,
    siteVisitTarget: 18,
    leadsWorked: 38,
    leadsWorkedTarget: 45,
    pipeline: [
      { label: "New", count: 9 },
      { label: "Contacted", count: 8 },
      { label: "Follow-up", count: 11 },
      { label: "Site visit", count: 5, tone: "var(--iris)" },
      { label: "Negotiation", count: 2, tone: "var(--violet)" },
      { label: "Won", count: 1, tone: "var(--green)" },
    ],
    sources: SOURCES,
    efficiency: EFFICIENCY,
    rank: 4,
    topPerformer: "Priya Nair (12 closures)",
    callsMade: 246,
    connected: 172,
    talkHours: 14,
    avgCall: "3m 05s",
    whatsappSent: 398,
    whatsappRead: 86,
    chartSeed: 6,
  },
  {
    slug: "sneha-kulkarni",
    name: "Sneha Kulkarni",
    email: "sneha@skylinedev.in",
    phone: "+91 98980 33471",
    role: "Sales",
    av: "a3",
    online: true,
    bridgeMissing: false,
    assignment: "Active in all projects",
    added: "09 Apr 2025",
    team: "Sales Team North",
    leadsAssigned: 240,
    activeLeads: 31,
    closures: 5,
    closuresDelta: 0,
    revenueCr: 2.4,
    revenueTargetCr: 4,
    conversion: 16,
    conversionTarget: 19,
    targetClosures: 8,
    siteVisits: 14,
    siteVisitTarget: 18,
    leadsWorked: 34,
    leadsWorkedTarget: 45,
    pipeline: [
      { label: "New", count: 8 },
      { label: "Contacted", count: 7 },
      { label: "Follow-up", count: 9 },
      { label: "Site visit", count: 4, tone: "var(--iris)" },
      { label: "Negotiation", count: 2, tone: "var(--violet)" },
      { label: "Won", count: 1, tone: "var(--green)" },
    ],
    sources: SOURCES,
    efficiency: EFFICIENCY,
    rank: 5,
    topPerformer: "Priya Nair (12 closures)",
    callsMade: 210,
    connected: 147,
    talkHours: 13,
    avgCall: "3m 08s",
    whatsappSent: 372,
    whatsappRead: 85,
    chartSeed: 8,
  },
  {
    slug: "aditya-verma",
    name: "Aditya Verma",
    email: "aditya@skylinedev.in",
    phone: "+91 98980 33472",
    role: "Sales",
    av: "a3",
    online: false,
    bridgeMissing: true,
    assignment: "Bypassed",
    added: "27 Apr 2025",
    team: "Sales Team North",
    leadsAssigned: 154,
    activeLeads: 19,
    closures: 3,
    closuresDelta: 0,
    revenueCr: 1.6,
    revenueTargetCr: 3,
    conversion: 15,
    conversionTarget: 19,
    targetClosures: 6,
    siteVisits: 9,
    siteVisitTarget: 14,
    leadsWorked: 22,
    leadsWorkedTarget: 30,
    pipeline: [
      { label: "New", count: 5 },
      { label: "Contacted", count: 5 },
      { label: "Follow-up", count: 6 },
      { label: "Site visit", count: 2, tone: "var(--iris)" },
      { label: "Negotiation", count: 1, tone: "var(--violet)" },
      { label: "Won", count: 0, tone: "var(--green)" },
    ],
    sources: SOURCES,
    efficiency: EFFICIENCY,
    rank: 6,
    topPerformer: "Priya Nair (12 closures)",
    callsMade: 138,
    connected: 89,
    talkHours: 8,
    avgCall: "3m 35s",
    whatsappSent: 204,
    whatsappRead: 78,
    chartSeed: 10,
  },
];

export function getAgentBySlug(slug: string): Agent | undefined {
  return AGENTS.find((a) => a.slug === slug);
}

/* Paired bars (leads worked vs calls made) for the last 14 days.
   A steady upward trend with per-agent wiggle so every dashboard
   looks alive but distinct. */
export type ChartBar = { day: string; leads: number; calls: number };

export function agentChartBars(seed: number): ChartBar[] {
  return Array.from({ length: 14 }, (_, i) => {
    const leadBase = 34 + i * 4.4 + ((i % 3) - 1) * 4 + (seed % 4);
    const leads = Math.min(96, Math.max(26, Math.round(leadBase)));
    const calls = Math.min(
      100,
      Math.round(leads + 14 + (i % 2) * 5 + (seed % 3)),
    );
    return { day: String(14 + i), leads, calls };
  });
}

/* Lead table rows shared across agent dashboards (placeholder). */
export const AGENT_LEADS = [
  { lead: "Rahul Mehta", initials: "RM", av: "a4", project: "Palm Residency", interest: "3 BHK", status: "Follow-up", badge: "b-amber", value: "₹1.65 Cr" },
  { lead: "Meera Iyer", initials: "MI", av: "a2", project: "Green Vista", interest: "2 BHK", status: "Site Visit", badge: "b-indigo", value: "₹95 L" },
  { lead: "Divya Shah", initials: "DS", av: "a4", project: "Palm Residency", interest: "4 BHK", status: "Negotiation", badge: "b-violet", value: "₹2.1 Cr" },
  { lead: "Karan Patel", initials: "KP", av: "a5", project: "Palm Residency", interest: "3 BHK", status: "New", badge: "b-gray", value: "₹1.5 Cr" },
  { lead: "Aarav Reddy", initials: "AR", av: "", project: "Palm Residency", interest: "3 BHK", status: "Follow-up", badge: "b-amber", value: "₹1.42 Cr" },
  { lead: "Harsh Trivedi", initials: "HT", av: "a5", project: "Green Vista", interest: "3 BHK", status: "Contacted", badge: "b-sky", value: "₹1.1 Cr" },
  { lead: "Sana Rahman", initials: "SR", av: "a2", project: "Green Vista", interest: "3 BHK", status: "Idle 8d", badge: "b-rose", value: "₹1.1 Cr" },
];

/* Recent calls rows (placeholder). */
export const AGENT_CALLS = [
  { lead: "Rahul Mehta", type: "Outgoing", duration: "4m 12s", outcome: "Interested", badge: "b-green", when: "Today 11:20" },
  { lead: "Aarav Reddy", type: "Outgoing", duration: "2m 48s", outcome: "Visit booked", badge: "b-indigo", when: "Today 10:05" },
  { lead: "Karan Patel", type: "Outgoing", duration: "—", outcome: "No answer", badge: "b-amber", when: "Today 09:41" },
  { lead: "Sana Rahman", type: "Incoming", duration: "1m 30s", outcome: "Call back later", badge: "b-rose", when: "Yest 16:02" },
  { lead: "Divya Shah", type: "Outgoing", duration: "6m 05s", outcome: "Negotiating", badge: "b-violet", when: "Yest 14:20" },
];

/* Activity timeline (placeholder). */
export const AGENT_ACTIVITY = [
  { icon: "🏆", text: "Closed deal — Divya Shah, 4 BHK Palm Residency, ₹2.1 Cr.", time: "Today 10:05" },
  { icon: "📅", text: "Site visit booked — Aarav Reddy, Saturday 11 AM.", time: "Today 10:05" },
  { icon: "📞", text: "Call logged — Rahul Mehta, 4m 12s, interested.", time: "Today 11:20" },
  { icon: "💬", text: "Brochure sent — Rahul Mehta via WhatsApp.", time: "Today 11:32" },
  { icon: "🏷️", text: "Lead received — Rahul Mehta tagged by Priya in Team Chat.", time: "Today 11:42" },
  { icon: "🔄", text: "Status updated — Meera Iyer → Site Visit.", time: "Yesterday 15:10" },
  { icon: "🕘", text: "Logged in — started shift.", time: "Yesterday 09:58" },
];

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}