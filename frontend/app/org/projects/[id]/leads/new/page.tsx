"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { PROJECT_LEAD_ACTION } from "@/lib/permissions";
import { AddLeadForm } from "@/components/org/add-lead-form";

export default function AddProjectLeadPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? "";
  const { isLoading, hasPermission } = useAuth();
  const backHref = `/org/projects/${encodeURIComponent(projectId)}/leads`;

  if (isLoading) return <div className="muted" style={{ padding: 24 }}>Loading…</div>;
  // Same gate as the project Leads tab's "Add lead" button.
  if (!hasPermission("projects", PROJECT_LEAD_ACTION)) {
    return (
      <div className="form-alert">
        You don&apos;t have permission to add leads to this project. <Link href={backHref}>Back to project leads</Link>
      </div>
    );
  }
  return <AddLeadForm projectId={projectId} backHref={backHref} backLabel="Back to project leads" />;
}
