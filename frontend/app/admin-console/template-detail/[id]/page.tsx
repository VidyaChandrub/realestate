"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Copy, Eye, LayoutTemplate, Pencil, X } from "lucide-react";
import { Reveal } from "@/components/superadmin/reveal";
import { StatusBadge, TemplateCover, manageHref, statusStyle } from "@/components/superadmin/templates/shared";
import { loadTemplate, duplicateTemplate, saveTemplate } from "@/lib/prestate/persist";
import { builderPath, localPreviewPath } from "@/lib/prestate/paths";
import { ensureConfig } from "@/lib/prestate/site-config";
import type { LandingPageData } from "@/lib/prestate/types";

type Tab = "overview" | "settings" | "preview";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "settings", label: "Settings" },
  { key: "preview", label: "Preview" },
];

const STATUS_OPTIONS: LandingPageData["status"][] = ["draft", "published", "unpublished"];

export default function SuperAdminTemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [template, setTemplate] = useState<LandingPageData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [toast, setToast] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);

  // Editable draft
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<LandingPageData["status"]>("draft");
  const [domain, setDomain] = useState("");
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    loadTemplate(params.id).then((t) => {
      /* eslint-disable react-hooks/set-state-in-effect */
      setTemplate(t);
      setLoaded(true);
      /* eslint-enable react-hooks/set-state-in-effect */
    });
  }, [params.id]);

  useEffect(() => {
    if (!template) return;
    // Seed the editable draft from the loaded template.
    /* eslint-disable react-hooks/set-state-in-effect */
    setName(template.name);
    setSlug(template.slug);
    setStatus(template.status);
    setDomain(template.domain);
    setIsPaid(template.isPaid ?? false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [template]);

  function notify(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(null), 3000);
  }

  if (loaded && !template) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--faint)" }}>
          <LayoutTemplate size={40} />
        </div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Template not found</div>
        <div className="muted" style={{ fontSize: 13.5, marginBottom: 18 }}>
          It may have been deleted or reset. Head back to Template Management.
        </div>
        <Link href="/admin-console/templates" className="btn btn-primary">
          ← Back to templates
        </Link>
      </div>
    );
  }

  if (!template) return null;

  const cfg = ensureConfig(template);
  const dirty =
    name !== template.name ||
    slug !== template.slug ||
    status !== template.status ||
    domain !== template.domain ||
    isPaid !== (template.isPaid ?? false);

  async function save() {
    if (!template) return;
    const cleanSlug =
      slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || template.slug;
    const updated = await saveTemplate({
      ...template,
      name: name.trim() || template.name,
      slug: cleanSlug,
      status,
      domain: domain.trim(),
      isPaid,
    });
    setTemplate(updated);
    setSlug(cleanSlug);
    notify("Template settings saved");
  }

  async function duplicate() {
    if (!template || duplicating) return;
    setDuplicating(true);
    try {
      const copy = await duplicateTemplate(template.id);
      router.push(manageHref(copy.id));
    } finally {
      setDuplicating(false);
    }
  }

  const previewHref = localPreviewPath(template);

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">
            <Link href="/admin-console/templates" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--brand)" }}>
              <ArrowLeft size={13} /> Template Management
            </Link>
          </div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {template.name}
            <StatusBadge status={template.status} />
          </h1>
          <div className="sub">
            {template.kind === "preset" ? "Predefined template" : "Custom template"} · {template.template}
          </div>
        </div>
        <div className="actions">
          <a className="btn btn-ghost" href={previewHref} target="_blank" rel="noreferrer">
            <Eye size={15} /> Preview
          </a>
          <button type="button" className="btn btn-ghost" disabled={duplicating} onClick={() => void duplicate()}>
            <Copy size={15} /> {duplicating ? "Duplicating…" : "Duplicate"}
          </button>
          <a className="btn btn-primary" href={builderPath(template.id)}>
            <Pencil size={15} /> Edit in builder
          </a>
        </div>
      </div>

      <div className="tabs reveal in">
        {TABS.map((t) => (
          <a key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)} role="button">
            {t.label}
          </a>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="grid g-2-1">
          <Reveal>
            <div className="card">
              <div className="card-h">
                <span className="t">Preview</span>
                <span className="badge b-indigo">{template.kind === "preset" ? "Predefined" : "Custom"}</span>
              </div>
              <div className="card-b">
                <TemplateCover thumbnail={template.thumbnail} accent={cfg.brand.primary} height={320} radius="14px" />
              </div>
            </div>
          </Reveal>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Reveal delay={1}>
              <div className="card">
                <div className="card-h">
                  <span className="t">About</span>
                </div>
                <div className="card-b" style={{ display: "grid", gap: 12 }}>
                  <MetaRow label="Base design" value={template.template} />
                  <MetaRow label="URL slug" value={`/${template.slug}`} mono />
                  <MetaRow label="Domain" value={template.domain || "Not connected"} mono={!!template.domain} />
                  <MetaRow label="Sections" value={`${template.sections.length}`} />
                  <MetaRow label="Last updated" value={template.updated} />
                </div>
              </div>
            </Reveal>

            <Reveal delay={2}>
              <div className="card">
                <div className="card-h">
                  <span className="t">Brand</span>
                </div>
                <div className="card-b" style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 6, background: cfg.brand.primary, border: "1px solid var(--line-2)" }} />
                    <span style={{ fontSize: 13 }}>Primary</span>
                    <span className="muted" style={{ fontSize: 12.5, marginLeft: "auto", fontFamily: "var(--font-mono), monospace" }}>{cfg.brand.primary}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 6, background: cfg.brand.accent, border: "1px solid var(--line-2)" }} />
                    <span style={{ fontSize: 13 }}>Accent</span>
                    <span className="muted" style={{ fontSize: 12.5, marginLeft: "auto", fontFamily: "var(--font-mono), monospace" }}>{cfg.brand.accent}</span>
                  </div>
                  <MetaRow label="Heading font" value={cfg.brand.headingFont} />
                  <MetaRow label="Body font" value={cfg.brand.bodyFont} />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      ) : null}

      {tab === "settings" ? (
        <Reveal>
          <div className="grid g-2-1">
            <div className="card">
              <div className="card-h">
                <span className="t">Template settings</span>
              </div>
              <div className="card-b">
                <div className="field">
                  <label>Template name</label>
                  <input className="inp" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="field">
                  <label>URL slug</label>
                  <input className="inp" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-template" />
                  <div className="hint">Preview at {localPreviewPath({ slug: slug || template.slug })}</div>
                </div>
                <div className="row2">
                  <div className="field">
                    <label>Status</label>
                    <select className="inp" value={status} onChange={(e) => setStatus(e.target.value as LandingPageData["status"])}>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {statusStyle(s).label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Custom domain</label>
                    <input className="inp" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. homes.example.com" />
                  </div>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Pricing</label>
                  <select className="inp" value={isPaid ? "paid" : "free"} onChange={(e) => setIsPaid(e.target.value === "paid")}>
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                  <button type="button" className="btn btn-ghost" disabled={!dirty} onClick={() => {
                    setName(template.name);
                    setSlug(template.slug);
                    setStatus(template.status);
                    setDomain(template.domain);
                    setIsPaid(template.isPaid ?? false);
                  }}>
                    Reset
                  </button>
                  <button type="button" className="btn btn-primary" disabled={!dirty} onClick={() => void save()}>
                    Save changes
                  </button>
                </div>
              </div>
            </div>

            <div className="card" style={{ alignSelf: "start" }}>
              <div className="card-h">
                <span className="t">Sections</span>
                <span className="badge b-gray">{template.sections.length}</span>
              </div>
              <div className="card-b" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {template.sections.length === 0 ? (
                  <span className="muted" style={{ fontSize: 13 }}>No sections yet.</span>
                ) : (
                  template.sections.map((s) => (
                    <span key={s.id} className="badge b-indigo" style={{ fontWeight: 600 }}>
                      {s.label}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </Reveal>
      ) : null}

      {tab === "preview" ? (
        <Reveal>
          <div className="card">
            <div className="card-h">
              <span className="t">Live preview</span>
              <div style={{ display: "flex", gap: 8 }}>
                <a className="btn btn-ghost btn-sm" href={previewHref} target="_blank" rel="noreferrer">
                  Open in new tab ↗
                </a>
                <a className="btn btn-primary btn-sm" href={builderPath(template.id)}>
                  Edit in builder
                </a>
              </div>
            </div>
            <div className="card-b">
              <TemplateCover thumbnail={template.thumbnail} accent={cfg.brand.primary} height={420} radius="14px" />
            </div>
          </div>
        </Reveal>
      ) : null}

      {toast ? (
        <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 500 }}>
          <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", boxShadow: "var(--sh-lg)" }}>
            <CheckCircle2 size={16} style={{ color: "var(--green)", flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{toast}</span>
            <button type="button" onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "inline-flex" }}>
              <X size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span className="muted" style={{ fontSize: 12.5, minWidth: 110 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, marginLeft: "auto", textAlign: "right", fontFamily: mono ? "var(--font-mono), monospace" : "inherit", wordBreak: "break-all" }}>
        {value}
      </span>
    </div>
  );
}
