"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { FormDesigner } from "@/components/superadmin/forms/FormDesigner";
import { getFormDef, saveFormDef } from "@/lib/openpage/forms-backend";
// FormDesigner's builder chrome is styled under `.superadmin` (fb-* rules in
// superadmin.css, all superadmin-prefixed); the wrapper below gives the editor
// those styles inside the org shell without leaking them org-wide.
import "@/app/admin-console/superadmin.css";

export default function OrgFormEditorPage() {
  const params = useParams<{ id: string }>();
  const [form, setForm] = useState<Awaited<ReturnType<typeof getFormDef>> | null>(null);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2800);
  };

  useEffect(() => {
    const id = params.id;
    if (!id) return;
    getFormDef("org", id)
      .then(setForm)
      .catch(() => setMissing(true));
  }, [params.id]);

  async function handleSave() {
    if (!form || !params.id || saving) return;
    setSaving(true);
    try {
      const saved = await saveFormDef("org", params.id, form);
      setForm(saved);
      notify("Form saved");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to save form.");
    } finally {
      setSaving(false);
    }
  }

  if (missing) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Form not found</h2>
        <p className="muted">This form no longer exists in your organisation&apos;s library.</p>
        <Link href="/org/forms" className="btn btn-primary" style={{ marginTop: 12, display: "inline-flex" }}>
          Back to Lead Forms
        </Link>
      </div>
    );
  }

  if (!form) return <p className="muted">Loading form…</p>;

  return (
    <>
      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/org/forms" className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
          <ChevronLeft size={15} /> Back to Lead Forms
        </Link>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Form"}
        </button>
      </div>
      <div className="superadmin">
        <FormDesigner
          form={form}
          onChange={(next) => setForm((prev) => ({ ...next, backendId: prev?.backendId ?? "" }))}
          onSave={() => void handleSave()}
        />
      </div>

      {toast ? (
        <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 500 }}>
          <div className="card" style={{ padding: "12px 16px", boxShadow: "var(--sh-lg)" }}>{toast}</div>
        </div>
      ) : null}
    </>
  );
}