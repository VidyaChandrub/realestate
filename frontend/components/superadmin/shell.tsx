"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Icon } from "@/components/icons";
import { NotificationsBell } from "./notifications-bell";

type NavItem = {
  href: string;
  icon: string;
  label: string;
  tip: string;
  badge?: string;
  activeMatch?: string[];
};

type NavGroup = {
  grp: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    grp: "Overview",
    items: [
      { href: "/admin-console", icon: "dashboard", label: "Dashboard", tip: "Dashboard", activeMatch: ["/admin-console"] },
      { href: "/admin-console/analytics", icon: "reports", label: "Analytics", tip: "Analytics", activeMatch: ["/admin-console/analytics"] },
      { href: "/admin-console/notifications", icon: "bell", label: "Notifications", tip: "Notifications", activeMatch: ["/admin-console/notifications"] },
    ],
  },
  {
    grp: "Manage",
    items: [
      {
        href: "/admin-console/organisations",
        icon: "building",
        label: "Organisations",
        tip: "Organisations",
        badge: "142",
        activeMatch: ["/admin-console/organisations", "/admin-console/organisation-detail"],
      },
      { href: "/admin-console/roles", icon: "lock", label: "Dynamic Roles", tip: "Manage Dynamic Roles", activeMatch: ["/admin-console/roles"] },
      { href: "/admin-console/admins", icon: "users", label: "Platform Team", tip: "Platform Team", activeMatch: ["/admin-console/admins"] },
    ],
  },
  {
    grp: "Product",
    items: [
      {
        href: "/admin-console/templates",
        icon: "puzzle",
        label: "Templates",
        tip: "Template Management",
        activeMatch: ["/admin-console/templates", "/admin-console/template-detail"],
      },
      { href: "/admin-console/org-domains", icon: "globe", label: "Org Domains", tip: "Organisation subdomains and custom domains", activeMatch: ["/admin-console/org-domains"] },
      { href: "/admin-console/domains", icon: "globe", label: "Page Domains", tip: "Landing-page domain migrations", activeMatch: ["/admin-console/domains"] },
    ],
  },
  {
    grp: "Billing & System",
    items: [
      { href: "/admin-console/subscriptions", icon: "billing", label: "Subscriptions", tip: "Subscriptions", activeMatch: ["/admin-console/subscriptions"] },
      { href: "/admin-console/email", icon: "mail", label: "Email & SMTP", tip: "Email & SMTP Management", activeMatch: ["/admin-console/email"] },
      { href: "/admin-console/audit-logs", icon: "shield", label: "Audit Logs", tip: "Audit Logs", activeMatch: ["/admin-console/audit-logs"] },
      { href: "/admin-console/settings", icon: "settings", label: "Settings", tip: "Settings", activeMatch: ["/admin-console/settings"] },
    ],
  },
];

const CRUMB_MAP: Record<string, string> = {
  "/admin-console": "Dashboard",
  "/admin-console/analytics": "Analytics",
  "/admin-console/notifications": "Notifications",
  "/admin-console/organisations": "Organisations",
  "/admin-console/roles": "Dynamic Roles",
  "/admin-console/organisation-detail": "Organisation",
  "/admin-console/admins": "Platform Team",
  "/admin-console/templates": "Templates",
  "/admin-console/template-detail": "Template",
  "/prestate": "Builder",
  "/admin-console/org-domains": "Org Domains",
  "/admin-console/domains": "Page Domains",
  "/admin-console/subscriptions": "Subscriptions",
  "/admin-console/email": "Email & SMTP",
  "/admin-console/audit-logs": "Audit Logs",
  "/admin-console/settings": "Settings",
};

export function SuperAdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, accessToken, isLoading: authLoading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pendingOrgsBadge, setPendingOrgsBadge] = useState<number | null>(null);

  const adminName = user ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email : "Super Admin";
  const avatarInitials = user?.first_name
    ? `${user.first_name[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase()
    : "SA";

  useEffect(() => {
    if (!authLoading && (!accessToken || user?.role !== "super_admin")) {
      router.replace("/admin-login");
    }
  }, [authLoading, accessToken, user, router]);

  useEffect(() => {
    if (!accessToken || user?.role !== "super_admin") return;
    let cancelled = false;
    apiFetch<{ pending?: number }>("/admin/organisations/summary", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .catch(() => null)
      .then((orgSummary) => {
        if (cancelled) return;
        setPendingOrgsBadge(orgSummary?.pending ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, user]);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await logout();
    } finally {
      setIsSigningOut(false);
      router.push("/admin-login");
      router.refresh();
    }
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
    CRUMB_MAP[
      Object.keys(CRUMB_MAP)
        .filter((base) => pathname.startsWith(`${base}/`))
        .sort((a, b) => b.length - a.length)[0]
    ] ??
    "Dashboard";

  return (
    <div className={appClass}>
      <aside className="sidebar">
        <div className="s-top">
          <div className="logo">iR</div>
          <div className="s-name">
            iPixxel Realty<small>Super Admin</small>
          </div>
        </div>
        <nav>
          <ul className="nav">
            {NAV_GROUPS.map((group) => (
              <ul className="nav-group" key={group.grp}>
                <li className="grp">{group.grp}</li>
                {group.items.map((item) => {
                  const isActive =
                    item.activeMatch?.some(
                      (base) => pathname === base || pathname.startsWith(`${base}/`),
                    ) ?? false;
                  const badge =
                    item.href === "/admin-console/organisations"
                      ? (pendingOrgsBadge && pendingOrgsBadge > 0 ? `${pendingOrgsBadge} pending` : undefined)
                      : item.badge;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        data-tip={item.tip}
                        className={isActive ? "active" : ""}
                      >
                        <span className="ic"><Icon name={item.icon as any} size={16} /></span>
                        <span className="lbl">{item.label}</span>
                        {badge ? <span className="badge-n">{badge}</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ))}
          </ul>
        </nav>
        <div className="s-foot">
          <div className="side-user">
            <div className="av">{avatarInitials}</div>
            <div className="meta">
              <b>{adminName}</b>
              <span>Super Administrator</span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="signout"
              title="Sign out"
            >
              <Icon name="logout" size={14} />
            </button>
          </div>
        </div>
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
                gap: 6,
                padding: "4px 9px",
                borderRadius: 999,
                background: "linear-gradient(135deg, rgba(79,70,229,0.12), rgba(124,58,237,0.12))",
                border: "1px solid rgba(79,70,229,0.2)",
                color: "var(--brand, #6366f1)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Platform
            </div>
            <div className="crumbs">
              Super Admin · <b>{crumb}</b>
            </div>
          </div>
          <div className="tb-search">
            <span className="si"><Icon name="search" size={14} /></span>
            <input placeholder="Search organisations, templates, domains, email logs…" />
            <span className="kbd">⌘K</span>
          </div>
          <div className="tb-right" style={{ position: "relative" }}>
            <NotificationsBell accessToken={accessToken} />
            <Link href="/admin-console/email" className="icon-btn" title="Email & SMTP Settings">
              <Icon name="mail" size={15} />
            </Link>
            <Link href="/admin-console/settings" className="icon-btn" title="Platform Settings">
              <Icon name="settings" size={15} />
            </Link>
            <div style={{ position: "relative" }}>
              <div
                className="tb-avatar"
                title={adminName}
                onClick={() => setProfileOpen((v) => !v)}
              >
                {avatarInitials}
              </div>

              {profileOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    right: 0,
                    width: 230,
                    background: "var(--surface, #ffffff)",
                    borderRadius: 14,
                    border: "1px solid var(--line, #e2e8f0)",
                    boxShadow: "0 20px 40px rgba(15,23,42,0.15)",
                    zIndex: 100,
                    padding: "8px 0",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line, #e2e8f0)" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink, #0f172a)" }}>
                      {adminName}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted, #64748b)", marginTop: 2 }}>
                      {user?.email || "admin@ipixxelrealty.com"}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <span className="badge b-indigo" style={{ fontSize: 10 }}>Super Admin</span>
                    </div>
                  </div>

                  <Link
                    href="/admin-console/settings"
                    onClick={() => setProfileOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 16px",
                      fontSize: 13,
                      color: "var(--ink, #0f172a)",
                      textDecoration: "none",
                    }}
                  >
                    <Icon name="settings" size={14} /> Platform Settings
                  </Link>

                  <Link
                    href="/admin-console/email"
                    onClick={() => setProfileOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 16px",
                      fontSize: 13,
                      color: "var(--ink, #0f172a)",
                      textDecoration: "none",
                    }}
                  >
                    <Icon name="mail" size={14} /> Email &amp; SMTP
                  </Link>

                  <Link
                    href="/admin-console/audit-logs"
                    onClick={() => setProfileOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 16px",
                      fontSize: 13,
                      color: "var(--ink, #0f172a)",
                      textDecoration: "none",
                    }}
                  >
                    <Icon name="shield" size={14} /> Audit Trail
                  </Link>

                  <div style={{ height: 1, background: "var(--line, #e2e8f0)", margin: "6px 0" }} />

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      void handleSignOut();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "9px 16px",
                      fontSize: 13,
                      color: "#ef4444",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <Icon name="logout" size={14} />
                    {isSigningOut ? "Signing out..." : "Sign Out"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="page">{children}</div>
      </main>
    </div>
  );
}
