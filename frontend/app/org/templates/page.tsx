"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutTemplate, Search } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { TemplateCover } from "@/components/superadmin/templates/shared";
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
import type { LandingPageRow, OrgTemplateSummary, OrgTemplatesListResponse } from "@/lib/types";
// Canvas renders using the builder's ps-* classes, which only this route
// needs — every rule in openpage.css is ps-prefixed, so importing it here
// can't leak into the rest of the org shell (same pattern app/org/*
// already uses borrowing superadmin.css from the Super Admin route group).
import "@/app/openpage.css";

const LIMIT = 12;

export default function OrgTemplatesPage() {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [useTemplate, setUseTemplate] = useState<{ id: string; name: string } | null>(null);
  const [useName, setUseName] = useState("");
  const [useBind, setUseBind] = useState<InventoryBindValue>({ kind: "none" });
  const [useHasInventory, setUseHasInventory] = useState(false);
  const [useSubmitting, setUseSubmitting] = useState(false);
  const [useError, setUseError] = useState<string | null>(null);

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

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<OrgTemplatesListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<LandingPageData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!accessToken) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setLoadError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (search) params.set("search", search);
    if (category) params.set("category", category);

    apiFetch<OrgTemplatesListResponse>(`/org/templates?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(setResult)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load templates."))
      .finally(() => setLoading(false));
  }, [accessToken, page, search, category]);

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
  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to = Math.min(page * LIMIT, total);
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const isFiltered = Boolean(search || category);
  const categories = Array.from(
    new Set(rows.map((r) => r.category).filter((c): c is string => Boolean(c))),
  ).sort();

  const previewCfg = previewData ? ensureConfig(previewData) : null;

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">
            <LayoutTemplate size={13} /> Website
          </div>
          <h1>Templates</h1>
          <div className="sub">Ready-made templates granted to your organisation.</div>
        </div>
      </div>

      <Reveal delay={1}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 340 }}>
            <input
              className="inp"
              placeholder="Search templates…"
              style={{ paddingLeft: 38 }}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Search
              size={16}
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--faint)" }}
            />
          </div>
          <select
            style={{ width: 180, flexShrink: 0 }}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <span className="muted" style={{ fontSize: 12.5, marginLeft: "auto" }}>
            {loading ? "Loading…" : `Showing ${from}–${to} of ${total}`}
          </span>
        </div>
      </Reveal>

      {loadError ? (
        <Reveal delay={2}>
          <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
            <div className="muted">{loadError}</div>
          </div>
        </Reveal>
      ) : !loading && rows.length === 0 ? (
        <Reveal delay={2}>
          <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--faint)" }}>
              <LayoutTemplate size={40} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
              {isFiltered ? "No templates match this filter" : "No templates available yet"}
            </div>
            <div className="muted" style={{ fontSize: 13.5 }}>
              {isFiltered
                ? "Try a different search or category."
                : "No templates have been assigned to your organisation yet. Ask your Super Admin to assign published templates."}
            </div>
          </div>
        </Reveal>
      ) : (
        <div className="grid g3">
          {rows.map((row, i) => (
            <OrgTemplateCard
              key={row.id}
              row={row}
              delay={i % 6}
              onPreview={() => openPreview(row.id)}
              onUse={() => openUseTemplate(row.id, row.name)}
            />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
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
      ) : null}

      <Modal
        open={!!previewId}
        onClose={closePreview}
        title={previewData?.name ?? "Loading preview…"}
        size="full"
        flush
        headerActions={
          <button
            className="btn btn-primary btn-sm"
            type="button"
            disabled={!previewData}
            onClick={() => previewData && openUseTemplate(previewData.id, previewData.name)}
          >
            Use this template
          </button>
        }
      >
            <div style={{ flex: 1, overflowY: "auto", background: "#f4f5f8", minHeight: 360 }}>
              {previewLoading ? (
                <div style={{ padding: 60, textAlign: "center", color: "var(--muted, #64748b)" }}>Loading preview…</div>
              ) : previewError ? (
                <div style={{ padding: 60, textAlign: "center", color: "var(--muted, #64748b)" }}>{previewError}</div>
              ) : previewData && previewCfg ? (
                <div className="ps-app">
                  <SiteRenderer
                    site={siteFromLandingPage(previewData)}
                    live
                    pageId={previewData.id}
                    projectName={previewData.name}
                    forms={previewCfg.forms as never}
                  />
                </div>
              ) : null}
            </div>
      </Modal>

      <Modal
        open={!!useTemplate}
        onClose={() => {
          if (!useSubmitting) setUseTemplate(null);
        }}
        title={useTemplate ? `Use “${useTemplate.name}”` : "Use template"}
        description="This creates your own editable copy — the shared template is never changed. Bind a project or standalone unit so only that listing’s details fill the page."
        closeDisabled={useSubmitting}
        containerClassName="z-[60]"
        footer={
          <>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setUseTemplate(null)} disabled={useSubmitting}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" type="button" onClick={confirmUseTemplate} disabled={useSubmitting}>
              {useSubmitting ? "Creating…" : "Create page"}
            </button>
          </>
        }
      >
            <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
              Page name
            </label>
            <input
              className="inp"
              autoFocus
              value={useName}
              onChange={(e) => setUseName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmUseTemplate()}
              disabled={useSubmitting}
            />
            <div style={{ height: 12 }} />
            <InventoryBindFields
              accessToken={accessToken}
              value={useBind}
              onChange={setUseBind}
              disabled={useSubmitting}
              onAvailabilityChange={setUseHasInventory}
            />
            {useError ? (
              <div style={{ color: "var(--rose)", fontSize: 12.5, marginTop: 8 }}>{useError}</div>
            ) : null}
      </Modal>
    </>
  );
}

function OrgTemplateCard({
  row,
  delay,
  onPreview,
  onUse,
}: {
  row: OrgTemplateSummary;
  delay: number;
  onPreview: () => void;
  onUse: () => void;
}) {
  return (
    <Reveal delay={delay}>
      <div className="card hover" style={{ padding: 0, display: "flex", flexDirection: "column", height: "100%" }}>
        <button
          type="button"
          onClick={onPreview}
          title="Preview"
          style={{ display: "block", width: "100%", border: "none", padding: 0, cursor: "pointer", background: "transparent" }}
        >
          <TemplateCover thumbnail={row.thumbnail ?? "hero"} accent="#6D5DFC" />
        </button>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 14.5 }}>{row.name}</span>
              {row.category ? <span className="badge b-indigo">{row.category}</span> : null}
            </div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
              {row.template}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
            <button className="btn btn-ghost btn-sm" type="button" onClick={onPreview}>
              Preview
            </button>
            <button className="btn btn-primary btn-sm" type="button" onClick={onUse}>
              Use this template
            </button>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
