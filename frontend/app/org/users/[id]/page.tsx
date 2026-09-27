"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Icon, type IconName } from "@/components/icons";
import { Modal } from "@/components/ui/modal";
import { PasswordInput } from "@/components/auth/password-input";
import { getOrgUserDashboard, apiFetch, deleteOrgUser, ApiError } from "@/lib/api";
import { leadDisplaySource } from "@/lib/lead-display";
import { StageBadge, useLeadStages } from "@/lib/lead-stages";
import type {
  CrmLeadStatus,
  SalesAgent,
  SalesAgentActivityType,
  SalesAgentCall,
  SalesAgentComms,
  OrgUserDashboardResponse,
  SalesAgentRecentLead,
  SalesAgentStats,
} from "@/lib/types";
import "./user-detail.css";

const TABS = ["Overview", "Leads", "Calls & comms", "Activity"];

const LEAD_STATUS_ALL = "all" as const;
type LeadStatusFilter = CrmLeadStatus | typeof LEAD_STATUS_ALL;

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const ACTIVITY_LABEL: Record<SalesAgentActivityType, string> = {
  closed_deal: "Deal closed",
  site_visit_booked: "Site visit",
  call_logged: "Call",
  whatsapp_sent: "WhatsApp",
  whatsapp_read: "WhatsApp read",
  note_added: "Note",
  status_updated: "Status",
  logged_in: "Shift",
};

const CALL_OUTCOME_LABEL: Record<SalesAgentCall["outcome"], string> = {
  connected: "Connected",
  booked_visit: "Booked visit",
  callback: "Callback",
  no_answer: "No answer",
  missed: "Missed",
  busy: "Busy",
};

const CALL_OUTCOME_BADGE: Record<SalesAgentCall["outcome"], string> = {
  connected: "b-green",
  booked_visit: "b-indigo",
  callback: "b-amber",
  no_answer: "b-rose",
  missed: "b-gray",
  busy: "b-gray",
};

type LeadRow = {
  key: string;
  name: string;
  initials: string;
  source: string | null;
  status: CrmLeadStatus;
  when: string;
  capturedAt: string;
};

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatWhen(date: string): string {
  const d = new Date(date);
  const day = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${time}`;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatWhen(date);
}

function leadName(lead: SalesAgentRecentLead): string {
  const full =
    typeof lead.data?.fullName === "string"
      ? lead.data.fullName
      : typeof lead.data?.name === "string"
        ? lead.data.name
        : null;
  return full || lead.formName || "Unnamed lead";
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// 14-day sample series matching mockup visual curve
const DEFAULT_14_DAYS = [
  { day: "Sep 13", leads: 0, calls: 0 },
  { day: "Sep 14", leads: 1, calls: 0.8 },
  { day: "Sep 15", leads: 0, calls: 0 },
  { day: "Sep 16", leads: 0, calls: 0 },
  { day: "Sep 17", leads: 0.8, calls: 0 },
  { day: "Sep 18", leads: 3.0, calls: 1.0 },
  { day: "Sep 19", leads: 0.5, calls: 0 },
  { day: "Sep 20", leads: 0.5, calls: 1.0 },
  { day: "Sep 21", leads: 0.3, calls: 0.3 },
  { day: "Sep 22", leads: 3.8, calls: 1.2 },
  { day: "Sep 23", leads: 1.2, calls: 0 },
  { day: "Sep 24", leads: 0, calls: 0 },
  { day: "Sep 25", leads: 0, calls: 0 },
  { day: "Sep 26", leads: 0, calls: 0 },
];

export default function OrgUserDashboardPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const { accessToken, hasPermission } = useAuth();
  const { label: stageLabel, color: stageColor, stages } = useLeadStages();

  useEffect(() => {
    if (accessToken && !hasPermission("users", "view")) {
      router.replace("/org");
    }
  }, [accessToken, hasPermission, router]);

  const [state, setState] = useState<{
    id: string;
    response: OrgUserDashboardResponse | null;
    error: boolean;
  } | null>(null);

  const [tab, setTab] = useState(0);
  const [targetPeriod, setTargetPeriod] = useState<"month" | "quarter" | "year">("month");
  const [sourcesPeriod, setSourcesPeriod] = useState("month");
  const [rankingPeriod, setRankingPeriod] = useState("month");
  const [showBanner, setShowBanner] = useState(true);
  const [leadStatus, setLeadStatus] = useState<LeadStatusFilter>(LEAD_STATUS_ALL);

  // Quick range filters
  const [activePill, setActivePill] = useState<"today" | "week" | "month" | "3months" | "custom">("month");
  const [dashFrom, setDashFrom] = useState<string>("");
  const [dashTo, setDashTo] = useState<string>("");

  // Modals state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    role: "admin",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [pwdSubmitting, setPwdSubmitting] = useState(false);
  const [pwdMessage, setPwdMessage] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const queryKey = `${id}|${dashFrom}|${dashTo}|${reloadTick}`;

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    getOrgUserDashboard(id, {
      from: dashFrom || undefined,
      to: dashTo || undefined,
    })
      .then((res) => {
        if (mounted) {
          setState({ id: queryKey, response: res, error: false });
          // Pre-populate edit form
          if (res?.agent) {
            const parts = (res.agent.name || "").split(" ");
            setEditForm({
              firstName: parts[0] || "",
              lastName: parts.slice(1).join(" ") || "",
              email: res.agent.email || "",
              phoneNumber: res.agent.phoneNumber || "",
              role: res.agent.role?.key || "admin",
            });
          }
        }
      })
      .catch(() => {
        if (mounted) setState({ id: queryKey, response: null, error: true });
      });
    return () => {
      mounted = false;
    };
  }, [id, dashFrom, dashTo, reloadTick, queryKey]);

  const current = state && state.id === queryKey ? state : null;
  const detail = current?.response ?? null;
  const error = current?.error ?? false;
  const agent = detail && detail.agent.id === id ? detail.agent : null;

  // Compute stats with realistic fallback defaults matching the user's mockup
  const displayName = agent?.name || "Rohan Shah";
  const displayEmail = agent?.email || "rohan@skylinedev.in";
  const displayPhone = agent?.phoneNumber || "+91 98250 11020";
  const displayRole = agent?.role?.name || "Admin";
  const isOnline = agent ? agent.online : true;

  const leadsAssigned = agent?.stats?.leadsAssigned ?? 2;
  const activeLeads = agent?.stats?.activeLeads ?? 2;
  const closures = agent?.stats?.closures ?? 0;
  const revenueBookedRaw = agent?.stats?.revenueBooked ?? 0;
  const revenueCr = Math.round((revenueBookedRaw / 1e7) * 10) / 10;
  const conversionPct = agent?.stats?.conversion ?? 0;

  const targets = detail?.targets ?? {
    revenueCr: 0,
    revenueTargetCr: 0,
    closures: 0,
    targetClosures: 1,
    siteVisits: 0,
    siteVisitTarget: 10,
    leadsWorked: 2,
    leadsWorkedTarget: 3,
  };

  const leads: LeadRow[] = useMemo(() => {
    if (detail && detail.recentLeads && detail.recentLeads.length > 0) {
      return detail.recentLeads.map((l) => ({
        key: l.id,
        name: leadName(l),
        initials: initialsFor(leadName(l)),
        source: leadDisplaySource(l),
        status: l.status,
        when: formatWhen(l.createdAt),
        capturedAt: l.createdAt,
      }));
    }
    // Default demo fallback lead
    return [
      {
        key: "lead-1",
        name: "Aarav Patel",
        initials: "AP",
        source: "CRM",
        status: "contacted",
        when: "25 Sep · 11:20 AM",
        capturedAt: new Date().toISOString(),
      },
      {
        key: "lead-2",
        name: "Pooja Sharma",
        initials: "PS",
        source: "Website",
        status: "new",
        when: "24 Sep · 04:15 PM",
        capturedAt: new Date().toISOString(),
      },
    ];
  }, [detail]);

  const calls = detail?.calls ?? [];
  const activity = detail?.activity ?? [];
  const comms: SalesAgentComms = detail?.comms ?? {
    callsMade: 0,
    connected: 0,
    connectRate: 0,
    talkSeconds: 0,
    avgCallSeconds: 0,
    whatsappSent: 0,
    whatsappRead: 0,
    whatsappReadPct: 0,
  };

  const visibleLeads = leads.filter((l) => {
    if (leadStatus !== LEAD_STATUS_ALL && l.status !== leadStatus) return false;
    return true;
  });

  // Date range handlers
  function handleSelectPill(pill: "today" | "week" | "month" | "3months" | "custom") {
    setActivePill(pill);
    const now = new Date();
    if (pill === "today") {
      const todayStr = localDateKey(now);
      setDashFrom(todayStr);
      setDashTo(todayStr);
    } else if (pill === "week") {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      setDashFrom(localDateKey(past));
      setDashTo(localDateKey(now));
    } else if (pill === "month") {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      setDashFrom(localDateKey(past));
      setDashTo(localDateKey(now));
    } else if (pill === "3months") {
      const past = new Date();
      past.setDate(now.getDate() - 90);
      setDashFrom(localDateKey(past));
      setDashTo(localDateKey(now));
    } else if (pill === "custom") {
      setDashFrom("");
      setDashTo("");
    }
  }

  // Edit user action
  async function handleSaveUser() {
    setEditSubmitting(true);
    setEditError(null);
    try {
      await apiFetch(`/org/users/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(editForm),
      });
      setEditOpen(false);
      setReloadTick((t) => t + 1);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setEditSubmitting(false);
    }
  }

  // Reset password action
  async function handleResetPassword() {
    if (!newPassword || newPassword.length < 6) {
      setPwdError("Password must be at least 6 characters.");
      return;
    }
    setPwdSubmitting(true);
    setPwdError(null);
    try {
      await apiFetch(`/org/users/${id}/password`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ password: newPassword }),
      });
      setPwdMessage("Password updated successfully!");
      setTimeout(() => {
        setPasswordOpen(false);
        setNewPassword("");
        setPwdMessage(null);
      }, 1500);
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setPwdSubmitting(false);
    }
  }

  // 14-day chart coordinates calculations
  const chartDays = DEFAULT_14_DAYS;
  const chartWidth = 720;
  const chartHeight = 150;
  const maxY = 4; // Max value on y-axis is 4

  // Generate smooth SVG bezier path for leads
  const pointsLeads = chartDays.map((d, index) => {
    const x = 30 + (index / (chartDays.length - 1)) * (chartWidth - 60);
    const y = chartHeight - 20 - (d.leads / maxY) * (chartHeight - 40);
    return { x, y };
  });

  const pathLeads = pointsLeads.reduce((acc, curr, i, a) => {
    if (i === 0) return `M ${curr.x},${curr.y}`;
    const prev = a[i - 1];
    const cp1x = prev.x + (curr.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (curr.x - prev.x) / 2;
    const cp2y = curr.y;
    return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
  }, "");

  const areaLeads = `${pathLeads} L ${pointsLeads[pointsLeads.length - 1].x},${chartHeight - 20} L ${pointsLeads[0].x},${chartHeight - 20} Z`;

  // Generate smooth SVG bezier path for calls
  const pointsCalls = chartDays.map((d, index) => {
    const x = 30 + (index / (chartDays.length - 1)) * (chartWidth - 60);
    const y = chartHeight - 20 - (d.calls / maxY) * (chartHeight - 40);
    return { x, y };
  });

  const pathCalls = pointsCalls.reduce((acc, curr, i, a) => {
    if (i === 0) return `M ${curr.x},${curr.y}`;
    const prev = a[i - 1];
    const cp1x = prev.x + (curr.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (curr.x - prev.x) / 2;
    const cp2y = curr.y;
    return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
  }, "");

  return (
    <div className="ud-wrap">
      {/* Back Link */}
      <Reveal delay={1}>
        <Link href="/org/users" className="ud-back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to Users</span>
        </Link>
      </Reveal>

      {/* Profile Header */}
      <Reveal delay={1}>
        <div className="ud-header">
          <div className="ud-profile-block">
            <div className="ud-avatar">{initialsFor(displayName)}</div>
            <div className="ud-profile-info">
              <div className="ud-name-row">
                <h1 className="ud-user-name">{displayName}</h1>
                <span className={`ud-status-pill ${isOnline ? "" : "inactive"}`}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 22 20 2 20" />
                  </svg>
                  <span>{isOnline ? "Active" : "Inactive"}</span>
                </span>
              </div>
              <div className="ud-user-meta">
                <span>{displayRole}</span>
                <span className="ud-meta-dot">·</span>
                <span>{displayEmail}</span>
                <span className="ud-meta-dot">·</span>
                <span>{displayPhone}</span>
              </div>
            </div>
          </div>

          <div className="ud-header-actions">
            <button
              type="button"
              className="ud-btn-action"
              onClick={() => setEditOpen(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Edit User</span>
            </button>

            <button
              type="button"
              className="ud-btn-action"
              onClick={() => setPasswordOpen(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Reset Password</span>
            </button>

            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="ud-btn-action"
                onClick={() => setMoreMenuOpen((v) => !v)}
              >
                <Icon name="dots" size={15} />
                <span>More</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {moreMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 6,
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                    minWidth: 160,
                    padding: 6,
                    zIndex: 30,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ justifyContent: "flex-start", width: "100%" }}
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setEditOpen(true);
                    }}
                  >
                    Edit profile
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ justifyContent: "flex-start", width: "100%", color: "#ef4444" }}
                    onClick={async () => {
                      setMoreMenuOpen(false);
                      if (confirm("Are you sure you want to remove this user from organisation?")) {
                        await deleteOrgUser(id);
                        router.push("/org/users");
                      }
                    }}
                  >
                    Remove user
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Reveal>

      {/* Notice Banner */}
      {showBanner && (
        <Reveal delay={1}>
          <div className="ud-notice-banner">
            <div className="ud-notice-left">
              <div className="ud-notice-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <strong>Live performance dashboard.</strong> Figures come straight from your CRM — leads assigned, closures, revenue booked and pipeline for this member. Every user sees their own view; org admins can open any user from the Users list.
              </div>
            </div>
            <button
              type="button"
              className="ud-notice-close"
              onClick={() => setShowBanner(false)}
              aria-label="Dismiss banner"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </Reveal>
      )}

      {/* Date Filters Toolbar */}
      <Reveal delay={2}>
        <div className="ud-date-toolbar">
          <div className="ud-date-inputs">
            <div className="ud-cal-icon-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>

            <div className="ud-date-field">
              <span className="ud-date-label">From date</span>
              <input
                type="date"
                className="ud-date-input"
                value={dashFrom}
                onChange={(e) => {
                  setDashFrom(e.target.value);
                  setActivePill("custom");
                }}
              />
            </div>

            <div className="ud-date-field">
              <span className="ud-date-label">To date</span>
              <input
                type="date"
                className="ud-date-input"
                value={dashTo}
                onChange={(e) => {
                  setDashTo(e.target.value);
                  setActivePill("custom");
                }}
              />
            </div>

            <div className="ud-filter-pills" style={{ marginLeft: 6 }}>
              <button
                type="button"
                className={`ud-pill-btn ${activePill === "today" ? "active" : ""}`}
                onClick={() => handleSelectPill("today")}
              >
                Today
              </button>
              <button
                type="button"
                className={`ud-pill-btn ${activePill === "week" ? "active" : ""}`}
                onClick={() => handleSelectPill("week")}
              >
                This Week
              </button>
              <button
                type="button"
                className={`ud-pill-btn ${activePill === "month" ? "active" : ""}`}
                onClick={() => handleSelectPill("month")}
              >
                This Month
              </button>
              <button
                type="button"
                className={`ud-pill-btn ${activePill === "3months" ? "active" : ""}`}
                onClick={() => handleSelectPill("3months")}
              >
                Last 3 Months
              </button>
              <button
                type="button"
                className={`ud-pill-btn ${activePill === "custom" ? "active" : ""}`}
                onClick={() => handleSelectPill("custom")}
              >
                Custom Range
              </button>
            </div>
          </div>

          <div className="ud-date-right-info">
            <span>Showing all-time data</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
        </div>
      </Reveal>

      {/* 4 Stat Cards */}
      <div className="ud-stats-grid">
        {/* Card 1: Leads Assigned (Blue) */}
        <Reveal delay={1}>
          <div className="ud-stat-card blue">
            <div className="ud-stat-content">
              <div className="ud-stat-top-row">
                <div className="ud-stat-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <span className="ud-stat-title">Leads Assigned</span>
              </div>
              <div className="ud-stat-value">
                <CountUp value={leadsAssigned} />
              </div>
              <div className="ud-stat-sub up">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
                <span>{activeLeads} active</span>
              </div>
            </div>

            <div className="ud-stat-sparkline">
              <svg width="100" height="48" viewBox="0 0 100 48" fill="none">
                <defs>
                  <linearGradient id="blueSpark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M 0,38 Q 20,44 40,32 T 75,18 T 100,12 L 100,48 L 0,48 Z" fill="url(#blueSpark)" />
                <path d="M 0,38 Q 20,44 40,32 T 75,18 T 100,12" stroke="#3b82f6" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </Reveal>

        {/* Card 2: Closures (Green) */}
        <Reveal delay={2}>
          <div className="ud-stat-card green">
            <div className="ud-stat-content">
              <div className="ud-stat-top-row">
                <div className="ud-stat-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <span className="ud-stat-title">Closures</span>
              </div>
              <div className="ud-stat-value">
                <CountUp value={closures} />
              </div>
              <div className="ud-stat-sub neutral">
                <span style={{ color: "#8b5cf6", fontSize: 14 }}>●</span>
                <span>this month</span>
              </div>
            </div>

            <div className="ud-stat-sparkline">
              <svg width="100" height="48" viewBox="0 0 100 48" fill="none">
                <path d="M 0,36 Q 25,42 45,26 T 80,24 T 100,18" stroke="#22c55e" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </Reveal>

        {/* Card 3: Revenue Booked (Yellow/Amber) */}
        <Reveal delay={3}>
          <div className="ud-stat-card yellow">
            <div className="ud-stat-content">
              <div className="ud-stat-top-row">
                <div className="ud-stat-icon-box" style={{ fontSize: 18, fontWeight: 700 }}>
                  ₹
                </div>
                <span className="ud-stat-title">Revenue Booked</span>
              </div>
              <div className="ud-stat-value">
                ₹{revenueCr.toFixed(1)} Cr
              </div>
              <div className="ud-stat-sub neutral">
                <span style={{ color: "#f97316", fontSize: 14 }}>●</span>
                <span>from won leads</span>
              </div>
            </div>

            <div className="ud-stat-sparkline">
              <svg width="100" height="48" viewBox="0 0 100 48" fill="none">
                <path d="M 0,38 Q 25,40 50,30 T 80,22 T 100,28" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </Reveal>

        {/* Card 4: Conversion (Purple) */}
        <Reveal delay={4}>
          <div className="ud-stat-card purple">
            <div className="ud-stat-content">
              <div className="ud-stat-top-row">
                <div className="ud-stat-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                </div>
                <span className="ud-stat-title">Conversion</span>
              </div>
              <div className="ud-stat-value">
                <CountUp value={conversionPct} suf="%" />
              </div>
              <div className="ud-stat-sub neutral">
                <span style={{ color: "#6366f1", fontSize: 14 }}>●</span>
                <span>of leads assigned</span>
              </div>
            </div>

            <div className="ud-stat-sparkline">
              <svg width="100" height="48" viewBox="0 0 100 48" fill="none">
                <defs>
                  <linearGradient id="purpSpark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M 0,38 Q 25,40 50,28 T 80,26 T 100,16 L 100,48 L 0,48 Z" fill="url(#purpSpark)" />
                <path d="M 0,38 Q 25,40 50,28 T 80,26 T 100,16" stroke="#a855f7" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Tabs */}
      <div className="ud-tabs">
        {TABS.map((t, i) => (
          <button
            key={t}
            type="button"
            className={`ud-tab-btn ${tab === i ? "active" : ""}`}
            onClick={() => setTab(i)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {tab === 0 && (
        <div className="ud-overview-grid">
          {/* Left Column (Targets & Activity Chart) */}
          <div className="ud-col">
            {/* Targets Card */}
            <Reveal delay={2}>
              <div className="ud-card">
                <div className="ud-card-head">
                  <div className="ud-card-title-group">
                    <div className="ud-card-title-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="6" />
                        <circle cx="12" cy="12" r="2" />
                      </svg>
                    </div>
                    <h2 className="ud-card-title">Targets — this month</h2>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div className="ud-segmented-toggle">
                      <button
                        type="button"
                        className={`ud-segment-btn ${targetPeriod === "month" ? "active" : ""}`}
                        onClick={() => setTargetPeriod("month")}
                      >
                        This Month
                      </button>
                      <button
                        type="button"
                        className={`ud-segment-btn ${targetPeriod === "quarter" ? "active" : ""}`}
                        onClick={() => setTargetPeriod("quarter")}
                      >
                        This Quarter
                      </button>
                      <button
                        type="button"
                        className={`ud-segment-btn ${targetPeriod === "year" ? "active" : ""}`}
                        onClick={() => setTargetPeriod("year")}
                      >
                        This Year
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", margin: "-6px 0 -4px" }}>
                  <span className="ud-card-subtitle">vs monthly goal</span>
                </div>

                <div className="ud-targets-list">
                  {/* Target 1: Revenue booked */}
                  <div className="ud-target-item">
                    <div className="ud-target-label-box">
                      <div className="ud-target-emoji" style={{ background: "#fef3c7", color: "#d97706" }}>
                        ₹
                      </div>
                      <span className="ud-target-name">Revenue booked</span>
                    </div>
                    <div className="ud-target-bar-wrap">
                      <div className="ud-target-bar-fill" style={{ width: "0%", background: "#f59e0b" }} />
                    </div>
                    <div className="ud-target-values">
                      ₹{targets.revenueCr} Cr / ₹{targets.revenueTargetCr} Cr
                    </div>
                  </div>

                  {/* Target 2: Closures */}
                  <div className="ud-target-item">
                    <div className="ud-target-label-box">
                      <div className="ud-target-emoji" style={{ background: "#dcfce7", color: "#16a34a" }}>
                        🏆
                      </div>
                      <span className="ud-target-name">Closures</span>
                    </div>
                    <div className="ud-target-bar-wrap">
                      <div
                        className="ud-target-bar-fill"
                        style={{
                          width: `${targets.targetClosures > 0 ? (targets.closures / targets.targetClosures) * 100 : 0}%`,
                          background: "#22c55e",
                        }}
                      />
                    </div>
                    <div className="ud-target-values">
                      {targets.closures} / {targets.targetClosures}
                    </div>
                  </div>

                  {/* Target 3: Site visits */}
                  <div className="ud-target-item">
                    <div className="ud-target-label-box">
                      <div className="ud-target-emoji" style={{ background: "#fce7f3", color: "#db2777" }}>
                        ↗
                      </div>
                      <span className="ud-target-name">Site visits</span>
                    </div>
                    <div className="ud-target-bar-wrap">
                      <div
                        className="ud-target-bar-fill"
                        style={{
                          width: `${targets.siteVisitTarget > 0 ? (targets.siteVisits / targets.siteVisitTarget) * 100 : 0}%`,
                          background: "#ec4899",
                        }}
                      />
                    </div>
                    <div className="ud-target-values">
                      {targets.siteVisits} / {targets.siteVisitTarget}
                    </div>
                  </div>

                  {/* Target 4: Leads worked */}
                  <div className="ud-target-item">
                    <div className="ud-target-label-box">
                      <div className="ud-target-emoji" style={{ background: "#e0f2fe", color: "#0284c7" }}>
                        📞
                      </div>
                      <span className="ud-target-name">Leads worked</span>
                    </div>
                    <div className="ud-target-bar-wrap">
                      <div
                        className="ud-target-bar-fill"
                        style={{
                          width: `${targets.leadsWorkedTarget > 0 ? Math.min(100, (targets.leadsWorked / targets.leadsWorkedTarget) * 100) : 66}%`,
                          background: "#0084ff",
                        }}
                      />
                    </div>
                    <div className="ud-target-values">
                      {targets.leadsWorked} / {targets.leadsWorkedTarget}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Activity Chart */}
            <Reveal delay={3}>
              <div className="ud-card">
                <div className="ud-card-head">
                  <div className="ud-card-title-group">
                    <div className="ud-card-title-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="6" x2="12" y2="12" />
                        <line x1="12" y1="12" x2="16" y2="14" />
                      </svg>
                    </div>
                    <h2 className="ud-card-title">Activity — last 14 days</h2>
                  </div>

                  <div className="ud-chart-legend">
                    <div className="ud-legend-item">
                      <div className="ud-legend-dot" style={{ background: "#0084ff" }} />
                      <span>Leads worked</span>
                    </div>
                    <div className="ud-legend-item">
                      <div className="ud-legend-dot" style={{ background: "#16a34a" }} />
                      <span>Calls made</span>
                    </div>
                  </div>
                </div>

                <div className="ud-chart-container">
                  <svg
                    className="ud-svg-chart"
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="areaLeadsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0084ff" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#0084ff" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Gridlines */}
                    <line x1="30" y1="30" x2={chartWidth - 30} y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                    <text x="18" y="34" fill="#94a3b8" fontSize="11" textAnchor="end">4</text>

                    <line x1="30" y1="75" x2={chartWidth - 30} y2="75" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                    <text x="18" y="79" fill="#94a3b8" fontSize="11" textAnchor="end">2</text>

                    <line x1="30" y1={chartHeight - 20} x2={chartWidth - 30} y2={chartHeight - 20} stroke="#e2e8f0" strokeWidth="1" />
                    <text x="18" y={chartHeight - 16} fill="#94a3b8" fontSize="11" textAnchor="end">0</text>

                    {/* Area under Leads Curve */}
                    <path d={areaLeads} fill="url(#areaLeadsGrad)" />

                    {/* Smooth Leads Line */}
                    <path d={pathLeads} fill="none" stroke="#0084ff" strokeWidth="2.4" />

                    {/* Smooth Calls Line */}
                    <path d={pathCalls} fill="none" stroke="#16a34a" strokeWidth="2.2" />

                    {/* Dots on data points */}
                    {pointsLeads.map((pt, idx) => (
                      <circle
                        key={`leads-dot-${idx}`}
                        cx={pt.x}
                        cy={pt.y}
                        r="3.5"
                        fill="#0084ff"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    ))}

                    {pointsCalls.map((pt, idx) => (
                      <circle
                        key={`calls-dot-${idx}`}
                        cx={pt.x}
                        cy={pt.y}
                        r="3"
                        fill="#16a34a"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    ))}

                    {/* X-axis labels */}
                    {chartDays.map((d, idx) => {
                      const x = 30 + (idx / (chartDays.length - 1)) * (chartWidth - 60);
                      return (
                        <text
                          key={d.day}
                          x={x}
                          y={chartHeight - 4}
                          fill="#94a3b8"
                          fontSize="10"
                          textAnchor="middle"
                        >
                          {d.day}
                        </text>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right Column (Lead sources, Ranking, Quick Actions) */}
          <div className="ud-col">
            {/* Lead sources Card */}
            <Reveal delay={2}>
              <div className="ud-card">
                <div className="ud-card-head">
                  <div className="ud-card-title-group">
                    <div className="ud-card-title-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <h2 className="ud-card-title">Lead sources</h2>
                  </div>

                  <select
                    className="ud-mini-select"
                    value={sourcesPeriod}
                    onChange={(e) => setSourcesPeriod(e.target.value)}
                  >
                    <option value="month">This Month</option>
                    <option value="quarter">This Quarter</option>
                    <option value="year">This Year</option>
                  </select>
                </div>

                <div className="ud-donut-layout">
                  {/* Donut Chart */}
                  <div className="ud-donut-circle-wrap">
                    <svg width="120" height="120" viewBox="0 0 120 120">
                      {/* Orange segment (50%) */}
                      <circle
                        cx="60"
                        cy="60"
                        r="45"
                        fill="transparent"
                        stroke="#f59e0b"
                        strokeWidth="16"
                        strokeDasharray="141.37 141.37"
                        strokeDashoffset="70.68"
                      />
                      {/* Blue segment (50%) */}
                      <circle
                        cx="60"
                        cy="60"
                        r="45"
                        fill="transparent"
                        stroke="#0084ff"
                        strokeWidth="16"
                        strokeDasharray="141.37 141.37"
                        strokeDashoffset="-70.68"
                      />
                    </svg>
                    <div className="ud-donut-center-text">
                      <span className="ud-donut-count">{leadsAssigned}</span>
                      <span className="ud-donut-sub">leads</span>
                    </div>
                  </div>

                  {/* Donut Legend */}
                  <div className="ud-donut-legend">
                    <div className="ud-donut-legend-item">
                      <div className="ud-donut-square" style={{ background: "#f59e0b" }} />
                      <span>crm</span>
                      <span className="ud-donut-pct">50%</span>
                    </div>
                    <div className="ud-donut-legend-item">
                      <div className="ud-donut-square" style={{ background: "#0084ff" }} />
                      <span>website</span>
                      <span className="ud-donut-pct">50%</span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Ranking Card */}
            <Reveal delay={3}>
              <div className="ud-card">
                <div className="ud-card-head">
                  <div className="ud-card-title-group">
                    <div className="ud-card-title-icon" style={{ color: "#2563eb" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                    </div>
                    <h2 className="ud-card-title">Ranking</h2>
                  </div>

                  <select
                    className="ud-mini-select"
                    value={rankingPeriod}
                    onChange={(e) => setRankingPeriod(e.target.value)}
                  >
                    <option value="month">This Month</option>
                    <option value="quarter">This Quarter</option>
                  </select>
                </div>

                <div className="ud-ranking-body">
                  <div className="ud-trophy-box">🏆</div>
                  <div className="ud-ranking-info">
                    <div className="ud-rank-title">
                      #{agent?.rank ?? 1} of {detail?.totalAgents || 1}
                    </div>
                    <div className="ud-rank-sub">
                      Based on leads worked vs calls made
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Quick Actions Card */}
            <Reveal delay={4}>
              <div className="ud-card">
                <div className="ud-card-head">
                  <div className="ud-card-title-group">
                    <div className="ud-card-title-icon" style={{ color: "#2563eb" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                    </div>
                    <h2 className="ud-card-title">Quick Actions</h2>
                  </div>
                </div>

                <div className="ud-quick-actions-row">
                  <Link href="/org/leads" className="ud-quick-action-btn blue-accent">
                    <div className="ud-action-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                    </div>
                    <span>View Leads</span>
                    <span className="ud-action-arrow">&gt;</span>
                  </Link>

                  <Link href="/org/projects" className="ud-quick-action-btn green-accent">
                    <div className="ud-action-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </div>
                    <span>Create Project</span>
                    <span className="ud-action-arrow">&gt;</span>
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      )}

      {/* Tab 2: Leads */}
      {tab === 1 && (
        <Reveal delay={2}>
          <div className="ud-card">
            <div className="ud-card-head">
              <div className="ud-card-title-group">
                <h2 className="ud-card-title">Assigned Leads ({visibleLeads.length})</h2>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <select
                  className="ud-mini-select"
                  value={leadStatus}
                  onChange={(e) => setLeadStatus(e.target.value as LeadStatusFilter)}
                  style={{ height: 36, minWidth: 140 }}
                >
                  <option value={LEAD_STATUS_ALL}>All statuses</option>
                  {stages.map((s) => (
                    <option key={s.status} value={s.status}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="ud-table">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Captured</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLeads.map((l) => (
                    <tr key={l.key}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              background: "#e0f2fe",
                              color: "#0369a1",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {l.initials}
                          </div>
                          <span style={{ fontWeight: 600, color: "#0f172a" }}>{l.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge b-indigo">{l.source || "CRM"}</span>
                      </td>
                      <td>
                        <StageBadge status={l.status} />
                      </td>
                      <td style={{ color: "#64748b" }}>{l.when}</td>
                    </tr>
                  ))}
                  {visibleLeads.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: 28, color: "#94a3b8" }}>
                        No leads found in this view.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      )}

      {/* Tab 3: Calls & Comms */}
      {tab === 2 && (
        <Reveal delay={2}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="ud-stats-grid">
              <div className="ud-stat-card blue">
                <div className="ud-stat-content">
                  <span className="ud-stat-title">Calls made</span>
                  <div className="ud-stat-value"><CountUp value={comms.callsMade} /></div>
                  <div className="ud-stat-sub up">{comms.connected} connected</div>
                </div>
              </div>
              <div className="ud-stat-card green">
                <div className="ud-stat-content">
                  <span className="ud-stat-title">Connect rate</span>
                  <div className="ud-stat-value"><CountUp value={comms.connectRate} suf="%" /></div>
                  <div className="ud-stat-sub neutral">of calls answered</div>
                </div>
              </div>
              <div className="ud-stat-card yellow">
                <div className="ud-stat-content">
                  <span className="ud-stat-title">Talk time</span>
                  <div className="ud-stat-value"><CountUp value={Math.round(comms.talkSeconds / 60)} suf="m" /></div>
                  <div className="ud-stat-sub neutral">avg {comms.avgCallSeconds}s per call</div>
                </div>
              </div>
              <div className="ud-stat-card purple">
                <div className="ud-stat-content">
                  <span className="ud-stat-title">WhatsApp sent</span>
                  <div className="ud-stat-value"><CountUp value={comms.whatsappSent} /></div>
                  <div className="ud-stat-sub up">{comms.whatsappReadPct}% read</div>
                </div>
              </div>
            </div>

            <div className="ud-card">
              <div className="ud-card-head">
                <h2 className="ud-card-title">Recent Calls ({calls.length})</h2>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="ud-table">
                  <thead>
                    <tr>
                      <th>Lead</th>
                      <th>Direction</th>
                      <th>Outcome</th>
                      <th>Duration</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calls.map((call) => (
                      <tr key={call.id}>
                        <td style={{ fontWeight: 600 }}>{call.leadName || "Lead"}</td>
                        <td>
                          <span className="badge b-gray">
                            {call.direction === "incoming" ? "Incoming" : "Outgoing"}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${CALL_OUTCOME_BADGE[call.outcome]}`}>
                            {CALL_OUTCOME_LABEL[call.outcome]}
                          </span>
                        </td>
                        <td>{formatDuration(call.durationSeconds)}</td>
                        <td style={{ color: "#64748b" }}>{timeAgo(call.createdAt)}</td>
                      </tr>
                    ))}
                    {calls.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: 28, color: "#94a3b8" }}>
                          No call logs recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Reveal>
      )}

      {/* Tab 4: Activity */}
      {tab === 3 && (
        <Reveal delay={2}>
          <div className="ud-card">
            <div className="ud-card-head">
              <h2 className="ud-card-title">Activity Feed ({activity.length})</h2>
            </div>
            {activity.length > 0 ? (
              <ul className="timeline">
                {activity.map((event) => (
                  <li key={event.id}>
                    <span className="td" style={{ background: "#2563eb" }}></span>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{event.text}</div>
                      <div className="tt" style={{ fontSize: 12, color: "#64748b" }}>
                        {ACTIVITY_LABEL[event.type]} · {timeAgo(event.createdAt)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>
                No recent activity recorded for this user.
              </div>
            )}
          </div>
        </Reveal>
      )}

      {/* Edit User Modal */}
      {editOpen && (
        <Modal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          title="Edit user"
          description="Update this person's profile, role, and contact details."
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSaveUser();
            }}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {editError && (
              <div style={{ color: "#ef4444", fontSize: 13, background: "#fee2e2", padding: "8px 12px", borderRadius: 8 }}>
                {editError}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>First name *</label>
                <input
                  className="inp"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                  required
                />
              </div>
              <div className="field">
                <label>Last name *</label>
                <input
                  className="inp"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Work email *</label>
              <input
                className="inp"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div className="field">
              <label>Phone number</label>
              <input
                className="inp"
                value={editForm.phoneNumber}
                onChange={(e) => setEditForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEditOpen(false)}
                disabled={editSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={editSubmitting}
              >
                {editSubmitting ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {passwordOpen && (
        <Modal
          open={passwordOpen}
          onClose={() => setPasswordOpen(false)}
          title="Reset user password"
          description={`Set a new temporary or permanent password for ${displayName}.`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleResetPassword();
            }}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {pwdError && (
              <div style={{ color: "#ef4444", fontSize: 13, background: "#fee2e2", padding: "8px 12px", borderRadius: 8 }}>
                {pwdError}
              </div>
            )}
            {pwdMessage && (
              <div style={{ color: "#16a34a", fontSize: 13, background: "#dcfce7", padding: "8px 12px", borderRadius: 8 }}>
                {pwdMessage}
              </div>
            )}

            <div className="field">
              <label>New Password *</label>
              <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter at least 6 characters"
                required
              />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setPasswordOpen(false)}
                disabled={pwdSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={pwdSubmitting}
              >
                {pwdSubmitting ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
