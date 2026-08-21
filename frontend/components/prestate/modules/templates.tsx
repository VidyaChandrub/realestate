"use client";

import { useState } from "react";
import { Copy, Eye, FilePlus2, Pencil, Plus, Trash2 } from "lucide-react";
import { TEMPLATES } from "@/lib/prestate/data";
import { BLANK_TEMPLATE } from "@/lib/prestate/page-templates";
import { localPreviewPath } from "@/lib/prestate/paths";
import { ensureConfig } from "@/lib/prestate/site-config";
import type { LandingPageData, TemplateData } from "@/lib/prestate/types";
import { ModuleHeader, StatusBadge } from "./shared";
import { Chip, Modal, Btn, TextField } from "@/components/prestate/ui";
import { SceneImage } from "@/components/prestate/art";

function findPreset(pages: LandingPageData[], designId: string) {
  return pages.find((p) => (p.kind ?? "custom") === "preset" && p.designId === designId)
    ?? pages.find((p) => p.designId === designId);
}

export function TemplatesModule({
  pages,
  onCreateFromDesign,
  onOpenBuilder,
  onOpenPreset,
  onPreview,
  onDuplicate,
  onDelete,
  onPublish,
  onUnpublish,
  onSave,
}: {
  pages: LandingPageData[];
  onCreateFromDesign: (design: TemplateData, name: string) => void;
  onOpenBuilder: (pageId: string) => void;
  onOpenPreset: (designId: string) => void;
  onPreview: (pageId: string) => void;
  onDuplicate: (pageId: string) => void;
  onDelete: (pageId: string) => void;
  onPublish: (pageId: string) => void;
  onUnpublish: (pageId: string) => void;
  onSave: (pageId: string) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [designId, setDesignId] = useState("tpl-blank");
  const [newName, setNewName] = useState("");
  const [deleteFor, setDeleteFor] = useState<LandingPageData | null>(null);

  const customs = pages.filter((p) => (p.kind ?? "custom") === "custom");
  const bases: TemplateData[] = [BLANK_TEMPLATE, ...TEMPLATES];
  const selected = bases.find((t) => t.id === designId) ?? BLANK_TEMPLATE;

  const submitCreate = () => {
    onCreateFromDesign(selected, newName.trim());
    setCreateOpen(false);
    setNewName("");
    setDesignId("tpl-blank");
  };

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <ModuleHeader
        title="Template Management"
        description="Click a thumbnail to open that template in the Prestate builder. Each template keeps its own design, brand, SEO, domain and tracking."
        actions={
          <Btn variant="primary" icon={<FilePlus2 size={14} />} onClick={() => setCreateOpen(true)}>
            Create New Template
          </Btn>
        }
      />

      <div className="ps-module-pad">
        <div className="ps-tpl-section-label">Predefined templates</div>
        <div className="ps-tpl-grid ps-tpl-grid-4">
          {TEMPLATES.map((design) => {
            const page = findPreset(pages, design.id);
            return (
              <TemplateCard
                key={design.id}
                title={page?.name ?? design.name}
                subtitle={design.description}
                thumbnail={page?.thumbnail || design.thumbnail}
                accent={design.accent2}
                status={page?.status}
                chip={design.name}
                domain={page ? (page.domain || localPreviewPath(page)) : "Not created yet"}
                onOpen={() => onOpenPreset(design.id)}
                onPreview={page ? () => onPreview(page.id) : undefined}
                onSave={page ? () => onSave(page.id) : undefined}
                onPublish={page ? () => onPublish(page.id) : undefined}
                onUnpublish={page ? () => onUnpublish(page.id) : undefined}
                onDuplicate={page ? () => onDuplicate(page.id) : undefined}
                onDelete={page ? () => setDeleteFor(page) : undefined}
                published={page?.status === "published"}
              />
            );
          })}
        </div>

        {customs.length > 0 ? (
          <>
            <div className="ps-tpl-section-label" style={{ marginTop: 28 }}>Your templates</div>
            <div className="ps-tpl-grid">
              {customs.map((p) => {
                const cfg = ensureConfig(p);
                return (
                  <TemplateCard
                    key={p.id}
                    title={p.name}
                    subtitle={`${p.template} · ${cfg.brand.headingFont}`}
                    thumbnail={p.thumbnail}
                    accent={cfg.brand.primary}
                    status={p.status}
                    chip={p.designId === "tpl-blank" ? "From scratch" : p.template}
                    domain={p.domain || localPreviewPath(p)}
                    onOpen={() => onOpenBuilder(p.id)}
                    onPreview={() => onPreview(p.id)}
                    onSave={() => onSave(p.id)}
                    onPublish={() => onPublish(p.id)}
                    onUnpublish={() => onUnpublish(p.id)}
                    onDuplicate={() => onDuplicate(p.id)}
                    onDelete={() => setDeleteFor(p)}
                    published={p.status === "published"}
                  />
                );
              })}
            </div>
          </>
        ) : null}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Template" width={740}>
        <p style={{ fontSize: 13, color: "var(--ps-slate)", lineHeight: 1.55, margin: "0 0 14px" }}>
          Start from a blank canvas or copy one of the four predefined designs. The new template is fully independent.
        </p>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ps-slate)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Template name</div>
        <TextField value={newName} onChange={setNewName} placeholder="e.g. Harbor Lights — Custom" />
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ps-slate)", textTransform: "uppercase", letterSpacing: 0.4, margin: "16px 0 8px" }}>Start from</div>
        <div className="ps-tpl-pick">
          {bases.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setDesignId(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 12,
                borderRadius: 12,
                border: designId === t.id ? "2px solid var(--ps-primary)" : "1px solid var(--ps-line)",
                background: designId === t.id ? "var(--ps-primary-mist)" : "var(--ps-panel-raised)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ width: 56, height: 40, borderRadius: 8, overflow: "hidden", background: t.accent2, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                {t.id === "tpl-blank" ? <Plus size={18} /> : <SceneImage art={t.thumbnail} />}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)" }}>{t.name}</div>
                <div style={{ fontSize: 11, color: "var(--ps-muted)", marginTop: 2 }}>{t.description}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="ps-modal-actions">
          <Btn variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={submitCreate}>Open in builder</Btn>
        </div>
      </Modal>

      <Modal open={!!deleteFor} onClose={() => setDeleteFor(null)} title={deleteFor?.kind === "preset" ? "Reset predefined template" : "Delete template"} width={440}>
        <p style={{ fontSize: 13.5, color: "var(--ps-slate)", lineHeight: 1.6, margin: 0 }}>
          {deleteFor?.kind === "preset" ? (
            <>Reset <strong style={{ color: "var(--ps-ink)" }}>{deleteFor?.name}</strong> to the original design? Edits on this template are removed. Other templates are not affected.</>
          ) : (
            <>Delete <strong style={{ color: "var(--ps-ink)" }}>{deleteFor?.name}</strong>? Other templates keep their own design and settings.</>
          )}
        </p>
        <div className="ps-modal-actions">
          <Btn variant="outline" onClick={() => setDeleteFor(null)}>Cancel</Btn>
          <Btn
            variant="danger"
            onClick={() => {
              if (deleteFor) onDelete(deleteFor.id);
              setDeleteFor(null);
            }}
          >
            {deleteFor?.kind === "preset" ? "Reset template" : "Delete template"}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

function TemplateCard({
  title,
  subtitle,
  thumbnail,
  accent,
  status,
  chip,
  domain,
  onOpen,
  onPreview,
  onSave,
  onPublish,
  onUnpublish,
  onDuplicate,
  onDelete,
  published,
}: {
  title: string;
  subtitle: string;
  thumbnail: string;
  accent: string;
  status?: LandingPageData["status"];
  chip: string;
  domain: string;
  onOpen: () => void;
  onPreview?: () => void;
  onSave?: () => void;
  onPublish?: () => void;
  onUnpublish?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  published?: boolean;
}) {
  return (
    <div className="ps-card" style={{ overflow: "hidden", borderRadius: 16 }}>
      <button type="button" className="ps-tpl-thumb" onClick={onOpen} title="Edit in builder">
        <div style={{ height: "100%", background: accent }}>
          <SceneImage art={thumbnail || "hero"} />
        </div>
        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6 }}>
          {status ? <StatusBadge status={status} /> : <Chip tone="neutral">Ready</Chip>}
        </div>
        <div style={{ position: "absolute", top: 10, right: 10 }}>
          <Chip tone="primary">{chip}</Chip>
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 42%, rgba(8,10,20,.78))", display: "flex", alignItems: "flex-end", padding: 14 }}>
          <div>
            <div style={{ color: "#fff", fontSize: 14.5, fontWeight: 800, lineHeight: 1.25 }}>{title}</div>
            <div style={{ color: "rgba(255,255,255,.72)", fontSize: 11, marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{subtitle}</div>
            <div style={{ color: "rgba(255,255,255,.55)", fontSize: 10.5, fontFamily: "ui-monospace, monospace", marginTop: 4 }}>{domain}</div>
          </div>
        </div>
      </button>
      <div className="ps-tpl-actions">
        <Btn size="sm" variant="primary" icon={<Pencil size={13} />} onClick={onOpen}>Edit</Btn>
        {onPreview ? <Btn size="sm" variant="outline" icon={<Eye size={13} />} onClick={onPreview}>Preview</Btn> : null}
        {onSave ? <Btn size="sm" variant="outline" onClick={onSave}>Save</Btn> : null}
        {published
          ? (onUnpublish ? <Btn size="sm" variant="outline" onClick={onUnpublish}>Unpublish</Btn> : null)
          : (onPublish ? <Btn size="sm" variant="secondary" onClick={onPublish}>Publish</Btn> : null)}
        {onDuplicate ? <Btn size="sm" variant="outline" icon={<Copy size={13} />} onClick={onDuplicate}>Duplicate</Btn> : null}
        {onDelete ? <Btn size="sm" variant="danger" icon={<Trash2 size={13} />} onClick={onDelete}>Delete</Btn> : null}
      </div>
    </div>
  );
}
