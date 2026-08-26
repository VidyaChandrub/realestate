"use client";

import type { ReactNode } from "react";
import type * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  Clock,
  HelpCircle,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Redo2,
  Rocket,
  Save,
  Settings,
  Smartphone,
  Sun,
  Tablet,
  Undo2,
  User,
  Users,
  Eye,
} from "lucide-react";
import type { Device, ModuleKey } from "@/lib/prestate/types";
import { BRAND } from "@/lib/prestate/data";

export function PrestateMark({ size = 30, color }: { size?: number; color?: string }) {
  const gid = `psm${color ? color.replace(/[^a-zA-Z0-9]/g, "") : ""}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          {color ? (
            <>
              <stop stopColor={color} />
              <stop offset="0.6" stopColor={color} stopOpacity="0.82" />
              <stop offset="1" stopColor={color} stopOpacity="0.7" />
            </>
          ) : (
            <>
              <stop stopColor="#7a6bff" />
              <stop offset="0.6" stopColor="#5a4be0" />
              <stop offset="1" stopColor="#3f34b5" />
            </>
          )}
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="34" height="34" rx="10" fill={`url(#${gid})`} />
      <path d="M11 27V18l9-7 9 7v9" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M15.5 27v-4.5h3V27M21.5 27v-7h3v7" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" fill="none" />
      <circle cx="20" cy="18.5" r="2.6" fill="#cda45e" />
    </svg>
  );
}

const DEVICES: { key: Device; icon: typeof Monitor; label: string }[] = [
  { key: "desktop", icon: Monitor, label: "Desktop" },
  { key: "tablet", icon: Tablet, label: "Tablet" },
  { key: "mobile", icon: Smartphone, label: "Mobile" },
];

export function TopNav({
  module,
  pageName,
  pageStatus,
  device,
  setDevice,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onPreview,
  onPublish,
  onUnpublish,
  // Text only — an org session isn't allowed to publish directly, so
  // studio.tsx passes "Submit for approval" / a review-status label here
  // instead of the Super Admin's "Publish" / "Unpublish". The click handlers
  // and branching (which slot renders) are unchanged.
  publishLabel = "Publish",
  unpublishLabel = "Unpublish",
  onNotify,
  onActivity,
  onHelp,
  onMenu,
  actions,
  user,
  onSignOut,
  settingsHref,
}: {
  module: ModuleKey;
  pageName?: string;
  pageStatus?: string;
  device: Device;
  setDevice: (d: Device) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  publishLabel?: string;
  unpublishLabel?: string;
  onNotify: () => void;
  onActivity: () => void;
  onHelp: () => void;
  onMenu: () => void;
  actions?: ReactNode;
  // The logged-in user, for the profile dropdown. Undefined/null renders a
  // "—" placeholder instead of guessing.
  user?: { name: string; email: string; initials: string } | null;
  onSignOut: () => void;
  // Real destination for the "Settings" menu item — differs by session
  // (org vs Super Admin). No fallback: pass it or the item stays inert.
  settingsHref?: string;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const published = pageStatus === "published";

  useEffect(() => {
    if (!profileOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-profile-menu]")) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [profileOpen]);

  return (
    <header className="ps-topnav ps-glass">
      {/* Logo */}
      <button type="button" className="ps-nav-toggle" title="Modules" onClick={onMenu}>
        <Menu size={18} />
      </button>
      <div className="ps-topnav-brand" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <PrestateMark />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <span className="ps-topnav-wordmark">PRESTATE</span>
          <span className="ps-topnav-sub">BUILDER</span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 0 }}>
        {/* Page context (builder) or module context */}
        {module === "builder" && pageName ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ps-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 320 }}>{pageName}</span>
            {pageStatus ? (
              <span className="ps-draft-pill">{pageStatus}</span>
            ) : null}
          </div>
        ) : (
          <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ps-ink)" }}>{MODULE_LABELS[module]}</span>
        )}
      </div>

      {/* Right controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        {module === "builder" ? (
          <>
            <div className="ps-builder-chrome">
            <button type="button" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="ps-topnav-icon-btn" style={iconBtn(canUndo)}>
              <Undo2 size={15} />
            </button>
            <button type="button" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" className="ps-topnav-icon-btn" style={iconBtn(canRedo)}>
              <Redo2 size={15} />
            </button>
            <div className="ps-vdiv" />
            </div>
            <div className="ps-device-toggle">
              {DEVICES.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  title={d.label}
                  onClick={() => setDevice(d.key)}
                  data-active={device === d.key ? "true" : "false"}
                >
                  <d.icon size={14} />
                </button>
              ))}
            </div>
            <div className="ps-vdiv ps-hide-md" />
            <div className="ps-builder-actions-wide">
              <button type="button" onClick={onSave} className="ps-topnav-btn">
                <Save size={14} /> <span className="ps-btn-label">Save Draft</span>
              </button>
              <button type="button" onClick={onPreview} className="ps-topnav-btn">
                <Eye size={14} /> <span className="ps-btn-label">Preview</span>
              </button>
              {published ? (
                <button type="button" onClick={onUnpublish} className="ps-topnav-btn">
                  {unpublishLabel}
                </button>
              ) : (
                <button type="button" onClick={onPublish} className="ps-topnav-btn ps-topnav-btn--publish">
                  <Rocket size={14} /> <span className="ps-btn-label">{publishLabel}</span>
                </button>
              )}
            </div>
          </>
        ) : (
          actions
        )}

        <div style={{ width: 1, height: 20, background: "var(--ps-line-strong)", margin: "0 2px" }} />

        {/* Notification */}
        <button type="button" onClick={onNotify} title="Notifications" className="ps-topnav-icon-btn" style={{ ...iconBtn(true), position: "relative" }}>
          <Bell size={16} />
          <span style={{ position: "absolute", top: 3, right: 3, width: 8, height: 8, borderRadius: "50%", background: "var(--ps-danger)", border: "2px solid var(--ps-panel)" }} />
        </button>
        <button type="button" onClick={onActivity} title="Activity feed" className="ps-topnav-icon-btn ps-hide-md" style={iconBtn(true)}>
          <Clock size={16} />
        </button>
        <button type="button" onClick={onHelp} title="Help center" className="ps-topnav-icon-btn ps-hide-md" style={iconBtn(true)}>
          <HelpCircle size={16} />
        </button>

        {/* Profile */}
        <div style={{ position: "relative" }} data-profile-menu>
          <button type="button" onClick={() => setProfileOpen((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer" }} onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)")} onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}>
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: "linear-gradient(135deg,#111827,#4b5563)",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {user?.initials ?? "—"}
            </span>
            <ChevronDown size={13} style={{ color: "var(--ps-muted)" }} />
          </button>
          {profileOpen ? (
            <div className="ps-card ps-fade-in" style={{ position: "absolute", top: 42, right: 0, width: 230, padding: 6, zIndex: 500, boxShadow: "var(--ps-shadow-lg)" }}>
              <div style={{ padding: "10px 10px 8px", borderBottom: "1px solid var(--ps-line)" }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{user?.name ?? "—"}</div>
                <div style={{ fontSize: 11.5, color: "var(--ps-muted)", marginTop: 1 }}>{user?.email ?? "—"}</div>
              </div>
              {/* Profile and Team & Roles have no destination page yet — left
                  as inert (menu just closes), same as the dark-mode toggle
                  below which doesn't apply a theme anywhere in the app. */}
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 12.5, color: "var(--ps-slate)", textAlign: "left" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
              >
                <User size={15} /> Profile
              </button>
              {/* <button
                type="button"
                onClick={() => setProfileOpen(false)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 12.5, color: "var(--ps-slate)", textAlign: "left" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
              >
                <Users size={15} /> Team & Roles
              </button> */}
              {settingsHref ? (
                <Link
                  href={settingsHref}
                  onClick={() => setProfileOpen(false)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 12.5, color: "var(--ps-slate)", textAlign: "left", textDecoration: "none" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "transparent")}
                >
                  <Settings size={15} /> Settings
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setProfileOpen(false)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 12.5, color: "var(--ps-slate)", textAlign: "left" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
                >
                  <Settings size={15} /> Settings
                </button>
              )}
              {/* <button
                type="button"
                onClick={() => {
                  setDark((v) => !v);
                  setProfileOpen(false);
                }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 12.5, color: "var(--ps-slate)", textAlign: "left" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
              >
                {dark ? <Sun size={15} /> : <Moon size={15} />} {dark ? "Light mode" : "Dark mode"}
              </button> */}
              <div style={{ borderTop: "1px solid var(--ps-line)", marginTop: 4, paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onSignOut();
                  }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 12.5, color: "var(--ps-danger)", textAlign: "left" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--ps-danger-soft)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export const MODULE_LABELS: Record<ModuleKey, string> = {
  builder: "Builder",
  pages: "Landing Pages",
  templates: "Template Management",
  forms: "Form Builder",
  brand: "Brand Center",
  headerfooter: "Header & Footer",
  seo: "SEO Center",
  tracking: "Tracking Center",
  domains: "Domains",
  typography: "Typography & Fonts",
};

function iconBtn(enabled: boolean) {
  return {
    width: 34,
    height: 34,
    border: "none",
    borderRadius: 9,
    background: "transparent",
    color: "var(--ps-slate)",
    cursor: enabled ? "pointer" : "not-allowed",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: enabled ? 1 : 0.35,
  } as const;
}

const actionBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 12px",
  borderRadius: 9,
  border: "1px solid transparent",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};

export { BRAND };