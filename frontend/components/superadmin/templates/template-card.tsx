"use client";

import Link from "next/link";
import { Copy, Eye, PauseCircle, Pencil, Rocket, RotateCcw, Settings2, Trash2 } from "lucide-react";
import { Reveal } from "@/components/superadmin/reveal";
import { StatusBadge, TemplateCover, manageHref, type TemplateRow } from "./shared";

/* One standardized card used for every template — no per-template layout
 * variation. Mirrors the LandingPageCard structure so the two product
 * surfaces read as one system. */

export function TemplateCard({
  row,
  delay,
  onEdit,
  onPreview,
  onDuplicate,
  onPublish,
  onUnpublish,
  onRemove,
}: {
  row: TemplateRow;
  delay?: number;
  onEdit: () => void;
  onPreview: () => void;
  onDuplicate?: () => void;
  onPublish?: () => void;
  onUnpublish?: () => void;
  onRemove?: () => void;
}) {
  const isPreset = row.kind === "preset";
  const published = row.status === "published";

  const iconBtn = {
    padding: "5px 8px",
    display: "inline-flex",
    alignItems: "center",
  } as const;

  return (
    <Reveal delay={delay}>
      <div className="card hover" style={{ padding: 0, display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Cover */}
        <button
          type="button"
          onClick={onEdit}
          title="Edit in builder"
          style={{ display: "block", width: "100%", border: "none", padding: 0, cursor: "pointer", background: "transparent" }}
        >
          <TemplateCover thumbnail={row.thumbnail} accent={row.accent}>
            <span style={{ position: "absolute", top: 10, left: 10 }}>
              <StatusBadge status={row.status} />
            </span>
            <span
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                fontSize: 11,
                fontWeight: 600,
                background: "rgba(255,255,255,0.2)",
                color: "#fff",
                padding: "3px 10px",
                borderRadius: 999,
                backdropFilter: "blur(4px)",
              }}
            >
              {row.source}
            </span>
          </TemplateCover>
        </button>

        {/* Body */}
        <div className="card-b" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 18px 18px" }}>
          <button
            type="button"
            onClick={onEdit}
            style={{ border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer" }}
          >
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--ink)", lineHeight: 1.3 }}>{row.name}</div>
            <div
              style={{
                fontSize: 12.5,
                color: "var(--muted)",
                marginTop: 4,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                lineHeight: 1.45,
              }}
            >
              {row.description}
            </div>
          </button>

          <div
            style={{
              fontSize: 11.5,
              color: "var(--faint)",
              marginTop: 10,
              fontFamily: "var(--font-mono), ui-monospace, monospace",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {row.domain}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
            <button
              type="button"
              onClick={onEdit}
              className="btn btn-soft btn-sm"
              style={{ flex: 1, justifyContent: "center", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              type="button"
              onClick={onPreview}
              className="btn btn-ghost btn-sm"
              style={{ flex: 1, justifyContent: "center", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Eye size={13} /> Preview
            </button>

            <div style={{ display: "flex", gap: 4, alignItems: "center", marginLeft: 2 }}>
              {row.pageId ? (
                <Link className="btn btn-ghost btn-sm" href={manageHref(row.pageId)} title="Manage" style={iconBtn}>
                  <Settings2 size={14} />
                </Link>
              ) : null}
              {onDuplicate ? (
                <button type="button" className="btn btn-ghost btn-sm" title="Duplicate" onClick={onDuplicate} style={iconBtn}>
                  <Copy size={14} />
                </button>
              ) : null}
              {published
                ? onUnpublish
                  ? (
                    <button type="button" className="btn btn-ghost btn-sm" title="Unpublish" onClick={onUnpublish} style={iconBtn}>
                      <PauseCircle size={14} />
                    </button>
                  )
                  : null
                : onPublish
                  ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      title="Publish"
                      onClick={onPublish}
                      style={{ ...iconBtn, color: "var(--green)" }}
                    >
                      <Rocket size={14} />
                    </button>
                  )
                  : null}
              {onRemove ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  title={isPreset ? "Reset to original" : "Delete"}
                  onClick={onRemove}
                  style={{ ...iconBtn, color: isPreset ? "var(--amber)" : "var(--rose)" }}
                >
                  {isPreset ? <RotateCcw size={14} /> : <Trash2 size={14} />}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
