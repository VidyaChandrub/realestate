"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Code, Copy, Eye, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Icon } from "@/components/icons";
import {
  deleteForm,
  duplicateForm,
  embedSnippet,
  iframeSnippet,
  loadFormLibrary,
  newFormDefinition,
  saveFormLibrary,
  shortcodeSnippet,
  type FormDefinition,
} from "@/lib/openpage/forms-store";
import { sampleBuilderForms } from "@/lib/openpage/sample-forms";

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

function ensureLibrary(): FormDefinition[] {
  const lib = loadFormLibrary();
  if (lib.length > 0) return lib;
  const seeded = sampleBuilderForms();
  saveFormLibrary(seeded);
  return seeded;
}

export default function SuperAdminFormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "disabled">("all");
  const [embedFor, setEmbedFor] = useState<FormDefinition | null>(null);

  function refresh() {
    setForms(ensureLibrary());
  }

  useEffect(() => {
    refresh();
  }, []);

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

  function createForm() {
    const created = newFormDefinition(undefined, "New enquiry form");
    saveFormLibrary([created, ...loadFormLibrary()]);
    router.push(`/admin-console/forms/${created.id}`);
  }

  return (
    <div>
      <Toaster theme="light" position="bottom-right" />
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <Icon name="document" size={14} /> Lead capture & landing page forms
          </div>
          <h1>Lead Forms</h1>
        </div>
        <div className="actions">
          <span className="fb-live">{activeCount} active forms</span>
          <button type="button" className="btn btn-primary" onClick={createForm}>
            <Plus size={15} /> Create New Form
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div className="search" style={{ flex: 1, minWidth: 240, position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: 12, color: "var(--muted)" }} />
          <input
            className="inp"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search forms by name, description, field label, or CSS class…"
            style={{ paddingLeft: 34, width: "100%" }}
          />
        </div>
        <div className="fb-seg">
          <button type="button" className={filter === "all" ? "is-on" : ""} onClick={() => setFilter("all")}>
            All ({forms.length})
          </button>
          <button type="button" className={filter === "active" ? "is-on" : ""} onClick={() => setFilter("active")}>
            Active ({activeCount})
          </button>
          <button type="button" className={filter === "disabled" ? "is-on" : ""} onClick={() => setFilter("disabled")}>
            Disabled ({forms.length - activeCount})
          </button>
        </div>
      </div>

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
            {visible.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">No forms match this search.</td>
              </tr>
            ) : (
              visible.map((form) => (
                <tr key={form.id}>
                  <td>
                    <span className={`fb-dot ${form.enabled === false ? "off" : ""}`} />
                    <Link href={`/admin-console/forms/${form.id}`} style={{ fontWeight: 800, color: "inherit" }}>
                      {form.name || "Untitled form"}
                    </Link>
                    {form.multiStep ? <span className="fb-chip">Multi-Step</span> : null}
                    <div className="muted" style={{ marginTop: 4, paddingLeft: 16 }}>
                      {form.description || "—"}
                    </div>
                  </td>
                  <td>
                    <span className="fb-list-id">{form.embed?.id || form.id}</span>
                  </td>
                  <td className="muted">{formatWhen(form.createdAt)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Link href={`/admin-console/forms/${form.id}`} className="btn btn-ghost" style={{ padding: "8px 12px" }}>
                        <Pencil size={13} /> Edit
                      </Link>
                      <button type="button" className="fb-icon-btn" title="Embed" onClick={() => setEmbedFor(form)}>
                        <Code size={14} />
                      </button>
                      <Link href={`/admin-console/forms/${form.id}?preview=1`} className="fb-icon-btn" title="Preview">
                        <Eye size={14} />
                      </Link>
                      <button
                        type="button"
                        className="fb-icon-btn"
                        title="Duplicate"
                        onClick={() => {
                          const copy = duplicateForm(form.id);
                          refresh();
                          if (copy) toast.success("Form duplicated");
                        }}
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        type="button"
                        className="fb-icon-btn danger"
                        title="Delete"
                        onClick={() => {
                          if (!window.confirm(`Delete “${form.name}”?`)) return;
                          deleteForm(form.id);
                          refresh();
                          toast.success("Form deleted");
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {embedFor ? (
        <div className="fb-modal" onClick={() => setEmbedFor(null)}>
          <div className="fb-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="fb-modal-h">
              <div>
                <div className="eyebrow">Embed form</div>
                <b>{embedFor.name}</b>
              </div>
              <button type="button" className="fb-icon-btn" onClick={() => setEmbedFor(null)}>
                <X size={14} />
              </button>
            </div>
            {[
              ["Form ID (landing pages)", embedFor.id],
              ["Embed ID", embedFor.embed?.id ?? embedFor.id],
              ["HTML", embedSnippet(embedFor.embed?.id || embedFor.id)],
              ["Iframe", iframeSnippet(embedFor.embed?.id || embedFor.id)],
              ["Shortcode", shortcodeSnippet(embedFor.embed?.id || embedFor.id)],
            ].map(([label, value]) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div className="muted" style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{label}</div>
                <textarea readOnly rows={label === "HTML" || label === "Iframe" ? 3 : 1} value={value} />
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ marginTop: 6 }}
                  onClick={() => {
                    void navigator.clipboard.writeText(value);
                    toast.success("Copied");
                  }}
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
