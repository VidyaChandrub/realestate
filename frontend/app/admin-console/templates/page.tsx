"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  Crown,
  Edit2,
  ExternalLink,
  Eye,
  Filter,
  FolderPlus,
  Grid,
  Layers,
  LayoutTemplate,
  List,
  Monitor,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Tablet,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { CountUp } from "@/components/superadmin/count-up";
import { Reveal } from "@/components/superadmin/reveal";
import {
  ACCESS_TIERS,
  accessTierOptionLabel,
  getTemplatePlanOptions,
  buildTemplateRows,
  deriveStats,
  matchesFilter,
  TEMPLATE_FILTERS,
  TemplateCover,
  type TemplateFilter,
  type TemplateRow,
  TierBadge,
  tierStyle,
  StatusBadge,
  manageHref,
} from "@/components/superadmin/templates/shared";
import { TemplateCard } from "@/components/superadmin/templates/template-card";
import { TEMPLATES, buildTemplateSections } from "@/lib/openpage/data";
import {
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  ensurePresetTemplates,
  loadTemplates,
  resetTemplate,
  saveTemplate,
  loadTemplateCategories,
  createTemplateCategory,
  updateTemplateCategory,
  deleteTemplateCategory,
  type TemplateCategory,
} from "@/lib/openpage/persist";
import { builderPath, templatePreviewPath } from "@/lib/openpage/paths";
import { defaultSiteConfig, seedConfigFor } from "@/lib/openpage/site-config";
import { inferDesignId } from "@/lib/openpage/page-templates";
import {
  buildRealEstateTemplate,
  openPageTemplateIdForDesign,
  realEstateTemplateMeta,
} from "@/lib/openpage/re-templates";
import type { LandingPageData, TemplateData } from "@/lib/openpage/types";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SceneImage } from "@/components/openpage/art";
import { apiFetch } from "@/lib/api";
import type { Plan } from "@/lib/types";

function thumbnailFor(id: string): string {
  switch (id) {
    case "premium":
      return "hero";
    case "aurelia-reserve":
      return "/templates/aurelia-reserve.jpg";
    case "vista-framed":
      return "/templates/vista-framed.jpg";
    case "future-home":
      return "/templates/future-home.jpg";
    case "modern-living":
      return "/templates/modern-living.jpg";
    case "investment-hub":
      return "/templates/investment-hub.jpg";
    case "vista-curve":
      return "/templates/vista-curve.jpg";
    case "residential":
      return "tower";
    case "commercial":
      return "commercial";
    case "luxury":
      return "interior";
    case "villa":
      return "villa";
    case "plot":
      return "plots";
    case "launch":
      return "overview";
    case "enquiry":
      return "lobby";
    case "site-visit":
      return "tour";
    case "brochure":
      return "pool";
    case "lead":
      return "garden";
    default:
      return "tower";
  }
}

function TemplateThumb({
  thumbnail,
  accent,
}: {
  thumbnail: string;
  accent?: string;
}) {
  const real = thumbnail.startsWith("/") || thumbnail.startsWith("http");
  if (real) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={thumbnail}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
      />
    );
  }
  return (
    <div style={{ width: "100%", height: "100%", background: accent || "#1e293b", position: "relative" }}>
      <SceneImage art={thumbnail || "hero"} />
    </div>
  );
}

function goToBuilder(pageId: string) {
  window.location.assign(builderPath(pageId));
}

export default function SuperAdminTemplatesPage() {
  const [pages, setPages] = useState<LandingPageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // View modes: "grid" (spacious) | "compact" | "table"
  const [viewMode, setViewMode] = useState<"grid" | "compact" | "table">("grid");

  // Filters
  const [filterIndex, setFilterIndex] = useState(0);
  const [tierFilter, setTierFilter] = useState<"all" | "free" | "paid" | "premium">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Categories
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [catBusy, setCatBusy] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);
  const [editingCat, setEditingCat] = useState<TemplateCategory | null>(null);

  // Create Template Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [designId, setDesignId] = useState("blank");
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [createTier, setCreateTier] = useState<"free" | "paid" | "premium">("free");
  const [createCategoryId, setCreateCategoryId] = useState<string>("");

  // Delete / Reset Confirm
  const [deleteFor, setDeleteFor] = useState<TemplateRow | null>(null);

  // Quick Device Preview Modal
  const [previewRow, setPreviewRow] = useState<TemplateRow | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const reloadCategories = useCallback(() => {
    loadTemplateCategories().then(setCategories).catch(() => { });
  }, []);

  const reloadTemplates = useCallback(() => {
    setLoading(true);
    ensurePresetTemplates()
      .then(setPages)
      .catch(() =>
        loadTemplates()
          .then(setPages)
          .catch(() => setPages([])),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reloadCategories();
    reloadTemplates();
    apiFetch<Plan[]>("/admin/plans")
      .then(setPlans)
      .catch(() => setPlans([]));
    try {
      const flash = window.sessionStorage.getItem("template_flash");
      if (flash) {
        window.sessionStorage.removeItem("template_flash");
        setToast(flash);
        window.setTimeout(() => setToast(null), 3200);
      }
    } catch {
      // ignore
    }
  }, [reloadCategories, reloadTemplates]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const notify = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const handleSaveCategory = async () => {
    if (!catName.trim()) {
      setCatError("Category name is required");
      return;
    }
    setCatBusy(true);
    setCatError(null);
    try {
      if (editingCat) {
        await updateTemplateCategory(editingCat.id, {
          name: catName.trim(),
        });
        notify("Category updated");
      } else {
        await createTemplateCategory({
          name: catName.trim(),
        });
        notify("Category created");
      }
      setCatName("");
      setEditingCat(null);
      reloadCategories();
    } catch (e) {
      setCatError(e instanceof Error ? e.message : "Failed to save category");
    } finally {
      setCatBusy(false);
    }
  };

  const handleDeleteCategory = async (cat: TemplateCategory) => {
    if (!window.confirm(`Delete category "${cat.name}"? Templates in this category will become Unassigned.`)) {
      return;
    }
    try {
      await deleteTemplateCategory(cat.id);
      notify("Category deleted");
      reloadCategories();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed to delete category");
    }
  };

  // Template CRUD actions
  const createFromDesign = useCallback(
    async (
      template: TemplateData,
      name: string,
      tier: "free" | "paid" | "premium" = "free",
      categoryId?: string,
    ) => {
      const label = name?.trim();
      if (!label) {
        throw new Error("Template name is required");
      }
      const slug =
        label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "new-template";
      const config = seedConfigFor({
        id: "",
        name: label,
        slug,
        status: "draft",
        template: template.name,
        domain: "",
        views: "—",
        conversions: "—",
        updated: "",
        thumbnail: template.thumbnail,
        sections: [],
        designId: template.id,
        kind: "custom",
      });
      const created = await createTemplate({
        name: label,
        slug,
        designId: template.id,
        template: template.name,
        kind: "custom",
        tier,
        categoryId: categoryId || undefined,
        sections: buildTemplateSections(template.id),
        config,
        openPageSite: buildRealEstateTemplate(openPageTemplateIdForDesign(template.id), label),
      });
      setPages((prev) => [created, ...prev]);
      notify(`Created "${label}"`);
      goToBuilder(created.id);
    },
    [notify],
  );

  const duplicateRow = useCallback(
    async (row: TemplateRow) => {
      if (!row.pageId) return;
      const copy = await duplicateTemplate(row.pageId);
      setPages((prev) => [copy, ...prev]);
      notify("Template duplicated");
      goToBuilder(copy.id);
    },
    [notify],
  );

  const setStatus = useCallback(
    async (pageId: string, status: LandingPageData["status"]) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;
      const updated = await saveTemplate({ ...page, status });
      setPages((prev) => prev.map((p) => (p.id === pageId ? updated : p)));
      notify(status === "published" ? "Published" : "Unpublished");
    },
    [pages, notify],
  );

  const deleteRow = useCallback(
    async (row: TemplateRow) => {
      const pageId = row.pageId;
      if (!pageId) return;
      await deleteTemplate(pageId);
      setPages((prev) => prev.filter((p) => p.id !== pageId));
      notify("Template deleted");
      setDeleteFor(null);
    },
    [notify],
  );

  const resetRow = useCallback(
    async (row: TemplateRow) => {
      const pageId = row.pageId;
      if (!pageId) return;
      const design = row.designId ?? inferDesignId(row.name);
      const updated = await resetTemplate(pageId, {
        sections: buildTemplateSections(design),
        config: seedConfigFor({
          id: pageId,
          name: row.name,
          slug: "",
          status: "draft",
          template: row.name,
          domain: "",
          views: "—",
          conversions: "—",
          updated: "",
          thumbnail: "",
          sections: [],
          designId: design,
          kind: "preset",
        }),
        openPageSite: buildRealEstateTemplate(openPageTemplateIdForDesign(design), row.name),
      });
      setPages((prev) => prev.map((p) => (p.id === pageId ? updated : p)));
      notify("Predefined template reset");
      setDeleteFor(null);
    },
    [notify],
  );

  const rows = useMemo(() => buildTemplateRows(pages), [pages]);
  const stats = useMemo(() => deriveStats(rows), [rows]);

  // Plan tier counts
  const tierCounts = useMemo(() => {
    let free = 0;
    let paid = 0;
    let premium = 0;
    for (const r of rows) {
      const t = r.tier ?? "free";
      if (t === "free") free++;
      else if (t === "paid") paid++;
      else if (t === "premium") premium++;
    }
    return { free, paid, premium };
  }, [rows]);

  // Subscription plan tiers dynamically derived from active plans
  const planOptions = useMemo(() => getTemplatePlanOptions(plans), [plans]);
  const freeOption = planOptions.find((o) => o.tier === "free");
  const paidOption = planOptions.find((o) => o.tier === "paid");
  const premOption = planOptions.find((o) => o.tier === "premium");

  const filter = TEMPLATE_FILTERS[filterIndex] ?? "All";

  // Visible rows after all filters
  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          matchesFilter(r, filter) &&
          (tierFilter === "all" || (r.tier ?? "free") === tierFilter) &&
          (categoryFilter === "all" || r.category === categoryFilter || r.categoryId === categoryFilter) &&
          (!search ||
            r.name.toLowerCase().includes(search) ||
            r.source.toLowerCase().includes(search) ||
            r.description.toLowerCase().includes(search)),
      ),
    [rows, filter, tierFilter, categoryFilter, search],
  );

  // Category counts
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      const cat = r.category || "Unassigned";
      map[cat] = (map[cat] ?? 0) + 1;
    }
    return map;
  }, [rows]);

  const blankBase: TemplateData = useMemo(
    () => ({
      id: "blank",
      name: "Blank canvas",
      category: "Real Estate",
      icon: "LayoutTemplate",
      pages: 1,
      conversions: "—",
      accent: "#6D5DFC",
      accent2: "#1e293b",
      thumbnail: "hero",
      description: "Empty page — add sections in the builder",
    }),
    [],
  );

  const submitCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setCreateError("Template name is required");
      return;
    }
    setCreateBusy(true);
    setCreateError(null);
    try {
      const meta = realEstateTemplateMeta.find((t) => t.id === designId);
      const base: TemplateData = meta
        ? {
          ...blankBase,
          id: meta.id,
          name: meta.name,
          description: meta.description,
          thumbnail: thumbnailFor(meta.id),
        }
        : TEMPLATES.find((t) => t.id === designId) ?? blankBase;
      await createFromDesign(base, trimmed, createTier, createCategoryId);
      setCreateOpen(false);
      setNewName("");
      setDesignId("blank");
      setCreateTier("free");
      setCreateCategoryId("");
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create template");
    } finally {
      setCreateBusy(false);
    }
  };

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
              color: "var(--brand, #0f1424)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            <LayoutTemplate size={13} />
            <span>TEMPLATE STUDIO &amp; TAXONOMY</span>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#10b981",
                display: "inline-block",
                marginLeft: 4,
              }}
            />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            Template Management
          </h1>
          <div className="sub" style={{ marginTop: 4, maxWidth: 680, fontSize: 13.5, color: "var(--muted)" }}>
            Govern, preview, and categorize landing page designs across Free Plan, Paid, and Premium tiers.
          </div>
        </div>

        {/* Global Header Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={reloadTemplates}
            title="Refresh templates"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 10 }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setEditingCat(null);
              setCatName("");
              setCatError(null);
              setCatModalOpen(true);
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 10 }}
          >
            <Settings2 size={14} /> Categories ({categories.length})
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setNewName("");
              setCreateError(null);
              setDesignId("blank");
              setCreateTier("free");
              setCreateCategoryId("");
              setCreateOpen(true);
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 10, fontWeight: 700 }}
          >
            <Plus size={16} /> Create Template
          </button>
        </div>
      </div>

      {/* Metric Counters Banner */}
      <Reveal delay={1}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {/* Card: Total */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line-2)",
              borderRadius: 14,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>Total Templates</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>
                <CountUp value={stats.total} />
              </div>
            </div>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--brand-050)",
                color: "var(--brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LayoutTemplate size={18} />
            </div>
          </div>

          {/* Card: Free Plan / Fixed Tier */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line-2)",
              borderRadius: 14,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              borderColor: tierFilter === "free" ? "var(--green)" : "var(--line-2)",
            }}
            onClick={() => setTierFilter(tierFilter === "free" ? "all" : "free")}
          >
            <div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>
                {freeOption?.badgeLabel || "Free Plan"}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)", marginTop: 2 }}>
                <CountUp value={tierCounts.free} />
              </div>
            </div>
            <span className="badge b-green" style={{ fontWeight: 700 }}>
              {freeOption?.badgeLabel || "Free Plan"}
            </span>
          </div>

          {/* Card: Paid Plans */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line-2)",
              borderRadius: 14,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              borderColor: tierFilter === "paid" ? "var(--indigo, #0f1424)" : "var(--line-2)",
            }}
            onClick={() => setTierFilter(tierFilter === "paid" ? "all" : "paid")}
          >
            <div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>
                {paidOption?.badgeLabel || "Paid Plans"}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--brand)", marginTop: 2 }}>
                <CountUp value={tierCounts.paid} />
              </div>
            </div>
            <span className="badge b-indigo" style={{ fontWeight: 700 }}>
              {paidOption?.badgeLabel || "Paid"}
            </span>
          </div>

          {/* Card: Premium / Top Tier */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line-2)",
              borderRadius: 14,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              borderColor: tierFilter === "premium" ? "var(--violet)" : "var(--line-2)",
            }}
            onClick={() => setTierFilter(tierFilter === "premium" ? "all" : "premium")}
          >
            <div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>
                {premOption?.badgeLabel || "Ultra Pro"}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--violet)", marginTop: 2 }}>
                <CountUp value={tierCounts.premium} />
              </div>
            </div>
            <span className="badge b-violet" style={{ fontWeight: 700 }}>
              {premOption?.badgeLabel || "Ultra Pro"}
            </span>
          </div>

          {/* Card: Categories */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line-2)",
              borderRadius: 14,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
            onClick={() => setCatModalOpen(true)}
          >
            <div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>Taxonomy</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>
                <CountUp value={categories.length} />
              </div>
            </div>
            <span className="badge b-gray" style={{ fontWeight: 600 }}>
              Categories
            </span>
          </div>
        </div>
      </Reveal>

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
        {/* Toolbar Top Row: Search & Tier Pills & Views */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {/* Search Input */}
          <div
            style={{
              position: "relative",
              minWidth: 240,
              maxWidth: 320,
              flex: 1,
            }}
          >
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
              placeholder="Search templates, styles, tags…"
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

          {/* Tier Filter Pills */}
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
              const count =
                t === "all"
                  ? stats.total
                  : t === "free"
                    ? tierCounts.free
                    : t === "paid"
                      ? tierCounts.paid
                      : tierCounts.premium;

              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTierFilter(t)}
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
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s ease",
                    textTransform: "none",
                  }}
                >
                  {t === "all"
                    ? "All Tiers"
                    : t === "free"
                      ? (freeOption?.badgeLabel || "Free Plan")
                      : t === "paid"
                        ? (paidOption?.badgeLabel || "Paid")
                        : (premOption?.badgeLabel || "Ultra Pro")}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 999,
                      background: active ? "var(--brand-050)" : "rgba(0,0,0,0.05)",
                      color: active ? "var(--brand)" : "var(--muted)",
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Kind Filter Pills */}
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
            {TEMPLATE_FILTERS.map((label, idx) => {
              const active = filterIndex === idx;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setFilterIndex(idx)}
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
                    transition: "all 0.15s ease",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle */}
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
              title="Spacious Grid View"
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
              title="Compact Grid View"
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

        {/* Toolbar Row 2: Sticky Category Chips Ribbon */}
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
            onClick={() => setCategoryFilter("all")}
            style={{
              flexShrink: 0,
              border: "none",
              background: categoryFilter === "all" ? "var(--ink)" : "var(--surface)",
              color: categoryFilter === "all" ? "#ffffff" : "var(--ink)",
              fontSize: 12,
              fontWeight: categoryFilter === "all" ? 700 : 500,
              padding: "4px 12px",
              borderRadius: 999,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: categoryFilter === "all" ? "var(--ink)" : "var(--line-2)",
            }}
          >
            All Categories ({rows.length})
          </button>

          {categories.map((c) => {
            const count = categoryCounts[c.name] ?? 0;
            const active = categoryFilter === c.name || categoryFilter === c.id;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryFilter(active ? "all" : c.name)}
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
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
              >
                <span>{c.name}</span>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 999,
                    background: active ? "var(--brand)" : "var(--line-2)",
                    color: active ? "#ffffff" : "var(--muted)",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setEditingCat(null);
              setCatName("");
              setCatError(null);
              setCatModalOpen(true);
            }}
            style={{
              flexShrink: 0,
              border: "1px dashed var(--line-2)",
              background: "transparent",
              color: "var(--muted)",
              fontSize: 11.5,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: 999,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Plus size={12} /> Add Category
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: "0 auto 12px" }} />
          <div>Loading template gallery…</div>
        </div>
      ) : visible.length === 0 ? (
        <div
          style={{
            background: "var(--surface)",
            border: "1px dashed var(--line-2)",
            borderRadius: 18,
            padding: "48px 24px",
            textAlign: "center",
            maxWidth: 500,
            margin: "40px auto",
          }}
        >
          <LayoutTemplate size={40} style={{ color: "var(--muted)", margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No templates found</h3>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
            No templates match the selected tier, category, or search filters.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearchInput("");
                setTierFilter("all");
                setCategoryFilter("all");
                setFilterIndex(0);
              }}
            >
              Reset filters
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={14} /> Create template
            </button>
          </div>
        </div>
      ) : viewMode === "table" ? (
        /* Dense Data Table View */
        <div className="card" style={{ padding: 0, overflow: "hidden", borderRadius: 16 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="tbl" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: 64 }}>Preview</th>
                  <th>Template Name</th>
                  <th>Category</th>
                  <th>Plan Access</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.key}>
                    <td>
                      <div
                        style={{
                          width: 52,
                          height: 34,
                          borderRadius: 6,
                          overflow: "hidden",
                          background: r.accent,
                          position: "relative",
                        }}
                      >
                        <TemplateThumb thumbnail={r.thumbnail || "hero"} accent={r.accent} />
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => goToBuilder(r.pageId || r.designId)}
                        style={{
                          border: "none",
                          background: "transparent",
                          fontWeight: 700,
                          fontSize: 14,
                          color: "var(--ink)",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        {r.name}
                      </button>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{r.description}</div>
                    </td>
                    <td>
                      {r.category ? (
                        <span className="badge b-gray" style={{ fontWeight: 600 }}>
                          {r.category}
                        </span>
                      ) : (
                        <span style={{ color: "var(--faint)", fontSize: 12 }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <TierBadge tier={r.tier} plans={plans} />
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{r.source}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <button
                          type="button"
                          className="btn btn-soft btn-sm"
                          onClick={() => goToBuilder(r.pageId || r.designId)}
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setPreviewRow(r)}
                        >
                          <Eye size={12} /> Preview
                        </button>
                        {r.pageId && (
                          <Link href={manageHref(r.pageId)} className="btn btn-ghost btn-sm" title="Settings">
                            <Settings2 size={12} />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Visual Card Showcase Grid */
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              viewMode === "compact"
                ? "repeat(auto-fill, minmax(260px, 1fr))"
                : "repeat(auto-fill, minmax(320px, 1fr))",
            gap: viewMode === "compact" ? 16 : 22,
          }}
        >
          {visible.map((r, i) => (
            <TemplateCard
              key={r.key}
              row={r}
              plans={plans}
              delay={i % 9}
              onEdit={() => {
                if (r.pageId) {
                  goToBuilder(r.pageId);
                } else {
                  setDesignId(r.designId);
                  setNewName(r.name);
                  setCreateOpen(true);
                }
              }}
              onPreview={() => window.open(templatePreviewPath(r.pageId || r.designId), "_blank")}
              onQuickPreview={() => setPreviewRow(r)}
              onDuplicate={() => duplicateRow(r)}
              onPublish={r.pageId && r.status !== "published" ? () => setStatus(r.pageId!, "published") : undefined}
              onUnpublish={r.pageId && r.status === "published" ? () => setStatus(r.pageId!, "draft") : undefined}
              onRemove={r.pageId ? () => setDeleteFor(r) : undefined}
            />
          ))}
        </div>
      )}

      {/* Interactive Responsive Device Preview Modal */}
      {previewRow && (
        <Modal
          open={!!previewRow}
          onClose={() => setPreviewRow(null)}
          title={previewRow.name}
          headerActions={
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <TierBadge tier={previewRow.tier} plans={plans} />
              {previewRow.category && (
                <span className="badge b-gray" style={{ fontWeight: 600 }}>
                  {previewRow.category}
                </span>
              )}
            </div>
          }
          footer={
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "space-between" }}>
              {/* Device switcher */}
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
                  title="Desktop View (100%)"
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
                  title="Tablet View (768px)"
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
                  title="Mobile View (375px)"
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

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => window.open(templatePreviewPath(previewRow.pageId || previewRow.designId), "_blank")}
              >
                <ExternalLink size={13} /> Fullscreen
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const target = previewRow.pageId || previewRow.designId;
                  setPreviewRow(null);
                  goToBuilder(target);
                }}
              >
                <Edit2 size={13} /> Open in Builder
              </button>
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
                overflow: "hidden",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
                transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                border: previewDevice !== "desktop" ? "8px solid #334155" : "none",
              }}
            >
              <iframe
                src={templatePreviewPath(previewRow.pageId || previewRow.designId)}
                title={previewRow.name}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Category Management Modal */}
      <Modal
        open={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        title="Manage Template Categories & Taxonomy"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Create / Edit Form */}
          <div
            style={{
              background: "var(--surface-2, #f8fafc)",
              border: "1px solid var(--line-2)",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
              {editingCat ? `Edit Category: "${editingCat.name}"` : "Add New Template Category"}
            </div>
            {catError && (
              <div style={{ color: "var(--rose)", fontSize: 12, marginBottom: 10 }}>
                {catError}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "flex-end" }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 12 }}>Category Name</label>
                <input
                  type="text"
                  className="inp"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Commercial, Luxury Villas…"
                  style={{ height: 38 }}
                />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveCategory}
                  disabled={catBusy}
                  style={{ height: 38 }}
                >
                  {editingCat ? "Update" : "Add"}
                </button>
                {editingCat && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setEditingCat(null);
                      setCatName("");
                    }}
                    style={{ height: 38 }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Categories List Table */}
          <div style={{ border: "1px solid var(--line-2)", borderRadius: 12, overflow: "hidden" }}>
            <table className="tbl" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Templates Count</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>
                      No categories created yet.
                    </td>
                  </tr>
                ) : (
                  categories.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>
                        <span style={{ fontSize: 12.5, fontWeight: 700 }}>
                          {categoryCounts[c.name] ?? 0} templates
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setEditingCat(c);
                              setCatName(c.name);
                            }}
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleDeleteCategory(c)}
                            style={{ color: "var(--rose)" }}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Create Template Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create New Landing Page Template"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setCreateOpen(false)} disabled={createBusy}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={submitCreate}
              disabled={createBusy || !newName.trim()}
            >
              {createBusy ? "Creating…" : "Create & Open Builder"}
            </button>
          </>
        }
      >
        {createError && (
          <div
            style={{
              color: "var(--rose)",
              background: "rgba(244,63,94,0.08)",
              border: "1px solid rgba(244,63,94,0.2)",
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 12.5,
              marginBottom: 14,
            }}
          >
            {createError}
          </div>
        )}

        <div className="field">
          <label>
            Template name <span style={{ color: "var(--rose)", fontWeight: 700 }}>*</span>
          </label>
          <input
            autoFocus
            className="inp"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              if (createError) setCreateError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitCreate();
            }}
            placeholder="e.g. Luxury Penthouse Showcase"
            required
          />
        </div>

        <div className="row2" style={{ marginBottom: 16 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Category <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span></label>
            <select
              className="inp"
              value={createCategoryId}
              onChange={(e) => {
                setCreateCategoryId(e.target.value);
              }}
            >
              <option value="">Unassigned</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Subscription Plan Access</label>
            <select
              className="inp"
              value={createTier}
              onChange={(e) => setCreateTier(e.target.value as any)}
            >
              {planOptions.map((opt) => (
                <option key={opt.tier} value={opt.tier}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Delete / Reset Confirmation Modal */}
      <ConfirmModal
        open={!!deleteFor}
        title={deleteFor?.kind === "preset" ? "Reset predefined template?" : "Delete template?"}
        message={
          deleteFor?.kind === "preset"
            ? `Are you sure you want to reset "${deleteFor?.name}" to its original design? Any custom builder edits will be reverted.`
            : `Are you sure you want to delete "${deleteFor?.name}"? Any landing pages currently using this template will retain their static content.`
        }
        confirmLabel={deleteFor?.kind === "preset" ? "Reset to original" : "Delete template"}
        destructive={deleteFor?.kind !== "preset"}
        onConfirm={() => {
          if (deleteFor?.kind === "preset") {
            resetRow(deleteFor);
          } else if (deleteFor) {
            deleteRow(deleteFor);
          }
        }}
        onClose={() => setDeleteFor(null)}
      />

      {/* Toast Notification */}
      {toast ? (
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
      ) : null}
    </div>
  );
}