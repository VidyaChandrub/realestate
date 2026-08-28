"use client";

import { useRef, useState } from "react";
import {
  UPLOAD_RULES,
  uploadFile,
  youtubeEmbedUrl,
  type UploadField,
} from "@/lib/upload";

interface Ctx {
  projectId?: string;
  unitTypeId?: string;
}

function UploadIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v13" />
    </svg>
  );
}

/** Dashed-border click target used for every upload control. */
function Dropzone({
  onClick,
  disabled,
  busy,
  title,
  hint,
  minWidth = 200,
}: {
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  title: string;
  hint?: string;
  minWidth?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        width: "100%",
        minWidth,
        maxWidth: 360,
        padding: "18px 16px",
        borderRadius: 12,
        border: "1.5px dashed var(--line, #d7dce6)",
        background: "var(--surface-2, rgba(15,23,42,.02))",
        color: "var(--muted, #64748b)",
        cursor: disabled || busy ? "default" : "pointer",
        transition: "border-color .15s, background .15s",
      }}
      onMouseEnter={(e) => {
        if (disabled || busy) return;
        e.currentTarget.style.borderColor = "var(--brand, #6d28d9)";
        e.currentTarget.style.background = "var(--brand-050, rgba(109,40,217,.05))";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--line, #d7dce6)";
        e.currentTarget.style.background = "var(--surface-2, rgba(15,23,42,.02))";
      }}
    >
      <UploadIcon />
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg, #334155)" }}>
        {busy ? "Uploading…" : title}
      </span>
      {hint ? <span style={{ fontSize: 11 }}>{hint}</span> : null}
    </button>
  );
}

function Preview({ field, url }: { field: UploadField; url: string }) {
  if (field === "brochure") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="btn btn-ghost btn-sm"
        style={{ alignSelf: "flex-start" }}
      >
        📄 View brochure
      </a>
    );
  }
  if (field === "video") {
    const embed = youtubeEmbedUrl(url);
    if (embed) {
      return (
        <iframe
          src={embed}
          title="Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            maxHeight: 200,
            border: 0,
            borderRadius: 8,
          }}
        />
      );
    }
    return (
      <video
        src={url}
        controls
        style={{
          width: "100%",
          maxHeight: 160,
          borderRadius: 8,
          background: "#000",
        }}
      />
    );
  }
  // image fields — eslint-disable: R2 public URL, not a local asset
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={url}
      alt=""
      style={{
        maxHeight: 120,
        maxWidth: "100%",
        borderRadius: 10,
        objectFit: "contain",
        border: "1px solid var(--line)",
      }}
    />
  );
}

/** Single-file upload with preview / replace / remove. `value` is the stored
 *  public URL (or null). */
export function MediaUpload({
  field,
  label,
  value,
  onChange,
  ctx,
  compact,
  allowLink,
  linkPlaceholder = "Paste a link (e.g. YouTube)",
}: {
  field: UploadField;
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  ctx?: Ctx;
  compact?: boolean;
  /** Also let the user paste an external URL instead of uploading a file. */
  allowLink?: boolean;
  linkPlaceholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState("");

  function useLink() {
    const v = link.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) {
      setError("Enter a full URL starting with http:// or https://");
      return;
    }
    setError(null);
    onChange(v);
    setLink("");
  }

  async function handle(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadFile(file, { field, ...ctx });
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const typeHint =
    field === "brochure"
      ? "PDF"
      : field === "video"
        ? "MP4 / WebM"
        : "PNG, JPG, WebP";

  return (
    <div className="field" style={{ marginBottom: compact ? 0 : undefined }}>
      {label ? <label>{label}</label> : null}
      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_RULES[field].accept}
        style={{ display: "none" }}
        onChange={(e) => void handle(e.target.files?.[0])}
      />
      {value ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Preview field={field} url={value} />
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? "Uploading…" : "Replace"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ color: "var(--rose)" }}
              disabled={busy}
              onClick={() => onChange(null)}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Dropzone
            onClick={() => inputRef.current?.click()}
            busy={busy}
            title={`Upload ${UPLOAD_RULES[field].label}`}
            hint={typeHint}
          />
          {allowLink ? (
            <>
              <div
                className="muted"
                style={{ fontSize: 11, textAlign: "center", maxWidth: 360 }}
              >
                — or —
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                <input
                  className="inp"
                  style={{ flex: 1 }}
                  placeholder={linkPlaceholder}
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      useLink();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={useLink}
                >
                  Use link
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
      {error ? (
        <div style={{ color: "var(--rose)", fontSize: 12, marginTop: 4 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

/** Multi-image upload for `galleryUrls`. */
export function GalleryUpload({
  value,
  onChange,
  ctx,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  ctx?: Ctx;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const added: string[] = [];
      for (const file of Array.from(files)) {
        added.push(await uploadFile(file, { field: "gallery", ...ctx }));
      }
      onChange([...value, ...added]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const TILE = 76;

  return (
    <div className="field">
      <label>Gallery images</label>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={UPLOAD_RULES.gallery.accept}
        style={{ display: "none" }}
        onChange={(e) => void handle(e.target.files)}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {value.map((url, i) => (
          <span
            key={url}
            style={{ position: "relative", display: "inline-flex" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              style={{
                width: TILE,
                height: TILE,
                objectFit: "cover",
                borderRadius: 10,
                border: "1px solid var(--line)",
              }}
            />
            <button
              type="button"
              aria-label="Remove image"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                width: 18,
                height: 18,
                borderRadius: "50%",
                border: "none",
                background: "var(--surface, #fff)",
                boxShadow: "0 0 0 1px var(--line)",
                cursor: "pointer",
                fontSize: 10,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          style={{
            width: TILE,
            height: TILE,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            borderRadius: 10,
            border: "1.5px dashed var(--line, #d7dce6)",
            background: "var(--surface-2, rgba(15,23,42,.02))",
            color: "var(--muted, #64748b)",
            cursor: busy ? "default" : "pointer",
          }}
        >
          {busy ? (
            <span style={{ fontSize: 12 }}>…</span>
          ) : (
            <>
              <UploadIcon size={18} />
              <span style={{ fontSize: 10, fontWeight: 600 }}>Add</span>
            </>
          )}
        </button>
      </div>
      {error ? (
        <div style={{ color: "var(--rose)", fontSize: 12, marginTop: 4 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
