"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutTemplate, Search, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { TemplateCover } from "@/components/superadmin/templates/shared";
import { Canvas } from "@/components/prestate/builder/canvas";
import { ensureConfig } from "@/lib/prestate/site-config";
import { orgBuilderPath } from "@/lib/prestate/paths";
import type { LandingPageData } from "@/lib/prestate/types";
import type { LandingPageRow, OrgTemplateSummary, OrgTemplatesListResponse } from "@/lib/types";
// Canvas renders using the prestate design system's ps-* classes, which only
// this route needs — every rule in prestate.css is ps-prefixed, so importing
// it here can't leak into the rest of the org shell (same pattern app/org/*
// already uses borrowing superadmin.css from the Super Admin route group).
import "@/app/prestate/prestate.css";

const LIMIT = 12;

export default function OrgTemplatesPage() {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [useTemplate, setUseTemplate] = useState<{ id: string; name: string } | null>(null);
  const [useName, setUseName] = useState("");
  const [useSubmitting, setUseSubmitting] = useState(false);
  const [useError, setUseError] = useState<string | null>(null);

  function openUseTemplate(id: string, defaultName: string) {
    setUseTemplate({ id, name: defaultName });
    setUseName(defaultName);
    setUseError(null);
  }

  async function confirmUseTemplate() {
    if (!useTemplate || !accessToken) return;
    if (!useName.trim()) {
      setUseError("Give the page a name");
      return;
    }
    setUseSubmitting(true);
    setUseError(null);
    try {
      const created = await apiFetch<LandingPageRow>("/org/landing-pages", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ templateId: useTemplate.id, name: useName.trim() }),
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
                : "Your platform admin hasn't published any free templates yet — check back soon."}
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

      {previewId ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 400,
            padding: 20,
          }}
          onClick={closePreview}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 16,
              width: "min(1180px, 100%)",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 24px 80px rgba(15,23,42,.35)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 18px",
                borderBottom: "1px solid var(--line)",
                flexShrink: 0,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 14 }}>{previewData?.name ?? "Loading preview…"}</span>
              <button
                className="btn btn-primary btn-sm"
                type="button"
                disabled={!previewData}
                style={{ marginLeft: "auto" }}
                onClick={() => previewData && openUseTemplate(previewData.id, previewData.name)}
              >
                Use this template
              </button>
              <button
                type="button"
                onClick={closePreview}
                style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "inline-flex", padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", background: "#f4f5f8" }}>
              {previewLoading ? (
                <div style={{ padding: 60, textAlign: "center", color: "var(--muted, #64748b)" }}>Loading preview…</div>
              ) : previewError ? (
                <div style={{ padding: 60, textAlign: "center", color: "var(--muted, #64748b)" }}>{previewError}</div>
              ) : previewData && previewCfg ? (
                <div className="ps-app">
                  <Canvas
                    sections={previewData.sections}
                    selectedId={null}
                    device="desktop"
                    readOnly
                    live
                    pageId={previewData.id}
                    theme={{
                      primary: previewCfg.brand.primary,
                      accent: previewCfg.brand.accent,
                      font: previewCfg.brand.bodyFont,
                      headingFont: previewCfg.brand.headingFont,
                      name: previewCfg.brand.name,
                      phone: previewCfg.brand.phone,
                      logo: previewCfg.brand.logo,
                    }}
                    form={previewCfg.form}
                    chrome={{ header: previewCfg.header, footer: previewCfg.footer, brand: previewCfg.brand }}
                    onSelect={() => {}}
                    onMutate={() => {}}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {useTemplate ? (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: 20 }}
          onClick={() => !useSubmitting && setUseTemplate(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: 24, width: 420, maxWidth: "100%", boxShadow: "0 24px 80px rgba(15,23,42,.35)" }}
          >
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Use “{useTemplate.name}”</div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
              This creates your own editable copy — the shared template is never changed, and other organisations using it are unaffected.
            </div>
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
            {useError ? (
              <div style={{ color: "var(--rose)", fontSize: 12.5, marginTop: 8 }}>{useError}</div>
            ) : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setUseTemplate(null)} disabled={useSubmitting}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" type="button" onClick={confirmUseTemplate} disabled={useSubmitting}>
                {useSubmitting ? "Creating…" : "Create page"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
