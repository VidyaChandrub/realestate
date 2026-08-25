"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { Seg } from "@/components/superadmin/seg";
import { orgBuilderPath } from "@/lib/prestate/paths";
import { buildTemplateSections } from "@/lib/prestate/data";
import { defaultSiteConfig } from "@/lib/prestate/site-config";
import { Canvas } from "@/components/prestate/builder/canvas";
import { Icon } from "@/components/icons";
import type { LandingPageRow, LandingPageStatus, OrgLandingPagesListResponse } from "@/lib/types";
import type { SectionInstance, SiteConfig } from "@/lib/prestate/types";
// Canvas renders using the prestate design system's ps-* classes, which only
// this route needs — same pattern /org/templates already uses (those rules
// are all ps-prefixed, so importing it here can't leak into the org shell).
import "@/app/prestate/prestate.css";

interface LandingPageDetail extends LandingPageRow {
  content: { sections: SectionInstance[]; config: SiteConfig };
}

const LIMIT = 20;
const STATUS_TABS = ["All", "Draft", "Pending", "Approved", "Rejected", "Published"] as const;

function statusParamFor(tabIndex: number): LandingPageStatus | undefined {
  switch (tabIndex) {
    case 1: return "draft";
    case 2: return "pending_approval";
    case 3: return "approved";
    case 4: return "rejected";
    case 5: return "published";
    default: return undefined;
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
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function OrgLandingPagesPage() {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [scratchOpen, setScratchOpen] = useState(false);
  const [scratchName, setScratchName] = useState("");
  const [scratchSubmitting, setScratchSubmitting] = useState(false);
  const [scratchError, setScratchError] = useState<string | null>(null);

  const [viewId, setViewId] = useState<string | null>(null);
  const [viewData, setViewData] = useState<LandingPageDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);

  // Editing a published/approved page silently reverts it to draft (see
  // OrgLandingPagesService.update) — this warns before that happens instead
  // of letting Edit navigate straight into the builder.
  const [editWarnTarget, setEditWarnTarget] = useState<{ id: string; name: string } | null>(null);

  const [tabIndex, setTabIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<OrgLandingPagesListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2800);
  };

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

  async function submitForApproval(id: string) {
    if (!accessToken) return;
    setBusyId(id);
    try {
      await apiFetch(`/org/landing-pages/${id}/submit`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
      notify("Submitted for approval");
      fetchList();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to submit.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!accessToken || !deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiFetch(`/org/landing-pages/${deleteTarget.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } });
      notify("Deleted");
      setDeleteTarget(null);
      fetchList();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete.");
    } finally {
      setDeleting(false);
    }
  }

  async function confirmCreateFromScratch() {
    if (!accessToken) return;
    if (!scratchName.trim()) {
      setScratchError("Give the page a name");
      return;
    }
    setScratchSubmitting(true);
    setScratchError(null);
    try {
      const slug = scratchName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "new-page";
      const created = await apiFetch<LandingPageRow>("/org/landing-pages", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          name: scratchName.trim(),
          // Same blank-page factories the Super Admin builder's "create
          // blank template" flow uses — no server-side reimplementation.
          content: {
            sections: buildTemplateSections("tpl-blank"),
            config: defaultSiteConfig({ name: scratchName.trim(), slug }),
          },
        }),
      });
      router.push(orgBuilderPath(created.id));
    } catch (err) {
      setScratchError(err instanceof Error ? err.message : "Failed to create page.");
      setScratchSubmitting(false);
    }
  }

  // Read-only content preview — reuses the exact same "fetch the full
  // record, render it read-only in Canvas inside a modal" mechanism as the
  // Preview button on /org/templates. This is NOT the live public URL:
  // public serving of published pages doesn't exist yet (no subdomains).
  // Once it does, a "View live site" link belongs here alongside this.
  function openView(id: string) {
    if (!accessToken) return;
    setViewId(id);
    setViewData(null);
    setViewError(null);
    setViewLoading(true);
    apiFetch<LandingPageDetail>(`/org/landing-pages/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(setViewData)
      .catch((err) => setViewError(err instanceof Error ? err.message : "Failed to load preview."))
      .finally(() => setViewLoading(false));
  }
  function closeView() {
    setViewId(null);
    setViewData(null);
    setViewError(null);
  }

  function startEdit(row: LandingPageRow) {
    if (row.status === "published" || row.status === "approved") {
      setEditWarnTarget({ id: row.id, name: row.name });
      return;
    }
    router.push(orgBuilderPath(row.id));
  }

  const rows = (result?.data ?? []).filter((r) => r.pageType === "landing");
  const total = result?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to = Math.min(page * LIMIT, total);
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Icon name="document" size={14} /> Website</div>
          <h1>My Landing Pages</h1>
          <div className="sub">Pages you&apos;ve created from your assigned templates — edit, submit for approval, and track review status.</div>
        </div>
        <div className="actions" style={{ display: "flex", gap: 10 }}>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              setScratchName("");
              setScratchError(null);
              setScratchOpen(true);
            }}
          >
            + Create from scratch
          </button>
          <Link className="btn btn-primary" href="/org/templates">+ New from template</Link>
        </div>
      </div>

      <Reveal delay={1}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
          <Seg
            options={[...STATUS_TABS]}
            value={tabIndex}
            onChange={(i) => { setTabIndex(i); setPage(1); }}
          />
          <span className="muted" style={{ fontSize: 12.5, marginLeft: "auto" }}>
            {loading ? "Loading…" : `Showing ${from}–${to} of ${total}`}
          </span>
        </div>
      </Reveal>

      <Reveal delay={2}>
        <div className="card">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Source template</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadError ? (
                  <tr><td colSpan={5} className="muted">{loadError}</td></tr>
                ) : !loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      No landing pages yet. Pick a template from <Link href="/org/templates">Templates</Link> to create your first one.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="nm" style={{ fontWeight: 600 }}>{row.name}</span>
                        <br />
                        <span className="sm muted" style={{ fontSize: 11 }}>{row.slug}</span>
                        {row.status === "rejected" && row.rejectionReason ? (
                          <div style={{ marginTop: 6, fontSize: 12, color: "var(--rose)", background: "var(--rose-050)", padding: "6px 10px", borderRadius: 8, maxWidth: 340 }}>
                            <strong>Rejected:</strong> {row.rejectionReason}
                          </div>
                        ) : null}
                      </td>
                      <td style={{ fontSize: 12.5 }}>
                        {row.sourceTemplate ? (
                          <span className="muted">{row.sourceTemplate.name}</span>
                        ) : (
                          <span className="badge b-indigo" style={{ fontWeight: 600 }}>From scratch</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[row.status]}`}>{STATUS_LABEL[row.status]}</span>
                      </td>
                      <td className="muted" style={{ fontSize: 12.5 }}>{formatDate(row.updatedAt)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          <button className="btn btn-ghost btn-sm" type="button" onClick={() => openView(row.id)}>
                            <Icon name="eye" size={13} /> View
                          </button>
                          <button className="btn btn-ghost btn-sm" type="button" onClick={() => startEdit(row)}>
                            Edit
                          </button>
                          {row.status === "draft" || row.status === "rejected" ? (
                            <button
                              className="btn btn-success btn-sm"
                              disabled={busyId === row.id}
                              onClick={() => submitForApproval(row.id)}
                            >
                              Submit for approval
                            </button>
                          ) : null}
                          {row.status !== "pending_approval" ? (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: "var(--rose)" }}
                              disabled={busyId === row.id}
                              onClick={() => setDeleteTarget({ id: row.id, name: row.name })}
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 ? (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 18px" }}>
              <button className="btn btn-ghost btn-sm" type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                ← Prev
              </button>
              <span className="muted" style={{ fontSize: 12.5, alignSelf: "center" }}>Page {page} of {totalPages}</span>
              <button className="btn btn-ghost btn-sm" type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Next →
              </button>
            </div>
          ) : null}
        </div>
      </Reveal>

      {viewId ? (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 20 }}
          onClick={closeView}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, width: "min(1180px, 100%)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 80px rgba(15,23,42,.35)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{viewData?.name ?? "Loading preview…"}</span>
              <span className="muted" style={{ fontSize: 12 }}>Content preview — not the live public URL</span>
              <button
                type="button"
                onClick={closeView}
                style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "inline-flex", padding: 4 }}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", background: "#f4f5f8" }}>
              {viewLoading ? (
                <div style={{ padding: 60, textAlign: "center", color: "var(--muted, #64748b)" }}>Loading preview…</div>
              ) : viewError ? (
                <div style={{ padding: 60, textAlign: "center", color: "var(--muted, #64748b)" }}>{viewError}</div>
              ) : viewData ? (
                <div className="ps-app">
                  <Canvas
                    sections={viewData.content.sections}
                    selectedId={null}
                    device="desktop"
                    readOnly
                    live
                    pageId={viewData.id}
                    theme={{
                      primary: viewData.content.config.brand.primary,
                      accent: viewData.content.config.brand.accent,
                      font: viewData.content.config.brand.bodyFont,
                      headingFont: viewData.content.config.brand.headingFont,
                      name: viewData.content.config.brand.name,
                      phone: viewData.content.config.brand.phone,
                      logo: viewData.content.config.brand.logo,
                    }}
                    form={viewData.content.config.form}
                    chrome={{ header: viewData.content.config.header, footer: viewData.content.config.footer, brand: viewData.content.config.brand }}
                    onSelect={() => {}}
                    onMutate={() => {}}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {editWarnTarget ? (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 20 }}
          onClick={() => setEditWarnTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 20, padding: 32, width: 440, maxWidth: "100%", boxShadow: "0 24px 80px rgba(15,23,42,.2)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "var(--amber-050)",
                  color: "var(--amber)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 18,
                }}
              >
                <Icon name="alert" size={16} />
              </span>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>Edit &quot;{editWarnTarget.name}&quot;?</h2>
            </div>
            <p style={{ margin: "0 0 6px", color: "var(--ink-2)", fontSize: 13.5, lineHeight: 1.6 }}>
              Any changes you save will return this page to draft and it will need approval again — opening it to look is fine.
            </p>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
              If you only want to look at it, use View instead — it&apos;s read-only.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
              <button className="btn btn-ghost" type="button" onClick={() => setEditWarnTarget(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => {
                  const target = editWarnTarget;
                  setEditWarnTarget(null);
                  if (target) router.push(orgBuilderPath(target.id));
                }}
              >
                Continue to edit
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {scratchOpen ? (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: 20 }}
          onClick={() => !scratchSubmitting && setScratchOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: 24, width: 420, maxWidth: "100%", boxShadow: "0 24px 80px rgba(15,23,42,.35)" }}
          >
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Create a blank page</div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
              Starts with an empty canvas — no template involved. Build it in the builder, then submit it for approval like any other page.
            </div>
            <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
              Page name
            </label>
            <input
              className="inp"
              autoFocus
              value={scratchName}
              onChange={(e) => setScratchName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmCreateFromScratch()}
              disabled={scratchSubmitting}
            />
            {scratchError ? (
              <div style={{ color: "var(--rose)", fontSize: 12.5, marginTop: 8 }}>{scratchError}</div>
            ) : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setScratchOpen(false)} disabled={scratchSubmitting}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" type="button" onClick={confirmCreateFromScratch} disabled={scratchSubmitting}>
                {scratchSubmitting ? "Creating…" : "Create page"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 20 }}
          onClick={() => {
            if (!deleting) setDeleteTarget(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 20, padding: 32, width: 440, maxWidth: "100%", boxShadow: "0 24px 80px rgba(15,23,42,.2)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "var(--rose-050)",
                  color: "var(--rose)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 18,
                }}
              >
                <Icon name="trash" size={14} />
              </span>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>Delete page?</h2>
            </div>
            <p style={{ margin: "0 0 6px", color: "var(--ink-2)", fontSize: 13.5, lineHeight: 1.6 }}>
              <strong>&quot;{deleteTarget.name}&quot;</strong> will be permanently deleted.
            </p>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>This action cannot be undone.</p>

            {deleteError ? (
              <div style={{ color: "var(--rose)", fontSize: 13, marginTop: 12, background: "var(--rose-050)", padding: "8px 12px", borderRadius: 8 }}>
                {deleteError}
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
              <button className="btn btn-ghost" type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </button>
              <button className="btn btn-danger" type="button" onClick={() => void confirmDelete()} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete page"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 500 }}>
          <div className="card" style={{ padding: "12px 16px", boxShadow: "var(--sh-lg)" }}>{toast}</div>
        </div>
      ) : null}
    </>
  );
}
