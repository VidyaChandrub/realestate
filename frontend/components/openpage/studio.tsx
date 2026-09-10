"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import {
  Bell,
  CheckCircle2,
  Clock,
  PencilRuler,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import type { LandingPageData, ModuleKey, SiteConfig } from "@/lib/openpage/types";
import { loadTemplate, loadTemplates, saveTemplate, saveTemplateNow, createTemplate, publishLandingPage, unpublishLandingPage, type Resource } from "@/lib/openpage/store";
import { uploadBuilderImage } from "@/lib/openpage/persist";
import { BuilderUploadProvider, type BuilderImageUploader } from "@/components/openpage/builder/upload-context";
import { buildThankYouSections } from "@/lib/openpage/page-templates";
import { builderPath, templatePreviewPath } from "@/lib/openpage/paths";
import { cloneConfig, ensureConfig } from "@/lib/openpage/site-config";
import { TopNav } from "@/components/openpage/topnav";
import { EditorLayout } from "@/components/openpage/editor/EditorLayout";
import { OpenPageBridge } from "@/components/openpage/editor/OpenPageBridge";
import { PopupsModule } from "@/components/openpage/editor/PopupsModule";
import { SiteRenderer } from "@/components/openpage/renderer/SiteRenderer";
import { useConfigStore } from "@/components/openpage/store/configStore";
import { landingPageFromSite } from "@/lib/openpage/content";
import { FormsModule } from "@/components/openpage/modules/forms";
import { BrandModule } from "@/components/openpage/modules/brand";
import { HeaderFooterModule } from "@/components/openpage/modules/headerfooter";
import { SeoModule } from "@/components/openpage/modules/seo";
import { TypographyModule } from "@/components/openpage/modules/typography";

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
// entire org-builder integration: the OpenPage editor and the config modules
// are untouched, they just render whatever LandingPageData they're handed,
// regardless of which REST resource it came from.
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

export function OpenPageStudio({ resource = "template" }: { resource?: Resource }) {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || searchParams.get("returnTo") || null;
  const router = useRouter();
  const { user: authUser, logout } = useAuth();
  const [module, setModule] = useState<ModuleKey>("builder");
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
  const apiRef = useRef<{
    undo: () => void;
    redo: () => void;
    save: () => void;
    preview: () => void;
    publish: () => void;
    unpublish: () => void;
  } | null>(null);
  const toastId = useRef(0);
  // Lightweight (no content) index of every template — feeds FormsModule's
  // site-scope bar/thank-you-page lookup.
  const [allPages, setAllPages] = useState<LandingPageData[]>([]);

  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [pageReady, setPageReady] = useState(false);
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
      try {
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
      if (!cancelled) window.location.replace(returnUrl || HOME_PATH[resource]);
      } catch {
        if (!cancelled) window.location.replace(returnUrl || HOME_PATH[resource]);
      } finally {
        if (!cancelled) setPageReady(true);
      }
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
      }).catch(() => {
        if (!cancelled) setAllPages([]);
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
    }).catch(() => {
      if (!cancelled) setAllPages([]);
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
    (pageId: string, sections: LandingPageData["sections"], status?: LandingPageData["status"]) => {
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

  const persistOpenPage = useCallback(
    (next: LandingPageData) => {
      setActivePage(next);
      saveInBackground(next);
    },
    [saveInBackground],
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
    const next = landingPageFromSite(activePage, useConfigStore.getState().config);
    setActivePage(next);
    saveTemplateNow(next, "landing-page")
      .then(() => publishLandingPage(activePage.id))
      .then((updated) => {
        setActivePage((cur) =>
          cur && cur.id === updated.id
            ? { ...next, status: updated.status, updated: updated.updated, updatedAt: updated.updatedAt }
            : cur,
        );
        toast("Published");
        window.open(`/preview/${encodeURIComponent(activePage.id)}`, "_blank", "noopener,noreferrer");
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

  useEffect(() => {
    if (!inAppPreviewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInAppPreviewOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inAppPreviewOpen]);

  const openLocalPreview = useCallback(
    (pageId?: string) => {
      const page = !pageId || pageId === activePage?.id ? activePage : null;
      if (!page) return;
      const next = landingPageFromSite(page, useConfigStore.getState().config);
      setActivePage(next);
      saveTemplateNow(next, resource)
        .then(() => {
          const href =
            resource === "landing-page"
              ? `/preview/${encodeURIComponent(page.id)}`
              : templatePreviewPath(page.id);
          window.open(href, "_blank", "noopener,noreferrer");
        })
        .catch((err) => toast(err instanceof Error ? err.message : "Couldn't save preview"));
    },
    [activePage, resource, toast],
  );

  useEffect(() => {
    apiRef.current = {
      undo: () => useConfigStore.getState().undo(),
      redo: () => useConfigStore.getState().redo(),
      save: () => {
        if (!activePage) return;
        saveInBackground(landingPageFromSite(activePage, useConfigStore.getState().config));
        toast("Saved");
      },
      preview: () => openLocalPreview(activePage?.id),
      publish: () => {
        if (!activePage) return;
        const next = {
          ...landingPageFromSite(activePage, useConfigStore.getState().config),
          status: "published" as const,
        };
        setActivePage(next);
        saveTemplateNow(next, resource)
          .then(() => {
            toast("Published");
            window.open(templatePreviewPath(next.id), "_blank", "noopener,noreferrer");
          })
          .catch((err) => toast(err instanceof Error ? err.message : "Couldn't publish — try again"));
      },
      unpublish: () => {
        if (!activePage) return;
        persistOpenPage({
          ...landingPageFromSite(activePage, useConfigStore.getState().config),
          status: "unpublished",
        });
        toast("Unpublished");
      },
    };
    const syncCaps = () => {
      setCanUndo(useConfigStore.getState().canUndo());
      setCanRedo(useConfigStore.getState().canRedo());
    };
    syncCaps();
    return useConfigStore.subscribe(syncCaps);
  }, [activePage, saveInBackground, toast, openLocalPreview, persistOpenPage, resource]);

  const patchConfig = useCallback(
    (pageId: string, recipe: (c: SiteConfig) => SiteConfig) => {
      setActivePage((prev) => {
        if (!prev || prev.id !== pageId) return prev;
        const nextCfg = recipe(ensureConfig(prev));
        const next = { ...prev, config: nextCfg, updated: "Just now" };
        useConfigStore.getState().patchSite({ forms: nextCfg.forms as never });
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
          <div className="op-root" style={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
            <EditorLayout />
          </div>
        ) : (
          <div className="ps-studio-boot">{pageReady ? "This page could not be opened." : "Opening page…"}</div>
        );
      case "popups":
        return activePage ? (
          <PopupsModule site={activePage} onPatch={(fn) => patchConfig(activePage.id, fn)} onToast={toast} />
        ) : null;
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
      default:
        return null;
    }
  };

  // Builder image uploads go straight to R2 via a presigned URL (no more
  // base64 data URIs bloating `content`). Null until a page is active —
  // MediaPicker then falls back to its legacy inline behaviour.
  const pageId = activePage?.id;
  const imageUploader: BuilderImageUploader = pageId
    ? (file: File) => uploadBuilderImage(file, { id: pageId, resource })
    : null;

  return (
    <BuilderUploadProvider uploader={imageUploader}>
    {activePage ? <OpenPageBridge page={activePage} onPersist={persistOpenPage} /> : null}
    <div className="ps-studio-root">
      <TopNav
        module={module}
        setModule={setModule}
        pageName={activePage?.name}
        pageStatus={module === "builder" ? activePage?.status : undefined}
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
        homeHref={returnUrl || HOME_PATH[resource]}
        unsaved={hasUnsaved}
      />

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <main className="ps-studio-main" data-module={module}>{renderModule()}</main>
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
        <div style={{ padding: "24px 0", textAlign: "center", color: "var(--ps-muted)", fontSize: 12.5 }}>
          No notifications yet.
        </div>
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
          <div style={{ padding: "24px 0", textAlign: "center", color: "var(--ps-muted)", fontSize: 12.5 }}>No activity yet.</div>
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
              <div><strong style={{ color: "var(--ps-ink)" }}>Builder</strong> — drag widgets, then Save, Preview, Publish or Unpublish from the top bar.</div>
              <div><strong style={{ color: "var(--ps-ink)" }}>Preview</strong> — opens over this studio. Press Escape or Close to return to the canvas.</div>
              <div><strong style={{ color: "var(--ps-ink)" }}>Publishing</strong> — click Publish to make this page live, and Unpublish to take it down. No review step — you&apos;re in control.</div>
              <div><strong style={{ color: "var(--ps-ink)" }}>Pages</strong> — this page came from a template your organisation was assigned. Editing it never changes the shared template or any other organisation&apos;s copy.</div>
              <div><strong style={{ color: "var(--ps-ink)" }}>Settings</strong> — Brand, Header, SEO, Tracking and Forms apply only to this page. Open them from Page tools in the top bar.</div>
              <div><strong style={{ color: "var(--ps-ink)" }}>Shortcuts</strong> — Ctrl+S save, Ctrl+Z undo, Ctrl+Shift+Z redo, Ctrl+K quick add.</div>
            </>
          ) : (
            <>
              <div><strong style={{ color: "var(--ps-ink)" }}>Builder</strong> — drag widgets, then Save, Preview, Publish or Unpublish from the top bar.</div>
              <div><strong style={{ color: "var(--ps-ink)" }}>Preview</strong> — opens a new tab with the saved template preview. Use the device switcher on the canvas for mobile and tablet.</div>
              <div><strong style={{ color: "var(--ps-ink)" }}>Pages</strong> — edit, duplicate, publish, unpublish, or delete from Super Admin templates. Page tools in the top bar opens Brand, Forms, SEO and the rest.</div>
              <div><strong style={{ color: "var(--ps-ink)" }}>Templates</strong> — pick a template from the Templates page in Super Admin. Clicking one opens this builder.</div>
              <div><strong style={{ color: "var(--ps-ink)" }}>Settings</strong> — Brand, Header, SEO, Tracking and Forms apply only to the template selected in the scope bar.</div>
              <div><strong style={{ color: "var(--ps-ink)" }}>Shortcuts</strong> — Ctrl+S save, Ctrl+Z undo, Ctrl+Shift+Z redo, Ctrl+K quick add.</div>
            </>
          )}
        </div>
      </SlidePanel>

      {inAppPreviewOpen && activePage ? (
        <div className="ps-preview-overlay" role="dialog" aria-label="Page preview">
          <div
            style={{ background: "#fff", width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}
          >
            <div className="ps-preview-bar">
              <span style={{ fontWeight: 700, fontSize: 14 }}>{activePage.name}</span>
              <span style={{ fontSize: 12, color: "var(--ps-muted)" }}>Preview · Esc to close</span>
              <button
                type="button"
                onClick={() => setInAppPreviewOpen(false)}
                className="ps-topnav-icon-btn"
                style={{ marginLeft: "auto" }}
                title="Close preview"
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", background: "#f4f5f8" }}>
              <SiteRenderer
                site={useConfigStore.getState().config}
                live
                pageId={activePage.id}
                projectName={activePage.name}
                forms={useConfigStore.getState().config.forms as never}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </BuilderUploadProvider>
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
