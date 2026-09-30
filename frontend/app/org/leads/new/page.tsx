"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { AddLeadForm } from "@/components/org/add-lead-form";

export default function AddLeadPage() {
  const { isLoading, isOrgAdmin, hasPermission } = useAuth();
  if (isLoading) return <div className="muted" style={{ padding: 24 }}>Loading…</div>;
  // Same gate as the Lead Center's "Add lead" button.
  if (!(isOrgAdmin() || hasPermission("crm", "add"))) {
    return (
      <div className="form-alert">
        You don&apos;t have permission to add leads. <Link href="/org/leads">Back to Lead Center</Link>
      </div>
    );
  }
  return <AddLeadForm backHref="/org/leads" backLabel="Back to Lead Center" />;
}
