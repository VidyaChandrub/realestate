"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { setFlash } from "@/lib/flash";
import {
  Field,
  FormActions,
  FormAlert,
  FormGrid,
  FormPage,
  SelectInput,
  formPageStyles,
} from "@/components/forms/form-page";
import type { Plan, Subscription } from "@/lib/types";
import { ORG_SUBS_TAB, SUBS_FLASH_KEY, SUBS_PATH } from "../../subscriptions-shared";

// Upgrade / change subscription — full page (was the "Upgrade / Change
// Subscription" modal on the Subscriptions studio). Same fields and PATCH.

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="form-alert">
      {children} <Link href={SUBS_PATH}>Back to Plans &amp; Subscriptions</Link>
    </div>
  );
}

export default function ChangeSubscriptionPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { isLoading, hasPermission } = useAuth();
  const canChange = hasPermission("admin_subscriptions", "edit");
  const [sub, setSub] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || isLoading || !canChange) return;
    let cancelled = false;
    Promise.all([
      apiFetch<Subscription>(`/admin/subscriptions/${encodeURIComponent(id)}`),
      apiFetch<Plan[]>("/admin/plans"),
    ])
      .then(([s, p]) => {
        if (cancelled) return;
        setSub(s);
        setPlans(p);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load subscription");
      });
    return () => {
      cancelled = true;
    };
  }, [id, isLoading, canChange]);

  if (isLoading) return <div className="muted" style={{ padding: 24 }}>Loading…</div>;
  if (!canChange) return <Notice>You don&apos;t have permission to change subscriptions.</Notice>;
  if (loadError) return <Notice>{loadError}</Notice>;
  if (!sub || !plans) return <div className="muted" style={{ padding: 24 }}>Loading…</div>;
  return <ChangeForm key={sub.id} sub={sub} plans={plans} />;
}

function ChangeForm({ sub, plans }: { sub: Subscription; plans: Plan[] }) {
  const router = useRouter();
  const [planId, setPlanId] = useState<string>(sub.planId);
  const [cycle, setCycle] = useState<"monthly" | "yearly">(sub.billingCycle);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function confirmUpgrade(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!planId) {
      setError("Select a plan");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await apiFetch<Subscription>(`/admin/subscriptions/${encodeURIComponent(sub.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ planId, billingCycle: cycle }),
      });
      setFlash(SUBS_FLASH_KEY, {
        message: `${sub.organisation?.name || "Org"} → ${updated.plan?.name} ${cycle}`,
        tab: ORG_SUBS_TAB,
      });
      router.push(SUBS_PATH);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upgrade failed");
      setSaving(false);
    }
  }

  return (
    <FormPage
      eyebrow="Billing · Plans & Subscriptions"
      title="Upgrade / change subscription"
      subtitle={`Change subscription for ${sub.organisation?.name ?? "this organisation"}.`}
      backHref={SUBS_PATH}
      backLabel="Back to Plans & Subscriptions"
    >
      <form className={formPageStyles.panel} onSubmit={confirmUpgrade}>
        <FormAlert message={error} />
        <FormGrid>
          <Field htmlFor="ch-plan" label="Select plan" icon="billing">
            <SelectInput id="ch-plan" value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ₹{p.priceMonthly}/mo / ₹{p.priceYearly}/yr
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field htmlFor="ch-cycle" label="Billing cycle" icon="calendar">
            <SelectInput
              id="ch-cycle"
              value={cycle}
              onChange={(e) => setCycle(e.target.value as "monthly" | "yearly")}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </SelectInput>
          </Field>
        </FormGrid>
        <FormActions cancelHref={SUBS_PATH} busy={saving} busyLabel="Saving…" submitLabel="Confirm change" />
      </form>
    </FormPage>
  );
}
