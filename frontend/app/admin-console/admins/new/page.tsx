"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { LIST_PATH, PlatformMemberForm } from "../member-form";

export default function CreatePlatformMemberPage() {
  const { isLoading, hasPermission } = useAuth();

  if (isLoading) {
    return <div className="muted" style={{ padding: 24 }}>Loading…</div>;
  }
  if (!hasPermission("admin_platform_team", "add")) {
    return (
      <div className="form-alert" style={{ maxWidth: 880, margin: "0 auto" }}>
        You don&apos;t have permission to add platform team members.{" "}
        <Link href={LIST_PATH}>Back to Platform Team</Link>
      </div>
    );
  }
  return <PlatformMemberForm />;
}
