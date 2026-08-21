"use client";

import { useRef, useState } from "react";
import { Link2, Sparkles, Trash2, Upload } from "lucide-react";
import { isMediaSrc, readMediaFile } from "@/lib/media";

export function MediaPicker({
  kind,
  label,
  value,
  onChange,
  iconNames,
  compact,
}: {
  kind: "image" | "icon";
  label?: string;
  value: string;
  onChange: (v: string) => void;
  iconNames?: string[];
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const src = value.trim();
  const showImg = isMediaSrc(src);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const result = await readMediaFile(file);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError("");
    onChange(result.data);
  };

  return (
    <div style={{ width: "100%" }}>
      {label ? (
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--ps-muted, #64748b)", marginBottom: 6 }}>
          {label}
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: compact ? "center" : "flex-start",
          padding: compact ? 0 : "8px 0 4px",
        }}
      >
        <button
          type="button"
          title={kind === "icon" ? "Upload icon" : "Upload image"}
          onClick={() => inputRef.current?.click()}
          style={{
            width: compact ? 40 : 56,
            height: compact ? 40 : 56,
            borderRadius: kind === "icon" ? 12 : 10,
            border: "1px dashed var(--ps-line-strong, #cbd5e1)",
            background: "var(--ps-bg, #f8fafc)",
            overflow: "hidden",
            flexShrink: 0,
            padding: 0,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ps-muted, #64748b)",
          }}
        >
          {showImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <Upload size={compact ? 14 : 16} />
          )}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 9px",
                borderRadius: 8,
                border: "1px solid var(--ps-line-strong, #cbd5e1)",
                background: "var(--ps-panel-raised, #fff)",
                color: "var(--ps-ink, #0f172a)",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Upload size={12} /> Upload
            </button>
            {src ? (
              <button
                type="button"
                onClick={() => onChange("")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 9px",
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  color: "#e5484d",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Trash2 size={12} /> Clear
              </button>
            ) : null}
          </div>
          <div style={{ position: "relative" }}>
            <Link2 size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--ps-muted, #94a3b8)", pointerEvents: "none" }} />
            <input
              className="ps-input"
              value={src.startsWith("data:") ? "" : src}
              onChange={(e) => {
                setError("");
                onChange(e.target.value);
              }}
              placeholder={kind === "icon" ? "Icon URL or lucide name" : "Image URL (https://…)"}
              style={{ paddingLeft: 28, fontSize: 12.5 }}
            />
          </div>
          {src.startsWith("data:") ? (
            <div style={{ fontSize: 10.5, color: "var(--ps-muted, #64748b)", marginTop: 4 }}>Uploaded file stored on this template</div>
          ) : null}
        </div>
      </div>
      {kind === "icon" && iconNames && iconNames.length > 0 ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ps-muted, #64748b)", marginBottom: 5, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Sparkles size={11} /> Built-in icons
          </div>
          <select
            className="ps-input"
            value={iconNames.includes(src) ? src : ""}
            onChange={(e) => onChange(e.target.value)}
            style={{ fontSize: 12.5 }}
          >
            <option value="">Custom upload / URL</option>
            {iconNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {error ? <div style={{ fontSize: 11.5, color: "#e5484d", marginTop: 6 }}>{error}</div> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.svg"
        hidden
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
