"use client";

import { useState } from "react";
import type { FormDefinition } from "@/lib/openpage/forms-store";
import type { LandingPageData } from "@/lib/openpage/types";
import type { PopupConfig } from "@/components/openpage/blocks/types";
import { useConfigStore } from "@/components/openpage/store/configStore";
import { ensureConfig } from "@/lib/openpage/site-config";

function uid() {
  return `popup_${Math.random().toString(36).slice(2, 9)}`;
}

const EMPTY_POPUPS: PopupConfig[] = [];
const EMPTY_FORMS: FormDefinition[] = [];

export function PopupsModule({
  site,
  onPatch,
  onToast,
}: {
  site: LandingPageData;
  pages?: LandingPageData[];
  onSelectSite?: (id: string) => void;
  onPatch: (fn: (c: ReturnType<typeof ensureConfig>) => ReturnType<typeof ensureConfig>) => void;
  onToast: (text: string) => void;
}) {
  const popups = useConfigStore((s) => s.config.popups) ?? EMPTY_POPUPS;
  const forms = useConfigStore((s) => s.config.forms) ?? EMPTY_FORMS;
  const patchSite = useConfigStore((s) => s.patchSite);
  const [selectedId, setSelectedId] = useState(popups[0]?.id ?? "");
  const selected = popups.find((p) => p.id === selectedId) ?? popups[0];

  function setPopups(next: PopupConfig[]) {
    patchSite({ popups: next });
    onPatch((c) => c);
    onToast("Popup saved");
  }

  function update(partial: Partial<PopupConfig>) {
    if (!selected) return;
    setPopups(popups.map((p) => (p.id === selected.id ? { ...p, ...partial } : p)));
  }

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Popup Builder</h2>
      <p style={{ color: "var(--ps-muted)", fontSize: 13, marginBottom: 16 }}>
        Popups use the same JSON config as the page. Attach a reusable form and optional brochure PDF.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {popups.map((p) => (
          <button
            key={p.id}
            type="button"
            className="ps-topnav-btn"
            onClick={() => setSelectedId(p.id)}
            style={{ opacity: p.id === selected?.id ? 1 : 0.7 }}
          >
            {p.name}
          </button>
        ))}
        <button
          type="button"
          className="ps-topnav-btn"
          onClick={() => {
            const next: PopupConfig = {
              id: uid(),
              name: "New popup",
              title: "Get the brochure",
              description: "Share your details to continue.",
              closeOnOverlay: true,
              trigger: "click",
              formId: forms[0]?.id,
            };
            setPopups([...popups, next]);
            setSelectedId(next.id);
          }}
        >
          Add popup
        </button>
      </div>
      {selected ? (
        <div style={{ display: "grid", gap: 10 }}>
          <label>Name<input value={selected.name} onChange={(e) => update({ name: e.target.value })} /></label>
          <label>Title<input value={selected.title} onChange={(e) => update({ title: e.target.value })} /></label>
          <label>Description<textarea value={selected.description} onChange={(e) => update({ description: e.target.value })} /></label>
          <label>Image URL<input value={selected.image ?? ""} onChange={(e) => update({ image: e.target.value })} /></label>
          <label>Video URL<input value={selected.videoUrl ?? ""} onChange={(e) => update({ videoUrl: e.target.value })} /></label>
          <label>Button text<input value={selected.buttonText ?? ""} onChange={(e) => update({ buttonText: e.target.value })} /></label>
          <label>Button URL<input value={selected.buttonUrl ?? ""} onChange={(e) => update({ buttonUrl: e.target.value })} /></label>
          <label>Brochure PDF URL<input value={selected.brochureUrl ?? ""} onChange={(e) => update({ brochureUrl: e.target.value })} /></label>
          <label>
            Form
            <select value={selected.formId ?? ""} onChange={(e) => update({ formId: e.target.value })}>
              <option value="">None</option>
              {forms.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </label>
          <label>
            Trigger
            <select value={selected.trigger} onChange={(e) => update({ trigger: e.target.value as PopupConfig["trigger"] })}>
              <option value="click">Click</option>
              <option value="manual">Manual</option>
              <option value="delay">Delay</option>
              <option value="exit">Exit intent</option>
              <option value="scroll">Scroll</option>
            </select>
          </label>
          <label>
            <input type="checkbox" checked={selected.closeOnOverlay} onChange={(e) => update({ closeOnOverlay: e.target.checked })} />
            Close when clicking overlay
          </label>
          <p style={{ fontSize: 12, color: "var(--ps-muted)" }}>Popup id for blocks: {selected.id} · Page: {site.name}</p>
        </div>
      ) : (
        <p>Create a popup to get started.</p>
      )}
      <style>{`
        label { display:flex; flex-direction:column; gap:4px; font-size:12px; font-weight:600; }
        input, textarea, select { font-weight:500; padding:8px 10px; border:1px solid var(--ps-line); border-radius:8px; }
      `}</style>
    </div>
  );
}
