"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { dashboardPathFor } from "@/lib/mock/sessions";

type NavItem = {
  href: string;
  icon: string;
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
    items: [{ href: "/org", icon: "📊", label: "Dashboard", tip: "Dashboard" }],
  },
  {
    grp: "Sales",
    items: [
      { href: "/org/leads", icon: "📇", label: "Lead Center", tip: "Lead Center" },
      { href: "/org/projects", icon: "🏗️", label: "Projects", tip: "Projects" },
    ],
  },
  {
    grp: "Communication",
    items: [
      { href: "/org/calling", icon: "📞", label: "Calling", tip: "Calling" },
      { href: "/org/whatsapp", icon: "💬", label: "WhatsApp", tip: "WhatsApp" },
    ],
  },
  {
    grp: "Website",
    items: [
      { href: "/org/websites", icon: "🌐", label: "Websites", tip: "Websites" },
      { href: "/org/landing-pages", icon: "📄", label: "Landing Pages", tip: "Landing Pages" },
      { href: "/org/templates", icon: "🧩", label: "Templates", tip: "Templates" },
      { href: "/org/integrations", icon: "🔌", label: "Integrations", tip: "Integrations" },
    ],
  },
  {
    grp: "Team",
    items: [
      { href: "/org/sales-agents", icon: "🧑‍💼", label: "Sales Agents", tip: "Sales Agents" },
      { href: "/org/teams", icon: "👥", label: "Teams", tip: "Teams" },
      { href: "/org/users", icon: "👤", label: "Users", tip: "Users" },
      { href: "/org/roles-permissions", icon: "🔐", label: "Roles & Permissions", tip: "Roles & Permissions" },
    ],
  },
  {
    grp: "More",
    items: [
      { href: "/org/publish-approvals", icon: "🚀", label: "Publish & Approvals", tip: "Publish & Approvals" },
      { href: "/org/settings", icon: "⚙️", label: "Settings", tip: "Settings" },
      { href: "/org/support", icon: "🛟", label: "Support", tip: "Support" },
    ],
  },
];

const CRUMB_MAP: Record<string, string> = {
  "/org": "Dashboard",
  "/org/leads": "Lead Center",
  "/org/projects": "Projects",
  "/org/calling": "Calling",
  "/org/whatsapp": "WhatsApp",
  "/org/websites": "Websites",
  "/org/landing-pages": "Landing Pages",
  "/org/templates": "Templates",
  "/org/integrations": "Integrations",
  "/org/sales-agents": "Sales Agents",
  "/org/teams": "Teams",
  "/org/users": "Users",
  "/org/roles-permissions": "Roles & Permissions",
  "/org/publish-approvals": "Publish & Approvals",
  "/org/settings": "Organisation Settings",
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

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 820) {
      setDrawerOpen((v) => !v);
    } else {
      setCollapsed((v) => !v);
    }
  };

  if (authLoading || !accessToken || !user || user.role !== "organisation_admin") {
    return null;
  }

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
                        <span className="ic">{item.icon}</span>
                        <span className="lbl">{item.label}</span>
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
              <b>{userName}</b>
              <span>{user.roleLabel}</span>
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
              Organisation · <b>{crumb}</b>
            </div>
          </div>
          <div className="tb-search">
            <span className="si">🔎</span>
            <input placeholder="Search leads, pages, agents…" />
            <span className="kbd">⌘K</span>
          </div>
          <div className="tb-right">
            <button className="icon-btn">
              🔔<span className="dot" />
            </button>
            <button className="icon-btn">❔</button>
            <div className="tb-avatar">{avatarInitials}</div>
          </div>
        </header>
        <div className="page">{children}</div>
      </main>
    </div>
  );
}
