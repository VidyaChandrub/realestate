"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { PlanForm } from "../../plan-form";
import { SUBS_PATH } from "../../subscriptions-shared";

export default function CreatePlanPage() {
  const { isLoading, hasPermission } = useAuth();
  if (isLoading) return <div className="muted" style={{ padding: 24 }}>Loading…</div>;
  if (!hasPermission("admin_subscriptions", "add")) {
    return (
      <div className="form-alert">
        You don&apos;t have permission to create plans. <Link href={SUBS_PATH}>Back to Plans &amp; Subscriptions</Link>
      </div>
    );
  }
  return <PlanForm />;
}
