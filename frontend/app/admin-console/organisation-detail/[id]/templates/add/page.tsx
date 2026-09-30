"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { setFlash } from "@/lib/flash";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/ui/modal";
import { FormActions, FormAlert, FormPage, formPageStyles } from "@/components/forms/form-page";
import type { OrganisationDetail, Plan } from "@/lib/types";
import { ORG_DETAIL_FLASH_KEY } from "../../../org-detail-shared";

// Add templates to an organisation — full page (was the "Add templates"
// modal on the organisation detail Templates tab). Same template filter,
// plan-limit rule and PUT as before.

/* eslint-disable @typescript-eslint/no-explicit-any -- same loosely-typed
   template payloads the organisation detail page works with. */

export default function AddOrgTemplatesPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { accessToken, isLoading, hasPermission } = useAuth();
  const canAdd = hasPermission("admin_org_templates_add", "add");
  const detailHref = `/admin-console/organisation-detail/${encodeURIComponent(id ?? "")}?tab=Templates`;

  const [org, setOrg] = useState<OrganisationDetail | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [allTemplates, setAllTemplates] = useState<any[]>([]);
  const [assignedTemplates, setAssignedTemplates] = useState<any[] | null>(null);
  const [selectedNewTemplateIds, setSelectedNewTemplateIds] = useState<string[]>([]);
  const [previewTpl, setPreviewTpl] = useState<any | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accessToken || !id || !canAdd) return;
    const headers = { Authorization: `Bearer ${accessToken}` };
    let cancelled = false;
    apiFetch<OrganisationDetail>(`/admin/organisations/${id}`, { headers })
      .then((o) => {
        if (!cancelled) setOrg(o);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Organisation not found");
      });
    apiFetch<any[]>(`/admin/organisations/${id}/templates`, { headers })
      .then((d) => {
        if (!cancelled) setAssignedTemplates(d);
      })
      .catch(() => {
        if (!cancelled) setAssignedTemplates([]);
      });
    apiFetch<Plan[]>("/admin/plans", { headers })
      .then((p) => {
        if (!cancelled) setPlans(p);
      })
      .catch(() => {});
    apiFetch<any[]>("/admin/templates", { headers })
      .then((d) => {
        if (!cancelled) setAllTemplates(Array.isArray(d) ? d : (d as any).data ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accessToken, id, canAdd]);

  if (isLoading) return <div className="muted" style={{ padding: 24 }}>Loading…</div>;
  if (!canAdd) {
    return (
      <div className="form-alert">
        You don&apos;t have permission to add templates. <Link href={detailHref}>Back to organisation</Link>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="form-alert">
        {loadError} <Link href={detailHref}>Back to organisation</Link>
      </div>
    );
  }
  if (!org || !assignedTemplates) return <div className="muted" style={{ padding: 24 }}>Loading…</div>;

  const plan = plans.find((p) => p.id === ((org as any).plan?.id || (org.subscription as any)?.planId));
  const rawLimit = (plan?.limits as any)?.templates;
  const allowedLabel = !rawLimit || rawLimit === "All" ? "All" : rawLimit;
  const max = !rawLimit || rawLimit === "All" || rawLimit === "Unlimited" ? Infinity : parseInt(String(rawLimit), 10);
  const available = allTemplates.filter(
    (t: any) =>
      t.status === "published" &&
      (t.pageType === "landing" || !t.pageType) &&
      !assignedTemplates.some((a: any) => a.templateId === t.id),
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !org || !assignedTemplates || selectedNewTemplateIds.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const nextIds = [...assignedTemplates.map((a: any) => a.templateId), ...selectedNewTemplateIds];
      await apiFetch(`/admin/organisations/${org.id}/templates`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ templateIds: nextIds }),
      });
      setFlash(ORG_DETAIL_FLASH_KEY, {
        message: `${selectedNewTemplateIds.length} template(s) added`,
        tab: "Templates",
      });
      router.push(detailHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
      setSaving(false);
    }
  }

  return (
    <FormPage
      eyebrow={`Organisations · ${org.name}`}
      title="Add templates"
      subtitle={`Current plan allows ${allowedLabel} templates — ${assignedTemplates.length} already assigned.`}
      backHref={detailHref}
      backLabel="Back to organisation"
    >
      <form className={formPageStyles.panel} onSubmit={handleSubmit}>
        <FormAlert message={error} />

        {available.length === 0 ? (
          <div className={formPageStyles.emptyNote}>No more published templates available to add.</div>
        ) : (
          <div
            className="grid"
            style={{ gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14, marginBottom: 20 }}
          >
            {available.map((tpl: any) => {
              const sel = selectedNewTemplateIds.includes(tpl.id);
              const dis = !sel && assignedTemplates.length + selectedNewTemplateIds.length >= max;
              return (
                <div
                  key={tpl.id}
                  role="checkbox"
                  aria-checked={sel}
                  aria-disabled={dis}
                  tabIndex={dis ? -1 : 0}
                  onClick={() =>
                    !dis &&
                    setSelectedNewTemplateIds((prev) => (sel ? prev.filter((x) => x !== tpl.id) : [...prev, tpl.id]))
                  }
                  onKeyDown={(e) => {
                    if ((e.key === " " || e.key === "Enter") && !dis) {
                      e.preventDefault();
                      setSelectedNewTemplateIds((prev) => (sel ? prev.filter((x) => x !== tpl.id) : [...prev, tpl.id]));
                    }
                  }}
                  style={{
                    border: "2px solid",
                    borderColor: sel ? "#2563eb" : "#e2e8f0",
                    borderRadius: 14,
                    overflow: "hidden",
                    cursor: dis ? "not-allowed" : "pointer",
                    opacity: dis ? 0.5 : 1,
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      height: 120,
                      background: tpl.thumbnail ? `url(${tpl.thumbnail}) center/cover` : "#eef1f6",
                      position: "relative",
                    }}
                  >
                    <span
                      className={`m-2 inline-block rounded-full px-2 py-1 text-[10px] font-bold text-white ${sel ? "bg-indigo-600" : "bg-black/60"}`}
                    >
                      {sel ? "Selected" : "Select"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewTpl(tpl);
                      }}
                      className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5"
                      aria-label={`Preview ${tpl.name}`}
                    >
                      <Icon name="eye" size={13} />
                    </button>
                  </div>
                  <div style={{ padding: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{tpl.name}</div>
                    <div style={{ fontSize: 11.5, color: "#64748b" }}>{tpl.slug}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <FormActions
          cancelHref={detailHref}
          busy={saving}
          submitDisabled={selectedNewTemplateIds.length === 0}
          busyLabel="Saving…"
          submitLabel={`Add ${selectedNewTemplateIds.length} template(s)`}
          submitIcon="plus"
        />
      </form>

      {previewTpl ? (
        <Modal
          open
          onClose={() => setPreviewTpl(null)}
          title={previewTpl.name}
          description={`${previewTpl.slug} · ${previewTpl.category}`}
          size="lg"
          flush
        >
          <div
            style={{
              height: 320,
              background: previewTpl.thumbnail ? `url(${previewTpl.thumbnail}) center/cover` : "#eef1f6",
            }}
          />
        </Modal>
      ) : null}
    </FormPage>
  );
}
