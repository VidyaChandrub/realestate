"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

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
      { href: "/superadmin", icon: "📊", label: "Dashboard", tip: "Dashboard", activeMatch: ["/superadmin"] },
      { href: "/superadmin/analytics", icon: "📈", label: "Analytics", tip: "Analytics", activeMatch: ["/superadmin/analytics"] },
    ],
  },
  {
    grp: "Manage",
    items: [
      {
        href: "/superadmin/organisations",
        icon: "🏢",
        label: "Organisations",
        tip: "Organisations",
        badge: "142",
        activeMatch: ["/superadmin/organisations", "/superadmin/organisation-detail"],
      },
      { href: "/superadmin/onboarding", icon: "✨", label: "Onboard Org", tip: "Onboard org", activeMatch: ["/superadmin/onboarding"] },
      { href: "/superadmin/admins", icon: "👥", label: "Platform Team", tip: "Platform Team", activeMatch: ["/superadmin/admins"] },
    ],
  },
  {
    grp: "Product",
    items: [
      {
        href: "/superadmin/templates",
        icon: "🧩",
        label: "Templates",
        tip: "Template Management",
        activeMatch: ["/superadmin/templates", "/superadmin/template-detail"],
      },
      { href: "/superadmin/approvals", icon: "✅", label: "Approvals", tip: "Approvals", badge: "6", activeMatch: ["/superadmin/approvals"] },
    ],
  },
  {
    grp: "Billing & System",
    items: [
      { href: "/superadmin/subscriptions", icon: "💳", label: "Subscriptions", tip: "Subscriptions", activeMatch: ["/superadmin/subscriptions"] },
      { href: "/superadmin/audit-logs", icon: "🛡️", label: "Audit Logs", tip: "Audit Logs", activeMatch: ["/superadmin/audit-logs"] },
      { href: "/superadmin/settings", icon: "⚙️", label: "Settings", tip: "Settings", activeMatch: ["/superadmin/settings"] },
    ],
  },
];

const CRUMB_MAP: Record<string, string> = {
  "/superadmin": "Dashboard",
  "/superadmin/analytics": "Analytics",
  "/superadmin/organisations": "Organisations",
  "/superadmin/organisation-detail": "Organisation",
  "/superadmin/onboarding": "Onboard",
  "/superadmin/admins": "Platform Team",
  "/superadmin/templates": "Templates",
  "/superadmin/template-detail": "Template",
  "/prestate": "Builder",
  "/superadmin/approvals": "Approvals",
  "/superadmin/subscriptions": "Subscriptions",
  "/superadmin/audit-logs": "Audit Logs",
  "/superadmin/settings": "Settings",
};

export function SuperAdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

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
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        data-tip={item.tip}
                        className={isActive ? "active" : ""}
                      >
                        <span className="ic">{item.icon}</span>
                        <span className="lbl">{item.label}</span>
                        {item.badge ? <span className="badge-n">{item.badge}</span> : null}
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
            <span className="si">🔎</span>
            <input placeholder="Search organisations, templates, admins…" />
            <span className="kbd">⌘K</span>
          </div>
          <div className="tb-right">
            <button className="icon-btn">
              🔔<span className="dot" />
            </button>
            <button className="icon-btn">❔</button>
            <div className="tb-avatar">PP</div>
          </div>
        </header>
        <div className="page">{children}</div>
      </main>
    </div>
  );
}
