"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Toaster, toast } from "sonner";
import { FormDesigner } from "@/components/superadmin/forms/FormDesigner";
import { getFormDef, saveFormDef } from "@/lib/openpage/forms-backend";

export default function SuperAdminFormEditorPage() {
  const params = useParams<{ id: string }>();
  const [form, setForm] = useState<Awaited<ReturnType<typeof getFormDef>> | null>(null);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = params.id;
    if (!id) return;
    getFormDef("admin", id)
      .then(setForm)
      .catch(() => setMissing(true));
  }, [params.id]);

  async function handleSave() {
    if (!form || !params.id || saving) return;
    setSaving(true);
    try {
      const saved = await saveFormDef("admin", params.id, form);
      setForm(saved);
      toast.success("Form saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save form.");
    } finally {
      setSaving(false);
    }
  }

  if (missing) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Form not found</h2>
        <p className="muted">This form no longer exists in the platform library.</p>
        <Link href="/admin-console/forms" className="btn btn-primary" style={{ marginTop: 12, display: "inline-flex" }}>
          Back to Form Builder
        </Link>
      </div>
    );
  }

  if (!form) return <p className="muted">Loading form…</p>;

  return (
    <div>
      <Toaster theme="light" position="bottom-right" />
      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/admin-console/forms" className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
          <ChevronLeft size={15} /> Back to Forms
        </Link>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Form"}
        </button>
      </div>
      <FormDesigner
        form={form}
        onChange={(next) => setForm((prev) => ({ ...next, backendId: prev?.backendId ?? "" }))}
        onSave={() => void handleSave()}
      />
    </div>
  );
}