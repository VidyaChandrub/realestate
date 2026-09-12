"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Code, Copy, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Reveal } from "@/components/superadmin/reveal";
import { useAuth } from "@/lib/auth-context";
import { embedSnippet, iframeSnippet, shortcodeSnippet } from "@/lib/openpage/forms-store";
import {
  createFormDef,
  deleteFormDef,
  duplicateFormDef,
  ensureFormLibrary,
  type BackedForm,
} from "@/lib/openpage/forms-backend";

function formatWhen(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrgFormsPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();

  const [forms, setForms] = useState<BackedForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "disabled">("all");
  const [embedFor, setEmbedFor] = useState<BackedForm | null>(null);
  const [deleteFor, setDeleteFor] = useState<BackedForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2800);
  };

  const canView = hasPermission("forms", "view");

  function refresh(quiet = false) {
    if (!canView) return;
    if (!quiet) {
      setLoading(true);
      setLoadError(null);
    }
    ensureFormLibrary("org")
      .then(setForms)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load forms."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (canView) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setLoading(true);
      setLoadError(null);
      /* eslint-enable react-hooks/set-state-in-effect */
      ensureFormLibrary("org")
        .then(setForms)
        .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load forms."))
        .finally(() => setLoading(false));
    }
  }, [canView]);

  const activeCount = forms.filter((f) => f.enabled !== false).length;

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    return forms.filter((f) => {
      const enabled = f.enabled !== false;
      if (filter === "active" && !enabled) return false;
      if (filter === "disabled" && enabled) return false;
      if (!query) return true;
      const hay = [
        f.name,
        f.description,
        f.id,
        f.embed?.id,
        ...(f.fields ?? []).flatMap((field) => [field.label, field.cssClass, field.type]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [forms, q, filter]);

  async function createForm() {
    setBusy(true);
    try {
      const created = await createFormDef("org", "New enquiry form");
      router.push(`/org/forms/${created.backendId}`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to create form.");
      setBusy(false);
    }
  }

  async function duplicate(id: string) {
    setBusy(true);
    try {
      await duplicateFormDef("org", id);
      notify("Form duplicated");
      refresh(true);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to duplicate form.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(target: BackedForm) {
    setBusy(true);
    try {
      await deleteFormDef("org", target.backendId);
      notify("Form deleted");
      refresh(true);
      setDeleteFor(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to delete form.");
    } finally {
      setBusy(false);
    }
  }

  if (!canView) {
    return (
      <Reveal>
        <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--faint)" }}>
            <Icon name="document" size={40} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Lead Forms are locked</div>
          <div className="muted" style={{ fontSize: 13.5 }}>
            Your role doesn&apos;t include access to lead forms. Ask your organisation admin to grant the &quot;forms&quot; permission.
          </div>
        </div>
      </Reveal>
    );
  }

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">
            <Icon name="document" size={13} /> Website
          </div>
          <h1>Lead Forms</h1>
          <div className="sub">Build lead-capture forms for your landing pages — separate from the Super Admin library.</div>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={createForm} disabled={busy}>
            <Plus size={15} /> Create New Form
          </button>
        </div>
      </div>

      <Reveal delay={1}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: 12, color: "var(--muted)" }} />
            <input
              className="inp"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search forms by name, description, field label, or CSS class…"
              style={{ paddingLeft: 34, width: "100%" }}
            />
          </div>
          {(["all", "active", "disabled"] as const).map((key) => (
            <button
              key={key}
              type="button"
              className={`btn btn-sm ${filter === key ? "btn-dark" : "btn-ghost"}`}
              onClick={() => setFilter(key)}
            >
              {key === "all" ? `All (${forms.length})` : key === "active" ? `Active (${activeCount})` : `Disabled (${forms.length - activeCount})`}
            </button>
          ))}
        </div>
      </Reveal>

      {loadError ? (
        <Reveal delay={2}>
          <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
            <div className="muted">{loadError}</div>
          </div>
        </Reveal>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Form title & status</th>
                <th>Form ID</th>
                <th>Created at</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="muted">Loading forms…</td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">No forms match this search.</td>
                </tr>
              ) : (
                visible.map((form) => (
                  <tr key={form.backendId}>
                    <td>
                      <span className={`b-${form.enabled === false ? "gray" : "green"}`} style={{ display: "inline-block", width: 8, height: 8, borderRadius: 8, marginRight: 8, verticalAlign: "middle" }} />
                      <Link href={`/org/forms/${form.backendId}`} style={{ fontWeight: 800, color: "inherit" }}>
                        {form.name || "Untitled form"}
                      </Link>
                      {form.multiStep ? <span className="chip" style={{ marginLeft: 6 }}>Multi-Step</span> : null}
                      <div className="muted" style={{ marginTop: 4, paddingLeft: 8 }}>
                        {form.description || "—"}
                      </div>
                    </td>
                    <td>
                      <span className="muted">{form.embed?.id || form.id}</span>
                    </td>
                    <td className="muted">{formatWhen(form.createdAt)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link href={`/org/forms/${form.backendId}`} className="btn btn-ghost btn-sm">
                          <Pencil size={12} /> Edit
                        </Link>
                        <button type="button" className="btn btn-ghost btn-sm" title="Embed" onClick={() => setEmbedFor(form)}>
                          <Code size={12} />
                        </button>
                        <Link href={`/org/forms/${form.backendId}?preview=1`} className="btn btn-ghost btn-sm" title="Preview">
                          <Eye size={12} />
                        </Link>
                        <button type="button" className="btn btn-ghost btn-sm" title="Duplicate" disabled={busy} onClick={() => duplicate(form.backendId)}>
                          <Copy size={12} />
                        </button>
                        <button type="button" className="btn btn-danger btn-sm" title="Delete" disabled={busy} onClick={() => setDeleteFor(form)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!embedFor}
        onClose={() => setEmbedFor(null)}
        title={embedFor ? `Embed “${embedFor.name}”` : "Embed form"}
        description="Copy a snippet to drop this form on a landing page or external site."
        size="md"
      >
        {embedFor
          ? (
            [
              ["Form ID (landing pages)", embedFor.id],
              ["Embed ID", embedFor.embed?.id ?? embedFor.id],
              ["HTML", embedSnippet(embedFor.embed?.id || embedFor.id)],
              ["Iframe", iframeSnippet(embedFor.embed?.id || embedFor.id)],
              ["Shortcode", shortcodeSnippet(embedFor.embed?.id || embedFor.id)],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{label}</div>
              <textarea readOnly rows={label === "HTML" || label === "Iframe" ? 3 : 1} value={value} />
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ marginTop: 6 }}
                  onClick={() => {
                    void navigator.clipboard.writeText(value);
                    notify("Copied");
                  }}
                >
                  Copy
                </button>
            </div>
          ))
          : null}
      </Modal>
      <ConfirmModal
        open={!!deleteFor}
        title="Delete form?"
        message={deleteFor ? <>Delete “{deleteFor.name}”? This cannot be undone.</> : null}
        confirmLabel="Delete form"
        destructive
        onConfirm={() => deleteFor && remove(deleteFor)}
        onClose={() => setDeleteFor(null)}
      />

      {toast ? (
        <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 500 }}>
          <div className="card" style={{ padding: "12px 16px", boxShadow: "var(--sh-lg)" }}>{toast}</div>
        </div>
      ) : null}
    </>
  );
}