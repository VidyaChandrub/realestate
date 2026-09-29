"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getPlatformTeamMember } from "@/lib/api";
import type { PlatformTeamMember } from "@/lib/types";
import { LIST_PATH, PlatformMemberForm, SUPER_ADMIN_ROLE } from "../../member-form";

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="form-alert" style={{ maxWidth: 880, margin: "0 auto" }}>
      {children} <Link href={LIST_PATH}>Back to Platform Team</Link>
    </div>
  );
}

export default function EditPlatformMemberPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { isLoading, hasPermission } = useAuth();
  const canEdit = hasPermission("admin_platform_team", "edit");

  const [member, setMember] = useState<PlatformTeamMember | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || isLoading || !canEdit) return;
    let cancelled = false;
    getPlatformTeamMember(id)
      .then((m) => {
        if (!cancelled) setMember(m);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load team member");
      });
    return () => {
      cancelled = true;
    };
  }, [id, isLoading, canEdit]);

  if (isLoading) return <div className="muted" style={{ padding: 24 }}>Loading…</div>;
  if (!canEdit) return <Notice>You don&apos;t have permission to edit platform team members.</Notice>;
  if (error) return <Notice>{error}</Notice>;
  if (!member) return <div className="muted" style={{ padding: 24 }}>Loading…</div>;
  // Mirrors the list, which offers no row actions on Super Admin accounts.
  if (member.roles.some((r) => r.key === SUPER_ADMIN_ROLE) || member.role?.key === SUPER_ADMIN_ROLE) {
    return <Notice>Super Admin accounts can&apos;t be edited from Platform Team.</Notice>;
  }
  return <PlatformMemberForm key={member.id} member={member} />;
}
