"use client";

import type { ReactNode } from "react";
import type * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronDown,
  Clock,
  HelpCircle,
  LogOut,
  Menu,
  Monitor,
  Pencil,
  PencilRuler,
  Redo2,
  Rocket,
  Save,
  Settings,
  SlidersHorizontal,
  Smartphone,
  Tablet,
  Undo2,
  User,
  Eye,
} from "lucide-react";
import { useEditorStore, type Viewport } from "@/components/openpage/store/editorStore";
import type { ModuleKey } from "@/lib/openpage/types";
import { BRAND } from "@/lib/openpage/data";

export function OpenPageMark({
  size = 30,
  color,
}: {
  size?: number;
  color?: string;
}) {
  const gid = `psm${color ? color.replace(/[^a-zA-Z0-9]/g, "") : ""}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <defs>
        <linearGradient
          id={gid}
          x1="4"
          y1="4"
          x2="36"
          y2="36"
          gradientUnits="userSpaceOnUse"
        >
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
      <path
        d="M11 27V18l9-7 9 7v9"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M15.5 27v-4.5h3V27M21.5 27v-7h3v7"
        stroke="#fff"
        strokeWidth="2.1"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="20" cy="18.5" r="2.6" fill="#cda45e" />
    </svg>
  );
}

export const MODULE_OPTIONS: {
  key: ModuleKey;
  label: string;
  icon: React.ComponentType<{
    size?: number | string;
    style?: React.CSSProperties;
  }>;
  desc: string;
  color: string;
  bg: string;
}[] = [
  {
    key: "builder",
    label: "Canvas Builder",
    icon: PencilRuler,
    desc: "Visual drag & drop page editor",
    color: "#6d5dfc",
    bg: "rgba(109, 93, 252, 0.15)",
  },
  {
    key: "settings",
    label: "Page Settings",
    icon: SlidersHorizontal,
    desc: "SEO, tracking, branding, typography & more",
    color: "#0ea5e9",
    bg: "rgba(14, 165, 233, 0.15)",
  },
];

export function TopNav({
  module,
  setModule,
  pageName,
  pageStatus,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onPreview,
  onPublish,
  onUnpublish,
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
  homeHref,
  unsaved,
}: {
  module: ModuleKey;
  setModule?: (m: ModuleKey) => void;
  pageName?: string;
  pageStatus?: string;
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
  onMenu?: () => void;
  actions?: ReactNode;
  user?: { name: string; email: string; initials: string } | null;
  onSignOut: () => void;
  settingsHref?: string;
  homeHref?: string;
  unsaved?: boolean;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [moduleMenuOpen, setModuleMenuOpen] = useState(false);
  const published = pageStatus === "published";

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-profile-menu]")) {
        setProfileOpen(false);
      }
      if (!target.closest("[data-module-menu]")) {
        setModuleMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <header className="ps-topnav ps-glass">
      {/* Logo & Page Breadcrumbs */}
      <div className="ps-topnav-left">
        {onMenu ? (
          <button
            type="button"
            className="ps-nav-toggle"
            title="Toggle Dock"
            onClick={onMenu}
          >
            <Menu size={18} />
          </button>
        ) : null}
        {homeHref ? (
          <Link
            href={homeHref}
            title={
              homeHref.includes("/add-new-project")
                ? "Back to Project Setup Wizard"
                : homeHref.includes("/projects")
                  ? "Back to Project"
                  : "Back to dashboard"
            }
            className="ps-topnav-icon-btn"
            style={{
              ...iconBtn(true),
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              width: "auto",
              padding: "0 10px",
            }}
          >
            <ArrowLeft size={16} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              {homeHref.includes("/add-new-project")
                ? "Back to Project Setup"
                : homeHref.includes("/projects")
                  ? "Back to Project"
                  : "Exit"}
            </span>
          </Link>
        ) : null}
        <div
          className="ps-topnav-brand"
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <OpenPageMark size={28} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              lineHeight: 1.1,
            }}
          >
            <span className="ps-topnav-wordmark">OPENPAGE</span>
            <span className="ps-topnav-sub">STUDIO</span>
          </div>
        </div>

        <div
          className="ps-vdiv"
          style={{ height: 20, margin: "0 2px" }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
          }}
        >
          {module !== "builder" && setModule ? (
            <button
              type="button"
              onClick={() => setModule("builder")}
              className="ps-topnav-btn ps-topnav-btn--publish"
              style={{ padding: "5px 10px", fontSize: 12 }}
            >
              <ArrowLeft size={13} /> Canvas
            </button>
          ) : null}
          {pageName ? (
            <span className="ps-page-title" title={pageName}>
              <span>{pageName}</span>
              <Pencil size={13} className="ps-page-title-edit" />
            </span>
          ) : null}
          {pageStatus ? (
            <span
              className={`ps-draft-pill ${published ? "ps-pill--published" : "ps-pill--draft"}`}
            >
              <span
                className="ps-dot"
                style={{ background: published ? "#34d399" : "#fbbf24" }}
              />
              {pageStatus}
            </span>
          ) : null}
          {unsaved ? <span className="ps-unsaved-pill">Unsaved</span> : null}

          {setModule ? (
            <div style={{ position: "relative" }} data-module-menu>
              <button
                type="button"
                onClick={() => setModuleMenuOpen((v) => !v)}
                className="ps-topnav-btn"
                style={{ padding: "4px 10px" }}
              >
                <span>{module === "builder" ? "Page tools" : MODULE_LABELS[module]}</span>
                <ChevronDown size={13} style={{ color: "#94a3b8" }} />
              </button>
              {moduleMenuOpen ? (
                <div className="ps-module-menu">
                  <div
                    style={{
                      padding: "4px 10px 8px",
                      fontSize: 10.5,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                      color: "#94a3b8",
                    }}
                  >
                    Studio modules
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {MODULE_OPTIONS.map((m) => {
                      const Icon = m.icon;
                      const active = module === m.key;
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => {
                            setModule(m.key);
                            setModuleMenuOpen(false);
                          }}
                          className="ps-module-menu-item"
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "8px 10px",
                            borderRadius: 10,
                            border: "none",
                            background: active ? "rgba(109, 93, 252, 0.22)" : "transparent",
                            color: active ? "#c4bfff" : "#ffffff",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 9,
                              background: m.bg,
                              color: m.color,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={17} />
                          </span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>
                              {m.label}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#94a3b8",
                                marginTop: 1,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {m.desc}
                            </div>
                          </div>
                          {active ? <Check size={16} style={{ color: "#9690ff", flexShrink: 0 }} /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="ps-topnav-center">
        {module === "builder" ? <DeviceToggle /> : null}
      </div>

      {/* Right controls */}
      <div className="ps-topnav-right" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {module === "builder" ? (
          <>
            <EditorChromeButtons
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={onUndo}
              onRedo={onRedo}
              onPreview={onPreview}
            />
            <div className="ps-vdiv" style={{ height: 20, margin: "0 2px" }} />
            <div
              className="ps-builder-actions-wide"
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <button
                type="button"
                onClick={onSave}
                className="ps-topnav-btn"
                title="Save draft changes (Ctrl+S)"
              >
                <Save size={14} /> <span className="ps-btn-label">Save</span>
              </button>
              {published ? (
                <button
                  type="button"
                  onClick={onUnpublish}
                  className="ps-topnav-btn"
                >
                  {unpublishLabel}
                </button>
              ) : null}
              <button
                type="button"
                onClick={onPublish}
                className="ps-topnav-btn ps-topnav-btn--publish"
                title={published ? "Update live page" : "Publish this page"}
              >
                <Rocket size={14} />
                <span className="ps-btn-label">{publishLabel}</span>
              </button>
            </div>
          </>
        ) : (
          actions
        )}

        <div
          style={{
            width: 1,
            height: 20,
            background: "var(--ps-line-strong)",
            margin: "0 2px",
          }}
        />

        {/* Notification */}
        <button
          type="button"
          onClick={onNotify}
          title="Notifications"
          className="ps-topnav-icon-btn"
          style={{ ...iconBtn(true), position: "relative" }}
        >
          <Bell size={16} />
        </button>
        <button
          type="button"
          onClick={onActivity}
          title="Activity feed"
          className="ps-topnav-icon-btn ps-hide-md"
          style={iconBtn(true)}
        >
          <Clock size={16} />
        </button>
        <button
          type="button"
          onClick={onHelp}
          title="Help center"
          className="ps-topnav-icon-btn ps-hide-md"
          style={iconBtn(true)}
        >
          <HelpCircle size={16} />
        </button>

        {/* Profile */}
        <div style={{ position: "relative" }} data-profile-menu>
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 6px",
              borderRadius: 10,
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background =
                "rgba(255,255,255,0.06)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background =
                "transparent")
            }
          >
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
            <div
              className="ps-card ps-fade-in"
              style={{
                position: "absolute",
                top: 42,
                right: 0,
                width: 230,
                padding: 6,
                zIndex: 500,
                boxShadow: "var(--ps-shadow-lg)",
              }}
            >
              <div
                style={{
                  padding: "10px 10px 8px",
                  borderBottom: "1px solid var(--ps-line)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800 }}>
                  {user?.name ?? "—"}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--ps-muted)",
                    marginTop: 1,
                  }}
                >
                  {user?.email ?? "—"}
                </div>
              </div>
              {/* Profile and Team & Roles have no destination page yet — left
                  as inert (menu just closes), same as the dark-mode toggle
                  below which doesn't apply a theme anywhere in the app. */}
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 12.5,
                  color: "var(--ps-slate)",
                  textAlign: "left",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.05)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    "transparent")
                }
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
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 12.5,
                    color: "var(--ps-slate)",
                    textAlign: "left",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLAnchorElement).style.background =
                      "rgba(255,255,255,0.05)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLAnchorElement).style.background =
                      "transparent")
                  }
                >
                  <Settings size={15} /> Settings
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setProfileOpen(false)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 12.5,
                    color: "var(--ps-slate)",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(255,255,255,0.05)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      "transparent")
                  }
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
              <div
                style={{
                  borderTop: "1px solid var(--ps-line)",
                  marginTop: 4,
                  paddingTop: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onSignOut();
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 12.5,
                    color: "var(--ps-danger)",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      "var(--ps-danger-soft)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      "transparent")
                  }
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
  settings: "Settings",
};

const VIEWPORTS: { value: Viewport; icon: typeof Monitor; label: string }[] = [
  { value: "desktop", icon: Monitor, label: "Desktop" },
  { value: "tablet", icon: Tablet, label: "Tablet" },
  { value: "mobile", icon: Smartphone, label: "Mobile" },
];

function DeviceToggle() {
  const viewport = useEditorStore((s) => s.viewport);
  const setViewport = useEditorStore((s) => s.setViewport);
  return (
    <div className="ps-device-toggle" role="group" aria-label="Device preview">
      {VIEWPORTS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          data-active={viewport === value}
          title={label}
          aria-label={label}
          aria-pressed={viewport === value}
          onClick={() => setViewport(value)}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}

function EditorChromeButtons({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPreview,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onPreview: () => void;
}) {
  return (
    <div className="ps-builder-chrome" style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <button type="button" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="ps-topnav-icon-btn" style={iconBtn(canUndo)}>
        <Undo2 size={15} />
      </button>
      <button type="button" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" className="ps-topnav-icon-btn" style={iconBtn(canRedo)}>
        <Redo2 size={15} />
      </button>
      <div className="ps-vdiv" style={{ height: 20, margin: "0 4px" }} />
      <button type="button" onClick={onPreview} title="Preview this page" className="ps-topnav-btn">
        <Eye size={14} />
        <span className="ps-btn-label">Preview</span>
      </button>
    </div>
  );
}

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
