"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { dashboardPathFor } from "@/lib/mock/sessions";
import { Icon, type IconName } from "@/components/icons";
import { loadTemplates } from "@/lib/prestate/store";
import { orgBuilderPath } from "@/lib/prestate/paths";

type NavItem = {
  href: string;
  icon: IconName;
  label: string;
  tip: string;
};

type NavGroup = {
  grp: string;
  items: NavItem[];
};

// Templates, Users, and Roles & Permissions are another developer's module —
// they appear here only as nav entries pointing at "Coming soon" placeholders.
const NAV_GROUPS: NavGroup[] = [
  {
    grp: "Overview",
    items: [{ href: "/org", icon: "dashboard", label: "Dashboard", tip: "Dashboard" }],
  },
  {
    grp: "Sales",
    items: [
      { href: "/org/leads", icon: "target", label: "Lead Center", tip: "Lead Center" },
      { href: "/org/projects", icon: "building", label: "Projects", tip: "Projects" },
    ],
  },
  {
    grp: "Communication",
    items: [
      { href: "/org/calling", icon: "phone", label: "Calling", tip: "Calling" },
      { href: "/org/whatsapp", icon: "mail", label: "WhatsApp", tip: "WhatsApp" },
    ],
  },
  {
    grp: "Website",
    items: [
      { href: "/org/landing-pages", icon: "document", label: "Landing Pages", tip: "Landing Pages" },
      { href: "/org/templates", icon: "puzzle", label: "Templates", tip: "Templates" },
      { href: "/org/domains", icon: "globe", label: "Domains & DNS", tip: "Domains & DNS" },
    ],
  },
      {
        grp: "Team",
        items: [
          { href: "/org/profile", icon: "profile", label: "My Profile", tip: "My Profile" },
          { href: "/org/sales-agents", icon: "users", label: "Sales Agents", tip: "Sales Agents" },
          { href: "/org/teams", icon: "users", label: "Teams", tip: "Teams" },
          { href: "/org/users", icon: "profile", label: "Users", tip: "Users" },
          { href: "/org/roles-permissions", icon: "lock", label: "Roles & Permissions", tip: "Roles & Permissions" },
        ],
      },
];

const CRUMB_MAP: Record<string, string> = {
  "/org": "Dashboard",
  "/org/leads": "Lead Center",
  "/org/projects": "Projects",
  "/org/calling": "Calling",
  "/org/calling/ai-agents": "AI Agents",
  "/org/calling/campaigns": "Campaigns",
  "/org/calling/call-logs": "Call Logs",
  "/org/calling/voice-lab": "Voice Lab",
  "/org/calling/automations": "Automations",
  "/org/calling/queue": "Call Queue",
  "/org/calling/numbers": "Numbers",
  "/org/calling/settings": "Calling Settings",
  "/org/whatsapp": "WhatsApp",
  "/org/whatsapp/ai-agents": "WhatsApp AI Agents",
  "/org/whatsapp/inbox": "WhatsApp Inbox",
  "/org/whatsapp/automations": "WhatsApp Automations",
  "/org/whatsapp/settings": "WhatsApp Settings",
  "/org/websites": "Websites",
  "/org/landing-pages": "Landing Pages",
  "/org/templates": "Templates",
  "/org/domains": "Domains & DNS",
  "/org/integrations": "Integrations",
  "/org/sales-agents": "Sales Agents",
  "/org/teams": "Teams",
  "/org/users": "Users",
  "/org/roles-permissions": "Roles & Permissions",
  "/org/publish-approvals": "Publish & Approvals",
  "/org/settings": "Organisation Settings",
  "/org/profile": "My Profile",
  "/org/support": "Support",
};

function initials(firstName: string | null, lastName: string | null): string {
  const parts = [firstName, lastName].filter(Boolean) as string[];
  if (parts.length === 0) return "—";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function OrgAdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, accessToken, isLoading: authLoading, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [builderLoading, setBuilderLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!accessToken || !user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "organisation_admin") {
      router.replace(dashboardPathFor(user.role));
    }
  }, [authLoading, accessToken, user, router]);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await logout();
    } finally {
      setIsSigningOut(false);
      router.push("/login");
      router.refresh();
    }
  }

  async function openBuilder() {
    setBuilderLoading(true);
    try {
      const pages = await loadTemplates({ resource: "landing-page" });
      if (pages && pages.length > 0) {
        router.push(orgBuilderPath(pages[0].id));
        return;
      }
    } catch {
      // No pages (or fetch failed) — fall through to the Landing Pages hub.
    } finally {
      setBuilderLoading(false);
    }
    router.push("/org/landing-pages");
  }

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 820) {
      setDrawerOpen((v) => !v);
    } else {
      setCollapsed((v) => !v);
    }
  };

  const appClass = [
    "app",
    collapsed ? "collapsed" : "",
    drawerOpen ? "drawer-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const crumb =
    CRUMB_MAP[pathname] ??
    (/^\/org\/projects\/(?!add-new-project$)[^/]+/.test(pathname)
      ? "Projects · Detail"
      : CRUMB_MAP[
          Object.keys(CRUMB_MAP)
            .filter((base) => pathname.startsWith(`${base}/`))
            .sort((a, b) => b.length - a.length)[0]
        ]) ??
    "Dashboard";

  const notifications = [
    {
      id: 1,
      title: "New lead assigned",
      meta: "Apex Heights • Premium Apartments",
      time: "2 min ago",
      unread: true,
      accent: "#4f46e5",
    },
    {
      id: 2,
      title: "Property update needed",
      meta: "Palm Residency • Final approval review",
      time: "1 hour ago",
      unread: true,
      accent: "#f59e0b",
    },
    {
      id: 3,
      title: "Campaign published",
      meta: "Skyline Villas landing page is live",
      time: "Today",
      unread: false,
      accent: "#10b981",
    },
  ];

  useEffect(() => {
    if (!profileMenuOpen && !notificationOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest("[data-profile-menu]") &&
        !target.closest("[data-notification-menu]")
      ) {
        setProfileMenuOpen(false);
        setNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [profileMenuOpen, notificationOpen]);

  const unreadNotificationCount = notifications.filter((item) => item.unread).length;

  if (authLoading || !accessToken || !user || user.role !== "organisation_admin") {
    return null;
  }

  const userName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;
  const avatarInitials = initials(user.first_name, user.last_name);

  return (
    <div className={appClass}>
      <aside className="sidebar">
        <div className="s-top">
          <div className="logo">iR</div>
          <div className="s-name">
            iPixxel Realty<small>Organisation Admin</small>
          </div>
        </div>
        <nav>
          <ul className="nav">
            {NAV_GROUPS.map((group) => (
              <ul className="nav-group" key={group.grp}>
                <li className="grp">{group.grp}</li>
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        data-tip={item.tip}
                        className={isActive ? "active" : ""}
                      >
                        <span className="ic"><Icon name={item.icon} size={16} /></span>
                        <span className="lbl">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="scrim" onClick={() => setDrawerOpen(false)} />
      <main className="main">
        <header className="topbar">
          <div className="tb-left">
            <button className="burger" onClick={toggleSidebar} aria-label="Toggle menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                borderRadius: 999,
                background: "rgba(79, 70, 229, 0.08)",
                border: "1px solid rgba(79, 70, 229, 0.12)",
                color: "#4f46e5",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Dashboard
            </div>
            <div className="crumbs">
              Organisation · <b>{crumb}</b>
            </div>
          </div>

          <div className="tb-search" style={{ maxWidth: 460 }}>
            <span className="si"><Icon name="search" size={14} /></span>
            <input placeholder="Search leads, pages, agents…" />
            <span className="kbd">⌘K</span>
          </div>

          <div className="tb-right" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={openBuilder}
              disabled={builderLoading}
              title="Open the page builder"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 13px",
                borderRadius: 11,
                border: "1px solid rgba(79,70,229,0.18)",
                background: "rgba(79,70,229,0.08)",
                color: "#4f46e5",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: builderLoading ? "wait" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <Icon name="puzzle" size={14} /> {builderLoading ? "Opening…" : "Open Builder"}
            </button>
            <div style={{ position: "relative" }} data-notification-menu>
              <button
                type="button"
                className="icon-btn"
                aria-label="Notifications"
                onClick={() => {
                  setNotificationOpen((value) => !value);
                  setProfileMenuOpen(false);
                }}
                style={{ position: "relative" }}
              >
                <Icon name="bell" size={14} />
                {unreadNotificationCount > 0 ? <span className="dot" /> : null}
              </button>

              {notificationOpen ? (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 12px)",
                    width: 340,
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.98)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.18)",
                    overflow: "hidden",
                    zIndex: 60,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 16px 12px",
                      borderBottom: "1px solid rgba(148, 163, 184, 0.15)",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Notifications
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                        {unreadNotificationCount} unread
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{
                        border: "none",
                        background: "rgba(79, 70, 229, 0.08)",
                        color: "#4f46e5",
                        borderRadius: 10,
                        padding: "8px 10px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Mark all read
                    </button>
                  </div>

                  <div style={{ maxHeight: 340, overflowY: "auto" }}>
                    {notifications.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                          padding: "14px 16px",
                          borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
                          background: item.unread ? "rgba(79, 70, 229, 0.02)" : "transparent",
                        }}
                      >
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            marginTop: 7,
                            background: item.accent,
                            boxShadow: `0 0 0 4px ${item.accent}22`,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{item.meta}</div>
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", paddingTop: 3 }}>
                          {item.time}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <button className="icon-btn" aria-label="Alerts" style={{ position: "relative" }}>
              <Icon name="alert" size={14} />
            </button>

            <div style={{ position: "relative" }} data-profile-menu>
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((value) => !value);
                  setNotificationOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 10px 6px 6px",
                  borderRadius: 14,
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  background: "rgba(255, 255, 255, 0.7)",
                  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
                  cursor: "pointer",
                }}
              >
                <div className="tb-avatar" style={{ width: 36, height: 36, fontSize: 12 }}>
                  {avatarInitials}
                </div>
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, textAlign: "left" }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: "#0f172a" }}>{userName}</span>
                  <span style={{ fontSize: 11, color: "#64748b" }}>{user.roleLabel}</span>
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="chevron-down" size={12} />
                </span>
              </button>

              {profileMenuOpen ? (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 12px)",
                    width: 220,
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.98)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.18)",
                    overflow: "hidden",
                    zIndex: 60,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 14px 12px",
                      borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
                    }}
                  >
                    <div className="tb-avatar" style={{ width: 34, height: 34, fontSize: 11 }}>
                      {avatarInitials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{userName}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{user.email}</div>
                    </div>
                  </div>

                  <Link
                    href="/org/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "12px 14px",
                      fontSize: 14,
                      color: "#0f172a",
                      textDecoration: "none",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>
                      <Icon name="profile" size={14} />
                    </span>
                    My Profile
                  </Link>

                  <Link
                    href="/org/settings"
                    onClick={() => setProfileMenuOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "12px 14px",
                      fontSize: 14,
                      color: "#0f172a",
                      textDecoration: "none",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>
                      <Icon name="settings" size={14} />
                    </span>
                    Settings
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      void handleSignOut();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "12px 14px",
                      fontSize: 14,
                      color: "#ef4444",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="logout" size={14} />
                    </span>
                    {isSigningOut ? "Logging out..." : "Logout"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <div className="page">{children}</div>

        <Link
          href="/org/support"
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 18px",
            borderRadius: 999,
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            color: "#fff",
            textDecoration: "none",
            boxShadow: "0 18px 40px rgba(79, 70, 229, 0.32)",
            fontSize: 13,
            fontWeight: 700,
            zIndex: 30,
          }}
        >
          <Icon name="flag" size={15} />
          Support
        </Link>
      </main>
    </div>
  );
}