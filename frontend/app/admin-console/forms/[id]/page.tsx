"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Toaster } from "sonner";
import { FormDesigner } from "@/components/superadmin/forms/FormDesigner";
import {
  findFormById,
  loadFormLibrary,
  upsertForm,
  type FormDefinition,
} from "@/lib/openpage/forms-store";

export default function SuperAdminFormEditorPage() {
  const params = useParams<{ id: string }>();
  const [form, setForm] = useState<FormDefinition | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const id = params.id;
    if (!id) return;
    const found = findFormById(id, loadFormLibrary());
    if (!found) {
      setMissing(true);
      return;
    }
    setMissing(false);
    setForm(found);
  }, [params.id]);

  if (missing) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Form not found</h2>
        <p className="muted">This form is missing from the local library (forms are stored in this browser).</p>
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
      <div style={{ marginBottom: 12 }}>
        <Link href="/admin-console/forms" className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
          <ChevronLeft size={15} /> Back to Forms
        </Link>
      </div>
      <FormDesigner
        form={form}
        onChange={setForm}
        onSave={() => {
          upsertForm(form);
        }}
      />
    </div>
  );
}
