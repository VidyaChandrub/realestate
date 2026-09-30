"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import type { OrganisationListResponse, Plan, Subscription } from "@/lib/types";
import { ORG_SUBS_TAB, SUBS_FLASH_KEY, SUBS_PATH } from "../subscriptions-shared";

// Assign subscription — full page (was the "Assign Subscription" modal on the
// Subscriptions studio). Same fields and requests as before.

type OrgOption = { id: string; name: string; city: string };

export default function AssignSubscriptionPage() {
  const router = useRouter();
  const { isLoading, hasPermission } = useAuth();
  const canAssign = hasPermission("admin_subscriptions", "add");

  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [orgId, setOrgId] = useState("");
  const [planId, setPlanId] = useState("");
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isLoading || !canAssign) return;
    let cancelled = false;
    apiFetch<OrganisationListResponse>("/admin/organisations?limit=100")
      .then((data) => {
        if (!cancelled) setOrgs((data.data || []).map((o) => ({ id: o.id, name: o.name, city: o.city || "" })));
      })
      .catch(() => {
        /* same as the studio: an empty list, the select still renders */
      });
    apiFetch<Plan[]>("/admin/plans")
      .then((data) => {
        if (!cancelled) setPlans(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load plans");
      });
    return () => {
      cancelled = true;
    };
  }, [isLoading, canAssign]);

  if (isLoading) return <div className="muted" style={{ padding: 24 }}>Loading…</div>;
  if (!canAssign) {
    return (
      <div className="form-alert">
        You don&apos;t have permission to assign subscriptions. <Link href={SUBS_PATH}>Back to Plans &amp; Subscriptions</Link>
      </div>
    );
  }

  async function confirmAssign(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!orgId || !planId) {
      setError("Select organisation and plan");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // An org can only ever have one non-cancelled subscription (enforced by
      // the API). If it already has one, "Assign Plan" must behave exactly
      // like "Change" — PATCH the existing row (same downgrade-guard
      // validation) — instead of POSTing a create that the API would reject.
      const existingRes = await apiFetch<{ data: Subscription[] }>(
        `/admin/subscriptions?orgId=${encodeURIComponent(orgId)}&limit=1`,
      );
      const existing = (existingRes.data || []).find((s) => s.status !== "cancelled");

      let message: string;
      if (existing) {
        const updated = await apiFetch<Subscription>(`/admin/subscriptions/${existing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ planId, billingCycle: cycle }),
        });
        message = `${updated.organisation?.name || "Org"} → ${updated.plan?.name} ${cycle}`;
      } else {
        const created = await apiFetch<Subscription>("/admin/subscriptions", {
          method: "POST",
          body: JSON.stringify({ orgId, planId, billingCycle: cycle }),
        });
        message = `Subscription created for ${created.organisation?.name}`;
      }
      setFlash(SUBS_FLASH_KEY, { message, tab: ORG_SUBS_TAB });
      router.push(SUBS_PATH);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed");
      setSaving(false);
    }
  }

  return (
    <FormPage
      eyebrow="Billing · Plans & Subscriptions"
      title="Assign subscription"
      subtitle="Link an organisation to a platform plan."
      backHref={SUBS_PATH}
      backLabel="Back to Plans & Subscriptions"
    >
      <form className={formPageStyles.panel} onSubmit={confirmAssign}>
        <FormAlert message={error} />

        <Field htmlFor="as-org" label="Organisation" icon="building">
          <SelectInput id="as-org" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            <option value="">Select organisation</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} — {o.city}
              </option>
            ))}
          </SelectInput>
        </Field>

        <FormGrid>
          <Field htmlFor="as-plan" label="Plan" icon="billing">
            <SelectInput id="as-plan" value={planId} onChange={(e) => setPlanId(e.target.value)}>
              <option value="">Select plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ₹{p.priceMonthly}/mo
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field htmlFor="as-cycle" label="Billing cycle" icon="calendar">
            <SelectInput
              id="as-cycle"
              value={cycle}
              onChange={(e) => setCycle(e.target.value as "monthly" | "yearly")}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </SelectInput>
          </Field>
        </FormGrid>

        <FormActions cancelHref={SUBS_PATH} busy={saving} busyLabel="Assigning…" submitLabel="Assign Plan" />
      </form>
    </FormPage>
  );
}
