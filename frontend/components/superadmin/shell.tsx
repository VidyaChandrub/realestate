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
      { href: "/admin-console/domains", icon: "globe", label: "Domain Requests", tip: "Domain Requests", activeMatch: ["/admin-console/domains"] },
    ],
  },
  {
    grp: "Billing & System",
    items: [
      { href: "/admin-console/subscriptions", icon: "billing", label: "Subscriptions", tip: "Subscriptions", activeMatch: ["/admin-console/subscriptions"] },
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
  "/admin-console/organisation-detail": "Organisation",
  "/admin-console/admins": "Platform Team",
  "/admin-console/templates": "Templates",
  "/admin-console/template-detail": "Template",
  "/prestate": "Builder",
  "/admin-console/domains": "Domain Requests",
  "/admin-console/subscriptions": "Subscriptions",
  "/admin-console/audit-logs": "Audit Logs",
  "/admin-console/settings": "Settings",
};

export function SuperAdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, accessToken } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [pendingOrgsBadge, setPendingOrgsBadge] = useState<number | null>(null);

  useEffect(() => {
    if (!accessToken) return;
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
  }, [accessToken]);

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
            <div className="av">PP</div>
            <div className="meta">
              <b>Pranab Patel</b>
              <span>Platform Owner</span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="signout"
              title="Sign out"
            >
              ⎋
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
            <div className="crumbs">
              Super Admin · <b>{crumb}</b>
            </div>
          </div>
          <div className="tb-search">
            <span className="si"><Icon name="search" size={14} /></span>
            <input placeholder="Search organisations, templates, admins…" />
            <span className="kbd">⌘K</span>
          </div>
          <div className="tb-right">
            <NotificationsBell accessToken={accessToken} />
            <button className="icon-btn"><Icon name="alert" size={16} /></button>
            <div className="tb-avatar">PP</div>
          </div>
        </header>
        <div className="page">{children}</div>
      </main>
    </div>
  );
}
