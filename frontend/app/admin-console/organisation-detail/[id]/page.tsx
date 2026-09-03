"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Icon } from "@/components/icons";
import type {
  CreateOrgUserInput,
  OrganisationActivityRow,
  OrganisationDetail,
  OrgUser,
  OrgUserAssignableRole,
  OrgUsersListResponse,
  Plan,
} from "@/lib/types";

const TABS = ["Overview", "Subscription", "Templates", "Domains", "Activity"] as const;
type Tab = (typeof TABS)[number];

const ROLE_OPTIONS: { value: OrgUserAssignableRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "sales", label: "Sales" },
];

const ROLE_BADGE_CLASS: Record<OrgUserAssignableRole, string> = {
  admin: "b-indigo",
  manager: "b-violet",
  sales: "b-teal",
};

// Every OrgStatus value, one source of truth for label + badge colour on
// this page — the list page (admin-console/organisations) had this right
// already; the detail page had two spots that collapsed anything non-
// "active" straight to "Disabled", which is how a "pending" org ended up
// showing "Pending" on the list but "Disabled" here for the same org.
const ORG_STATUS_META: Record<string, { label: string; badge: string }> = {
  active: { label: "Active", badge: "b-green" },
  pending: { label: "Pending", badge: "b-amber" },
  draft: { label: "Draft", badge: "b-gray" },
  disabled: { label: "Disabled", badge: "b-rose" },
  rejected: { label: "Rejected", badge: "b-rose" },
};

function orgStatusMeta(status: string) {
  return ORG_STATUS_META[status] ?? { label: status, badge: "b-gray" };
}

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: OrgUserAssignableRole;
}

const EMPTY_USER_FORM: UserFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  role: "sales",
};

interface EditForm {
  name: string;
  city: string;
  timezone: string;
  currency: string;
  defaultLanguage: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  state: string;
  postalCode: string;
  country: string;
  logoUrl: string;
  faviconUrl: string;
  brandColour: string;
}

const EMPTY_EDIT_FORM: EditForm = {
  name: "",
  city: "",
  timezone: "",
  currency: "",
  defaultLanguage: "",
  website: "",
  addressLine1: "",
  addressLine2: "",
  state: "",
  postalCode: "",
  country: "",
  logoUrl: "",
  faviconUrl: "",
  brandColour: "",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatActionLabel(action: string): string {
  return action
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Image field with inline preview + upload + remove — used for both the
// org logo and favicon in the edit form. `value` is the stored public URL
// ("" when none); `onPick` runs the presigned upload, `onRemove` clears it.
function AssetUploadField({
  value,
  uploading,
  accept,
  uploadedLabel,
  onPick,
  onRemove,
}: {
  value: string;
  uploading: boolean;
  accept: string;
  uploadedLabel: string;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onPick(file);
  };
  return value ? (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 11px", border: "1px solid var(--line-2)", borderRadius: 11, background: "var(--surface)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={value}
        alt="Preview"
        style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--surface)", flexShrink: 0 }}
      />
      <span className="muted" style={{ flex: 1, minWidth: 0, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {uploading ? "Uploading…" : uploadedLabel}
      </span>
      <label style={{ flexShrink: 0, cursor: "pointer", color: "var(--brand)", fontWeight: 600, fontSize: 12.5 }}>
        <input type="file" accept={accept} style={{ display: "none" }} onChange={onChange} />
        Replace
      </label>
      <button
        type="button"
        aria-label="Remove"
        title="Remove"
        onClick={onRemove}
        style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 7, border: "1px solid var(--line-2)", background: "var(--surface)", color: "var(--muted)", cursor: "pointer", fontSize: 13, lineHeight: 1 }}
      >
        ✕
      </button>
    </div>
  ) : (
    <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 13px", border: "1px dashed var(--line-2)", borderRadius: 11, background: "var(--surface)", cursor: "pointer", fontSize: 13, color: "var(--muted)" }}>
      <input type="file" accept={accept} style={{ display: "none" }} onChange={onChange} />
      {uploading ? (
        "Uploading…"
      ) : (
        <>
          <Icon name="upload" size={16} /> Upload ·{" "}
          <span style={{ color: "var(--brand)", fontWeight: 600 }}>browse</span>
        </>
      )}
    </label>
  );
}

export default function SuperAdminOrganisationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, isLoading: authLoading } = useAuth();

  const [tab, setTab] = useState<Tab>("Overview");
  const [org, setOrg] = useState<OrganisationDetail | null>(null);
  const [users, setUsers] = useState<OrgUser[] | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersReloadTick, setUsersReloadTick] = useState(0);
  const [activity, setActivity] = useState<OrganisationActivityRow[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const [userFormOpen, setUserFormOpen] = useState(false);
  const [userForm, setUserForm] = useState<UserFormData>(EMPTY_USER_FORM);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [userFormSubmitting, setUserFormSubmitting] = useState(false);
  const [userStatusBusyId, setUserStatusBusyId] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);

  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Non-blocking notice — replaces window.alert (no native dialogs in this app).
  const [toast, setToast] = useState<string | null>(null);
  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3000);
  };

  const [plans, setPlans] = useState<Plan[]>([]);
  const [assignedTemplates, setAssignedTemplates] = useState<any[]>([]);
  const [allTemplates, setAllTemplates] = useState<any[]>([]);
  const [upgradePlanId, setUpgradePlanId] = useState<string>("");
  const [upgradeBillingCycle, setUpgradeBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [upgrading, setUpgrading] = useState(false);
  const [addTemplateOpen, setAddTemplateOpen] = useState(false);
  const [selectedNewTemplateIds, setSelectedNewTemplateIds] = useState<string[]>([]);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [previewTpl, setPreviewTpl] = useState<any | null>(null);

  useEffect(() => {
    if (!authLoading && !accessToken) {
      router.replace("/login");
    }
  }, [authLoading, accessToken, router]);

  useEffect(() => {
    if (!accessToken || !params.id) return;
    const headers = { Authorization: `Bearer ${accessToken}` };
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setNotFound(false);
    /* eslint-enable react-hooks/set-state-in-effect */

    Promise.all([
      apiFetch<OrganisationDetail>(`/admin/organisations/${params.id}`, { headers }),
      apiFetch<OrganisationActivityRow[]>(`/admin/organisations/${params.id}/activity`, { headers }),
    ])
      .then(([orgRes, activityRes]) => {
        setOrg(orgRes);
        setActivity(activityRes);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [accessToken, params.id]);

  useEffect(() => {
    if (!accessToken || !params.id) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setUsersLoading(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    apiFetch<OrgUsersListResponse>(`/admin/organisations/${params.id}/users?limit=100`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => setUsers(res.data))
      .catch(() => setUsers(null))
      .finally(() => setUsersLoading(false));
  }, [accessToken, params.id, usersReloadTick]);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<Plan[]>("/admin/plans", { headers: { Authorization: `Bearer ${accessToken}` } }).then(setPlans).catch(()=>{});
    apiFetch<any[]>("/admin/templates", { headers: { Authorization: `Bearer ${accessToken}` } }).then(d=> setAllTemplates(Array.isArray(d)?d:(d as any).data??[])).catch(()=>{});
  }, [accessToken]);

  const [domainsData, setDomainsData] = useState<any | null>(null);
  const [domainsLoading, setDomainsLoading] = useState(false);

  useEffect(() => {
    if (!accessToken || !params.id) return;
    setDomainsLoading(true);
    apiFetch<any>(`/admin/organisations/${params.id}/domains`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(setDomainsData)
      .catch(() => setDomainsData(null))
      .finally(() => setDomainsLoading(false));
  }, [accessToken, params.id, tab]);

  useEffect(() => {
    if (!accessToken || !params.id) return;
    apiFetch<any[]>(`/admin/organisations/${params.id}/templates`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(setAssignedTemplates).catch(()=>setAssignedTemplates([]));
  }, [accessToken, params.id, tab, org?.assignedTemplates]);

  function openCreateUser() {
    setUserForm(EMPTY_USER_FORM);
    setUserFormError(null);
    setUserFormOpen(true);
  }

  async function submitCreateUser() {
    if (!accessToken || !params.id) return;
    setUserFormSubmitting(true);
    setUserFormError(null);
    try {
      const body: CreateOrgUserInput = {
        firstName: userForm.firstName,
        lastName: userForm.lastName,
        email: userForm.email,
        phoneNumber: userForm.phoneNumber || undefined,
        role: userForm.role,
      };
      await apiFetch(`/admin/organisations/${params.id}/users`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });
      setUserFormOpen(false);
      setUsersReloadTick((t) => t + 1);
    } catch (err) {
      setUserFormError(err instanceof Error ? err.message : "Failed to create user.");
    } finally {
      setUserFormSubmitting(false);
    }
  }

  async function toggleUserStatus(user: OrgUser) {
    if (!accessToken || !params.id) return;
    const nextStatus = user.status === "active" ? "disabled" : "active";
    setUserStatusBusyId(user.id);
    try {
      await apiFetch(`/admin/organisations/${params.id}/users/${user.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status: nextStatus }),
      });
      setUsersReloadTick((t) => t + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to update user status.");
    } finally {
      setUserStatusBusyId(null);
    }
  }

  function startEdit() {
    if (!org) return;
    setEditForm({
      name: org.name,
      city: org.city,
      timezone: org.timezone,
      currency: org.currency,
      defaultLanguage: org.defaultLanguage,
      website: org.website ?? "",
      addressLine1: org.addressLine1 ?? "",
      addressLine2: org.addressLine2 ?? "",
      state: org.state ?? "",
      postalCode: org.postalCode ?? "",
      country: org.country ?? "",
      logoUrl: org.logoUrl ?? "",
      faviconUrl: org.faviconUrl ?? "",
      brandColour: org.brandColour ?? "",
    });
    setEditError(null);
    setEditing(true);
  }

  // Logo + favicon share one presigned-upload flow — same shape as the
  // signup wizard's logo upload, just pointed at the admin org-scoped
  // endpoint (key is scoped to this org id server-side).
  async function handleAssetUpload(kind: "logo" | "favicon", file: File) {
    if (!org || !accessToken) return;
    const setBusy = kind === "logo" ? setLogoUploading : setFaviconUploading;
    const formKey: "logoUrl" | "faviconUrl" = kind === "logo" ? "logoUrl" : "faviconUrl";
    setEditError(null);
    setBusy(true);
    try {
      const { uploadUrl, publicUrl } = await apiFetch<{ uploadUrl: string; publicUrl: string }>(
        `/admin/organisations/${org.id}/${kind}-upload-url`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
        },
      );
      const put = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) throw new Error(`Upload failed (${put.status}).`);
      setEditForm((f) => ({ ...f, [formKey]: publicUrl }));
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Upload failed — please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!org || !accessToken) return;
    setEditError(null);
    setEditSubmitting(true);
    // brandColour is validated server-side as a strict hex — only send it
    // when it's a real value, so editing an org that never set one doesn't 400.
    const { brandColour, ...rest } = editForm;
    const payload: Partial<EditForm> = { ...rest };
    if (/^#[0-9a-fA-F]{6}$/.test(brandColour)) payload.brandColour = brandColour;
    try {
      await apiFetch(`/admin/organisations/${org.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(payload),
      });
      setOrg((prev) => (prev ? { ...prev, ...editForm } : prev));
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function confirmToggleStatus() {
    if (!org || !accessToken) return;
    const next = org.status === "active" ? "disabled" : "active";

    setStatusSubmitting(true);
    try {
      await apiFetch(`/admin/organisations/${org.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status: next }),
      });
      setOrg((prev) => (prev ? { ...prev, status: next } : prev));
      setStatusModalOpen(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setStatusSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!org || !accessToken) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await apiFetch(`/admin/organisations/${org.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      router.push("/admin-console/organisations");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete organisation.");
      setDeleting(false);
    }
  }

  if (authLoading || !accessToken || loading) {
    return null;
  }

  if (notFound || !org) {
    return (
      <div className="card">
        <div className="card-b">
          <p className="muted">Organisation not found.</p>
        </div>
      </div>
    );
  }

  // Invited users have no name until they set one themselves at first
  // login — fall back to their email rather than rendering blank.
  const adminName = org.admin
    ? [org.admin.firstName, org.admin.lastName].filter(Boolean).join(" ") || org.admin.email
    : "—";

  return (
    <>
      <div className="page-head reveal in">
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span className="av" style={{ width: 58, height: 58, borderRadius: 16, fontSize: 20 }}>
            {initials(org.name)}
          </span>
          <div>
            <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {org.name}{" "}
              <span className={`badge ${orgStatusMeta(org.status).badge}`}>
                <span className="dot" style={{ background: "currentColor" }} />
                {orgStatusMeta(org.status).label}
              </span>
            </h1>
            <div className="sub" style={{ marginTop: 4 }}>
              {org.city} · <span className="mono">{org.slug}</span> · onboarded {formatDate(org.createdAt)}
            </div>
            {(org.subdomain || org.customDomain) ? (
              <div style={{ display:"flex", gap:12, alignItems:"center", marginTop:8, flexWrap:"wrap" }}>
                {org.subdomain ? (
                  <span className="chip">
                    <Icon name="globe" size={12} /> {org.subdomainHost ?? org.subdomain}
                    <span style={{ textTransform:"capitalize", fontWeight:700 }}> · {org.subdomainStatus}</span>
                  </span>
                ) : null}
                {org.customDomain ? (
                  <span className="chip">
                    <Icon name="link" size={12} /> {org.customDomain}
                    <span style={{ textTransform:"capitalize", fontWeight:700 }}> · {org.customDomainStatus}</span>
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <div className="actions">
          <span className={`badge ${orgStatusMeta(org.status).badge}`}>
            {orgStatusMeta(org.status).label}
          </span>
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: 20 }}>
        <Reveal delay={1}>
          <div className="stat">
            <div className="top">
              <span className="label">Users</span>
              <span className="ic ic-indigo"><Icon name="profile" size={16} /></span>
            </div>
            <div className="value">
              <CountUp value={org.userCount} />
            </div>
            <div className="delta">{org.teamCount} teams</div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="stat">
            <div className="top">
              <span className="label">Sites</span>
              <span className="ic ic-sky"><Icon name="document" size={16} /></span>
            </div>
            <div className="value">—</div>
            <div className="delta">—</div>
          </div>
        </Reveal>
        <Reveal delay={3}>
          <div className="stat">
            <div className="top">
              <span className="label">Leads captured</span>
              <span className="ic ic-green"><Icon name="target" size={16} /></span>
            </div>
            <div className="value">—</div>
            <div className="delta">—</div>
          </div>
        </Reveal>
        <Reveal delay={4}>
          <div className="stat">
            <div className="top">
              <span className="label">Plan value</span>
              <span className="ic ic-violet"><Icon name="billing" size={16} /></span>
            </div>
            <div className="value">{org.plan?.name ?? "—"}</div>
            <div className="delta">{org.planValue != null ? `₹${org.planValue.toLocaleString("en-IN")}` : "—"}</div>
          </div>
        </Reveal>
      </div>

      <div className="tabs reveal in">
        {TABS.map((t) => (
          <a key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t}
          </a>
        ))}
      </div>

      <div className="grid g-2-1">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {tab === "Overview" ? (
            <Reveal delay={2}>
              <div className="card">
                <div className="card-h">
                  <span className="t">Organisation details</span>
                  {!editing ? (
                    <button className="btn btn-ghost btn-sm" onClick={startEdit}>
                      Edit
                    </button>
                  ) : null}
                </div>
                <div className="card-b">
                  {editing ? (
                    <form onSubmit={handleEditSubmit}>
                      <div className="row2">
                        <div className="field">
                          <label>Organisation name</label>
                          <input
                            className="inp"
                            required
                            value={editForm.name}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          />
                        </div>
                        <div className="field">
                          <label>City</label>
                          <input
                            className="inp"
                            required
                            value={editForm.city}
                            onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="row2">
                        <div className="field">
                          <label>Timezone</label>
                          <input
                            className="inp"
                            value={editForm.timezone}
                            onChange={(e) => setEditForm((f) => ({ ...f, timezone: e.target.value }))}
                          />
                        </div>
                        <div className="field">
                          <label>Currency</label>
                          <input
                            className="inp"
                            value={editForm.currency}
                            onChange={(e) => setEditForm((f) => ({ ...f, currency: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="row2">
                        <div className="field">
                          <label>Default language</label>
                          <input
                            className="inp"
                            value={editForm.defaultLanguage}
                            onChange={(e) => setEditForm((f) => ({ ...f, defaultLanguage: e.target.value }))}
                          />
                        </div>
                        <div className="field">
                          <label>Website</label>
                          <input
                            className="inp"
                            placeholder="https://…"
                            value={editForm.website}
                            onChange={(e) => setEditForm((f) => ({ ...f, website: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="row2">
                        <div className="field">
                          <label>Address line 1</label>
                          <input
                            className="inp"
                            value={editForm.addressLine1}
                            onChange={(e) => setEditForm((f) => ({ ...f, addressLine1: e.target.value }))}
                          />
                        </div>
                        <div className="field">
                          <label>Address line 2</label>
                          <input
                            className="inp"
                            value={editForm.addressLine2}
                            onChange={(e) => setEditForm((f) => ({ ...f, addressLine2: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="row2">
                        <div className="field">
                          <label>State</label>
                          <input
                            className="inp"
                            value={editForm.state}
                            onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value }))}
                          />
                        </div>
                        <div className="field">
                          <label>Postal code</label>
                          <input
                            className="inp"
                            value={editForm.postalCode}
                            onChange={(e) => setEditForm((f) => ({ ...f, postalCode: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="row2">
                        <div className="field">
                          <label>Country</label>
                          <input
                            className="inp"
                            value={editForm.country}
                            onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value }))}
                          />
                        </div>
                        <div className="field">
                          <label>Brand colour</label>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <input
                              type="color"
                              className="colorpick"
                              value={/^#[0-9a-f]{6}$/i.test(editForm.brandColour) ? editForm.brandColour : "#4f46e5"}
                              onChange={(e) => setEditForm((f) => ({ ...f, brandColour: e.target.value }))}
                              aria-label="Pick a brand colour"
                            />
                            <span className="mono">{(editForm.brandColour || "#4f46e5").toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="row2">
                        <div className="field">
                          <label>Logo</label>
                          <AssetUploadField
                            value={editForm.logoUrl}
                            uploading={logoUploading}
                            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                            uploadedLabel="Logo uploaded"
                            onPick={(file) => void handleAssetUpload("logo", file)}
                            onRemove={() => setEditForm((f) => ({ ...f, logoUrl: "" }))}
                          />
                        </div>
                        <div className="field">
                          <label>Favicon</label>
                          <AssetUploadField
                            value={editForm.faviconUrl}
                            uploading={faviconUploading}
                            accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,.ico"
                            uploadedLabel="Favicon uploaded"
                            onPick={(file) => void handleAssetUpload("favicon", file)}
                            onRemove={() => setEditForm((f) => ({ ...f, faviconUrl: "" }))}
                          />
                        </div>
                      </div>
                      {editError ? <div className="form-alert">{editError}</div> : null}
                      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setEditing(false)}
                          disabled={editSubmitting}
                        >
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={editSubmitting}>
                          {editSubmitting ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid g2" style={{ gap: 14 }}>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Admin
                        </div>
                        <b>{adminName}</b>
                        <div className="sm muted">{org.admin?.email ?? "—"}</div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Phone
                        </div>
                        <b>{org.admin?.phoneNumber ?? "—"}</b>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          City
                        </div>
                        <b>{org.city}</b>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Subdomain root
                        </div>
                        <b className="mono">{org.slug}</b>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Timezone
                        </div>
                        <b>{org.timezone}</b>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Currency
                        </div>
                        <b>{org.currency}</b>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Default language
                        </div>
                        <b>{org.defaultLanguage}</b>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Website
                        </div>
                        <b>{org.website ?? "—"}</b>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Address
                        </div>
                        <b>
                          {[org.addressLine1, org.addressLine2, org.state, org.postalCode, org.country]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </b>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Logo
                        </div>
                        {org.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={org.logoUrl}
                            alt="Organisation logo"
                            style={{ height: 36, width: "auto", maxWidth: 140, objectFit: "contain", borderRadius: 6, marginTop: 2 }}
                          />
                        ) : (
                          <b>—</b>
                        )}
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Favicon
                        </div>
                        {org.faviconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={org.faviconUrl}
                            alt="Organisation favicon"
                            style={{ height: 24, width: 24, objectFit: "contain", borderRadius: 4, marginTop: 2 }}
                          />
                        ) : (
                          <b>—</b>
                        )}
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Brand colour
                        </div>
                        {org.brandColour ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: 4,
                                background: org.brandColour,
                                display: "inline-block",
                              }}
                            />
                            <b className="mono">{org.brandColour}</b>
                          </span>
                        ) : (
                          <b>—</b>
                        )}
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Plan
                        </div>
                        <b>{org.plan?.name ?? "—"}</b>
                        {org.plan && org.planValue != null ? (
                          <div className="sm muted">₹{org.planValue.toLocaleString("en-IN")}</div>
                        ) : null}
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Status
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span className={`badge ${orgStatusMeta(org.status).badge}`}>
                            {orgStatusMeta(org.status).label}
                          </span>
                          {org.status === "rejected" && org.rejectionReason ? (
                            <span
                              title={`Rejection reason: ${org.rejectionReason}`}
                              style={{ display: "inline-flex", color: "var(--rose)", cursor: "help" }}
                            >
                              <Icon name="info" size={14} />
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Reveal>
          ) : null}

          {tab === "Subscription" ? (
            <Reveal delay={2}>
              <div className="card">
                <div className="card-h">
                  <span className="t">Subscription</span>
                  {org.subscription ? <span className={`badge ${(org.subscription as any).status==="active"?"b-green":"b-amber"}`}>{(org.subscription as any).status}</span> : <span className="badge b-gray">No subscription</span>}
                </div>
                <div className="card-b" style={{ display:"grid", gap:16 }}>
                  {org.subscription ? (
                    <div style={{ display:"grid", gap:10, padding:14, border:"1px solid var(--line)", borderRadius:12, background:"var(--surface-2)" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                        <span className={`badge ${(org as any).plan?.badge || "b-indigo"}`}>{(org as any).plan?.name ?? (org.subscription as any).plan?.name ?? "—"}</span>
                        <span className="chip">{(org.subscription as any).billingCycle}</span>
                        <span className="chip">₹{((org.subscription as any).amount ?? 0).toLocaleString("en-IN")}</span>
                        {(org.subscription as any).mrr ? <span className="chip">MRR ₹{(org.subscription as any).mrr.toLocaleString("en-IN")}</span> : null}
                      </div>
                      <div className="grid g2" style={{ gap:10, fontSize:13 }}>
                        <div><span className="muted" style={{ fontSize:11 }}>Plan value</span><br/><b>₹{((org as any).planValue ?? (org.subscription as any).amount ?? 0).toLocaleString("en-IN")}</b></div>
                        <div><span className="muted" style={{ fontSize:11 }}>Renews</span><br/><b>{(org as any).subscriptionRenewsAt || (org.subscription as any).renewsAt ? new Date((org as any).subscriptionRenewsAt || (org.subscription as any).renewsAt).toLocaleDateString("en-GB") : "—"}</b></div>
                        <div><span className="muted" style={{ fontSize:11 }}>Templates</span><br/><b>{assignedTemplates.length} assigned</b></div>
                        <div><span className="muted" style={{ fontSize:11 }}>Status</span><br/><b>{(org.subscription as any).status}</b></div>
                      </div>
                    </div>
                  ) : <div className="help">No subscription yet — approvals created one after package selection.</div>}

                  <div>
                    <div style={{ fontWeight:700, marginBottom:8 }}>Upgrade package</div>
                    <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10 }}>
                      <span style={{ fontSize:12, fontWeight:600 }}>Billing:</span>
                      <div style={{ display:"flex", gap:4, background:"#eef1f6", borderRadius:999, padding:3 }}>
                        {(["monthly","yearly"] as const).map(c=>(
                          <button key={c} type="button" onClick={()=>setUpgradeBillingCycle(c)} style={{ padding:"6px 12px", borderRadius:999, border:"none", background: upgradeBillingCycle===c?"#fff":"transparent", fontWeight:600, fontSize:12, cursor:"pointer", textTransform:"capitalize", boxShadow: upgradeBillingCycle===c?"0 1px 4px rgba(0,0,0,.1)":"none" }}>{c}</button>
                        ))}
                      </div>
                    </div>
                    <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:10 }}>
                      {plans.map(p=>{
                        const isCurrent = (org as any).plan?.id===p.id || (org.subscription as any)?.planId===p.id;
                        const isSelected = upgradePlanId===p.id;
                        const price = upgradeBillingCycle==="monthly"? p.priceMonthly : p.priceYearly;
                        return (
                          <div key={p.id} onClick={()=> setUpgradePlanId(p.id)} style={{ border:"2px solid", borderColor: isSelected? "var(--brand)": isCurrent? "var(--green)":"var(--line)", borderRadius:14, padding:12, cursor:"pointer", background: isSelected? "var(--brand-050)" : "#fff" }}>
                            <div className={`badge ${p.badge}`}>{p.name}</div>
                            <div style={{ fontWeight:800, marginTop:6 }}>₹{price.toLocaleString("en-IN")}<span style={{ fontSize:11, color:"var(--muted)"}}>{upgradeBillingCycle==="monthly"?"/mo":"/yr"}</span></div>
                            <div style={{ fontSize:11, color:"var(--muted)"}}>{(p.limits as any)?.templates} templates · {p.limits?.projects} projects</div>
                            <div style={{ fontSize:11, fontWeight:700, color: isCurrent? "var(--green)": isSelected? "var(--brand)":"var(--muted)", marginTop:6 }}>{isCurrent?"Current": isSelected?"Selected":"Select"}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ marginTop:12, display:"flex", gap:10 }}>
                      <button className="btn btn-primary btn-sm" disabled={upgrading || !upgradePlanId} onClick={async()=>{
                        if(!upgradePlanId) return;
                        setUpgrading(true);
                        try{
                          if(org.subscription){
                            await apiFetch(`/admin/subscriptions/${(org.subscription as any).id}`, { method:"PATCH", headers:{ Authorization:`Bearer ${accessToken}` }, body: JSON.stringify({ planId: upgradePlanId, billingCycle: upgradeBillingCycle }) });
                          } else {
                            await apiFetch(`/admin/subscriptions`, { method:"POST", headers:{ Authorization:`Bearer ${accessToken}` }, body: JSON.stringify({ orgId: org.id, planId: upgradePlanId, billingCycle: upgradeBillingCycle }) });
                          }
                          const fresh = await apiFetch<OrganisationDetail>(`/admin/organisations/${org.id}`, { headers:{ Authorization:`Bearer ${accessToken}` }});
                          setOrg(fresh);
                          setUpgradePlanId("");
                          notify("Subscription upgraded");
                        } catch(e:any){ notify(e.message||"Upgrade failed"); }
                        finally{ setUpgrading(false); }
                      }}>
                        {upgrading?"Upgrading…":"Upgrade subscription"}
                      </button>
                      <span className="muted" style={{ fontSize:12, alignSelf:"center"}}>Upgrade increases template limit — then add more in Templates tab.</span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ) : null}

          {tab === "Templates" ? (
            <Reveal delay={2}>
              <div className="card">
                <div className="card-h">
                  <span className="t">Assigned templates</span>
                  <span className="chip">{assignedTemplates.length} selected</span>
                  <button className="btn btn-primary btn-sm" onClick={()=> setAddTemplateOpen(true)}>+ Add template</button>
                </div>
                <div className="card-b">
                  {assignedTemplates.length===0 ? <p className="muted">No templates assigned — add from available templates (limit depends on package).</p> : (
                    <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12 }}>
                      {assignedTemplates.map((at:any)=>(
                        <div key={at.templateId} style={{ border:"1px solid var(--line)", borderRadius:12, overflow:"hidden"}}>
                          <div style={{ height:100, background: at.template.thumbnail? `url(${at.template.thumbnail}) center/cover`:"#eef1f6", position:"relative"}}>
                            <button type="button" onClick={()=> setPreviewTpl(at.template)} className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow" title="Preview"><Icon name="eye" size={14}/></button>
                          </div>
                          <div style={{ padding:10}}>
                            <div style={{ fontWeight:700, fontSize:12}}>{at.template.name}</div>
                            <div style={{ fontSize:11, color:"var(--muted)"}}>{at.template.slug}</div>
                            <button className="btn btn-ghost btn-sm" style={{ marginTop:6, color:"var(--rose)" }} onClick={async()=>{
                              const nextIds = assignedTemplates.filter(x=>x.templateId!==at.templateId).map(x=>x.templateId);
                              setTemplateSaving(true);
                              try{
                                await apiFetch(`/admin/organisations/${org.id}/templates`, { method:"PUT", headers:{ Authorization:`Bearer ${accessToken}` }, body: JSON.stringify({ templateIds: nextIds })});
                                setAssignedTemplates(prev=> prev.filter(x=>x.templateId!==at.templateId));
                              } catch(e:any){ notify(e.message||"Failed"); }
                              finally{ setTemplateSaving(false); }
                            }} disabled={templateSaving}>Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="muted" style={{ fontSize:12, marginTop:10}}>Starter allows 1 template, Pro 2, Pro Max All — upgrade subscription to increase limit, then add more here.</p>
                </div>
              </div>

              {addTemplateOpen ? (
                <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:400, padding:20}} onClick={()=>setAddTemplateOpen(false)}>
                  <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:16, padding:16, width:720, maxWidth:"100%", maxHeight:"85vh", overflow:"auto"}}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
                      <b>Add templates</b>
                      <button className="btn btn-ghost btn-sm" onClick={()=>setAddTemplateOpen(false)}></button>
                    </div>
                    <div style={{ fontSize:12, color:"var(--muted)", marginBottom:10}}>
                      Current plan allows {(()=>{
                        const plan = plans.find(p=> p.id===((org as any).plan?.id || (org.subscription as any)?.planId));
                        const raw=(plan?.limits as any)?.templates;
                        if(!raw || raw==="All") return "All";
                        return raw;
                      })()} templates — {assignedTemplates.length} already assigned.
                    </div>
                    <div className="grid" style={{ gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10, maxHeight:360, overflow:"auto"}}>
                      {allTemplates.filter((t:any)=> !assignedTemplates.some((a:any)=>a.templateId===t.id)).map((tpl:any)=> {
                        const sel = selectedNewTemplateIds.includes(tpl.id);
                        const plan = plans.find(p=> p.id===((org as any).plan?.id || (org.subscription as any)?.planId));
                        const raw=(plan?.limits as any)?.templates;
                        const max = !raw || raw==="All"||raw==="Unlimited" ? Infinity : parseInt(String(raw),10);
                        const dis = !sel && (assignedTemplates.length + selectedNewTemplateIds.length) >= max;
                        return (
                          <div key={tpl.id} onClick={()=> !dis && setSelectedNewTemplateIds(prev=> sel? prev.filter(x=>x!==tpl.id): [...prev, tpl.id])} style={{ border:"1px solid", borderColor: sel?"var(--brand)":"var(--line)", borderRadius:12, overflow:"hidden", cursor: dis?"not-allowed":"pointer", opacity: dis?0.5:1}}>
                            <div style={{ height:90, background: tpl.thumbnail? `url(${tpl.thumbnail}) center/cover`:"#eef1f6", position:"relative"}}>
                              <span className={`m-1 inline-block rounded-full px-2 py-1 text-[10px] font-bold text-white ${sel?"bg-indigo-600":"bg-black/60"}`}>{sel?"":"Select"}</span>
                              <button type="button" onClick={(e)=>{ e.stopPropagation(); setPreviewTpl(tpl); }} className="absolute right-1 top-1 rounded-full bg-white/90 p-1"><Icon name="eye" size={12}/></button>
                            </div>
                            <div style={{ padding:8}}>
                              <div style={{ fontWeight:700, fontSize:12}}>{tpl.name}</div>
                              <div style={{ fontSize:11, color:"var(--muted)"}}>{tpl.slug}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:12}}>
                      <button className="btn btn-ghost btn-sm" onClick={()=>{ setSelectedNewTemplateIds([]); setAddTemplateOpen(false); }}>Cancel</button>
                      <button className="btn btn-primary btn-sm" disabled={templateSaving || selectedNewTemplateIds.length===0} onClick={async()=>{
                        setTemplateSaving(true);
                        try{
                          const nextIds = [...assignedTemplates.map((a:any)=>a.templateId), ...selectedNewTemplateIds];
                          await apiFetch(`/admin/organisations/${org.id}/templates`, { method:"PUT", headers:{ Authorization:`Bearer ${accessToken}` }, body: JSON.stringify({ templateIds: nextIds })});
                          setAssignedTemplates(prev=> [...prev, ...selectedNewTemplateIds.map(id=> {
                            const t=allTemplates.find((x:any)=>x.id===id);
                            return { templateId:id, template:{ id: t.id, name:t.name, slug:t.slug, thumbnail:t.thumbnail, category:t.category }};
                          })]);
                          setSelectedNewTemplateIds([]); setAddTemplateOpen(false);
                        } catch(e:any){ notify(e.message||"Failed to add"); }
                        finally{ setTemplateSaving(false); }
                      }}>
                        {templateSaving?"Saving…":`Add ${selectedNewTemplateIds.length} template(s)`}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {previewTpl ? (
                <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, padding:20}} onClick={()=>setPreviewTpl(null)}>
                  <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:16, overflow:"hidden", width:720, maxWidth:"100%"}}>
                    <div style={{ height:260, background: previewTpl.thumbnail? `url(${previewTpl.thumbnail}) center/cover`: "#eef1f6", position:"relative"}}>
                      <button onClick={()=>setPreviewTpl(null)} className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white"><Icon name="close" size={14}/></button>
                    </div>
                    <div style={{ padding:16}}>
                      <b>{previewTpl.name}</b><div className="muted" style={{ fontSize:12}}>{previewTpl.slug} · {previewTpl.category}</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </Reveal>
          ) : null}

          {tab === "Domains" ? (
            <Reveal delay={2}>
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div className="grid g3" style={{ gap:14 }}>
                  <div className="card" style={{ padding:16 }}>
                    <div className="muted" style={{ fontSize:11.5, fontWeight:700, textTransform:"uppercase" }}>Total Configured Domains</div>
                    <div style={{ fontSize:22, fontWeight:800, color:"var(--ink)", marginTop:4 }}>
                      {(domainsData?.subdomain ? 1 : 0) + (domainsData?.customDomain ? 1 : 0) + (domainsData?.domainRequests?.length ?? 0)}
                    </div>
                    <div className="delta" style={{ fontSize:12, marginTop:2 }}>Subdomains &amp; Custom Domains</div>
                  </div>
                  <div className="card" style={{ padding:16 }}>
                    <div className="muted" style={{ fontSize:11.5, fontWeight:700, textTransform:"uppercase" }}>Primary Subdomain</div>
                    <div style={{ fontSize:15, fontWeight:800, fontFamily:"monospace", color:"var(--ink)", marginTop:6, overflow:"hidden", textOverflow:"ellipsis" }}>
                      {domainsData?.subdomainHost ?? (domainsData?.subdomain ? `${domainsData.subdomain}.localhost` : "—")}
                    </div>
                    <div style={{ marginTop:4 }}>
                      <span className={`badge ${domainsData?.subdomainStatus === "active" ? "b-green" : "b-gray"}`}>
                        {domainsData?.subdomainStatus ?? "none"}
                      </span>
                    </div>
                  </div>
                  <div className="card" style={{ padding:16 }}>
                    <div className="muted" style={{ fontSize:11.5, fontWeight:700, textTransform:"uppercase" }}>Website Custom Domains</div>
                    <div style={{ fontSize:22, fontWeight:800, color:"var(--ink)", marginTop:4 }}>
                      {domainsData?.domainRequests?.length ?? 0}
                    </div>
                    <div className="delta" style={{ fontSize:12, marginTop:2 }}>Mapped to landing pages</div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-h">
                    <span className="t">All Domains &amp; Subdomains</span>
                    <span className="chip">
                      {(domainsData?.subdomain ? 1 : 0) + (domainsData?.customDomain ? 1 : 0) + (domainsData?.domainRequests?.length ?? 0)} total
                    </span>
                  </div>
                  <div className="tbl-wrap">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Scope / Website</th>
                          <th>Domain / Host</th>
                          <th>Kind</th>
                          <th>Status</th>
                          <th>DNS</th>
                          <th>SSL</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {domainsLoading ? (
                          <tr><td colSpan={7} className="muted">Loading domains…</td></tr>
                        ) : (
                          <>
                            {/* 1. Organisation Primary Subdomain */}
                            {domainsData?.subdomain ? (
                              <tr style={{ background:"var(--surface-2)" }}>
                                <td>
                                  <span style={{ fontWeight:800, color:"var(--brand)" }}>Organisation Portal</span>
                                  <br /><span className="muted sm">Primary platform subdomain</span>
                                </td>
                                <td style={{ fontFamily:"monospace", fontWeight:800 }}>
                                  {domainsData.subdomainHost ?? `${domainsData.subdomain}.localhost`}
                                </td>
                                <td><span className="badge b-teal">Primary Subdomain</span></td>
                                <td>
                                  <span className={`badge ${domainsData.subdomainStatus === "active" ? "b-green" : domainsData.subdomainStatus === "pending" ? "b-amber" : "b-gray"}`}>
                                    {domainsData.subdomainStatus}
                                  </span>
                                </td>
                                <td><span className="badge b-green">Active</span></td>
                                <td><span className="badge b-green">Active</span></td>
                                <td className="muted" style={{ fontSize:12 }}>{formatDate(org.createdAt)}</td>
                              </tr>
                            ) : null}

                            {/* 2. Organisation Primary Custom Domain (if configured) */}
                            {domainsData?.customDomain ? (
                              <tr style={{ background:"var(--surface-2)" }}>
                                <td>
                                  <span style={{ fontWeight:800, color:"var(--brand)" }}>Organisation Domain</span>
                                  <br /><span className="muted sm">Primary company domain</span>
                                </td>
                                <td style={{ fontFamily:"monospace", fontWeight:800 }}>{domainsData.customDomain}</td>
                                <td><span className="badge b-indigo">Org Custom Domain</span></td>
                                <td>
                                  <span className={`badge ${domainsData.customDomainStatus === "connected" ? "b-green" : domainsData.customDomainStatus === "pending" ? "b-amber" : "b-gray"}`}>
                                    {domainsData.customDomainStatus}
                                  </span>
                                </td>
                                <td><span className="badge b-gray">Active</span></td>
                                <td><span className="badge b-gray">Active</span></td>
                                <td className="muted" style={{ fontSize:12 }}>—</td>
                              </tr>
                            ) : null}

                            {/* 3. Website / Landing Page Custom Domains */}
                            {(domainsData?.domainRequests ?? []).map((dr: any) => (
                              <tr key={dr.id}>
                                <td>
                                  <span style={{ fontWeight:700 }}>{dr.landingPage?.name ?? "Website"}</span>
                                  <br /><span className="muted sm">{dr.landingPage?.slug}</span>
                                </td>
                                <td style={{ fontFamily:"monospace", fontWeight:700 }}>{dr.domain}</td>
                                <td><span className="badge b-sky">Website Domain</span></td>
                                <td><span className={`badge ${dr.status === "connected" ? "b-green" : dr.status === "pending" ? "b-amber" : "b-gray"}`}>{dr.status}</span></td>
                                <td><span className="badge b-gray">{dr.dnsStatus}</span></td>
                                <td><span className="badge b-gray">{dr.sslStatus}</span></td>
                                <td className="muted" style={{ fontSize:12 }}>{new Date(dr.createdAt ?? dr.requestedAt).toLocaleDateString()}</td>
                              </tr>
                            ))}

                            {!domainsData?.subdomain && !domainsData?.customDomain && (!domainsData?.domainRequests || domainsData.domainRequests.length === 0) ? (
                              <tr><td colSpan={7} className="muted">No domains configured for this organisation.</td></tr>
                            ) : null}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </Reveal>
          ) : null}

          {tab === "Activity" ? (
            <Reveal delay={2}>
              <div className="card">
                <div className="card-h">
                  <span className="t">All activity</span>
                </div>
                <div className="card-b">
                  {!activity || activity.length === 0 ? (
                    <p className="muted">No activity yet.</p>
                  ) : (
                    <ul className="timeline">
                      {activity.map((entry) => (
                        <li key={entry.id}>
                          <span className="td" />
                          <b style={{ fontSize: 13 }}>{formatActionLabel(entry.action)}</b>
                          <div className="tt">
                            {entry.entity ?? "—"} · {formatDateTime(entry.createdAt)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Reveal>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Reveal delay={2}>
            <div className="card">
              <div className="card-h">
                <span className="t">Activity</span>
              </div>
              <div className="card-b">
                {!activity || activity.length === 0 ? (
                  <p className="muted">No activity yet.</p>
                ) : (
                  <ul className="timeline">
                    {activity.slice(0, 5).map((entry) => (
                      <li key={entry.id}>
                        <span className="td" />
                        <b style={{ fontSize: 13 }}>{formatActionLabel(entry.action)}</b>
                        <div className="tt">
                          {entry.entity ?? "—"} · {formatDateTime(entry.createdAt)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Reveal>
          <Reveal delay={3}>
            <div className="card">
              <div className="card-h">
                <span className="t">Danger zone</span>
              </div>
              <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  className="btn btn-ghost btn-block"
                  onClick={() => setStatusModalOpen(true)}
                  disabled={statusSubmitting}
                >
                  {org.status === "active" ? <><Icon name="close" size={14} /> Suspend organisation</> : <><Icon name="chevron-right" size={14} /> Reactivate organisation</>}
                </button>
                <button
                  className="btn btn-ghost btn-block"
                  style={{ color: "var(--rose)", borderColor: "var(--rose-050)" }}
                  onClick={() => setDeleteModalOpen(true)}
                >
                  <Icon name="trash" size={14} /> Delete organisation
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {statusModalOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 400,
            padding: 20,
          }}
          onClick={() => {
            if (!statusSubmitting) setStatusModalOpen(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 32,
              width: 440,
              maxWidth: "100%",
              boxShadow: "0 24px 80px rgba(15,23,42,.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "var(--amber-050)",
                  color: "var(--amber)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 18,
                }}
              >
                {org.status === "active" ? <Icon name="close" size={14} /> : <Icon name="chevron-right" size={14} />}
              </span>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>
                {org.status === "active" ? "Suspend organisation?" : "Reactivate organisation?"}
              </h2>
            </div>
            <p style={{ margin: "0 0 6px", color: "var(--ink-2)", fontSize: 13.5, lineHeight: 1.6 }}>
              {org.status === "active" ? (
                <>
                  <strong>&quot;{org.name}&quot;</strong> will be marked disabled. No data is deleted — you
                  can reactivate any time.
                </>
              ) : (
                <>
                  <strong>&quot;{org.name}&quot;</strong> will be marked active again.
                </>
              )}
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 24,
                paddingTop: 20,
                borderTop: "1px solid var(--line)",
              }}
            >
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setStatusModalOpen(false)}
                disabled={statusSubmitting}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => void confirmToggleStatus()}
                disabled={statusSubmitting}
              >
                {statusSubmitting
                  ? "Saving…"
                  : org.status === "active"
                    ? "Suspend organisation"
                    : "Reactivate organisation"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteModalOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 400,
            padding: 20,
          }}
          onClick={() => {
            if (!deleting) setDeleteModalOpen(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 32,
              width: 440,
              maxWidth: "100%",
              boxShadow: "0 24px 80px rgba(15,23,42,.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "var(--rose-050)",
                  color: "var(--rose)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 18,
                }}
              >
                <Icon name="trash" size={14} />
              </span>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>
                Delete organisation?
              </h2>
            </div>
            <p style={{ margin: "0 0 6px", color: "var(--ink-2)", fontSize: 13.5, lineHeight: 1.6 }}>
              <strong>&quot;{org.name}&quot;</strong> and its {org.userCount} user
              {org.userCount === 1 ? "" : "s"} will be permanently deleted.
            </p>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>This action cannot be undone.</p>

            {deleteError ? (
              <div
                style={{
                  color: "var(--rose)",
                  fontSize: 13,
                  marginTop: 12,
                  background: "var(--rose-050)",
                  padding: "8px 12px",
                  borderRadius: 8,
                }}
              >
                {deleteError}
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 24,
                paddingTop: 20,
                borderTop: "1px solid var(--line)",
              }}
            >
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button className="btn btn-danger" type="button" onClick={() => void handleDelete()} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete organisation"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 500 }}>
          <div
            className="card"
            style={{ padding: "12px 16px", boxShadow: "var(--sh-lg)" }}
          >
            {toast}
          </div>
        </div>
      ) : null}
    </>
  );
}
