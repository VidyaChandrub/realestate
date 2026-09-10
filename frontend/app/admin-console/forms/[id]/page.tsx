"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Toaster } from "sonner";
import { FormDesigner } from "@/components/superadmin/forms/FormDesigner";
import {
  findFormById,
  loadFormLibrary,
  saveFormLibrary,
  upsertForm,
  type FormDefinition,
} from "@/lib/openpage/forms-store";

export default function SuperAdminFormEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<FormDefinition | null>(null);

  useEffect(() => {
    const id = params.id;
    const found = findFormById(id, loadFormLibrary());
    if (!found) {
      router.replace("/admin-console/forms");
      return;
    }
    setForm(found);
  }, [params.id, router]);

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
          saveFormLibrary(loadFormLibrary().map((f) => (f.id === form.id ? form : f)));
        }}
      />
    </div>
  );
}
