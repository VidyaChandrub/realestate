"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { OrgUserForm, USERS_PATH } from "../user-form";
import "../users.css";

export default function CreateOrgUserPage() {
  const { isLoading, hasPermission } = useAuth();

  if (isLoading) return <div className="muted" style={{ padding: 24 }}>Loading…</div>;
  if (!hasPermission("users", "add")) {
    return (
      <div className="form-alert">
        You don&apos;t have permission to add users. <Link href={USERS_PATH}>Back to Users</Link>
      </div>
    );
  }
  return <OrgUserForm />;
}
