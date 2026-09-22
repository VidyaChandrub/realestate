"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Copy,
  Edit2,
  ExternalLink,
  Eye,
  Grid,
  Layers,
  LayoutTemplate,
  List,
  MoreVertical,
  PauseCircle,
  Pencil,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { TemplateCover, StatusBadge } from "@/components/superadmin/templates/shared";
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
} from "@/lib/types";
import type { SectionInstance, SiteConfig } from "@/lib/openpage/types";
import {
  InventoryBindFields,
  inventoryBindPayload,
  needsInventorySelection,
  type InventoryBindValue,
} from "@/components/org/inventory-bind-fields";
import "@/app/openpage.css";

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
  const { accessToken } = useAuth();
  const router = useRouter();

  // Create scratch modal state
  const [scratchOpen, setScratchOpen] = useState(false);
  const [scratchName, setScratchName] = useState("");
  const [scratchBind, setScratchBind] = useState<InventoryBindValue>({ kind: "none" });
  const [scratchHasInventory, setScratchHasInventory] = useState(false);
  const [scratchSubmitting, setScratchSubmitting] = useState(false);
  const [scratchError, setScratchError] = useState<string | null>(null);

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

  const fetchList = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    const status = statusParamFor(tabIndex);
    if (status) params.set("status", status);
    apiFetch<OrgLandingPagesListResponse>(`/org/landing-pages?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(setResult)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load pages."))
      .finally(() => setLoading(false));
  }, [accessToken, page, tabIndex]);

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
  const filteredRows = rawRows.filter((r) =>
    !searchInput
      ? true
      : r.name.toLowerCase().includes(searchInput.toLowerCase()) ||
        r.slug.toLowerCase().includes(searchInput.toLowerCase()),
  );

  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const atLandingPageCreateLimit =
    landingPageQuota != null &&
    landingPageQuota.limit != null &&
    landingPageQuota.used >= landingPageQuota.limit;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 60 }}>
      {/* Studio Header */}
      <div
        className="reveal in"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 800,
              color: "var(--brand, #4f46e5)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            <LayoutTemplate size={13} />
            <span>WEBSITE &amp; PAGES</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            My Landing Pages
          </h1>
          <div className="sub" style={{ marginTop: 4, maxWidth: 680, fontSize: 13.5, color: "var(--muted)" }}>
            Pages you&apos;ve created from your assigned templates — edit, preview, and publish whenever you&apos;re ready.
          </div>
        </div>

        {/* Global Header Actions */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {!atLandingPageCreateLimit && (
            <>
              <button
                className="btn btn-soft"
                type="button"
                onClick={() => {
                  setScratchName("");
                  setScratchBind({ kind: "none" });
                  setScratchError(null);
                  setScratchOpen(true);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 11,
                  fontWeight: 600,
                  padding: "9px 16px",
                }}
              >
                <Sparkles size={15} /> Create from scratch
              </button>

              <Link
                className="btn btn-primary"
                href="/org/templates"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 11,
                  fontWeight: 700,
                  padding: "9px 18px",
                }}
              >
                <Plus size={16} /> New from template
              </Link>
            </>
          )}
        </div>
      </div>

      {atLandingPageCreateLimit ? (
        <div
          className="card reveal in"
          style={{
            marginBottom: 16,
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

      {/* Floating & Sticky Control Toolbar */}
      <div
        style={{
          position: "sticky",
          top: 12,
          zIndex: 30,
          background: "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: "1px solid var(--line-2)",
          borderRadius: 16,
          padding: "12px 16px",
          boxShadow: "0 10px 28px -10px rgba(14, 21, 37, 0.08), 0 2px 6px rgba(14, 21, 37, 0.03)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {/* Search input */}
        <div style={{ position: "relative", minWidth: 220, maxWidth: 320, flex: 1 }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            className="inp"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search pages by name or slug…"
            style={{
              paddingLeft: 36,
              paddingRight: searchInput ? 32 : 12,
              height: 38,
              borderRadius: 10,
              fontSize: 13,
              width: "100%",
            }}
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
                color: "var(--muted)",
                padding: 2,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status segmented pills */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "var(--surface-2, #f8fafc)",
            padding: 3,
            borderRadius: 10,
            border: "1px solid var(--line-2)",
          }}
        >
          {STATUS_TABS.map((label, idx) => {
            const active = tabIndex === idx;
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setTabIndex(idx);
                  setPage(1);
                }}
                style={{
                  border: "none",
                  background: active ? "var(--surface)" : "transparent",
                  color: active ? "var(--ink)" : "var(--muted)",
                  fontWeight: active ? 700 : 500,
                  fontSize: 12.5,
                  padding: "6px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                  boxShadow: active ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* View Mode Switcher */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "var(--surface-2, #f8fafc)",
            padding: 3,
            borderRadius: 10,
            border: "1px solid var(--line-2)",
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            title="Visual Cards View"
            style={{
              border: "none",
              background: viewMode === "grid" ? "var(--surface)" : "transparent",
              color: viewMode === "grid" ? "var(--ink)" : "var(--muted)",
              padding: "6px 10px",
              borderRadius: 8,
              cursor: "pointer",
              boxShadow: viewMode === "grid" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <Grid size={15} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            title="Data Table View"
            style={{
              border: "none",
              background: viewMode === "table" ? "var(--surface)" : "transparent",
              color: viewMode === "table" ? "var(--ink)" : "var(--muted)",
              padding: "6px 10px",
              borderRadius: 8,
              cursor: "pointer",
              boxShadow: viewMode === "table" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
              display: "inline-flex",
              alignItems: "center",
            }}
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
            background: "linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(124, 58, 237, 0.04) 100%)",
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
              boxShadow: "0 8px 24px -4px rgba(79, 70, 229, 0.4)",
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
              !atLandingPageCreateLimit && (
                <>
                <Link
                  href="/org/templates"
                  className="btn btn-primary"
                  style={{
                    padding: "10px 22px",
                    fontSize: 14,
                    fontWeight: 700,
                    borderRadius: 12,
                    boxShadow: "0 4px 14px rgba(79, 70, 229, 0.35)",
                  }}
                >
                  <Plus size={16} /> Choose from Templates
                </Link>
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
                        <button
                          type="button"
                          className="btn btn-soft btn-sm"
                          onClick={() => startEdit(row)}
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openView(row.id)}
                        >
                          <Eye size={12} /> View
                        </button>
                        {row.status === "published" ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={busyId === row.id}
                            onClick={() => unpublishPage(row.id)}
                          >
                            Unpublish
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={busyId === row.id}
                            onClick={() => publishPage(row.id)}
                            style={{ fontWeight: 700 }}
                          >
                            Publish
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => duplicatePage(row.id)}
                          title="Duplicate"
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setDeleteTarget({ id: row.id, name: row.name })}
                          style={{ color: "var(--rose)" }}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 22,
          }}
        >
          {filteredRows.map((row) => (
            <OrgLandingPageVisualCard
              key={row.id}
              row={row}
              busy={busyId === row.id}
              onEdit={() => startEdit(row)}
              onView={() => openView(row.id)}
              onPublish={() => publishPage(row.id)}
              onUnpublish={() => unpublishPage(row.id)}
              onDuplicate={() => duplicatePage(row.id)}
              onDelete={() => setDeleteTarget({ id: row.id, name: row.name })}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </button>
          <span className="muted" style={{ fontSize: 12.5, alignSelf: "center" }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next →
          </button>
        </div>
      )}

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
  busy,
  onEdit,
  onView,
  onPublish,
  onUnpublish,
  onDuplicate,
  onDelete,
}: {
  row: LandingPageRow;
  busy: boolean;
  onEdit: () => void;
  onView: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isPublished = row.status === "published";

  return (
    <div
      className="card template-visual-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setMenuOpen(false);
      }}
      style={{
        padding: 0,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderRadius: 18,
        overflow: "hidden",
        border: hovered ? "1px solid var(--brand-100, #c7d2fe)" : "1px solid var(--line-2)",
        boxShadow: hovered
          ? "0 14px 34px -10px rgba(79, 70, 229, 0.18), 0 4px 14px -4px rgba(14, 21, 37, 0.08)"
          : "0 2px 8px -2px rgba(14, 21, 37, 0.05)",
        transform: hovered ? "translateY(-4px)" : "none",
        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        background: "var(--surface)",
        position: "relative",
      }}
    >
      {/* Cover Preview */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        <TemplateCover thumbnail={row.thumbnail ?? "hero"} accent="#4f46e5" height={188} radius="18px 18px 0 0">
          {/* Top Badges */}
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              zIndex: 2,
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            <span className={`badge ${STATUS_BADGE[row.status]}`} style={{ fontWeight: 700 }}>
              <span className="dot" style={{ background: "currentColor" }} />
              {STATUS_LABEL[row.status]}
            </span>
          </div>

          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 2,
            }}
          >
            {row.sourceTemplate ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  background: "rgba(15, 20, 36, 0.72)",
                  color: "#ffffff",
                  padding: "3px 9px",
                  borderRadius: 999,
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {row.sourceTemplate.name}
              </span>
            ) : (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  background: "rgba(99, 102, 241, 0.85)",
                  color: "#ffffff",
                  padding: "3px 9px",
                  borderRadius: 999,
                  backdropFilter: "blur(6px)",
                }}
              >
                Custom Canvas
              </span>
            )}
          </div>

          {/* Quick Hover Action Overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(15, 23, 42, 0.35) 0%, rgba(15, 23, 42, 0.88) 100%)",
              backdropFilter: "blur(3px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              opacity: hovered ? 1 : 0,
              pointerEvents: hovered ? "auto" : "none",
              transition: "opacity 0.22s ease-in-out",
              zIndex: 4,
              padding: 16,
            }}
          >
            <button
              type="button"
              onClick={onEdit}
              style={{
                width: "100%",
                maxWidth: 180,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "var(--brand, #4f46e5)",
                color: "#ffffff",
                border: "none",
                borderRadius: 10,
                padding: "9px 16px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 6px 18px rgba(79, 70, 229, 0.4)",
              }}
            >
              <Pencil size={14} /> Open Builder
            </button>

            <button
              type="button"
              onClick={onView}
              style={{
                width: "100%",
                maxWidth: 180,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "rgba(255, 255, 255, 0.18)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.35)",
                borderRadius: 10,
                padding: "8px 16px",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                backdropFilter: "blur(8px)",
              }}
            >
              <Eye size={14} /> Live Preview
            </button>
          </div>
        </TemplateCover>
      </div>

      {/* Card Body */}
      <div
        className="card-b"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "16px 18px 16px",
        }}
      >
        <div>
          <button
            type="button"
            onClick={onEdit}
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              textAlign: "left",
              cursor: "pointer",
              width: "100%",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 15.5,
                color: "var(--ink)",
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={row.name}
            >
              {row.name}
            </div>
          </button>

          <div
            style={{
              fontSize: 11.5,
              color: "var(--muted)",
              marginTop: 4,
              fontFamily: "var(--font-mono), ui-monospace, monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            /{row.slug}
          </div>
        </div>

        {/* Footer Meta & Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid var(--line)",
            fontSize: 11.5,
            color: "var(--muted)",
          }}
        >
          <span>Updated: {formatDate(row.updatedAt)}</span>
          {isPublished && (
            <span style={{ color: "var(--green)", fontWeight: 700, fontSize: 11 }}>
              ● Live
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
          <button
            type="button"
            onClick={onEdit}
            className="btn btn-soft btn-sm"
            style={{ flex: 1, justifyContent: "center", fontWeight: 700, borderRadius: 9 }}
          >
            <Pencil size={13} /> Edit
          </button>

          {isPublished ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={onUnpublish}
              style={{ flex: 1, justifyContent: "center", borderRadius: 9 }}
            >
              <PauseCircle size={13} /> Pause
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busy}
              onClick={onPublish}
              style={{ flex: 1, justifyContent: "center", fontWeight: 700, borderRadius: 9 }}
            >
              <Rocket size={13} /> Publish
            </button>
          )}

          {/* More menu */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ padding: "6px 8px", borderRadius: 8 }}
            >
              <MoreVertical size={14} />
            </button>

            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  bottom: "100%",
                  right: 0,
                  marginBottom: 6,
                  background: "var(--surface)",
                  border: "1px solid var(--line-2)",
                  borderRadius: 12,
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
                  zIndex: 50,
                  minWidth: 150,
                  padding: 4,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
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
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  style={{ justifyContent: "flex-start", gap: 8, fontSize: 12, color: "var(--rose)" }}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
