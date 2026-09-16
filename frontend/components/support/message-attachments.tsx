"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);
// The upload key is "{uuid}-{sanitizedFilename}" (see backend StorageService.buildKey) —
// strip that prefix to recover a filename worth showing in the UI.
const UUID_PREFIX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;

function parseAttachment(url: string): { name: string; ext: string; isImage: boolean } {
  let pathname = url;
  try {
    pathname = new URL(url).pathname;
  } catch {
    // Not an absolute URL (unexpected, but don't blow up the thread over it).
  }
  const raw = decodeURIComponent(pathname.split("/").pop() || "attachment");
  const name = raw.replace(UUID_PREFIX, "") || raw;
  const dot = name.lastIndexOf(".");
  const ext = dot > -1 ? name.slice(dot + 1).toLowerCase() : "";
  return { name, ext, isImage: IMAGE_EXTENSIONS.has(ext) };
}

function Lightbox({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(10, 12, 20, 0.86)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8 }}
        onClick={(e) => e.stopPropagation()}
      >
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label="Open original"
          title="Open original"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "rgba(255,255,255,0.12)",
            color: "#fff",
          }}
        >
          <Icon name="download" size={16} />
        </a>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          title="Close"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "rgba(255,255,255,0.12)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Icon name="close" size={18} />
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={name}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "90vw",
          maxHeight: "85vh",
          borderRadius: 8,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          objectFit: "contain",
        }}
      />
    </div>,
    document.body,
  );
}

/**
 * Renders a message's attachments WhatsApp-style: images as small tappable
 * thumbnails (full image opens in a lightbox), documents as a compact file
 * card that opens/downloads on click — instead of a plain "Attachment" link.
 */
export function MessageAttachments({ urls, mine }: { urls: string[]; mine: boolean }) {
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);

  if (!urls || urls.length === 0) return null;

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {urls.map((url) => {
          const { name, ext, isImage } = parseAttachment(url);
          if (isImage) {
            return (
              <button
                key={url}
                type="button"
                onClick={() => setPreview({ url, name })}
                title={name}
                style={{
                  display: "block",
                  width: 160,
                  maxWidth: "100%",
                  padding: 0,
                  borderRadius: 10,
                  overflow: "hidden",
                  cursor: "zoom-in",
                  background: "rgba(0,0,0,0.08)",
                  lineHeight: 0,
                  border: mine ? "1px solid rgba(255,255,255,0.4)" : "1px solid var(--line)",
                  boxShadow: "0 1px 4px rgba(15, 23, 42, 0.18)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={name}
                  loading="lazy"
                  style={{ display: "block", width: "100%", height: 120, objectFit: "cover" }}
                />
              </button>
            );
          }
          return (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              title={name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 10,
                textDecoration: "none",
                width: 200,
                maxWidth: "100%",
                background: mine ? "rgba(255,255,255,0.16)" : "var(--surface)",
                border: mine ? "1px solid rgba(255,255,255,0.28)" : "1px solid var(--line)",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  flexShrink: 0,
                  background: mine ? "rgba(255,255,255,0.22)" : "var(--surface-2)",
                  color: mine ? "#fff" : "var(--brand)",
                }}
              >
                <Icon name="document" size={15} />
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: mine ? "#fff" : "inherit",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {name}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 10.5,
                    color: mine ? "rgba(255,255,255,0.78)" : "var(--faint)",
                  }}
                >
                  {ext ? `${ext.toUpperCase()} file` : "File"} · tap to open
                </span>
              </span>
              <Icon name="download" size={13} />
            </a>
          );
        })}
      </div>
      {preview ? (
        <Lightbox url={preview.url} name={preview.name} onClose={() => setPreview(null)} />
      ) : null}
    </>
  );
}
