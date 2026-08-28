"use client";

import { useRef, useState } from "react";
import { uploadFile } from "@/lib/upload";
import type { Amenity } from "@/lib/types";

const QUICK_ADD = [
  "Swimming pool",
  "Clubhouse & gym",
  "Landscaped garden",
  "2-level parking",
  "Kids play area",
  "24×7 security",
  "Power backup",
  "Sports court",
  "Yoga deck",
];

/** Project amenities editor — name + optional uploaded icon per amenity.
 *  Used by both the create and edit project forms. */
export function AmenityChips({
  value,
  onChange,
  projectId,
}: {
  value: Amenity[];
  onChange: (next: Amenity[]) => void;
  projectId?: string;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyName, setBusyName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const targetName = useRef<string | null>(null);

  function add(name: string) {
    const v = name.trim();
    if (!v) return;
    if (value.some((a) => a.name.toLowerCase() === v.toLowerCase())) return;
    onChange([...value, { name: v, iconUrl: null }]);
    setDraft("");
  }

  function pickIcon(name: string) {
    targetName.current = name;
    fileRef.current?.click();
  }

  async function onFile(file: File | undefined) {
    const name = targetName.current;
    if (!file || !name) return;
    setBusyName(name);
    setError(null);
    try {
      const url = await uploadFile(file, { field: "amenityIcon", projectId });
      onChange(
        value.map((a) => (a.name === name ? { ...a, iconUrl: url } : a)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Icon upload failed");
    } finally {
      setBusyName(null);
      targetName.current = null;
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.ico"
        style={{ display: "none" }}
        onChange={(e) => void onFile(e.target.files?.[0])}
      />

      {value.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {value.map((a) => (
            <span
              key={a.name}
              className="chip"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {a.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.iconUrl}
                  alt=""
                  width={16}
                  height={16}
                  style={{ borderRadius: 3, objectFit: "cover" }}
                />
              ) : null}
              {a.name}
              <button
                type="button"
                title="Upload icon"
                aria-label={`Upload icon for ${a.name}`}
                disabled={busyName === a.name}
                onClick={() => pickIcon(a.name)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                {busyName === a.name ? "…" : a.iconUrl ? "🔄" : "🖼"}
              </button>
              <button
                type="button"
                aria-label={`Remove ${a.name}`}
                onClick={() => onChange(value.filter((x) => x.name !== a.name))}
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  fontWeight: 700,
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="muted" style={{ fontSize: 13 }}>
          No amenities yet — pick from the quick list or add your own.
        </div>
      )}

      {error ? (
        <div style={{ color: "var(--rose)", fontSize: 12, marginTop: 6 }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          className="inp"
          placeholder="Custom amenity — e.g. Tennis court"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            }
          }}
        />
        <button className="btn btn-ghost" type="button" onClick={() => add(draft)}>
          ＋ Add
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {QUICK_ADD.filter(
          (o) => !value.some((a) => a.name.toLowerCase() === o.toLowerCase()),
        ).map((o) => (
          <button
            key={o}
            type="button"
            className="chip"
            style={{ cursor: "pointer" }}
            onClick={() => add(o)}
          >
            ＋ {o}
          </button>
        ))}
      </div>
    </div>
  );
}
