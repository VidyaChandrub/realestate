"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Globe,
  LayoutTemplate,
  Plug,
  MessageCircle,
  Palette,
  PencilRuler,
  Search,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import type { Device, LandingPageData, ModuleKey, SectionInstance, SiteConfig } from "@/lib/prestate/types";
import { loadPages, normalizeDomain, isLikelyHostname, savePages, seedPages } from "@/lib/prestate/store";
import { localPreviewPath } from "@/lib/prestate/paths";
import { ensureConfig } from "@/lib/prestate/site-config";
import { TopNav, MODULE_LABELS } from "@/components/prestate/topnav";
import { BuilderWorkspace, type BuilderApi } from "@/components/prestate/builder/workspace";
import { PropertiesModule } from "@/components/prestate/modules/properties";
import { FormsModule } from "@/components/prestate/modules/forms";
import { BrandModule } from "@/components/prestate/modules/brand";
import { HeaderFooterModule } from "@/components/prestate/modules/headerfooter";
import { SeoModule } from "@/components/prestate/modules/seo";
import { TrackingModule } from "@/components/prestate/modules/tracking";
import { DomainsModule } from "@/components/prestate/modules/domains";

const NAV_ITEMS: { key: ModuleKey; label: string; icon: React.ComponentType<{ size?: number | string }> }[] = [
  { key: "builder", label: "Builder", icon: PencilRuler },
  { key: "properties", label: "Properties", icon: Building2 },
  { key: "forms", label: "Forms", icon: MessageCircle },
  { key: "brand", label: "Brand", icon: Palette },
  { key: "headerfooter", label: "Header & Footer", icon: PencilRuler },
  { key: "seo", label: "SEO", icon: Search },
  { key: "tracking", label: "Tracking", icon: Target },
  { key: "domains", label: "Domains", icon: Globe },
];

interface Toast {
  id: number;
  text: string;
}

export function PrestateStudio() {
  const searchParams = useSearchParams();
  const [module, setModule] = useState<ModuleKey>("builder");
  const [device, setDevice] = useState<Device>("desktop");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [pages, setPages] = useState<LandingPageData[]>(() => seedPages());
  const [activePageId, setActivePageId] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const apiRef = useRef<BuilderApi | null>(null);
  const toastId = useRef(0);

  useEffect(() => {
    const list = loadPages();
    setPages(list);
    const id = searchParams.get("id");
    const design = searchParams.get("design");
    if (id && list.some((p) => p.id === id)) {
      setActivePageId(id);
      setModule("builder");
      return;
    }
    if (design) {
      const match =
        list.find((p) => p.designId === design && (p.kind ?? "custom") === "preset") ??
        list.find((p) => p.designId === design);
      if (match) {
        setActivePageId(match.id);
        setModule("builder");
        return;
      }
    }
    window.location.replace("/superadmin/templates");
  }, [searchParams]);

  useEffect(() => {
    savePages(pages);
  }, [pages]);

  const toast = useCallback((text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  const activePage = pages.find((p) => p.id === activePageId);
  const scoped = activePage ? [activePage] : [];

  const persistPage = useCallback((pageId: string, sections: SectionInstance[], status?: LandingPageData["status"]) => {
    setPages((prev) => {
      const next = prev.map((p) =>
        p.id === pageId ? { ...p, sections, status: status ?? p.status, updated: "Just now" } : p,
      );
      savePages(next);
      return next;
    });
  }, []);

  const openLocalPreview = useCallback((pageId?: string) => {
    const id = pageId ?? activePageId;
    const list = loadPages();
    const page = list.find((p) => p.id === id) ?? pages.find((p) => p.id === id);
    if (!page) return;
    window.open(localPreviewPath(page), "_blank", "noopener,noreferrer");
  }, [pages, activePageId]);

  const assignDomain = useCallback((pageId: string, raw: string) => {
    const host = normalizeDomain(raw);
    if (!host || !isLikelyHostname(host)) {
      toast("Enter a hostname like auroraresidences.com");
      return false;
    }
    const clash = pages.find((p) => p.id !== pageId && normalizeDomain(p.domain) === host);
    if (clash) {
      toast(`“${host}” is already assigned to ${clash.name}`);
      return false;
    }
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== pageId) return p;
        const cfg = ensureConfig(p);
        const prevHost = normalizeDomain(p.domain);
        const canonical =
          !cfg.seo.canonical ||
          cfg.seo.canonical.includes("localhost") ||
          (prevHost && cfg.seo.canonical.includes(prevHost))
            ? `https://${host}`
            : cfg.seo.canonical;
        return {
          ...p,
          domain: host,
          updated: "Just now",
          config: { ...cfg, seo: { ...cfg.seo, canonical } },
        };
      }),
    );
    toast(`Assigned ${host} · /p/host/${host}`);
    return true;
  }, [pages, toast]);

  const clearDomain = useCallback((pageId: string) => {
    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, domain: "", updated: "Just now" } : p)));
    toast("Domain removed from this template");
  }, [toast]);

  const patchConfig = useCallback((pageId: string, recipe: (c: SiteConfig) => SiteConfig) => {
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, config: recipe(ensureConfig(p)), updated: "Just now" } : p)),
    );
  }, []);

  const patchPage = useCallback((pageId: string, patch: Partial<LandingPageData>) => {
    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, ...patch, updated: "Just now" } : p)));
  }, []);

  const renderModule = () => {
    switch (module) {
      case "builder":
        return activePage ? (
          <BuilderWorkspace
            page={activePage}
            device={device}
            setDevice={setDevice}
            apiRef={apiRef}
            onCapabilities={({ canUndo: u, canRedo: r }) => {
              setCanUndo(u);
              setCanRedo(r);
            }}
            onToast={toast}
            onPersist={(sections, status) => persistPage(activePage.id, sections, status)}
            onOpenLocalPreview={() => openLocalPreview(activePage.id)}
          />
        ) : (
          <div style={{ padding: 40, color: "var(--ps-muted)" }}>Create a landing page to start building.</div>
        );
      case "properties":
        return <PropertiesModule onToast={toast} />;
      case "forms":
        return activePage ? (
          <FormsModule
            site={activePage}
            pages={scoped}
            onSelectSite={() => {}}
            onPatch={(fn) => patchConfig(activePage.id, fn)}
            onToast={toast}
          />
        ) : null;
      case "brand":
        return activePage ? (
          <BrandModule
            site={activePage}
            pages={scoped}
            onSelectSite={() => {}}
            onPatch={(fn) => patchConfig(activePage.id, fn)}
            onToast={toast}
          />
        ) : null;
      case "headerfooter":
        return activePage ? (
          <HeaderFooterModule
            site={activePage}
            pages={scoped}
            onSelectSite={() => {}}
            onPatch={(fn) => patchConfig(activePage.id, fn)}
            onToast={toast}
          />
        ) : null;
      case "seo":
        return activePage ? (
          <SeoModule
            site={activePage}
            pages={scoped}
            onSelectSite={() => {}}
            onPatch={(fn) => patchConfig(activePage.id, fn)}
            onPatchPage={(patch) => patchPage(activePage.id, patch)}
            onToast={toast}
          />
        ) : null;
      case "tracking":
        return activePage ? (
          <TrackingModule
            site={activePage}
            pages={scoped}
            onSelectSite={() => {}}
            onPatch={(fn) => patchConfig(activePage.id, fn)}
            onToast={toast}
          />
        ) : null;
      case "domains":
        return activePage ? (
          <DomainsModule
            site={activePage}
            onToast={toast}
            onAssignDomain={assignDomain}
            onClearDomain={clearDomain}
            onPreview={(id) => openLocalPreview(id)}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "var(--ps-bg)" }}>
      <TopNav
        module={module}
        pageName={activePage?.name}
        pageStatus={module === "builder" ? activePage?.status : undefined}
        device={device}
        setDevice={setDevice}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => apiRef.current?.undo()}
        onRedo={() => apiRef.current?.redo()}
        onSave={() => apiRef.current?.save()}
        onPreview={() => apiRef.current?.preview()}
        onPublish={() => apiRef.current?.publish()}
        onUnpublish={() => apiRef.current?.unpublish()}
        onNotify={() => setNotifOpen(true)}
        onActivity={() => setActivityOpen(true)}
        onHelp={() => setHelpOpen(true)}
        onMenu={() => setNavOpen((v) => !v)}
        actions={
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ps-primary)", display: "inline-flex", alignItems: "center", gap: 7 }}>
            <Sparkles size={15} /> {MODULE_LABELS[module]}
          </span>
        }
      />

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Workspace rail */}
        <nav className="ps-rail" data-open={navOpen ? "true" : "false"}>
          <Link href="/superadmin/templates" title="Templates" className="ps-rail-btn">
            <LayoutTemplate size={19} />
            <span className="ps-rail-label">Templates</span>
          </Link>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = module === item.key;
            return (
              <button
                key={item.key}
                type="button"
                title={item.label}
                onClick={() => {
                  setModule(item.key);
                  setNavOpen(false);
                }}
                className="ps-rail-btn"
                data-active={active ? "true" : "false"}
              >
                <Icon size={19} />
                <span className="ps-rail-label">{item.label}</span>
              </button>
            );
          })}
          <div style={{ flex: 1 }} />
          <button type="button" title="Settings" className="ps-rail-btn" onClick={() => { setSettingsOpen(true); setNavOpen(false); }}>
            <Settings size={18} />
            <span className="ps-rail-label">Settings</span>
          </button>
        </nav>
        {navOpen ? <button type="button" className="ps-drawer-backdrop ps-nav-scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)} /> : null}

        {/* Module content */}
        <main className="ps-module-shell" style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>{renderModule()}</main>
      </div>

      {/* Toasts */}
      <div className="ps-toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className="ps-fade-in ps-toast">
            <CheckCircle2 size={16} style={{ color: "var(--ps-success)", flexShrink: 0, marginTop: 1 }} />
            <span style={{ flex: 1 }}>{t.text}</span>
            <button type="button" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} style={{ background: "none", border: "none", color: "var(--ps-muted)", cursor: "pointer", padding: 0, display: "inline-flex", flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Notifications panel */}
      <SlidePanel open={notifOpen} onClose={() => setNotifOpen(false)} title="Notifications" icon={<Bell size={16} />}>
        {NOTIFS.map((n, i) => (
          <NotifRow key={i} n={n} />
        ))}
      </SlidePanel>

      {/* Activity panel */}
      <SlidePanel open={activityOpen} onClose={() => setActivityOpen(false)} title="Activity feed" icon={<Clock size={16} />}>
        {ACTIVITY.map((a, i) => (
          <div key={i} style={{ display: "flex", gap: 11, padding: "10px 0", borderBottom: "1px solid var(--ps-line)", alignItems: "flex-start" }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: a.bg, color: a.color, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{a.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-ink)" }}>{a.text}</div>
              <div style={{ fontSize: 11, color: "var(--ps-muted)", marginTop: 1 }}>{a.time}</div>
            </div>
            {a.mention ? <span className="ps-chip" style={{ background: "var(--ps-primary-soft)", color: "var(--ps-primary)" }}>{a.mention}</span> : null}
          </div>
        ))}
      </SlidePanel>

      {/* AI panel */}
      <SlidePanel open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Workspace settings" icon={<Settings size={16} />}>
        <p style={{ fontSize: 13, color: "var(--ps-slate)", lineHeight: 1.65 }}>
          Workspace, billing and member roles stay in this panel. Changes apply to every landing page in the current workspace.
        </p>
        <button type="button" className="ps-topnav-btn" style={{ marginTop: 12 }} onClick={() => { setSettingsOpen(false); toast("Workspace preferences saved"); }}>
          Save preferences
        </button>
      </SlidePanel>

      <SlidePanel open={helpOpen} onClose={() => setHelpOpen(false)} title="Help center" icon={<Sparkles size={16} />}>
        <div style={{ fontSize: 13, color: "var(--ps-slate)", lineHeight: 1.7, display: "flex", flexDirection: "column", gap: 12 }}>
          <div><strong style={{ color: "var(--ps-ink)" }}>Builder</strong> — drag widgets, then Save Draft, Preview, Publish or Unpublish from the top bar.</div>
          <div><strong style={{ color: "var(--ps-ink)" }}>Preview</strong> — opens a real local page at /p/your-slug. Resize the window for mobile/tablet.</div>
          <div><strong style={{ color: "var(--ps-ink)" }}>Domains</strong> — assign auroraresidences.com (or any hostname) to a page, then open /p/host/auroraresidences.com.</div>
          <div><strong style={{ color: "var(--ps-ink)" }}>Pages</strong> — edit, duplicate, publish, unpublish, assign domain, or delete. Use the ⋯ menu on desktop or the action row on mobile.</div>
          <div><strong style={{ color: "var(--ps-ink)" }}>Templates</strong> — pick a template from the Templates page in Super Admin. Clicking one opens this builder.</div>
          <div><strong style={{ color: "var(--ps-ink)" }}>Settings</strong> — Brand, Header, SEO, Tracking, Forms and Domains apply only to the template selected in the scope bar.</div>
          <div><strong style={{ color: "var(--ps-ink)" }}>Shortcuts</strong> — Ctrl+S save, Ctrl+Z undo, Ctrl+Shift+Z redo.</div>
        </div>
      </SlidePanel>
    </div>
  );
}

function SlidePanel({
  open,
  onClose,
  title,
  icon,
  children,
  width = 360,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  width?: number;
}) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1500, background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)" }}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="ps-slide-in ps-slide-panel"
        style={{ width, maxWidth: "92vw" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "15px 18px", borderBottom: "1px solid var(--ps-line)", flexShrink: 0 }}>
          <span style={{ width: 32, height: 32, borderRadius: 10, background: "var(--ps-primary-soft)", color: "var(--ps-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--ps-ink)" }}>{title}</span>
          <button type="button" onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--ps-muted)", cursor: "pointer", padding: 6, display: "inline-flex" }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 18px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

function NotifRow({ n }: { n: (typeof NOTIFS)[number] }) {
  return (
    <div style={{ display: "flex", gap: 11, padding: "11px 0", borderBottom: "1px solid var(--ps-line)", alignItems: "flex-start" }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, background: n.bg, color: n.color, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-ink)", lineHeight: 1.4 }}>{n.text}</div>
        <div style={{ fontSize: 11, color: "var(--ps-muted)", marginTop: 2 }}>{n.time}</div>
      </div>
      {!n.read ? <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ps-primary)", flexShrink: 0, marginTop: 4 }} /> : null}
    </div>
  );
}

const NOTIFS = [
  { text: "A lead submitted the form on Aurora Residences — 2 min ago", time: "2 min ago", icon: <MessageCircle size={15} />, bg: "var(--ps-primary-soft)", color: "var(--ps-primary)", read: false },
  { text: "Your page “Serene Villas” was published successfully", time: "18 min ago", icon: <CheckCircle2 size={15} />, bg: "var(--ps-success-soft)", color: "var(--ps-success)", read: false },
  { text: "Payment of ₹40,000 received from Rohan K. for booking", time: "1 hr ago", icon: <CreditCard size={15} />, bg: "var(--ps-secondary-soft)", color: "var(--ps-secondary-dark)", read: true },
  { text: "SEO audit complete — 3 pages need meta descriptions", time: "3 hrs ago", icon: <Search size={15} />, bg: "#e8f1fe", color: "#2563eb", read: true },
  { text: "Domain luxury.clientdomain.com renewed for 1 year", time: "Yesterday", icon: <Globe size={15} />, bg: "#eef0f5", color: "var(--ps-slate)", read: true },
];

const ACTIVITY = [
  { text: "Aarav R. updated hero headline on Aurora Residences", time: "10:42 AM", icon: <PencilRuler size={14} />, bg: "var(--ps-primary-soft)", color: "var(--ps-primary)", mention: "Page" },
  { text: "Priya M. changed the lead form layout", time: "10:18 AM", icon: <MessageCircle size={14} />, bg: "var(--ps-secondary-soft)", color: "var(--ps-secondary-dark)", mention: "Form" },
  { text: "Aarav R. published “Serene Villas” to serenevillas.com", time: "9:47 AM", icon: <CheckCircle2 size={14} />, bg: "var(--ps-success-soft)", color: "var(--ps-success)", mention: "Publish" },
  { text: "System connected Razorpay payments", time: "9:02 AM", icon: <Plug size={14} />, bg: "#eef0f5", color: "var(--ps-slate)", mention: "Integration" },
  { text: "Priya M. imported 3,412 leads from Facebook Ads", time: "Yesterday", icon: <TrendingUp size={14} />, bg: "#e8f1fe", color: "#2563eb", mention: "Leads" },
];