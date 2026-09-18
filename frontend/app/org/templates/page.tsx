"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ExternalLink,
  Eye,
  FolderPlus,
  Grid,
  Layers,
  LayoutTemplate,
  List,
  Lock,
  Monitor,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { TemplateCover, TierBadge } from "@/components/superadmin/templates/shared";
import { SiteRenderer } from "@/components/openpage/renderer/SiteRenderer";
import { siteFromLandingPage } from "@/lib/openpage/content";
import { ensureConfig } from "@/lib/openpage/site-config";
import { orgBuilderPath } from "@/lib/openpage/paths";
import {
  InventoryBindFields,
  inventoryBindPayload,
  needsInventorySelection,
  type InventoryBindValue,
} from "@/components/org/inventory-bind-fields";
import type { LandingPageData } from "@/lib/openpage/types";
import type {
  LandingPageRow,
  OrgTemplateSummary,
  OrgTemplatesListResponse,
  AvailableTemplatesResponse,
} from "@/lib/types";
import "@/app/openpage.css";

const LIMIT = 12;

export default function OrgTemplatesPage() {
  const { accessToken } = useAuth();
  const router = useRouter();

  // Create page from template state
  const [useTemplate, setUseTemplate] = useState<{ id: string; name: string } | null>(null);
  const [useName, setUseName] = useState("");
  const [useBind, setUseBind] = useState<InventoryBindValue>({ kind: "none" });
  const [useHasInventory, setUseHasInventory] = useState(false);
  const [useSubmitting, setUseSubmitting] = useState(false);
  const [useError, setUseError] = useState<string | null>(null);

  // Add Template Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [availableData, setAvailableData] = useState<AvailableTemplatesResponse | null>(null);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [availableError, setAvailableError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);
  const [addModalTierFilter, setAddModalTierFilter] = useState<string>("all");
  const [addModalCategoryFilter, setAddModalCategoryFilter] = useState<string>("all");
  const [upgradePrompt, setUpgradePrompt] = useState<{ title: string; body: string } | null>(null);

  // Remove (unassign)
  const [removeConfirm, setRemoveConfirm] = useState<{ id: string; name: string } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removeBlocked, setRemoveBlocked] = useState<{ name: string; message: string } | null>(null);

  // Filters & Search
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");

  // Assigned Templates list
  const [result, setResult] = useState<OrgTemplatesListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // In-app Responsive Preview
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<LandingPageData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  function openUseTemplate(id: string, defaultName: string) {
    setUseTemplate({ id, name: defaultName });
    setUseName(defaultName);
    setUseBind({ kind: "none" });
    setUseError(null);
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

  const fetchAssignedTemplates = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (search) params.set("search", search);
    if (category && category !== "all") params.set("category", category);
    if (tierFilter && tierFilter !== "all") params.set("tier", tierFilter);

    apiFetch<OrgTemplatesListResponse>(`/org/templates?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(setResult)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load templates."))
      .finally(() => setLoading(false));
  }, [accessToken, page, search, category, tierFilter]);

  const loadAvailableTemplates = useCallback(() => {
    if (!accessToken) return;
    setAvailableLoading(true);
    setAvailableError(null);
    apiFetch<AvailableTemplatesResponse>("/org/templates/available", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(setAvailableData)
      .catch((err) => setAvailableError(err instanceof Error ? err.message : "Failed to load available templates."))
      .finally(() => setAvailableLoading(false));
  }, [accessToken]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchAssignedTemplates();
    loadAvailableTemplates();
  }, [fetchAssignedTemplates, loadAvailableTemplates]);

  function openAddModal() {
    setAddModalOpen(true);
    setAssignMessage(null);
    loadAvailableTemplates();
  }

  async function handleAssignTemplate(templateId: string): Promise<boolean> {
    if (!accessToken) return false;
    setAssigningId(templateId);
    setAssignMessage(null);
    setAvailableError(null);
    try {
      const res = await apiFetch<{ success: boolean; message: string }>(`/org/templates/${templateId}/assign`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setAssignMessage(res.message);
      loadAvailableTemplates();
      fetchAssignedTemplates();
      return true;
    } catch (err) {
      setAvailableError(err instanceof Error ? err.message : "Failed to add template.");
      return false;
    } finally {
      setAssigningId(null);
    }
  }

  function requestRemoveTemplate(id: string, name: string) {
    setRemoveError(null);
    const count =
      rows.find((r) => r.id === id)?.landingPageCount ??
      availableData?.data.find((t) => t.id === id)?.landingPageCount ??
      0;
    if (count > 0) {
      const message = `Can't remove this template — ${count} landing page${count === 1 ? "" : "s"} in your workspace ${count === 1 ? "was" : "were"} built from it. Delete ${count === 1 ? "that page" : "those pages"} first if you want to free up this slot.`;
      setRemoveBlocked({ name, message });
      return;
    }
    setRemoveConfirm({ id, name });
  }

  async function confirmRemoveTemplate() {
    if (!removeConfirm || !accessToken) return;
    const { id } = removeConfirm;
    setRemovingId(id);
    try {
      await apiFetch<{ success: boolean; message: string }>(`/org/templates/${id}/assign`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setRemoveConfirm(null);
      setAssignMessage("Template removed from your organisation");
      fetchAssignedTemplates();
      loadAvailableTemplates();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove template.";
      setRemoveError(message);
      setAvailableError(message);
      setRemoveConfirm(null);
    } finally {
      setRemovingId(null);
    }
  }

  function openPreview(id: string) {
    if (!accessToken) return;
    setPreviewId(id);
    setPreviewData(null);
    setPreviewError(null);
    setPreviewLoading(true);
    apiFetch<LandingPageData>(`/org/templates/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(setPreviewData)
      .catch((err) => setPreviewError(err instanceof Error ? err.message : "Failed to load preview."))
      .finally(() => setPreviewLoading(false));
  }

  function closePreview() {
    setPreviewId(null);
    setPreviewData(null);
    setPreviewError(null);
  }

  const rows = result?.data ?? [];
  const total = result?.total ?? 0;
  const isFiltered = Boolean(search || (category && category !== "all") || (tierFilter && tierFilter !== "all"));

  const allCategories = Array.from(
    new Set(
      [
        ...rows.map((r) => r.category),
        ...(availableData?.data ?? []).map((t) => t.category),
      ].filter((c): c is string => Boolean(c)),
    ),
  ).sort();

  const previewCfg = previewData ? ensureConfig(previewData) : null;
  const previewedTmpl = availableData?.data.find((t) => t.id === previewId);
  const previewedIsAssigned =
    !!previewId &&
    (rows.some((r) => r.id === previewId) || (previewedTmpl?.isAssigned ?? false));

  const filteredAvailable = (availableData?.data ?? []).filter((t) => {
    if (addModalTierFilter !== "all" && (t.tier ?? "free") !== addModalTierFilter) return false;
    if (addModalCategoryFilter !== "all" && t.category !== addModalCategoryFilter) return false;
    return true;
  });

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
            <span>WEBSITE &amp; DESIGN SYSTEM</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            Templates Studio
          </h1>
          <div className="sub" style={{ marginTop: 4, maxWidth: 680, fontSize: 13.5, color: "var(--muted)" }}>
            High-converting real estate landing page templates granted to your organisation.
          </div>
        </div>

        {/* Global Header Actions & Quota Telemetry */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {availableData && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "var(--surface)",
                border: "1px solid var(--line-2)",
                padding: "6px 14px",
                borderRadius: 12,
                fontSize: 12.5,
              }}
            >
              <span style={{ color: "var(--muted)" }}>Package:</span>
              <strong style={{ color: "var(--brand)" }}>{availableData.planName}</strong>
              <span style={{ color: "var(--line-2)" }}>|</span>
              <span style={{ color: "var(--muted)" }}>Assigned:</span>
              <strong style={{ color: "var(--ink)" }}>
                {availableData.assignedCount} of {availableData.maxAllowed == null ? "Unlimited" : availableData.maxAllowed}
              </strong>
            </div>
          )}

          <button
            className="btn btn-primary"
            type="button"
            onClick={openAddModal}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              borderRadius: 11,
              fontWeight: 700,
              padding: "9px 18px",
            }}
          >
            <Plus size={16} /> Add Template from Plan
          </button>
        </div>
      </div>

      {removeError && (
        <div
          style={{
            padding: "12px 16px",
            background: "var(--rose-050, #fef2f2)",
            color: "var(--rose, #e11d48)",
            border: "1px solid var(--rose-100, #fecdd3)",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {removeError}
        </div>
      )}

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
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* Toolbar Top Row: Search, Tier Pills, and View Modes */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {/* Search box */}
          <div style={{ position: "relative", minWidth: 240, maxWidth: 340, flex: 1 }}>
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
              placeholder="Search your assigned templates…"
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

          {/* Tier Pills */}
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
            {(["all", "free", "paid", "premium"] as const).map((t) => {
              const active = tierFilter === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTierFilter(t);
                    setPage(1);
                  }}
                  style={{
                    border: "none",
                    background: active ? "var(--surface)" : "transparent",
                    color: active ? "var(--ink)" : "var(--muted)",
                    fontWeight: active ? 700 : 500,
                    fontSize: 12.5,
                    padding: "6px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    boxShadow: active ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                    textTransform: "capitalize",
                    transition: "all 0.15s ease",
                  }}
                >
                  {t === "all" ? "All Tiers" : t}
                </button>
              );
            })}
          </div>

          {/* View mode toggle */}
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
              title="Spacious Grid"
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
              onClick={() => setViewMode("compact")}
              title="Compact Grid"
              style={{
                border: "none",
                background: viewMode === "compact" ? "var(--surface)" : "transparent",
                color: viewMode === "compact" ? "var(--ink)" : "var(--muted)",
                padding: "6px 10px",
                borderRadius: 8,
                cursor: "pointer",
                boxShadow: viewMode === "compact" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <LayoutTemplate size={15} />
            </button>
          </div>
        </div>

        {/* Toolbar Row 2: Category Chips Ribbon */}
        {allCategories.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 2,
              scrollbarWidth: "none",
            }}
          >
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>
              Categories:
            </span>

            <button
              type="button"
              onClick={() => {
                setCategory("all");
                setPage(1);
              }}
              style={{
                flexShrink: 0,
                border: "1px solid",
                borderColor: category === "all" ? "var(--ink)" : "var(--line-2)",
                background: category === "all" ? "var(--ink)" : "var(--surface)",
                color: category === "all" ? "#ffffff" : "var(--ink)",
                fontSize: 12,
                fontWeight: category === "all" ? 700 : 500,
                padding: "4px 12px",
                borderRadius: 999,
                cursor: "pointer",
              }}
            >
              All
            </button>

            {allCategories.map((c) => {
              const active = category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCategory(active ? "all" : c);
                    setPage(1);
                  }}
                  style={{
                    flexShrink: 0,
                    border: "1px solid",
                    borderColor: active ? "var(--brand)" : "var(--line-2)",
                    background: active ? "var(--brand-050)" : "var(--surface)",
                    color: active ? "var(--brand)" : "var(--ink)",
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    padding: "4px 12px",
                    borderRadius: 999,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: "0 auto 12px" }} />
          <div>Loading assigned templates…</div>
        </div>
      ) : loadError ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ color: "var(--rose)", fontWeight: 600 }}>{loadError}</div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={fetchAssignedTemplates}
            style={{ marginTop: 12 }}
          >
            Try Again
          </button>
        </div>
      ) : rows.length === 0 ? (
        /* Rich Discovery Hero Empty State */
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              background: "linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(124, 58, 237, 0.04) 100%)",
              border: "1px solid var(--brand-100, #e0e3fd)",
              borderRadius: 20,
              padding: "44px 32px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
              overflow: "hidden",
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
              <Sparkles size={28} />
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", margin: "0 0 8px" }}>
              {isFiltered ? "No templates match your filters" : "Supercharge Your Real Estate Marketing"}
            </h2>
            <p style={{ maxWidth: 580, fontSize: 14, color: "var(--ink-2)", margin: "0 0 24px", lineHeight: 1.6 }}>
              {isFiltered
                ? "Try clearing your search query or switching tiers and categories."
                : "Select high-converting landing page designs tailored for luxury residences, commercial spaces, and multi-unit towers. Included in your subscription plan."}
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              {isFiltered ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setSearchInput("");
                    setCategory("all");
                    setTierFilter("all");
                  }}
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={openAddModal}
                  style={{
                    padding: "10px 22px",
                    fontSize: 14,
                    fontWeight: 700,
                    borderRadius: 12,
                    boxShadow: "0 4px 14px rgba(79, 70, 229, 0.35)",
                  }}
                >
                  <Plus size={16} /> Browse &amp; Add Templates from Plan
                </button>
              )}
            </div>
          </div>

          {/* Quick Preview of Available Catalog */}
          {availableData && availableData.data.length > 0 && !isFiltered && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Available in Your Plan Catalog
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={openAddModal}
                  style={{ fontWeight: 600, color: "var(--brand)" }}
                >
                  View All ({availableData.data.length}) →
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                {availableData.data.slice(0, 4).map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="card"
                    style={{
                      padding: 0,
                      borderRadius: 16,
                      overflow: "hidden",
                      border: "1px solid var(--line-2)",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div style={{ position: "relative" }}>
                      <TemplateCover thumbnail={tmpl.thumbnail ?? "hero"} accent="#4f46e5" height={160}>
                        <div style={{ position: "absolute", top: 10, left: 10 }}>
                          <TierBadge tier={tmpl.tier} />
                        </div>
                        {tmpl.category && (
                          <div style={{ position: "absolute", top: 10, right: 10 }}>
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
                              {tmpl.category}
                            </span>
                          </div>
                        )}
                      </TemplateCover>
                    </div>

                    <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{tmpl.name}</div>
                      <div style={{ marginTop: "auto", display: "flex", gap: 6, paddingTop: 6 }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openPreview(tmpl.id)}
                          style={{ flex: 1, justifyContent: "center" }}
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAssignTemplate(tmpl.id)}
                          disabled={assigningId === tmpl.id || tmpl.isLocked}
                          style={{ flex: 1, justifyContent: "center" }}
                        >
                          {assigningId === tmpl.id ? "Adding…" : "+ Add"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Visual Card Gallery Grid of Assigned Templates */
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              viewMode === "compact"
                ? "repeat(auto-fill, minmax(270px, 1fr))"
                : "repeat(auto-fill, minmax(320px, 1fr))",
            gap: viewMode === "compact" ? 16 : 22,
          }}
        >
          {rows.map((row, i) => (
            <OrgVisualTemplateCard
              key={row.id}
              row={row}
              delay={i % 6}
              onPreview={() => openPreview(row.id)}
              onUse={() => openUseTemplate(row.id, row.name)}
              onRemove={() => requestRemoveTemplate(row.id, row.name)}
              removing={removingId === row.id}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {result && Math.ceil(total / LIMIT) > 1 && (
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
            Page {page} of {Math.ceil(total / LIMIT)}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            disabled={page >= Math.ceil(total / LIMIT)}
            onClick={() => setPage((p) => Math.min(Math.ceil(total / LIMIT), p + 1))}
          >
            Next →
          </button>
        </div>
      )}

      {/* Interactive Responsive Device Preview Modal */}
      {previewId && (
        <Modal
          open={!!previewId}
          onClose={closePreview}
          title={previewData?.name ?? previewedTmpl?.name ?? "Template Preview"}
          headerActions={
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {previewedTmpl && <TierBadge tier={previewedTmpl.tier} />}
              {previewedTmpl?.category && (
                <span className="badge b-gray" style={{ fontWeight: 600 }}>
                  {previewedTmpl.category}
                </span>
              )}
            </div>
          }
          footer={
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "space-between" }}>
              {/* Device Viewport Toggle */}
              <div
                style={{
                  display: "inline-flex",
                  background: "var(--surface-2, #f8fafc)",
                  borderRadius: 8,
                  padding: 2,
                  border: "1px solid var(--line-2)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  title="Desktop View"
                  style={{
                    border: "none",
                    background: previewDevice === "desktop" ? "var(--surface)" : "transparent",
                    color: previewDevice === "desktop" ? "var(--brand)" : "var(--muted)",
                    padding: "5px 9px",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  <Monitor size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("tablet")}
                  title="Tablet View"
                  style={{
                    border: "none",
                    background: previewDevice === "tablet" ? "var(--surface)" : "transparent",
                    color: previewDevice === "tablet" ? "var(--brand)" : "var(--muted)",
                    padding: "5px 9px",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  <Tablet size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  title="Mobile View"
                  style={{
                    border: "none",
                    background: previewDevice === "mobile" ? "var(--surface)" : "transparent",
                    color: previewDevice === "mobile" ? "var(--brand)" : "var(--muted)",
                    padding: "5px 9px",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  <Smartphone size={15} />
                </button>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {previewedIsAssigned ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      const id = previewId;
                      const name = previewData?.name ?? previewedTmpl?.name ?? "Landing Page";
                      closePreview();
                      openUseTemplate(id, name);
                    }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}
                  >
                    <Sparkles size={14} /> Use this template
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={async () => {
                      const id = previewId;
                      const ok = await handleAssignTemplate(id);
                      if (ok) closePreview();
                    }}
                    disabled={assigningId === previewId || previewedTmpl?.isLocked}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}
                  >
                    <Plus size={14} /> Add to Workspace
                  </button>
                )}
              </div>
            </div>
          }
        >
          <div
            style={{
              background: "#0f172a",
              borderRadius: 14,
              padding: previewDevice === "desktop" ? "8px" : "24px 12px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 520,
              maxHeight: "75vh",
              overflow: "hidden",
            }}
          >
            {previewLoading ? (
              <div style={{ color: "#ffffff", padding: 40, textAlign: "center" }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                <div>Loading preview canvas…</div>
              </div>
            ) : previewError ? (
              <div style={{ color: "var(--rose)", padding: 20 }}>{previewError}</div>
            ) : previewData ? (
              <div
                style={{
                  width:
                    previewDevice === "desktop"
                      ? "100%"
                      : previewDevice === "tablet"
                      ? 768
                      : 375,
                  height: 520,
                  background: "#ffffff",
                  borderRadius: previewDevice === "desktop" ? 8 : 16,
                  overflowY: "auto",
                  boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
                  transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                  border: previewDevice !== "desktop" ? "8px solid #334155" : "none",
                }}
              >
                <SiteRenderer
                  site={siteFromLandingPage(previewData)}
                  live
                />
              </div>
            ) : null}
          </div>
        </Modal>
      )}

      {/* Add Template Modal */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Templates to Workspace"
        description="Select templates granted under your subscription plan to build landing pages."
        size="lg"
      >
        <div>
          {availableLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
              <div>Loading available plan templates…</div>
            </div>
          ) : availableError ? (
            <div style={{ padding: "16px 0", color: "var(--rose)", fontSize: 13 }}>{availableError}</div>
          ) : availableData ? (
            <div>
              {/* Quota Telemetry Banner */}
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
                    {availableData.planName} Package
                  </span>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    Template Allowance: {availableData.assignedCount} of{" "}
                    {availableData.maxAllowed == null ? "Unlimited" : availableData.maxAllowed} Selected
                  </div>
                </div>
                <span
                  className={`badge ${
                    availableData.remainingQuota === 0
                      ? "b-amber"
                      : availableData.remainingQuota != null
                      ? "b-indigo"
                      : "b-green"
                  }`}
                  style={{ fontWeight: 700 }}
                >
                  {availableData.remainingQuota === 0
                    ? "Quota Reached"
                    : availableData.remainingQuota != null
                    ? `${availableData.remainingQuota} remaining slots`
                    : "Unlimited access"}
                </span>
              </div>

              {/* Filters in modal */}
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
                <select
                  className="inp"
                  style={{ width: 140, height: 36 }}
                  value={addModalTierFilter}
                  onChange={(e) => setAddModalTierFilter(e.target.value)}
                >
                  <option value="all">All Tiers</option>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                  <option value="premium">Premium</option>
                </select>
                <select
                  className="inp"
                  style={{ width: 180, height: 36 }}
                  value={addModalCategoryFilter}
                  onChange={(e) => setAddModalCategoryFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <span className="muted" style={{ fontSize: 12.5, marginLeft: "auto" }}>
                  {filteredAvailable.length} templates
                </span>
              </div>

              {/* Template Cards Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: 14,
                  maxHeight: 440,
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {filteredAvailable.map((tmpl) => {
                  const isAssigned = tmpl.isAssigned;
                  const isQuotaFull = availableData.remainingQuota === 0 && !isAssigned;

                  return (
                    <div
                      key={tmpl.id}
                      style={{
                        border: isAssigned ? "2px solid var(--brand, #4f46e5)" : "1px solid var(--line-2)",
                        borderRadius: 14,
                        overflow: "hidden",
                        background: "var(--surface)",
                        display: "flex",
                        flexDirection: "column",
                        position: "relative",
                      }}
                    >
                      <div style={{ position: "relative" }}>
                        <TemplateCover thumbnail={tmpl.thumbnail ?? "hero"} accent={isAssigned ? "#4f46e5" : "#94a3b8"} height={150}>
                          <div style={{ position: "absolute", top: 8, left: 8 }}>
                            <TierBadge tier={tmpl.tier} />
                          </div>
                          {tmpl.isLocked && (
                            <div
                              style={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                background: "rgba(15, 23, 42, 0.8)",
                                color: "#f59e0b",
                                padding: "3px 8px",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                backdropFilter: "blur(4px)",
                                zIndex: 2,
                              }}
                            >
                              <Lock size={12} /> Locked
                            </div>
                          )}
                        </TemplateCover>
                      </div>

                      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ink)" }}>{tmpl.name}</div>
                        {tmpl.category && (
                          <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{tmpl.category}</div>
                        )}

                        <div style={{ marginTop: "auto", paddingTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            type="button"
                            onClick={() => openPreview(tmpl.id)}
                            style={{ width: "100%", justifyContent: "center" }}
                          >
                            Preview
                          </button>
                          {tmpl.isLocked ? (
                            <button
                              className="btn btn-sm"
                              type="button"
                              onClick={() => {
                                setUpgradePrompt({
                                  title: `${tmpl.tier === "premium" ? "Premium" : "Paid"} Template Locked`,
                                  body:
                                    tmpl.lockReason ??
                                    "This template is not available on your current plan. Please upgrade your subscription to unlock it.",
                                });
                              }}
                              style={{
                                width: "100%",
                                justifyContent: "center",
                                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                                color: "#fff",
                                border: "none",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                fontWeight: 700,
                              }}
                            >
                              <Lock size={13} /> Upgrade to Unlock
                            </button>
                          ) : isAssigned ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 12,
                                fontWeight: 700,
                                color: "var(--brand)",
                                background: "var(--brand-050)",
                                padding: "6px 12px",
                                borderRadius: 8,
                                width: "100%",
                                justifyContent: "center",
                              }}
                            >
                              <Check size={14} /> Added to Workspace
                            </span>
                          ) : (
                            <button
                              className="btn btn-primary btn-sm"
                              type="button"
                              onClick={() => handleAssignTemplate(tmpl.id)}
                              disabled={assigningId === tmpl.id || isQuotaFull}
                              style={{ width: "100%", justifyContent: "center", fontWeight: 700 }}
                            >
                              {assigningId === tmpl.id
                                ? "Adding…"
                                : isQuotaFull
                                ? "Quota Full"
                                : "+ Add to Workspace"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      {/* Use Template Modal */}
      <Modal
        open={!!useTemplate}
        onClose={() => setUseTemplate(null)}
        title="Create Landing Page"
        description={useTemplate ? `Start a new landing page based on "${useTemplate.name}".` : undefined}
        footer={
          <>
            <button className="btn btn-ghost" type="button" onClick={() => setUseTemplate(null)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={useSubmitting}
              onClick={confirmUseTemplate}
              style={{ fontWeight: 700 }}
            >
              {useSubmitting ? "Creating…" : "Create & Launch Builder"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {useError && (
            <div
              style={{
                padding: "8px 12px",
                background: "var(--rose-050)",
                color: "var(--rose)",
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              {useError}
            </div>
          )}
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Landing Page Name</label>
            <input
              className="inp"
              placeholder="e.g. Skyline Residence Launch"
              value={useName}
              onChange={(e) => setUseName(e.target.value)}
              autoFocus
            />
          </div>

          <InventoryBindFields
            accessToken={accessToken}
            value={useBind}
            onChange={setUseBind}
            onAvailabilityChange={setUseHasInventory}
          />
        </div>
      </Modal>

      {/* Remove Confirm Modal */}
      <ConfirmModal
        open={!!removeConfirm}
        title="Remove Template from Workspace?"
        message={
          removeConfirm
            ? `Are you sure you want to remove "${removeConfirm.name}"? You can re-add it anytime if you have quota remaining.`
            : ""
        }
        confirmLabel={removingId ? "Removing…" : "Remove Template"}
        destructive
        onConfirm={confirmRemoveTemplate}
        onClose={() => setRemoveConfirm(null)}
      />

      {/* Remove Blocked Modal */}
      <Modal
        open={!!removeBlocked}
        onClose={() => setRemoveBlocked(null)}
        title="Template In Use"
        footer={
          <button className="btn btn-primary" type="button" onClick={() => setRemoveBlocked(null)}>
            Understood
          </button>
        }
      >
        <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
          {removeBlocked?.message}
        </div>
      </Modal>

      {/* Upgrade Prompt Modal */}
      <Modal
        open={!!upgradePrompt}
        onClose={() => setUpgradePrompt(null)}
        title={upgradePrompt?.title ?? "Subscription Upgrade"}
        footer={
          <>
            <button className="btn btn-ghost" type="button" onClick={() => setUpgradePrompt(null)}>
              Close
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                setUpgradePrompt(null);
                router.push("/org/settings?section=billing");
              }}
              style={{ fontWeight: 700 }}
            >
              View Subscription Plans →
            </button>
          </>
        }
      >
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#fef3c7",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Lock size={20} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
              {upgradePrompt?.body}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* Modern Visual Card for Assigned Org Templates with Hover Quick Overlay */
function OrgVisualTemplateCard({
  row,
  delay,
  onPreview,
  onUse,
  onRemove,
  removing,
}: {
  row: OrgTemplateSummary;
  delay: number;
  onPreview: () => void;
  onUse: () => void;
  onRemove: () => void;
  removing: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Reveal delay={delay}>
      <div
        className="card template-visual-card"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
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
        {/* Cover Preview Container */}
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
              <TierBadge tier={row.tier} />
            </div>

            {row.category && (
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  zIndex: 2,
                }}
              >
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
                  {row.category}
                </span>
              </div>
            )}

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
                onClick={onUse}
                style={{
                  width: "100%",
                  maxWidth: 190,
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
                  transition: "transform 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
              >
                <Sparkles size={14} /> Create Landing Page
              </button>

              <button
                type="button"
                onClick={onPreview}
                style={{
                  width: "100%",
                  maxWidth: 190,
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
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.28)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)")}
              >
                <Eye size={14} /> Quick Preview
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

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "var(--muted)",
                marginTop: 6,
              }}
            >
              <span>Built pages:</span>
              <strong style={{ color: "var(--ink)" }}>{row.landingPageCount}</strong>
            </div>
          </div>

          {/* Action Footer */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 14,
              alignItems: "center",
              paddingTop: 10,
              borderTop: "1px solid var(--line)",
            }}
          >
            <button
              type="button"
              onClick={onUse}
              className="btn btn-primary btn-sm"
              style={{
                flex: 1,
                justifyContent: "center",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 700,
                borderRadius: 9,
              }}
            >
              <Sparkles size={13} /> Use
            </button>

            <button
              type="button"
              onClick={onPreview}
              className="btn btn-ghost btn-sm"
              style={{
                flex: 1,
                justifyContent: "center",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 600,
                borderRadius: 9,
              }}
            >
              <Eye size={13} /> Preview
            </button>

            <button
              type="button"
              onClick={onRemove}
              disabled={removing}
              className="btn btn-ghost btn-sm"
              title="Remove template"
              style={{
                padding: "6px 8px",
                color: "var(--rose)",
                borderRadius: 8,
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
