"use client";

import { useEffect, useState } from "react";
import type { SiteConfig } from "@/lib/prestate/types";
import { loadPages } from "@/lib/prestate/persist";
import { findFormByEmbedId, loadFormLibrary } from "@/lib/prestate/forms-store";
import { ensureConfig } from "@/lib/prestate/site-config";
import { Canvas } from "@/components/prestate/builder/canvas";
import { buildThankYouSections } from "@/lib/prestate/page-templates";

export default function EmbedFormPage({ params }: { params: Promise<{ embedId: string }> }) {
  const [embedId, setEmbedId] = useState<string | null>(null);
  const [form, setForm] = useState<SiteConfig["form"] | null>(null);

  useEffect(() => {
    void params.then((p) => setEmbedId(p.embedId));
  }, [params]);

  useEffect(() => {
    if (!embedId) return;
    // Try forms library first (reusable forms), then fall back to page configs (per-template form)
    const lib = loadFormLibrary();
    const fromLib = findFormByEmbedId(embedId, lib as never);
    if (fromLib) {
      setForm(fromLib as unknown as SiteConfig["form"]);
      return;
    }
    const pages = loadPages();
    for (const pg of pages) {
      const cfg = ensureConfig(pg);
      if (cfg.form.embed?.id === embedId || pg.slug === embedId) {
        setForm(cfg.form);
        return;
      }
    }
    // Fallback: first page's form
    const fallback = pages[0] ? ensureConfig(pages[0]).form : null;
    setForm(fallback);
  }, [embedId]);

  if (!embedId) return <div style={{ padding: 40, fontFamily: "Inter, sans-serif", color: "#64748b" }}>Loading embed…</div>;
  if (!form) return <div style={{ padding: 40, fontFamily: "Inter, sans-serif", color: "#64748b" }}>Form not found for “{embedId}”. Save the form in the builder to generate its latest version — the embed always loads the current config.</div>;

  // Render just the lead-form as a standalone page — no header/footer chrome, white bg.
  const dummySections = buildThankYouSections().slice(0, 0);
  // We render Canvas with a single lead-form section so all validation / PDF / thank-you logic stays consolidated.
  const sections = [
    {
      id: "embed_lead_form",
      type: "lead-form",
      label: "Form",
      icon: "Send",
      settings: { heading: form.name || "Enquiry", sub: form.description || "", button: form.submitLabel || "Submit" },
      style: {
        colors: { bg: "#ffffff", text: "#111827" },
        spacing: { padding: { top: 24, right: 16, bottom: 24, left: 16 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, gap: 16 },
        layout: { width: "full", height: "auto", align: "center", direction: "column" },
        typography: {},
        responsive: {},
      },
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <style>{`body{margin:0}`}</style>
      <Canvas
        sections={sections as never}
        selectedId={null}
        device="desktop"
        readOnly
        live
        design={{ css: "", bundle: { tokens: {} as never, fonts: [] } }}
        theme={{ primary: "#6D5DFC", accent: "#CDA45E", font: "Inter", name: form.name }}
        form={form}
        chrome={{ header: {} as never, footer: {} as never, brand: {} as never }}
        pageId={`embed_${embedId}`}
        onSelect={() => {}}
        onMutate={() => {}}
      />
      <div style={{ textAlign: "center", padding: "10px 12px", fontSize: 11, color: "#94a3b8", fontFamily: "Inter, sans-serif", borderTop: "1px solid #f1f5f9" }}>
        Powered by Prestate · Form <code>{embedId}</code> · always shows the latest saved version
      </div>
    </div>
  );
}
