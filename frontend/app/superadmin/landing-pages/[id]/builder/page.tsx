"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { LpPage } from "@/lib/lp-types";
import { Builder } from "@/components/builder/builder";

export default function BuilderPage() {
  const params = useParams<{ id: string }>();
  const { accessToken } = useAuth();

  const [page, setPage] = useState<LpPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !params.id) return;
    apiFetch<LpPage>(`/admin/landing-pages/${params.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((p) => setPage(p))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load page"));
  }, [accessToken, params.id]);

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", color: "#ef4444", fontSize: 15 }}>
        {error}
      </div>
    );
  }

  if (!page) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", color: "#64748b", fontSize: 15 }}>
        Loading page…
      </div>
    );
  }

  return <Builder key={page.id} page={page} accessToken={accessToken as string} />;
}