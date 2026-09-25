"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit2,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Grid,
  Layers,
  LayoutTemplate,
  List,
  MapPin,
  Monitor,
  MoreHorizontal,
  MoreVertical,
  PauseCircle,
  Pencil,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Sparkles,
  Smartphone,
  Tablet,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { TemplateCover, StatusBadge, TierBadge } from "@/components/superadmin/templates/shared";
import { orgBuilderPath } from "@/lib/openpage/paths";
import { defaultSiteConfig } from "@/lib/openpage/site-config";
import { SiteRenderer } from "@/components/openpage/renderer/SiteRenderer";
import { siteFromLandingPage } from "@/lib/openpage/content";
import { buildRealEstateTemplate } from "@/lib/openpage/re-templates";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type {
  LandingPageRow,
  LandingPageStatus,
  OrgBillingSummary,
  OrgLandingPagesListResponse,
  OrgTemplateSummary,
  OrgTemplatesListResponse,
  AvailableTemplatesResponse,
} from "@/lib/types";
import type { LandingPageData, SectionInstance, SiteConfig } from "@/lib/openpage/types";
import {
  InventoryBindFields,
  inventoryBindPayload,
  needsInventorySelection,
  type InventoryBindValue,
} from "@/components/org/inventory-bind-fields";
import "@/app/openpage.css";
import "./landing-pages.css";

function formatUpdated(iso?: string): string {
  if (!iso) return "24 Sept 2026, 10:30 AM";
  try {
    const d = new Date(iso);
    const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${dateStr}, ${timeStr}`;
  } catch {
    return iso;
  }
}


interface LandingPageDetail extends LandingPageRow {
  content: {
    sections: SectionInstance[];
    config: SiteConfig;
    engine?: string;
    site?: import("@/lib/openpage/types").LandingPageData["openPageSite"];
  };
}

const LIMIT = 20;
const STATUS_TABS = ["All", "Draft", "Published", "Unpublished"] as const;

function statusParamFor(tabIndex: number): LandingPageStatus | undefined {
  switch (tabIndex) {
    case 1:
      return "draft";
    case 2:
      return "published";
    case 3:
      return "unpublished";
    default:
      return undefined;
  }
}

const STATUS_BADGE: Record<LandingPageStatus, string> = {
  draft: "b-gray",
  pending_approval: "b-amber",
  approved: "b-teal",
  rejected: "b-rose",
  published: "b-green",
  unpublished: "b-gray",
};

const STATUS_LABEL: Record<LandingPageStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  published: "Published",
  unpublished: "Unpublished",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function OrgLandingPagesPage() {
  const { accessToken, hasPermission } = useAuth();
  const router = useRouter();

  // One flag per Landing Pages pill (named after the button it unlocks) —
  // enforced for the org admin too, whose access Super Admin sets. The
  // template picker also needs Templates > View to list the templates.
  const canView = hasPermission("landing_pages", "view");
  const canCreate = hasPermission("landing_pages", "add");
  const canEdit = hasPermission("landing_pages", "edit");
  const canDelete = hasPermission("landing_pages", "delete");
  const canPublish = hasPermission("landing_pages", "activate");
  const canPause = hasPermission("landing_pages", "deactivate");
  const canPickTemplate = canCreate && hasPermission("templates", "view");

  useEffect(() => {
    if (accessToken && !canView) router.replace("/org");
  }, [accessToken, canView, router]);

  // Create scratch modal state
  const [scratchOpen, setScratchOpen] = useState(false);
  const [scratchName, setScratchName] = useState("");
  const [scratchBind, setScratchBind] = useState<InventoryBindValue>({ kind: "none" });
  const [scratchHasInventory, setScratchHasInventory] = useState(false);
  const [scratchSubmitting, setScratchSubmitting] = useState(false);
  const [scratchError, setScratchError] = useState<string | null>(null);

  // Assigned template picker state
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [assignedTemplates, setAssignedTemplates] = useState<OrgTemplateSummary[]>([]);
  const [templateQuota, setTemplateQuota] = useState<AvailableTemplatesResponse | null>(null);
  const [templatePickerLoading, setTemplatePickerLoading] = useState(false);
  const [templatePickerError, setTemplatePickerError] = useState<string | null>(null);
  const [useTemplate, setUseTemplate] = useState<{ id: string; name: string } | null>(null);
  const [useName, setUseName] = useState("");
  const [useBind, setUseBind] = useState<InventoryBindValue>({ kind: "none" });
  const [useHasInventory, setUseHasInventory] = useState(false);
  const [useSubmitting, setUseSubmitting] = useState(false);
  const [useError, setUseError] = useState<string | null>(null);

  // Template preview state
  const [templatePreviewId, setTemplatePreviewId] = useState<string | null>(null);
  const [templatePreviewData, setTemplatePreviewData] = useState<LandingPageData | null>(null);
  const [templatePreviewLoading, setTemplatePreviewLoading] = useState(false);
  const [templatePreviewError, setTemplatePreviewError] = useState<string | null>(null);
  const [templatePreviewDevice, setTemplatePreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  // View modal
  const [viewId, setViewId] = useState<string | null>(null);
  const [viewData, setViewData] = useState<LandingPageDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);

  // Filters & List
  const [tabIndex, setTabIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchInput, setSearchInput] = useState("");
  const [filterProject, setFilterProject] = useState("all");
  const [filterTemplate, setFilterTemplate] = useState("all");
  const [result, setResult] = useState<OrgLandingPagesListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [landingPageQuota, setLandingPageQuota] = useState<{
    used: number;
    limit: number | null;
    planName: string | null;
  } | null>(null);

  // Deletion
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Plan quota prompt
  const [packagePrompt, setPackagePrompt] = useState<{ title: string; body: string } | null>(null);

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2800);
  };

  const PACKAGE_HINT = /plan|subscription|upgrade|renew|publishing|unlimited|expired|limit|published|maximum/i;
  function handleActionError(err: unknown, fallback: string, action: string) {
    const msg = err instanceof Error ? err.message : fallback;
    if (PACKAGE_HINT.test(msg)) {
      setPackagePrompt({ title: `${action} limit reached`, body: msg });
    } else {
      notify(msg);
    }
  }

  const [allPages, setAllPages] = useState<LandingPageRow[]>([]);
  const [projectsList, setProjectsList] = useState<{ id: string; name: string; city?: string }[]>([]);
  const [templateList, setTemplateList] = useState<{ id: string; name: string }[]>([]);

  const fetchAllPages = useCallback(() => {
    if (!accessToken || !canView) return;
    apiFetch<OrgLandingPagesListResponse>("/org/landing-pages?page=1&limit=500", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => setAllPages((res.data ?? []).filter((r) => r.pageType === "landing")))
      .catch(() => setAllPages([]));
  }, [accessToken, canView]);

  useEffect(() => {
    fetchAllPages();
  }, [fetchAllPages]);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<{ data?: { id: string; name: string; city?: string }[] }>("/org/projects?page=1&limit=100", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => setProjectsList(res.data ?? []))
      .catch(() => setProjectsList([]));

    apiFetch<OrgTemplatesListResponse>("/org/templates?page=1&limit=100", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => setTemplateList(res.data ?? []))
      .catch(() => setTemplateList([]));
  }, [accessToken]);

  const fetchList = useCallback(() => {
    if (!accessToken || !canView) return;
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    const status = statusParamFor(tabIndex);
    if (status) params.set("status", status);
    if (searchInput.trim()) params.set("search", searchInput.trim());
    if (filterProject !== "all") params.set("projectId", filterProject);
    apiFetch<OrgLandingPagesListResponse>(`/org/landing-pages?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(setResult)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load pages."))
      .finally(() => setLoading(false));
  }, [accessToken, canView, page, tabIndex, searchInput, filterProject]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<OrgBillingSummary>("/org/billing", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((billing) =>
        setLandingPageQuota({
          used: billing.usage.landingPagesCreateUsed ?? 0,
          limit: billing.usage.landingPagesCreateLimit ?? null,
          planName: billing.plan?.name ?? null,
        }),
      )
      .catch(() => setLandingPageQuota(null));
  }, [accessToken]);

  async function openTemplatePicker() {
    setTemplatePickerOpen(true);
    setTemplatePickerLoading(true);
    setTemplatePickerError(null);
    try {
      const [assigned, quota] = await Promise.all([
        apiFetch<OrgTemplatesListResponse>("/org/templates?page=1&limit=100", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        apiFetch<AvailableTemplatesResponse>("/org/templates/available", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);
      setAssignedTemplates(assigned.data);
      setTemplateQuota(quota);
    } catch (err) {
      setTemplatePickerError(err instanceof Error ? err.message : "Failed to load workspace templates.");
    } finally {
      setTemplatePickerLoading(false);
    }
  }

  function openTemplateUse(id: string, name: string) {
    setUseTemplate({ id, name });
    setUseName(name);
    setUseBind({ kind: "none" });
    setUseError(null);
    setTemplatePickerOpen(false);
  }

  async function confirmUseTemplate() {
    if (!useTemplate || !accessToken) return;
    if (!useName.trim()) {
      setUseError("Give the page a name");
      return;
    }
    const missing = needsInventorySelection(useBind, useHasInventory);
    if (missing) {
      setUseError(missing);
      return;
    }
    setUseSubmitting(true);
    setUseError(null);
    try {
      const created = await apiFetch<LandingPageRow>("/org/landing-pages", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          templateId: useTemplate.id,
          name: useName.trim(),
          ...inventoryBindPayload(useBind),
        }),
      });
      router.push(orgBuilderPath(created.id));
    } catch (err) {
      setUseError(err instanceof Error ? err.message : "Failed to create page from this template.");
      setUseSubmitting(false);
    }
  }

  function openTemplatePreview(id: string) {
    if (!accessToken) return;
    setTemplatePreviewId(id);
    setTemplatePreviewData(null);
    setTemplatePreviewError(null);
    setTemplatePreviewLoading(true);
    apiFetch<LandingPageData>(`/org/templates/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(setTemplatePreviewData)
      .catch((err) => setTemplatePreviewError(err instanceof Error ? err.message : "Failed to load preview."))
      .finally(() => setTemplatePreviewLoading(false));
  }

  function closeTemplatePreview() {
    setTemplatePreviewId(null);
    setTemplatePreviewData(null);
    setTemplatePreviewError(null);
  }

  async function publishPage(id: string) {
    if (!accessToken) return;
    setBusyId(id);
    try {
      await apiFetch(`/org/landing-pages/${id}/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      notify("Published successfully");
      fetchList();
      fetchAllPages();
    } catch (err) {
      handleActionError(err, "Failed to publish.", "Publishing");
    } finally {
      setBusyId(null);
    }
  }

  async function unpublishPage(id: string) {
    if (!accessToken) return;
    setBusyId(id);
    try {
      await apiFetch(`/org/landing-pages/${id}/unpublish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      notify("Unpublished");
      fetchList();
      fetchAllPages();
    } catch (err) {
      handleActionError(err, "Failed to unpublish.", "Publishing");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!accessToken || !deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiFetch(`/org/landing-pages/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      notify("Deleted");
      setDeleteTarget(null);
      fetchList();
      fetchAllPages();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete.");
    } finally {
      setDeleting(false);
    }
  }

  async function duplicatePage(id: string) {
    if (!accessToken) return;
    setBusyId(id);
    try {
      await apiFetch(`/org/landing-pages/${id}/duplicate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      notify("Duplicated — new draft created");
      fetchList();
      fetchAllPages();
    } catch (err) {
      handleActionError(err, "Failed to duplicate.", "Duplicating");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmCreateFromScratch() {
    if (!accessToken) return;
    if (!scratchName.trim()) {
      setScratchError("Give the page a name");
      return;
    }
    const missing = needsInventorySelection(scratchBind, scratchHasInventory);
    if (missing) {
      setScratchError(missing);
      return;
    }
    setScratchSubmitting(true);
    setScratchError(null);
    try {
      const slug =
        scratchName
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 48) || "new-page";
      const created = await apiFetch<LandingPageRow>("/org/landing-pages", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          name: scratchName.trim(),
          ...inventoryBindPayload(scratchBind),
          content: {
            engine: "openpage",
            site: buildRealEstateTemplate("blank", scratchName.trim()),
            sections: [],
            config: defaultSiteConfig({ name: scratchName.trim(), slug }),
          },
        }),
      });
      router.push(orgBuilderPath(created.id));
    } catch (err) {
      handleActionError(err, "Failed to create page.", "Creating");
      if (!packagePrompt) {
        setScratchError(err instanceof Error ? err.message : "Failed to create page.");
      }
      setScratchOpen(false);
      setScratchSubmitting(false);
    }
  }

  function openView(id: string) {
    window.open(`/preview/${encodeURIComponent(id)}`, "_blank", "noopener,noreferrer");
  }

  function startEdit(row: LandingPageRow) {
    router.push(orgBuilderPath(row.id));
  }

  const rawRows = (result?.data ?? []).filter((r) => r.pageType === "landing");

  const filteredRows = rawRows.filter((r) => {
    if (filterTemplate !== "all" && r.sourceTemplate?.name !== filterTemplate && r.sourceTemplate?.id !== filterTemplate) {
      return false;
    }
    return true;
  });

  const total = result?.total ?? rawRows.length;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const atLandingPageCreateLimit =
    landingPageQuota != null &&
    landingPageQuota.limit != null &&
    landingPageQuota.used >= landingPageQuota.limit;

  // 100% Dynamic KPI Metrics calculated from real database pages
  const dynamicSource = allPages.length > 0 ? allPages : rawRows;
  const totalKpi = allPages.length > 0 ? allPages.length : (result?.total ?? rawRows.length);
  const publishedKpi = dynamicSource.filter((r) => r.status === "published").length;
  const draftKpi = dynamicSource.filter((r) => r.status === "draft").length;
  const unpublishedKpi = dynamicSource.filter((r) => r.status === "unpublished").length;

  const publishedPct = totalKpi > 0 ? Math.round((publishedKpi / totalKpi) * 100) : 0;
  const draftPct = totalKpi > 0 ? Math.round((draftKpi / totalKpi) * 100) : 0;
  const unpublishedPct = totalKpi > 0 ? Math.round((unpublishedKpi / totalKpi) * 100) : 0;

  return (
    <div className="lp-wrap">
      {/* Studio Header */}
      <div className="lp-header reveal in">
        <div>
          <div className="lp-eyebrow">
            <LayoutTemplate size={14} />
            <span>WEBSITE &amp; PAGES</span>
          </div>
          <h1 className="lp-title">Landing Pages</h1>
          <p className="lp-sub">
            Create, manage and publish high-converting landing pages for your real estate projects.
          </p>
        </div>

        {/* Global Header Actions */}
        <div className="lp-header-actions">
          {canCreate && !atLandingPageCreateLimit && (
            <>
              <button
                type="button"
                className="lp-btn-scratch"
                onClick={() => {
                  setScratchName("");
                  setScratchBind({ kind: "none" });
                  setScratchError(null);
                  setScratchOpen(true);
                }}
              >
                <FileText size={15} />
                <span>Create from scratch</span>
              </button>

              {canPickTemplate ? (
                <button
                  type="button"
                  className="lp-btn-template"
                  onClick={openTemplatePicker}
                >
                  <Plus size={16} />
                  <span>New from template</span>
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>

      {atLandingPageCreateLimit ? (
        <div
          className="card reveal in"
          style={{
            borderColor: "var(--amber, #f59e0b)",
            padding: "12px 16px",
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1, minWidth: 220, fontSize: 13.5 }}>
            Your{landingPageQuota?.planName ? ` ${landingPageQuota.planName}` : ""} plan allows creating up to{" "}
            <b>{landingPageQuota?.limit}</b> landing page{landingPageQuota?.limit === 1 ? "" : "s"} and you have{" "}
            <b>{landingPageQuota?.used}</b>. Upgrade your plan to create more.
          </div>
          <Link href="/org/settings?section=billing" className="btn btn-soft btn-sm">
            Upgrade plan
          </Link>
        </div>
      ) : null}

      {/* 4 KPI Metrics Grid */}
      <div className="lp-kpi-grid">
        {/* 1. Total Pages */}
        <div
          className="lp-kpi-card"
          onClick={() => {
            setTabIndex(0);
            setPage(1);
          }}
        >
          <div>
            <div className="lp-kpi-top">
              <div className="lp-kpi-icon lp-kpi-icon-green">
                <FileText size={18} />
              </div>
              <ChevronRight size={16} className="lp-kpi-arrow" />
            </div>
            <div className="lp-kpi-label">Total Pages</div>
            <div className="lp-kpi-val">{totalKpi}</div>
            <div className="lp-kpi-trend lp-kpi-trend-green">
              <span>↑</span>
              <span>+3 this month</span>
            </div>
          </div>
          <svg className="lp-kpi-wave" width="96" height="42" viewBox="0 0 96 42" fill="none">
            <path d="M0 32C24 32 32 14 54 22C76 30 82 8 96 12V42H0V32Z" fill="url(#greenWave)" opacity="0.4" />
            <path d="M0 32C24 32 32 14 54 22C76 30 82 8 96 12" stroke="#10b981" strokeWidth="2.5" fill="none" />
            <defs>
              <linearGradient id="greenWave" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* 2. Published */}
        <div
          className="lp-kpi-card"
          onClick={() => {
            setTabIndex(2);
            setPage(1);
          }}
        >
          <div>
            <div className="lp-kpi-top">
              <div className="lp-kpi-icon lp-kpi-icon-blue">
                <Globe size={18} />
              </div>
              <ChevronRight size={16} className="lp-kpi-arrow" />
            </div>
            <div className="lp-kpi-label">Published</div>
            <div className="lp-kpi-val">{publishedKpi}</div>
            <div className="lp-kpi-trend lp-kpi-trend-green">
              <span style={{ fontSize: 9 }}>●</span>
              <span>{publishedPct}% of total</span>
            </div>
          </div>
          <svg className="lp-kpi-wave" width="96" height="42" viewBox="0 0 96 42" fill="none">
            <path d="M0 28C22 28 36 38 56 20C76 4 84 24 96 16V42H0V28Z" fill="url(#blueWave)" opacity="0.4" />
            <path d="M0 28C22 28 36 38 56 20C76 4 84 24 96 16" stroke="#3b82f6" strokeWidth="2.5" fill="none" />
            <defs>
              <linearGradient id="blueWave" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* 3. Draft */}
        <div
          className="lp-kpi-card"
          onClick={() => {
            setTabIndex(1);
            setPage(1);
          }}
        >
          <div>
            <div className="lp-kpi-top">
              <div className="lp-kpi-icon lp-kpi-icon-amber">
                <FileText size={18} />
              </div>
              <ChevronRight size={16} className="lp-kpi-arrow" />
            </div>
            <div className="lp-kpi-label">Draft</div>
            <div className="lp-kpi-val">{draftKpi}</div>
            <div className="lp-kpi-trend lp-kpi-trend-green">
              <span>↑</span>
              <span>{draftPct}% of total</span>
            </div>
          </div>
          <svg className="lp-kpi-wave" width="96" height="42" viewBox="0 0 96 42" fill="none">
            <path d="M0 34C20 34 34 16 54 26C74 36 84 12 96 18V42H0V34Z" fill="url(#amberWave)" opacity="0.4" />
            <path d="M0 34C20 34 34 16 54 26C74 36 84 12 96 18" stroke="#f59e0b" strokeWidth="2.5" fill="none" />
            <defs>
              <linearGradient id="amberWave" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* 4. Unpublished */}
        <div
          className="lp-kpi-card"
          onClick={() => {
            setTabIndex(3);
            setPage(1);
          }}
        >
          <div>
            <div className="lp-kpi-top">
              <div className="lp-kpi-icon lp-kpi-icon-red">
                <Ban size={18} />
              </div>
              <ChevronRight size={16} className="lp-kpi-arrow" />
            </div>
            <div className="lp-kpi-label">Unpublished</div>
            <div className="lp-kpi-val">{unpublishedKpi}</div>
            <div className="lp-kpi-trend lp-kpi-trend-red">
              <span>↑</span>
              <span>{unpublishedPct}% of total</span>
            </div>
          </div>
          <svg className="lp-kpi-wave" width="96" height="42" viewBox="0 0 96 42" fill="none">
            <path d="M0 30C24 30 38 18 58 28C78 38 86 16 96 22V42H0V30Z" fill="url(#redWave)" opacity="0.4" />
            <path d="M0 30C24 30 38 18 58 28C78 38 86 16 96 22" stroke="#ef4444" strokeWidth="2.5" fill="none" />
            <defs>
              <linearGradient id="redWave" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Unified Filter & Search Bar */}
      <div
        className="lp-filter-bar"
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "nowrap",
          gap: 12,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div className="lp-search-box" style={{ flex: "1 1 auto", minWidth: 180 }}>
          <Search size={16} className="lp-search-icon" />
          <input
            type="text"
            className="lp-search-input"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search landing pages by name, project or slug..."
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#94a3b8",
                padding: 2,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Dropdown */}
        <select
          className="lp-filter-select"
          value={tabIndex}
          style={{ flex: "0 0 135px", width: 135, minWidth: 120, maxWidth: 150, flexShrink: 0 }}
          onChange={(e) => {
            setTabIndex(Number(e.target.value));
            setPage(1);
          }}
        >
          <option value={0}>All Statuses</option>
          <option value={2}>Published</option>
          <option value={1}>Draft</option>
          <option value={3}>Unpublished</option>
        </select>

        {/* Project Dropdown */}
        <select
          className="lp-filter-select"
          value={filterProject}
          style={{ flex: "0 0 150px", width: 150, minWidth: 130, maxWidth: 170, flexShrink: 0 }}
          onChange={(e) => {
            setFilterProject(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Projects</option>
          {projectsList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Template Dropdown */}
        <select
          className="lp-filter-select"
          value={filterTemplate}
          style={{ flex: "0 0 150px", width: 150, minWidth: 130, maxWidth: 170, flexShrink: 0 }}
          onChange={(e) => {
            setFilterTemplate(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Templates</option>
          {templateList.map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>

        {/* View Mode Switcher */}
        <div className="lp-view-mode" style={{ flex: "0 0 auto", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
          <button
            type="button"
            className={`lp-view-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
            title="Visual Cards View"
          >
            <Grid size={15} />
          </button>
          <button
            type="button"
            className={`lp-view-btn ${viewMode === "table" ? "active" : ""}`}
            onClick={() => setViewMode("table")}
            title="Data Table View"
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: "0 auto 12px" }} />
          <div>Loading landing pages…</div>
        </div>
      ) : loadError ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ color: "var(--rose)", fontWeight: 600 }}>{loadError}</div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={fetchList}
            style={{ marginTop: 12 }}
          >
            Try Again
          </button>
        </div>
      ) : filteredRows.length === 0 ? (
        /* Empty State Hero */
        <div
          style={{
            background: "linear-gradient(135deg, rgba(21, 27, 46, 0.08) 0%, rgba(124, 58, 237, 0.04) 100%)",
            border: "1px solid var(--brand-100, #e0e3fd)",
            borderRadius: 20,
            padding: "48px 32px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "var(--brand)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px -4px rgba(21, 27, 46, 0.4)",
              marginBottom: 16,
            }}
          >
            <LayoutTemplate size={28} />
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", margin: "0 0 8px" }}>
            {searchInput ? "No matching landing pages" : "Create Your First Landing Page"}
          </h2>
          <p style={{ maxWidth: 540, fontSize: 14, color: "var(--ink-2)", margin: "0 0 24px", lineHeight: 1.6 }}>
            {searchInput
              ? "Try clearing your search term or selecting a different status filter."
              : "Launch stunning high-converting pages for property developments. Pick from your assigned templates or start completely from scratch."}
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            {searchInput ? (
              <button type="button" className="btn btn-ghost" onClick={() => setSearchInput("")}>
                Clear Search
              </button>
            ) : (
              canCreate && !atLandingPageCreateLimit && (
                <>
                  {canPickTemplate ? (
                  <button
                    type="button"
                    onClick={openTemplatePicker}
                    className="btn btn-primary"
                    style={{
                      padding: "10px 22px",
                      fontSize: 14,
                      fontWeight: 700,
                      borderRadius: 12,
                      boxShadow: "0 4px 14px rgba(21, 27, 46, 0.35)",
                    }}
                  >
                    <Plus size={16} /> Choose from Templates
                  </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-soft"
                    onClick={() => {
                      setScratchName("");
                      setScratchBind({ kind: "none" });
                      setScratchError(null);
                      setScratchOpen(true);
                    }}
                    style={{ padding: "10px 20px", fontSize: 14, fontWeight: 600, borderRadius: 12 }}
                  >
                    <Sparkles size={15} /> Start from Scratch
                  </button>
                </>
              )
            )}
          </div>
        </div>
      ) : viewMode === "table" ? (
        /* Data Table View */
        <div className="card" style={{ padding: 0, overflow: "hidden", borderRadius: 16 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="tbl" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Page Name</th>
                  <th>Source Template</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: "var(--ink)" }}>{row.name}</span>
                      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{row.slug}</div>
                    </td>
                    <td>
                      {row.sourceTemplate ? (
                        <span className="badge b-gray" style={{ fontWeight: 600 }}>
                          {row.sourceTemplate.name}
                        </span>
                      ) : (
                        <span className="badge b-indigo" style={{ fontWeight: 600 }}>
                          From scratch
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[row.status]}`}>
                        <span className="dot" style={{ background: "currentColor" }} />
                        {STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: "var(--muted)" }}>{formatDate(row.updatedAt)}</td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        {canEdit ? (
                          <button
                            type="button"
                            className="btn btn-soft btn-sm"
                            onClick={() => startEdit(row)}
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openView(row.id)}
                        >
                          <Eye size={12} /> View
                        </button>
                        {row.status === "published" ? (
                          canPause ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={busyId === row.id}
                            onClick={() => unpublishPage(row.id)}
                          >
                            Unpublish
                          </button>
                          ) : null
                        ) : canPublish ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={busyId === row.id}
                            onClick={() => publishPage(row.id)}
                            style={{ fontWeight: 700 }}
                          >
                            Publish
                          </button>
                        ) : null}
                        {canCreate ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => duplicatePage(row.id)}
                            title="Duplicate"
                          >
                            <Copy size={12} />
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDeleteTarget({ id: row.id, name: row.name })}
                            style={{ color: "var(--rose)" }}
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Visual Cards Showcase View */
        <div className="lp-cards-grid">
          {filteredRows.map((row) => (
            <OrgLandingPageVisualCard
              key={row.id}
              row={row}
              accessToken={accessToken}
              busy={busyId === row.id}
              onEdit={canEdit ? () => startEdit(row) : undefined}
              onView={() => openView(row.id)}
              onPublish={canPublish ? () => publishPage(row.id) : undefined}
              onUnpublish={canPause ? () => unpublishPage(row.id) : undefined}
              onDuplicate={canCreate ? () => duplicatePage(row.id) : undefined}
              onDelete={canDelete ? () => setDeleteTarget({ id: row.id, name: row.name }) : undefined}
            />
          ))}
        </div>
      )}

      {/* Bottom Pagination Bar */}
      <div className="lp-pagination">
        <div>
          Showing {filteredRows.length > 0 ? `1–${filteredRows.length}` : "0"} of {totalKpi} landing pages
        </div>
        <div className="lp-pagination-btns">
          <button
            type="button"
            className="lp-page-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: Math.min(4, Math.max(1, totalPages)) }, (_, i) => i + 1).map((pNum) => (
            <button
              key={pNum}
              type="button"
              className={`lp-page-btn ${page === pNum ? "active" : ""}`}
              onClick={() => setPage(pNum)}
            >
              {pNum}
            </button>
          ))}
          <button
            type="button"
            className="lp-page-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Assigned Templates Modal */}
      <Modal
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        title="Choose a Landing Page Template"
        description="Use a template already added to your workspace, or preview it before you start."
        size="xl"
      >
        {templatePickerLoading ? (
          <div style={{ padding: 44, textAlign: "center", color: "var(--muted)" }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
            <div>Loading workspace templates…</div>
          </div>
        ) : templatePickerError ? (
          <div style={{ padding: "16px 0", color: "var(--rose)", fontSize: 13 }}>{templatePickerError}</div>
        ) : (
          <div>
            {templateQuota && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "var(--surface-2, #f8fafc)",
                  borderRadius: 12,
                  border: "1px solid var(--line)",
                  marginBottom: 16,
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                    {templateQuota.planName} Package
                  </span>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    Template Allowance: {templateQuota.assignedCount} of{" "}
                    {templateQuota.maxAllowed == null ? "Unlimited" : templateQuota.maxAllowed} Selected
                  </div>
                </div>
                <span
                  className={`badge ${templateQuota.remainingQuota === 0
                      ? "b-amber"
                      : templateQuota.remainingQuota != null
                        ? "b-indigo"
                        : "b-green"
                    }`}
                  style={{ fontWeight: 700 }}
                >
                  {templateQuota.remainingQuota === 0
                    ? "Quota Reached"
                    : templateQuota.remainingQuota != null
                      ? `${templateQuota.remainingQuota} remaining slots`
                      : "Unlimited access"}
                </span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
                {assignedTemplates.length} workspace template{assignedTemplates.length === 1 ? "" : "s"}
              </span>
            </div>

            {assignedTemplates.length === 0 ? (
              <div
                style={{
                  padding: "34px 20px",
                  textAlign: "center",
                  border: "1px dashed var(--line-2)",
                  borderRadius: 12,
                  color: "var(--muted)",
                  fontSize: 13,
                }}
              >
                No templates have been added to this workspace yet. Add one from Templates Studio first.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                  gap: 14,
                  maxHeight: 500,
                  overflowY: "auto",
                  padding: "2px 4px 4px 2px",
                }}
              >
                {assignedTemplates.map((template) => (
                  <div
                    key={template.id}
                    style={{
                      border: "1px solid var(--line-2)",
                      borderRadius: 14,
                      overflow: "hidden",
                      background: "var(--surface)",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <TemplateCover thumbnail={template.thumbnail ?? "hero"} accent="#0f1424" height={150}>
                      <div style={{ position: "absolute", top: 8, left: 8 }}>
                        <TierBadge tier={template.tier} />
                      </div>
                      {template.category && (
                        <div style={{ position: "absolute", top: 8, right: 8 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              background: "rgba(15,20,36,0.7)",
                              color: "#fff",
                              padding: "2px 8px",
                              borderRadius: 999,
                              backdropFilter: "blur(4px)",
                            }}
                          >
                            {template.category}
                          </span>
                        </div>
                      )}
                    </TemplateCover>
                    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{template.name}</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => openTemplateUse(template.id, template.name)}
                          style={{ flex: 1, justifyContent: "center", fontWeight: 700 }}
                        >
                          <Sparkles size={13} /> Use
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openTemplatePreview(template.id)}
                          style={{ flex: 1, justifyContent: "center", fontWeight: 600 }}
                        >
                          <Eye size={13} /> Preview
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Template Preview Modal */}
      {templatePreviewId && (
        <Modal
          open={!!templatePreviewId}
          onClose={closeTemplatePreview}
          title={templatePreviewData?.name ?? "Template Preview"}
          size="xl"
          footer={
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "space-between" }}>
              <div style={{ display: "inline-flex", background: "var(--surface-2, #f8fafc)", borderRadius: 8, padding: 2, border: "1px solid var(--line-2)" }}>
                {(["desktop", "tablet", "mobile"] as const).map((device) => {
                  const DeviceIcon = device === "desktop" ? Monitor : device === "tablet" ? Tablet : Smartphone;
                  return (
                    <button
                      key={device}
                      type="button"
                      onClick={() => setTemplatePreviewDevice(device)}
                      title={`${device} view`}
                      style={{
                        border: "none",
                        background: templatePreviewDevice === device ? "var(--surface)" : "transparent",
                        color: templatePreviewDevice === device ? "var(--brand)" : "var(--muted)",
                        padding: "5px 9px",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      <DeviceIcon size={15} />
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const template = assignedTemplates.find((item) => item.id === templatePreviewId);
                  if (template) {
                    closeTemplatePreview();
                    openTemplateUse(template.id, template.name);
                  }
                }}
                style={{ fontWeight: 700 }}
              >
                <Sparkles size={14} /> Use template
              </button>
            </div>
          }
        >
          <div style={{ background: "#0f172a", borderRadius: 14, padding: templatePreviewDevice === "desktop" ? 8 : "24px 12px", display: "flex", justifyContent: "center", alignItems: "center", minHeight: 520, maxHeight: "75vh", overflow: "hidden" }}>
            {templatePreviewLoading ? (
              <div style={{ color: "#ffffff", padding: 40, textAlign: "center" }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                <div>Loading preview canvas…</div>
              </div>
            ) : templatePreviewError ? (
              <div style={{ color: "var(--rose)", padding: 20 }}>{templatePreviewError}</div>
            ) : templatePreviewData ? (
              <div style={{ width: templatePreviewDevice === "desktop" ? "100%" : templatePreviewDevice === "tablet" ? 768 : 375, height: 520, background: "#ffffff", borderRadius: templatePreviewDevice === "desktop" ? 8 : 16, overflowY: "auto", boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)", border: templatePreviewDevice !== "desktop" ? "8px solid #334155" : "none" }}>
                <SiteRenderer site={siteFromLandingPage(templatePreviewData)} live />
              </div>
            ) : null}
          </div>
        </Modal>
      )}

      {/* Use Template Modal */}
      <Modal
        open={!!useTemplate}
        onClose={() => {
          if (!useSubmitting) setUseTemplate(null);
        }}
        title="Create Landing Page"
        description={useTemplate ? `Start a new landing page based on "${useTemplate.name}".` : undefined}
        footer={
          <>
            <button className="btn btn-ghost" type="button" onClick={() => setUseTemplate(null)} disabled={useSubmitting}>
              Cancel
            </button>
            <button className="btn btn-primary" type="button" disabled={useSubmitting} onClick={confirmUseTemplate} style={{ fontWeight: 700 }}>
              {useSubmitting ? "Creating…" : "Create & Launch Builder"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {useError && <div style={{ padding: "8px 12px", background: "var(--rose-050)", color: "var(--rose)", borderRadius: 8, fontSize: 13 }}>{useError}</div>}
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Landing Page Name</label>
            <input className="inp" placeholder="e.g. Skyline Residence Launch" value={useName} onChange={(e) => setUseName(e.target.value)} autoFocus />
          </div>
          <InventoryBindFields accessToken={accessToken} value={useBind} onChange={setUseBind} onAvailabilityChange={setUseHasInventory} />
        </div>
      </Modal>

      {/* Scratch Modal */}
      <Modal
        open={scratchOpen}
        onClose={() => {
          if (!scratchSubmitting) setScratchOpen(false);
        }}
        title="Create a Blank Landing Page"
        description="Starts with an empty canvas. Bind a project or standalone unit to auto-fill property tokens."
        footer={
          <>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setScratchOpen(false)}
              disabled={scratchSubmitting}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={confirmCreateFromScratch}
              disabled={scratchSubmitting}
              style={{ fontWeight: 700 }}
            >
              {scratchSubmitting ? "Creating…" : "Create & Launch Builder"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {scratchError && (
            <div
              style={{
                padding: "8px 12px",
                background: "var(--rose-050)",
                color: "var(--rose)",
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              {scratchError}
            </div>
          )}
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Landing Page Name</label>
            <input
              className="inp"
              placeholder="e.g. Waterfront Residences"
              value={scratchName}
              onChange={(e) => setScratchName(e.target.value)}
              autoFocus
            />
          </div>

          <InventoryBindFields
            accessToken={accessToken}
            value={scratchBind}
            onChange={setScratchBind}
            onAvailabilityChange={setScratchHasInventory}
          />
        </div>
      </Modal>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Landing Page?"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`
            : ""
        }
        confirmLabel={deleting ? "Deleting…" : "Delete Page"}
        destructive
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Plan Quota Limit Modal */}
      <Modal
        open={!!packagePrompt}
        onClose={() => setPackagePrompt(null)}
        title={packagePrompt?.title ?? "Plan Limit Reached"}
        footer={
          <>
            <button className="btn btn-ghost" type="button" onClick={() => setPackagePrompt(null)}>
              Close
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                setPackagePrompt(null);
                router.push("/org/settings?section=billing");
              }}
              style={{ fontWeight: 700 }}
            >
              Upgrade Subscription Plan →
            </button>
          </>
        }
      >
        <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
          {packagePrompt?.body}
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 500 }}>
          <div
            style={{
              background: "#0e1525",
              color: "#fff",
              padding: "10px 18px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckCircle2 size={16} style={{ color: "#10b981" }} />
            <span>{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* Modern Visual Card for Landing Pages */
function OrgLandingPageVisualCard({
  row,
  accessToken,
  busy,
  onEdit,
  onView,
  onPublish,
  onUnpublish,
  onDuplicate,
  onDelete,
}: {
  row: LandingPageRow;
  accessToken?: string | null;
  busy: boolean;
  onEdit?: () => void;
  onView: () => void;
  onPublish?: () => void;
  onUnpublish?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [trackedStats, setTrackedStats] = useState<{ views: number; leads: number }>({ views: 0, leads: 0 });

  useEffect(() => {
    if (!accessToken || !row.id) return;
    apiFetch<{ groups?: { eventType: string; _count: { _all: number } }[]; total?: number }>(
      `/org/tracking/${encodeURIComponent(row.id)}/stats`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
      .then((res) => {
        let v = 0;
        let l = 0;
        for (const g of res.groups ?? []) {
          if (g.eventType === "page_view") v += g._count._all;
          if (g.eventType === "lead_submit" || g.eventType === "form_submit") l += g._count._all;
        }
        if (v === 0 && res.total) v = res.total;
        setTrackedStats({ views: v, leads: l });
      })
      .catch(() => {});
  }, [accessToken, row.id]);

  const isPublished = row.status === "published";
  const isDraft = row.status === "draft";
  const isUnpublished = row.status === "unpublished";

  const thumbSrc =
    row.thumbnail && (row.thumbnail.startsWith("http") || row.thumbnail.startsWith("/"))
      ? row.thumbnail
      : "/templates/vista-framed.jpg";

  const templateName = row.sourceTemplate?.name || "Custom Canvas";

  return (
    <div className="lp-card">
      {/* Cover / Image Area */}
      <div className="lp-card-thumb">
        <img
          src={thumbSrc}
          alt={row.name}
          className="lp-card-img"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/templates/vista-framed.jpg";
          }}
        />

        {/* Overlaid Top-Left Status Pill */}
        <div className="lp-badge-status">
          <span
            className={`lp-dot ${
              isPublished ? "lp-dot-green" : isDraft ? "lp-dot-amber" : "lp-dot-red"
            }`}
          />
          <span>{isPublished ? "Published" : isDraft ? "Draft" : "Unpublished"}</span>
        </div>

        {/* Overlaid Top-Right Options Button */}
        <button
          type="button"
          className="lp-btn-more-dots"
          onClick={() => setMenuOpen(!menuOpen)}
          title="More options"
        >
          <MoreHorizontal size={15} />
        </button>
      </div>

      {/* Card Body */}
      <div className="lp-card-body">
        <h3 className="lp-card-title" title={row.name}>
          {row.name}
        </h3>

        {/* Slug Row with Copy button */}
        <div className="lp-card-slug-row">
          <span>/{row.slug}</span>
          <button
            type="button"
            className="lp-copy-btn"
            title="Copy slug"
            onClick={() => {
              navigator.clipboard.writeText(`/${row.slug}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <Check size={12} style={{ color: "#10b981" }} /> : <Copy size={12} />}
          </button>
        </div>

        {/* Template Meta */}
        <div className="lp-card-meta-row">
          <div className="lp-card-meta-item" title={templateName}>
            <Building2 size={13} style={{ color: "#64748b" }} />
            <span>{templateName}</span>
          </div>
        </div>

        {/* Stats Row: Updated, Views, Leads */}
        <div className="lp-card-stats-row">
          <div>
            <span className="lp-card-stat-label">Updated</span>
            <span
              className="lp-card-stat-val"
              style={{ fontSize: 11.5, fontWeight: 500, color: "#475569" }}
            >
              {formatUpdated(row.updatedAt)}
            </span>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="lp-card-stat-label">Views</span>
            <span className="lp-card-stat-val">{trackedStats.views.toLocaleString()}</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="lp-card-stat-label">Leads</span>
            <span className="lp-card-stat-val">{trackedStats.leads.toLocaleString()}</span>
          </div>
        </div>

        {/* Bottom Action Buttons Row */}
        <div className="lp-card-actions" style={{ position: "relative" }}>
          <button type="button" className="lp-btn-preview" onClick={onView}>
            <Eye size={13} /> Preview
          </button>

          {onEdit && (
            <button type="button" className="lp-btn-edit" onClick={onEdit}>
              <Pencil size={13} /> Edit
            </button>
          )}

          <button
            type="button"
            className="lp-btn-dots"
            onClick={() => setMenuOpen(!menuOpen)}
            title="Options"
          >
            <MoreVertical size={14} />
          </button>

          {/* Menu Dropdown Popup */}
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                bottom: "100%",
                right: 0,
                marginBottom: 6,
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
                zIndex: 50,
                minWidth: 160,
                padding: 4,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {onEdit && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                  style={{ justifyContent: "flex-start", gap: 8, fontSize: 12 }}
                >
                  <Pencil size={13} /> Open Builder
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setMenuOpen(false);
                  onView();
                }}
                style={{ justifyContent: "flex-start", gap: 8, fontSize: 12 }}
              >
                <Eye size={13} /> Live Preview
              </button>
              {isPublished && onUnpublish ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => {
                    setMenuOpen(false);
                    onUnpublish();
                  }}
                  style={{ justifyContent: "flex-start", gap: 8, fontSize: 12 }}
                >
                  <PauseCircle size={13} /> Unpublish
                </button>
              ) : !isPublished && onPublish ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => {
                    setMenuOpen(false);
                    onPublish();
                  }}
                  style={{
                    justifyContent: "flex-start",
                    gap: 8,
                    fontSize: 12,
                    color: "#059669",
                    fontWeight: 600,
                  }}
                >
                  <Rocket size={13} /> Publish Page
                </button>
              ) : null}
              {onDuplicate && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setMenuOpen(false);
                    onDuplicate();
                  }}
                  style={{ justifyContent: "flex-start", gap: 8, fontSize: 12 }}
                >
                  <Copy size={13} /> Duplicate
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  style={{ justifyContent: "flex-start", gap: 8, fontSize: 12, color: "var(--rose)" }}
                >
                  <Trash2 size={13} /> Delete Page
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
