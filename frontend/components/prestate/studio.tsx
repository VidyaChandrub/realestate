"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import {
  Bell,
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
  Type,
  X,
} from "lucide-react";
import type { Device, LandingPageData, ModuleKey, SectionInstance, SiteConfig } from "@/lib/prestate/types";
import { loadTemplate, loadTemplates, saveTemplate, createTemplate, publishLandingPage, unpublishLandingPage, type Resource } from "@/lib/prestate/store";
import { buildThankYouSections } from "@/lib/prestate/page-templates";
import { builderPath, localPreviewPath } from "@/lib/prestate/paths";
import { cloneConfig, ensureConfig } from "@/lib/prestate/site-config";
import { TopNav, MODULE_LABELS } from "@/components/prestate/topnav";
import { BuilderWorkspace, type BuilderApi } from "@/components/prestate/builder/workspace";
import { Canvas } from "@/components/prestate/builder/canvas";
import { FormsModule } from "@/components/prestate/modules/forms";
import { BrandModule } from "@/components/prestate/modules/brand";
import { HeaderFooterModule } from "@/components/prestate/modules/headerfooter";
import { SeoModule } from "@/components/prestate/modules/seo";
import { TrackingModule } from "@/components/prestate/modules/tracking";
import { TypographyModule } from "@/components/prestate/modules/typography";

const NAV_ITEMS: { key: ModuleKey; label: string; icon: React.ComponentType<{ size?: number | string }> }[] = [
  { key: "builder", label: "Builder", icon: PencilRuler },
  { key: "typography", label: "Typography & Fonts", icon: Type },
  { key: "forms", label: "Forms", icon: MessageCircle },
  { key: "brand", label: "Brand", icon: Palette },
  { key: "headerfooter", label: "Header & Footer", icon: PencilRuler },
  { key: "seo", label: "SEO", icon: Search },
  { key: "tracking", label: "Tracking", icon: Target },
];

interface Toast {
  id: number;
  text: string;
}

// GET /org/activity row — real AuditLog entries scoped to the caller's own
// org. Only wired up for resource: "landing-page" (the org session); the
// Super Admin builder keeps its illustrative ACTIVITY feed below since
// there's no single "org" to scope a real feed to there.
interface OrgActivityEntry {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  createdAt: string;
}

const ACTIVITY_LABELS: Record<string, string> = {
  landing_page_created: "Page created",
  landing_page_published: "Page published",
  landing_page_unpublished: "Page unpublished",
  org_onboarded: "Organisation onboarded",
  org_templates_updated: "Assigned templates updated",
  subscription_created: "Subscription started",
  subscription_updated: "Subscription updated",
};

function activityLabel(action: string): string {
  return ACTIVITY_LABELS[action] ?? action.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

// Which backend resource this session edits — a Super Admin Template
// (default) or an org's own LandingPage. Threading this through is the
// entire org-builder integration: BuilderWorkspace/Canvas/the widget
// modules are untouched, they just render whatever LandingPageData they're
// handed, regardless of which REST resource it came from.
const HOME_PATH: Record<Resource, string> = {
  template: "/admin-console/templates",
  "landing-page": "/org/landing-pages",
};

// Real destination for the TopNav profile menu's "Settings" item — differs
// by session, same split as HOME_PATH.
const SETTINGS_PATH: Record<Resource, string> = {
  template: "/admin-console/settings",
  "landing-page": "/org/settings",
};

function initialsFor(firstName: string | null | undefined, lastName: string | null | undefined): string {
  const parts = [firstName, lastName].filter(Boolean) as string[];
  if (parts.length === 0) return "—";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export function PrestateStudio({ resource = "template" }: { resource?: Resource }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user: authUser, logout } = useAuth();
  const [module, setModule] = useState<ModuleKey>("builder");
  const [device, setDevice] = useState<Device>("desktop");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [orgActivity, setOrgActivity] = useState<OrgActivityEntry[] | null>(null);
  const [orgActivityLoading, setOrgActivityLoading] = useState(false);
  const [activePage, setActivePage] = useState<LandingPageData | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const apiRef = useRef<BuilderApi | null>(null);
  const toastId = useRef(0);
  // Lightweight (no content) index of every template — feeds FormsModule's
  // site-scope bar/thank-you-page lookup.
  const [allPages, setAllPages] = useState<LandingPageData[]>([]);

  const [hasUnsaved, setHasUnsaved] = useState(false);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsaved]);

  useEffect(() => {
    let cancelled = false;
    const id = searchParams.get("id");
    const design = searchParams.get("design");

    (async () => {
      if (id) {
        const page = await loadTemplate(id, resource);
        if (cancelled) return;
        if (page) {
          setActivePage(page);
          setModule("builder");
          return;
        }
      }
      // ?design= lookup-by-design-id is a Template-only concept (org pages
      // are opened by their own id, never by a shared design id) — skip it
      // entirely for the org resource.
      if (design && resource === "template") {
        // Unreachable in practice today (nothing sets ?design=; builderPath()
        // only ever produces ?id=) but kept correct: a design could in theory
        // be a thank-you one, so search both pageTypes, not just landing.
        const [landing, thankYou] = await Promise.all([
          loadTemplates({ pageType: "landing" }),
          loadTemplates({ pageType: "thank-you" }),
        ]);
        if (cancelled) return;
        const list = [...landing, ...thankYou];
        const match =
          list.find((p) => p.designId === design && (p.kind ?? "custom") === "preset") ??
          list.find((p) => p.designId === design);
        if (match) {
          setActivePage(match);
          setModule("builder");
          return;
        }
      }
      if (!cancelled) window.location.replace(HOME_PATH[resource]);
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, resource]);

  useEffect(() => {
    let cancelled = false;
    if (resource === "landing-page") {
      // The org's own pages already come back as one list (both pageTypes
      // together) — no separate landing/thank-you calls needed.
      loadTemplates({ resource: "landing-page" }).then((pages) => {
        if (!cancelled) setAllPages(pages);
      });
      return () => {
        cancelled = true;
      };
    }
    // FormsModule needs both: its thank-you picker lists every thank-you
    // page in the workspace (not just this page's own companion), and the
    // scope bar / domain-collision check need every landing page.
    Promise.all([
      loadTemplates({ includeContent: false, pageType: "landing" }),
      loadTemplates({ includeContent: false, pageType: "thank-you" }),
    ]).then(([landing, thankYou]) => {
      if (!cancelled) setAllPages([...landing, ...thankYou]);
    });
    return () => {
      cancelled = true;
    };
  }, [activePage?.id, resource]);

  // Scoped to the page currently open in the builder — not the whole org's
  // feed, which would mix in every other page's history (including old
  // entries unrelated to what you're looking at right now). Fetches on
  // each open rather than once, so the feed is fresh.
  useEffect(() => {
    if (!activityOpen || resource !== "landing-page" || !activePage) return;
    let cancelled = false;
    setOrgActivityLoading(true);
    apiFetch<OrgActivityEntry[]>(`/org/activity?entityId=${encodeURIComponent(activePage.id)}`)
      .then((rows) => {
        if (!cancelled) setOrgActivity(rows);
      })
      .catch(() => {
        if (!cancelled) setOrgActivity([]);
      })
      .finally(() => {
        if (!cancelled) setOrgActivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activityOpen, resource, activePage?.id]);

  const toast = useCallback((text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  const scoped = activePage ? [activePage] : [];

  const railItems = NAV_ITEMS;

  // Fires the debounced single-record save and reconciles the server-derived
  // fields once it resolves, so a slow save can't clobber newer local edits
  // made in the meantime. Also syncs `status` from the response — for
  // landing pages the backend is the sole authority on whether this save
  // reverted a published page to draft (deep-equality diff against stored
  // content; see OrgLandingPagesService.update), so the client must reflect
  // whatever it actually decided, not guess ahead of it.
  const saveInBackground = useCallback(
    (next: LandingPageData) => {
      setHasUnsaved(true);
      void saveTemplate(next, resource)
        .then((saved) => {
          setActivePage((cur) =>
            cur && cur.id === saved.id ? { ...cur, status: saved.status, updated: saved.updated, updatedAt: saved.updatedAt } : cur,
          );
          setHasUnsaved(false);
        })
        .catch(() => { setHasUnsaved(false); toast("Couldn't save — check your connection"); });
    },
    [toast, resource],
  );

  const persistPage = useCallback(
    (pageId: string, sections: SectionInstance[], status?: LandingPageData["status"]) => {
      setActivePage((prev) => {
        if (!prev || prev.id !== pageId) return prev;
        // `status` is only passed by the explicit Publish/Unpublish buttons.
        // For templates: a plain content edit (autosave, no status passed)
        // on something already live or about to go live reverts it to
        // draft, guessed client-side — the Admin backend has no diff logic
        // of its own, so this is the only place that decision gets made.
        // For landing pages: never guess here. The backend does its own
        // deep-equality diff against stored content and decides for real;
        // saveInBackground syncs whatever it decides back into `status`
        // once the save resolves. Guessing "draft" here too would make an
        // unopened, unedited page flash to draft the instant any autosave
        // fires (e.g. from the legacy-widget migration on load), even when
        // the backend correctly leaves it published.
        const nextStatus =
          status ??
          (resource === "landing-page"
            ? prev.status
            : prev.status === "published" || prev.status === "scheduled"
              ? "draft"
              : prev.status);
        const next = { ...prev, sections, status: nextStatus, updated: "Just now" };
        saveInBackground(next);
        return next;
      });
    },
    [saveInBackground, resource],
  );

  // The org builder's direct Publish/Unpublish actions — real API calls,
  // not routed through BuilderApi.publish()/unpublish() like templates.
  // Those go through onPersist -> patchTemplate, which accepts a `status`
  // field; patchLandingPage deliberately doesn't (see its comment in
  // persist.ts), so landing pages need their own status-changing calls.
  // Only meaningful for resource: "landing-page" (see topNavPublish below,
  // the only caller).
  const publishPage = useCallback(() => {
    if (!activePage) return;
    publishLandingPage(activePage.id)
      .then((updated) => {
        setActivePage((cur) => (cur && cur.id === updated.id ? { ...cur, status: updated.status } : cur));
        toast("Published");
      })
      .catch((err) => toast(err instanceof Error ? err.message : "Couldn't publish — try again"));
  }, [activePage, toast]);

  const unpublishPage = useCallback(() => {
    if (!activePage) return;
    unpublishLandingPage(activePage.id)
      .then((updated) => {
        setActivePage((cur) => (cur && cur.id === updated.id ? { ...cur, status: updated.status } : cur));
        toast("Unpublished — page is no longer live");
      })
      .catch((err) => toast(err instanceof Error ? err.message : "Couldn't unpublish — try again"));
  }, [activePage, toast]);

  // What the Publish/Unpublish slot in TopNav shows and does, per resource.
  // Both resources now publish/unpublish directly — org pages just go
  // through their own endpoint instead of BuilderApi.
  const topNavPublish =
    resource === "landing-page"
      ? { label: "Publish", run: publishPage }
      : { label: "Publish", run: () => apiRef.current?.publish() };
  const topNavUnpublish =
    resource === "landing-page"
      ? { label: "Unpublish", run: unpublishPage }
      : { label: "Unpublish", run: () => apiRef.current?.unpublish() };

  const topNavUser = authUser
    ? {
        name: [authUser.first_name, authUser.last_name].filter(Boolean).join(" ") || authUser.email,
        email: authUser.email,
        initials: initialsFor(authUser.first_name, authUser.last_name),
      }
    : null;

  const handleSignOut = useCallback(() => {
    void logout().then(() => {
      router.push("/login");
      router.refresh();
    });
  }, [logout, router]);

  const [inAppPreviewOpen, setInAppPreviewOpen] = useState(false);

  const openLocalPreview = useCallback(
    (pageId?: string) => {
      const page = !pageId || pageId === activePage?.id ? activePage : null;
      if (!page) return;
      // /p/[slug] only works for Templates — slugs there are globally
      // unique. A LandingPage's slug is only unique per-org, and public
      // serving of org pages is out of scope, so there's no route that
      // could resolve one anyway. Preview in-app instead of opening a tab
      // that would 403/404.
      if (resource === "landing-page") {
        setInAppPreviewOpen(true);
        return;
      }
      window.open(localPreviewPath(page), "_blank", "noopener,noreferrer");
    },
    [activePage, resource],
  );

  const patchConfig = useCallback(
    (pageId: string, recipe: (c: SiteConfig) => SiteConfig) => {
      setActivePage((prev) => {
        if (!prev || prev.id !== pageId) return prev;
        const next = { ...prev, config: recipe(ensureConfig(prev)), updated: "Just now" };
        saveInBackground(next);
        return next;
      });
    },
    [saveInBackground],
  );

  const patchPage = useCallback(
    (pageId: string, patch: Partial<LandingPageData>) => {
      setActivePage((prev) => {
        if (!prev || prev.id !== pageId) return prev;
        const next = { ...prev, ...patch, updated: "Just now" };
        saveInBackground(next);
        return next;
      });
    },
    [saveInBackground],
  );

  const renderModule = () => {
    switch (module) {
      case "builder":
        return activePage ? (
          <BuilderWorkspace
            page={activePage}
            device={device}
            setDevice={setDevice}
            apiRef={apiRef}
            resource={resource}
            onCapabilities={({ canUndo: u, canRedo: r }) => {
              setCanUndo(u);
              setCanRedo(r);
            }}
            onToast={toast}
            onPersist={(sections, status) => persistPage(activePage.id, sections, status)}
            onPatchConfig={(recipe) => patchConfig(activePage.id, recipe)}
            onOpenLocalPreview={() => openLocalPreview(activePage.id)}
          />
        ) : (
          <div style={{ padding: 40, color: "var(--ps-muted)" }}>Create a landing page to start building.</div>
        );
      case "forms":
        return activePage ? (
          <FormsModule
            site={activePage}
            pages={allPages}
            onSelectSite={() => {}}
            onPatch={(fn) => patchConfig(activePage.id, fn)}
            onToast={toast}
            onCreateThankYouPage={
              // Ad-hoc thank-you creation writes a new platform Template row
              // — never available for an org's own landing pages. An org
              // page's companion (if any) was copied alongside it at
              // creation time; there's no "add one later" flow here.
              resource === "landing-page" ||
              allPages.some((p) => p.pageType === "thank-you" && p.parentPageId === activePage.id)
                ? undefined
                : () => {
                    void createTemplate({
                      name: `${ensureConfig(activePage).brand.name} — Thank You`,
                      slug: `${activePage.slug}-thanks`,
                      designId: "tpl-thankyou",
                      template: "Thank You Page",
                      status: activePage.status === "published" ? "published" : "draft",
                      kind: "custom",
                      pageType: "thank-you",
                      parentPageId: activePage.id,
                      thumbnail: activePage.thumbnail,
                      sections: buildThankYouSections(),
                      config: cloneConfig(ensureConfig(activePage)),
                    }).then((created) => {
                      toast("Thank You page created — opening in builder");
                      window.location.assign(builderPath(created.id));
                    });
                  }
            }
          />
        ) : null;
      case "typography":
        return activePage ? (
          <TypographyModule
            site={activePage}
            pages={scoped}
            onSelectSite={() => {}}
            onPatch={(fn) => patchConfig(activePage.id, fn)}
            onToast={toast}
            resource={resource}
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
        onPublish={topNavPublish.run}
        publishLabel={topNavPublish.label}
        onUnpublish={topNavUnpublish.run}
        unpublishLabel={topNavUnpublish.label}
        onNotify={() => setNotifOpen(true)}
        onActivity={() => setActivityOpen(true)}
        onHelp={() => setHelpOpen(true)}
        user={topNavUser}
        onSignOut={handleSignOut}
        settingsHref={SETTINGS_PATH[resource]}
        homeHref={HOME_PATH[resource]}
        actions={
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ps-primary)", display: "inline-flex", alignItems: "center", gap: 7 }}>
            <Sparkles size={15} /> {MODULE_LABELS[module]}
          </span>
        }
      />

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Module content */}
        <main className="ps-module-shell" style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>{renderModule()}</main>
      </div>

      {/* Fixed bottom navigation */}
      <nav className="ps-bottombar" aria-label="Studio modules">
        <Link href={HOME_PATH[resource]} title="Back" className="ps-rail-btn ps-bb-item">
          <LayoutTemplate size={18} />
          <span className="ps-rail-label">{resource === "landing-page" ? "My Pages" : "Templates"}</span>
        </Link>
        {railItems.map((item) => {
          const Icon = item.icon;
          const active = module === item.key;
          return (
            <button
              key={item.key}
              type="button"
              title={item.label}
              onClick={() => setModule(item.key)}
              className="ps-rail-btn ps-bb-item"
              data-active={active ? "true" : "false"}
            >
              <Icon size={18} />
              <span className="ps-rail-label">{item.label}</span>
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button type="button" title="Settings" className="ps-rail-btn ps-bb-item" onClick={() => setSettingsOpen(true)}>
          <Settings size={18} />
          <span className="ps-rail-label">Settings</span>
        </button>
      </nav>

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
        {resource === "landing-page" ? (
          orgActivityLoading && !orgActivity ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: "var(--ps-muted)", fontSize: 12.5 }}>Loading…</div>
          ) : !orgActivity || orgActivity.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: "var(--ps-muted)", fontSize: 12.5 }}>No activity yet.</div>
          ) : (
            orgActivity.map((entry) => (
              <div key={entry.id} style={{ display: "flex", gap: 11, padding: "10px 0", borderBottom: "1px solid var(--ps-line)", alignItems: "flex-start" }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: "var(--ps-primary-soft)", color: "var(--ps-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <PencilRuler size={14} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-ink)" }}>{activityLabel(entry.action)}</div>
                  <div style={{ fontSize: 11, color: "var(--ps-muted)", marginTop: 1 }}>{new Date(entry.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))
          )
        ) : (
          ACTIVITY.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 11, padding: "10px 0", borderBottom: "1px solid var(--ps-line)", alignItems: "flex-start" }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: a.bg, color: a.color, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{a.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-ink)" }}>{a.text}</div>
                <div style={{ fontSize: 11, color: "var(--ps-muted)", marginTop: 1 }}>{a.time}</div>
              </div>
              {a.mention ? <span className="ps-chip" style={{ background: "var(--ps-primary-soft)", color: "var(--ps-primary)" }}>{a.mention}</span> : null}
            </div>
          ))
        )}
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
          {resource === "landing-page" ? (
            <>
              <div><strong style={{ color: "var(--ps-ink)" }}>Builder</strong> — drag widgets, then Save Draft, Preview, Publish or Unpublish from the top bar.</div>
              <div><strong style={{ color: "var(--ps-ink)" }}>Preview</strong> — opens a real local page at /p/your-slug. Resize the window for mobile/tablet.</div>
              <div><strong style={{ color: "var(--ps-ink)" }}>Publishing</strong> — click Publish to make this page live, and Unpublish to take it down. No review step — you&apos;re in control.</div>
              <div><strong style={{ color: "var(--ps-ink)" }}>Pages</strong> — this page came from a template your organisation was assigned. Editing it never changes the shared template or any other organisation&apos;s copy.</div>
              <div><strong style={{ color: "var(--ps-ink)" }}>Settings</strong> — Brand, Header, SEO, Tracking and Forms apply only to this page.</div>
              <div><strong style={{ color: "var(--ps-ink)" }}>Shortcuts</strong> — Ctrl+S save, Ctrl+Z undo, Ctrl+Shift+Z redo.</div>
            </>
          ) : (
            <>
              <div><strong style={{ color: "var(--ps-ink)" }}>Builder</strong> — drag widgets, then Save Draft, Preview, Publish or Unpublish from the top bar.</div>
              <div><strong style={{ color: "var(--ps-ink)" }}>Preview</strong> — opens a real local page at /p/your-slug. Resize the window for mobile/tablet.</div>
              <div><strong style={{ color: "var(--ps-ink)" }}>Pages</strong> — edit, duplicate, publish, unpublish, or delete. Use the ⋯ menu on desktop or the action row on mobile.</div>
              <div><strong style={{ color: "var(--ps-ink)" }}>Templates</strong> — pick a template from the Templates page in Super Admin. Clicking one opens this builder.</div>
              <div><strong style={{ color: "var(--ps-ink)" }}>Settings</strong> — Brand, Header, SEO, Tracking and Forms apply only to the template selected in the scope bar.</div>
              <div><strong style={{ color: "var(--ps-ink)" }}>Shortcuts</strong> — Ctrl+S save, Ctrl+Z undo, Ctrl+Shift+Z redo.</div>
            </>
          )}
        </div>
      </SlidePanel>

      {inAppPreviewOpen && activePage ? (
        <div
          style={{ position: "fixed", inset: 0, background: "#0f172a", display: "flex", flexDirection: "column", zIndex: 600 }}
          onClick={() => setInAppPreviewOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid var(--ps-border, #e5e7eb)", flexShrink: 0 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{activePage.name}</span>
              <button
                type="button"
                onClick={() => setInAppPreviewOpen(false)}
                style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--ps-muted, #64748b)", cursor: "pointer", display: "inline-flex", padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", background: "#f4f5f8" }}>
              {(() => {
                const cfg = ensureConfig(activePage);
                return (
                  <div className="ps-app">
                    <Canvas
                      sections={activePage.sections}
                      selectedId={null}
                      device="desktop"
                      readOnly
                      live
                      pageId={activePage.id}
                      theme={{
                        primary: cfg.brand.primary,
                        accent: cfg.brand.accent,
                        font: cfg.brand.bodyFont,
                        headingFont: cfg.brand.headingFont,
                        name: cfg.brand.name,
                        phone: cfg.brand.phone,
                        logo: cfg.brand.logo,
                      }}
                      form={cfg.form}
                      chrome={{ header: cfg.header, footer: cfg.footer, brand: cfg.brand }}
                      onSelect={() => {}}
                      onMutate={() => {}}
                    />
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      ) : null}
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