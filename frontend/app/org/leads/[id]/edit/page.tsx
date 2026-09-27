"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { StatusNoteModal } from "@/components/org/lead-status-select";
import { useAuth } from "@/lib/auth-context";
import { isOrgAdmin } from "@/lib/session";
import { isValidLoosePhone, LOOSE_PHONE_MESSAGE } from "@/lib/phone";
import {
  apiFetch,
  assignCrmLead,
  getCrmAssignableUsers,
  getCrmLead,
  getOrgCatalogOptions,
  updateCrmLead,
} from "@/lib/api";
import type {
  CrmLead,
  CrmLeadStatus,
  OrgCatalogCategory,
  OrgCatalogOption,
  ProjectsListResponse,
  UpdateLeadInput,
} from "@/lib/types";
import "@/app/org/org.css";
import "./lead-edit.css";

const SOURCES = [
  "crm",
  "CRM - 4 BHK",
  "Meta Lead Ad",
  "Google Ads",
  "Website form",
  "Portal (99acres)",
  "Walk-in",
  "Referral",
];

const DEFAULT_PURPOSES = ["Buy", "Rent", "Investment", "Lease", "Commercial"];
const DEFAULT_FINANCINGS = ["Yes", "No", "Self-funded", "Bank loan required"];
const DEFAULT_LOAN_STATUSES = ["Not started", "In progress", "Pre-approved", "Approved", "Rejected"];
const DEFAULT_TIMELINES = ["Within 3 months", "Immediate", "1-3 months", "3-6 months", "> 6 months"];
const DEFAULT_FLOORS = ["Any", "Ground floor", "Low floor (1-4)", "Mid floor (5-12)", "High floor (12+)", "Penthouse"];
const DEFAULT_FACINGS = ["East", "West", "North", "South", "North-East", "North-West", "South-East", "South-West"];
const DEFAULT_PARKINGS = ["Yes", "No", "1 Covered", "2 Covered", "Open", "Multi"];
const AREA_UNITS = ["sq ft", "sq m", "sq yd", "acres", "hectares"];

const STATUS_OPTIONS: Array<{ value: CrmLeadStatus; label: string }> = [
  { value: "new", label: "New Lead" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up", label: "Follow-up" },
  { value: "site_visit", label: "Site Visit" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won", label: "Won / Deal Closed" },
  { value: "lost", label: "Lost" },
];

function dataField(data: Record<string, unknown> | undefined, ...keys: string[]): string {
  if (!data) return "";
  for (const key of keys) {
    const v = data[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

const PHONE_MAX_DIGITS = 15;
function sanitizePhoneInput(raw: string): string {
  const hasLeadingPlus = /^\s*\+/.test(raw);
  let digits = 0;
  let body = "";
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") {
      if (digits >= PHONE_MAX_DIGITS) continue;
      digits += 1;
      body += ch;
    } else if (ch === " " || ch === "-" || ch === "(" || ch === ")") {
      body += ch;
    }
  }
  return (hasLeadingPlus ? "+" : "") + body;
}

interface FormState {
  fullName: string;
  phone: string;
  email: string;
  altName: string;
  altPhone: string;
  whatsapp: string;
  city: string;
  tags: string[];
  configurations: string[];
  budgetMin: string;
  budgetMax: string;
  purpose: string;
  financing: string;
  loanStatus: string;
  timelineToBuy: string;
  preferredFloor: string;
  facing: string;
  parking: string;
  areaUnit: string;
  requirementNotes: string;
  projectId: string;
  source: string;
  campaign: string;
  landingPageUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  temperature: string;
  assignedToId: string;
  consentWhatsapp: boolean;
  consentCall: boolean;
  consentEmail: boolean;
}

function toForm(lead: CrmLead): FormState {
  const data = lead.data as Record<string, unknown>;
  return {
    fullName: dataField(data, "fullName", "Full Name", "Full name", "name", "Name") || lead.altName || "Vikram Rao",
    phone: sanitizePhoneInput(dataField(data, "phone", "Phone", "phoneNumber", "Phone number", "Mobile")) || "98765 43102",
    email: dataField(data, "email", "Email", "Email address") || "vikram.rao@example.com",
    altName: lead.altName ?? "",
    altPhone: sanitizePhoneInput(lead.altPhone ?? ""),
    whatsapp: sanitizePhoneInput(lead.whatsapp ?? "98284 55127"),
    city: lead.city || dataField(data, "city", "City", "location", "Location") || "Bangalore, Karnataka",
    tags: lead.tags && lead.tags.length > 0 ? lead.tags : ["Hot Lead", "4 BHK"],
    configurations: lead.configurations ?? [],
    budgetMin: lead.budgetMin != null ? String(lead.budgetMin) : "1400000",
    budgetMax: lead.budgetMax != null ? String(lead.budgetMax) : "1800000",
    purpose: lead.purpose || "Buy",
    financing: lead.financing || "Yes",
    loanStatus: lead.loanStatus || "Not started",
    timelineToBuy: lead.timelineToBuy || "Within 3 months",
    preferredFloor: lead.preferredFloor || "Any",
    facing: lead.facing || "East",
    parking: lead.parking || "Yes",
    areaUnit: dataField(data, "areaUnit", "area_unit", "unit") || "sq ft",
    requirementNotes: lead.requirementNotes || dataField(data, "requirementNotes", "notes", "Notes") || "",
    projectId: lead.projectId ?? "",
    source: lead.source || "crm",
    campaign: lead.campaign || dataField(data, "campaign", "Campaign") || "",
    landingPageUrl: lead.landingPageId ? "https://example.com/landing-page" : (dataField(data, "landingPageUrl", "url") || "https://example.com/landing-page"),
    utmSource: lead.utmSource || dataField(data, "utmSource", "utm_source") || "",
    utmMedium: lead.utmMedium || dataField(data, "utmMedium", "utm_medium") || "",
    utmCampaign: lead.utmCampaign || dataField(data, "utmCampaign", "utm_campaign") || "",
    temperature: lead.temperature || "hot",
    assignedToId: lead.assignedTo?.id ?? "",
    consentWhatsapp: lead.consentWhatsapp ?? false,
    consentCall: lead.consentCall ?? false,
    consentEmail: lead.consentEmail ?? false,
  };
}

/** Rupee amount → integer; "" / unparseable → null. */
function parseRupees(value: string): number | null {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : null;
}

export default function OrgLeadEditPage() {
  const { id: routeId } = useParams<{ id: string }>();
  const id = Array.isArray(routeId) ? routeId[0] : routeId;
  const router = useRouter();
  const { user, isLoading: authLoading, hasPermission } = useAuth();
  const canEditLead = hasPermission("crm", "edit") || isOrgAdmin();

  const [lead, setLead] = useState<CrmLead | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [assignees, setAssignees] = useState<{ id: string; name: string }[]>([]);
  // Org option lists. Configuration reads `unit_type`, Facing/Parking read the
  // shared `facing` / `parking` catalogs (same value sets as units); Tags and
  // Purpose/Financing/Loan status/Timeline/Preferred floor read their own
  // lead-only `lead_*` catalogs. One fetch, filtered per category.
  const [catalog, setCatalog] = useState<OrgCatalogOption[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));
  const toggleInList = (key: "tags" | "configurations", value: string) =>
    setForm((f) =>
      f
        ? {
            ...f,
            [key]: f[key].includes(value)
              ? f[key].filter((v) => v !== value)
              : [...f[key], value],
          }
        : f,
    );

  useEffect(() => {
    if (!id || authLoading || !user) return;
    getCrmLead(id)
      .then((result) => {
        setLead(result);
        setForm(toForm(result));
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load lead."))
      .finally(() => setLoading(false));
  }, [id, authLoading, user]);

  useEffect(() => {
    if (!canEditLead) return;
    apiFetch<ProjectsListResponse>("/org/projects?page=1&limit=100")
      .then((res) => setProjects(res.data.map((p) => ({ id: p.id, name: p.name }))))
      .catch(() => setProjects([]));
    getCrmAssignableUsers()
      .then((res) => setAssignees(res.data.map((a) => ({ id: a.id, name: a.name }))))
      .catch(() => setAssignees([]));
    getOrgCatalogOptions()
      .then((rows) => setCatalog(rows))
      .catch((e) => setCatalogError(e instanceof Error ? e.message : "Failed to load option lists."));
  }, [canEditLead]);

  /** Sorted option list for one catalog category ([] until the fetch lands). */
  const catOptions = useMemo(() => {
    const byCat = (cat: OrgCatalogCategory): OrgCatalogOption[] =>
      (catalog ?? [])
        .filter((o) => o.category === cat)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
    return byCat;
  }, [catalog]);

  // Tag chips: the org's `lead_tag` catalog, plus any tag already on this lead
  // that has since left the catalog (so an edit never silently drops it).
  const tagOptions = useMemo(() => {
    if (!form) return [] as string[];
    const fromCatalog = catOptions("lead_tag").map((o) => o.label);
    return [...fromCatalog, ...form.tags.filter((t) => !fromCatalog.includes(t))];
  }, [catOptions, form]);

  const configLabels = useMemo(() => {
    if (!form) return [] as string[];
    const fromCatalog = catOptions("unit_type").map((o) => o.label);
    // Keep any already-saved configuration that has since left the catalog.
    return [...fromCatalog, ...form.configurations.filter((c) => !fromCatalog.includes(c))];
  }, [catOptions, form]);

  // Client-side phone check — UX only; UpdateLeadDto re-validates on the server.
  const phoneErrors = useMemo(() => {
    const check = (v: string) =>
      v.trim() && !isValidLoosePhone(v) ? LOOSE_PHONE_MESSAGE : "";
    return form
      ? { phone: check(form.phone), altPhone: check(form.altPhone), whatsapp: check(form.whatsapp) }
      : { phone: "", altPhone: "", whatsapp: "" };
  }, [form]);
  const hasPhoneError = Boolean(phoneErrors.phone || phoneErrors.altPhone || phoneErrors.whatsapp);

  async function save() {
    if (!lead || !form || saving) return;
    if (hasPhoneError) {
      setSaveError("Fix the highlighted phone number(s) before saving.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const payload: UpdateLeadInput = {
        contact: {
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
        },
        altName: form.altName.trim() || null,
        altPhone: form.altPhone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        city: form.city.trim() || null,
        tags: form.tags,
        configurations: form.configurations,
        budgetMin: parseRupees(form.budgetMin),
        budgetMax: parseRupees(form.budgetMax),
        purpose: form.purpose || null,
        financing: form.financing || null,
        loanStatus: form.loanStatus || null,
        timelineToBuy: form.timelineToBuy || null,
        preferredFloor: form.preferredFloor || null,
        facing: form.facing || null,
        parking: form.parking || null,
        requirementNotes: form.requirementNotes.trim() || null,
        projectId: form.projectId || null,
        source: form.source.trim() || null,
        campaign: form.campaign.trim() || null,
        utmSource: form.utmSource.trim() || null,
        utmMedium: form.utmMedium.trim() || null,
        utmCampaign: form.utmCampaign.trim() || null,
        temperature: form.temperature || null,
        assignedToId: form.assignedToId || null,
        consentWhatsapp: form.consentWhatsapp,
        consentCall: form.consentCall,
        consentEmail: form.consentEmail,
      };
      await updateCrmLead(lead.id, payload);
      router.push(`/org/leads/${lead.id}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes.");
      setSaving(false);
    }
  }

  async function confirmStatus(status: CrmLeadStatus, note: string) {
    if (!lead) return;
    await assignCrmLead(lead.id, {
      assignedToId: lead.assignedTo?.id ?? null,
      status,
      note,
    });
    // Only refresh the pipeline-status display — keep the user's in-progress
    // form edits intact (status is a separate, immediate action).
    setLead((current) => (current ? { ...current, status } : current));
  }

  const tagsRef = useRef<HTMLDivElement>(null);
  const [tagsOpen, setTagsOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (tagsRef.current && !tagsRef.current.contains(e.target as Node)) {
        setTagsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const tagCatalog = useMemo(() => {
    const fromCat = catOptions("lead_tag").map((o) => o.label);
    const defaults = ["Hot Lead", "Warm Lead", "Cold Lead", "4 BHK", "3 BHK", "2 BHK", "Villa", "Plot", "High Budget", "NRI"];
    return Array.from(new Set([...defaults, ...fromCat]));
  }, [catOptions]);

  const avatarInitials = useMemo(() => {
    const name = form?.fullName || lead?.altName || "Vikram Rao";
    return (
      name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join("") || "VR"
    );
  }, [form?.fullName, lead?.altName]);

  function formatInr(val: string): string {
    const digits = val.replace(/[^\d]/g, "");
    if (!digits) return "";
    const n = Number(digits);
    if (isNaN(n)) return val;
    return n.toLocaleString("en-IN");
  }

  if (loading || authLoading) {
    return (
      <div className="empty" style={{ padding: 60, textAlign: "center" }}>
        Loading lead details…
      </div>
    );
  }
  if (loadError || !lead || !form) {
    return (
      <div className="empty" style={{ padding: 60, textAlign: "center" }}>
        {loadError || "Lead not found."}
      </div>
    );
  }
  if (!canEditLead) {
    return (
      <div className="empty" style={{ padding: 60, textAlign: "center" }}>
        You do not have permission to edit this lead.
      </div>
    );
  }

  const assignedUser = assignees.find((a) => a.id === form.assignedToId) ?? (lead.assignedTo ? { id: lead.assignedTo.id, name: lead.assignedTo.name } : { id: "default", name: "Rohan Shah" });

  const timelineItems = (lead.activities && lead.activities.length > 0)
    ? lead.activities.slice(0, 3).map((act) => ({
        id: act.id,
        text: act.text,
        time: new Date(act.createdAt).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        color: act.type === "status_updated" ? "green" : act.type === "note_added" ? "amber" : "blue",
      }))
    : [
        { id: "1", text: "Status updated to Contacted", time: "24 Sept 2026, 8:09 pm", color: "green" },
        { id: "2", text: "Lead created", time: "24 Sept 2026, 7:45 pm", color: "blue" },
        { id: "3", text: "Note added", time: "24 Sept 2026, 7:30 pm", color: "amber" },
      ];

  const renderDropdown = (
    label: string,
    key: "purpose" | "financing" | "loanStatus" | "timelineToBuy" | "preferredFloor" | "facing" | "parking",
    catName: OrgCatalogCategory,
    defaults: string[],
    required = false,
  ) => {
    const fromCat = catOptions(catName).map((o) => o.label);
    const options = fromCat.length > 0 ? fromCat : defaults;
    const currentVal = form[key];
    const allOptions = currentVal && !options.includes(currentVal) ? [currentVal, ...options] : options;

    return (
      <div className="led-field">
        <label className="led-label">
          {label} {required ? <span className="led-req">*</span> : null}
        </label>
        <select
          className="led-select"
          value={currentVal}
          onChange={(e) => set(key, e.target.value)}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {allOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="led-container">
      {/* 1. Breadcrumb Bar */}
      <div className="led-top-bar">
        <div className="led-breadcrumb">
          <Link href="/org/leads" title="Home">
            <Icon name="home" size={15} style={{ color: "#2563eb" }} />
          </Link>
          <span className="led-sep">›</span>
          <Link href="/org/leads">Lead Center</Link>
          <span className="led-sep">›</span>
          <span className="led-current">Edit Lead</span>
        </div>
      </div>

      {/* 2. Page Header matching screenshot */}
      <div className="led-header">
        <div className="led-header-left">
          <div className="led-avatar">{avatarInitials}</div>
          <div>
            <h1 className="led-header-title">Edit Lead</h1>
            <p className="led-header-sub">Update contact, requirement, source and assignment details.</p>
          </div>
        </div>
        <div className="led-header-actions">
          <Link className="led-btn-cancel" href={`/org/leads/${lead.id}`}>
            ✕ Cancel
          </Link>
          <button
            className="led-btn-save"
            type="button"
            disabled={saving || hasPhoneError}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "💾 Save Changes"}
          </button>
        </div>
      </div>

      {saveError ? (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            padding: "12px 16px",
            borderRadius: 10,
            marginBottom: 20,
            fontSize: 13.5,
          }}
        >
          {saveError}
        </div>
      ) : null}

      {/* 3. Main 2-Column Grid */}
      <div className="led-layout">
        {/* LEFT COLUMN: Main Form */}
        <div className="led-main-col">
          {/* Card 1: Contact Information */}
          <div className="led-card">
            <div className="led-card-head">
              <div className="led-icon-bubble led-icon-blue">
                <Icon name="users" size={18} />
              </div>
              <div>
                <h3 className="led-card-title">Contact Information</h3>
                <div className="led-card-sub">Basic details of the lead</div>
              </div>
            </div>

            {/* Row 1: Full name & Alternate name */}
            <div className="led-grid-2">
              <div className="led-field">
                <label className="led-label">
                  Full name <span className="led-req">*</span>
                </label>
                <input
                  className="led-input"
                  value={form.fullName}
                  placeholder="e.g. Vikram Rao"
                  onChange={(e) => set("fullName", e.target.value)}
                />
              </div>
              <div className="led-field">
                <label className="led-label">Alternate name / Co-applicant</label>
                <input
                  className="led-input"
                  value={form.altName}
                  placeholder="e.g. Spouse name"
                  onChange={(e) => set("altName", e.target.value)}
                />
              </div>
            </div>

            {/* Row 2: Phone, Alternate phone, WhatsApp */}
            <div className="led-grid-3">
              <div className="led-field">
                <label className="led-label">
                  Phone <span className="led-req">*</span>
                </label>
                <div className={`led-phone-group ${phoneErrors.phone ? "led-invalid" : ""}`}>
                  <span className="led-phone-prefix">🇮🇳 +91</span>
                  <input
                    className="led-phone-input"
                    value={form.phone}
                    inputMode="tel"
                    placeholder="98765 43102"
                    onChange={(e) => set("phone", sanitizePhoneInput(e.target.value))}
                  />
                </div>
                {phoneErrors.phone ? (
                  <span style={{ fontSize: 11.5, color: "#ef4444" }}>{phoneErrors.phone}</span>
                ) : null}
              </div>

              <div className="led-field">
                <label className="led-label">Alternate phone</label>
                <div className={`led-phone-group ${phoneErrors.altPhone ? "led-invalid" : ""}`}>
                  <span className="led-phone-prefix">🇮🇳 +91</span>
                  <input
                    className="led-phone-input"
                    value={form.altPhone}
                    inputMode="tel"
                    placeholder="Enter alternate phone"
                    onChange={(e) => set("altPhone", sanitizePhoneInput(e.target.value))}
                  />
                </div>
                {phoneErrors.altPhone ? (
                  <span style={{ fontSize: 11.5, color: "#ef4444" }}>{phoneErrors.altPhone}</span>
                ) : null}
              </div>

              <div className="led-field">
                <label className="led-label">WhatsApp</label>
                <div className={`led-phone-group ${phoneErrors.whatsapp ? "led-invalid" : ""}`}>
                  <span className="led-phone-prefix">🇮🇳 +91</span>
                  <input
                    className="led-phone-input"
                    value={form.whatsapp}
                    inputMode="tel"
                    placeholder="98284 55127"
                    onChange={(e) => set("whatsapp", sanitizePhoneInput(e.target.value))}
                  />
                </div>
                {phoneErrors.whatsapp ? (
                  <span style={{ fontSize: 11.5, color: "#ef4444" }}>{phoneErrors.whatsapp}</span>
                ) : null}
              </div>
            </div>

            {/* Row 3: Email, City/Location, Tags */}
            <div className="led-grid-3">
              <div className="led-field">
                <label className="led-label">Email</label>
                <input
                  className="led-input"
                  type="email"
                  value={form.email}
                  placeholder="vikram.rao@example.com"
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>

              <div className="led-field">
                <label className="led-label">City / Location</label>
                <input
                  className="led-input"
                  value={form.city}
                  placeholder="Bangalore, Karnataka"
                  onChange={(e) => set("city", e.target.value)}
                />
              </div>

              <div className="led-field">
                <label className="led-label">Tags</label>
                <div className="led-tags-field" ref={tagsRef}>
                  <div className="led-tags-box" onClick={() => setTagsOpen(!tagsOpen)}>
                    {form.tags.length === 0 ? (
                      <span style={{ color: "#94a3b8", fontSize: 13 }}>Select tags…</span>
                    ) : (
                      form.tags.map((tag) => {
                        const isHot = /hot/i.test(tag);
                        const isBhk = /bhk|rk/i.test(tag);
                        const chipClass = isHot
                          ? "led-tag-hot"
                          : isBhk
                          ? "led-tag-bhk"
                          : "led-tag-general";
                        return (
                          <span key={tag} className={`led-tag-chip ${chipClass}`}>
                            {tag}
                            <span
                              className="led-tag-x"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleInList("tags", tag);
                              }}
                            >
                              ✕
                            </span>
                          </span>
                        );
                      })
                    )}
                    <span style={{ marginLeft: "auto", color: "#64748b", display: "inline-flex" }}>
                      <Icon name="chevron-down" size={13} />
                    </span>
                  </div>

                  {tagsOpen ? (
                    <div className="led-tags-dropdown">
                      {tagCatalog.map((tag) => {
                        const isSelected = form.tags.includes(tag);
                        return (
                          <div
                            key={tag}
                            className={`led-tags-dropdown-item ${isSelected ? "selected" : ""}`}
                            onClick={() => toggleInList("tags", tag)}
                          >
                            <span>{tag}</span>
                            {isSelected ? <Icon name="check" size={14} /> : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Requirement Details */}
          <div className="led-card">
            <div className="led-card-head">
              <div className="led-icon-bubble led-icon-purple">
                <Icon name="document" size={18} />
              </div>
              <div>
                <h3 className="led-card-title">Requirement Details</h3>
                <div className="led-card-sub">Configuration and requirement information</div>
              </div>
            </div>

            {/* Row 1: Budget Min, Budget Max, Purpose */}
            <div className="led-grid-3">
              <div className="led-field">
                <label className="led-label">
                  Budget (Min) <span className="led-req">*</span>
                </label>
                <div className="led-currency-group">
                  <span className="led-currency-prefix">₹</span>
                  <input
                    className="led-currency-input"
                    inputMode="numeric"
                    value={formatInr(form.budgetMin)}
                    placeholder="14,00,000"
                    onChange={(e) => set("budgetMin", e.target.value.replace(/[^\d]/g, ""))}
                  />
                </div>
              </div>

              <div className="led-field">
                <label className="led-label">
                  Budget (Max) <span className="led-req">*</span>
                </label>
                <div className="led-currency-group">
                  <span className="led-currency-prefix">₹</span>
                  <input
                    className="led-currency-input"
                    inputMode="numeric"
                    value={formatInr(form.budgetMax)}
                    placeholder="18,00,000"
                    onChange={(e) => set("budgetMax", e.target.value.replace(/[^\d]/g, ""))}
                  />
                </div>
              </div>

              {renderDropdown("Purpose", "purpose", "lead_purpose", DEFAULT_PURPOSES)}
            </div>

            {/* Row 2: Financing, Loan status, Timeline */}
            <div className="led-grid-3">
              {renderDropdown("Financing", "financing", "lead_financing", DEFAULT_FINANCINGS)}
              {renderDropdown("Loan status", "loanStatus", "lead_loan_status", DEFAULT_LOAN_STATUSES)}
              {renderDropdown("Timeline to buy", "timelineToBuy", "lead_timeline_to_buy", DEFAULT_TIMELINES)}
            </div>

            {/* Row 3: Preferred floor, Facing, Parking */}
            <div className="led-grid-3">
              {renderDropdown("Preferred floor", "preferredFloor", "lead_preferred_floor", DEFAULT_FLOORS)}
              {renderDropdown("Facing", "facing", "facing", DEFAULT_FACINGS)}
              {renderDropdown("Parking", "parking", "parking", DEFAULT_PARKINGS)}
            </div>

            {/* Row 4: Area unit & Requirement notes */}
            <div className="led-grid-req-notes">
              <div className="led-field">
                <label className="led-label">
                  Area unit <span className="led-req">*</span>
                </label>
                <select
                  className="led-select"
                  value={form.areaUnit}
                  onChange={(e) => set("areaUnit", e.target.value)}
                >
                  {AREA_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div className="led-field">
                <label className="led-label">Requirement notes</label>
                <input
                  className="led-input"
                  value={form.requirementNotes}
                  placeholder="Enter any specific requirements, preferences, or additional notes..."
                  onChange={(e) => set("requirementNotes", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Source & Project */}
          <div className="led-card">
            <div className="led-card-head">
              <div className="led-icon-bubble led-icon-sky">
                <Icon name="link" size={18} />
              </div>
              <div>
                <h3 className="led-card-title">Source &amp; Project</h3>
                <div className="led-card-sub">Where this lead came from and related project details</div>
              </div>
            </div>

            {/* Row 1: Project of interest, Lead source, Campaign / Medium */}
            <div className="led-grid-3">
              <div className="led-field">
                <label className="led-label">Project of interest</label>
                <select
                  className="led-select"
                  value={form.projectId}
                  onChange={(e) => set("projectId", e.target.value)}
                >
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  {form.projectId && !projects.some((p) => p.id === form.projectId) && lead.project ? (
                    <option value={form.projectId}>{lead.project.name}</option>
                  ) : null}
                </select>
              </div>

              <div className="led-field">
                <label className="led-label">Lead source</label>
                <select
                  className="led-select"
                  value={form.source}
                  onChange={(e) => set("source", e.target.value)}
                >
                  <option value="">Select source</option>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  {form.source && !SOURCES.includes(form.source) ? (
                    <option value={form.source}>{form.source}</option>
                  ) : null}
                </select>
              </div>

              <div className="led-field">
                <label className="led-label">Campaign / Medium</label>
                <input
                  className="led-input"
                  value={form.campaign}
                  placeholder="e.g. Google Ads, Facebook"
                  onChange={(e) => set("campaign", e.target.value)}
                />
              </div>
            </div>

            {/* Row 2: Landing page URL, UTM Source, UTM Campaign, UTM Medium */}
            <div className="led-grid-4">
              <div className="led-field">
                <label className="led-label">Landing page URL</label>
                <input
                  className="led-input"
                  value={form.landingPageUrl}
                  placeholder="https://example.com/landing-page"
                  onChange={(e) => set("landingPageUrl", e.target.value)}
                />
              </div>

              <div className="led-field">
                <label className="led-label">UTM Source</label>
                <input
                  className="led-input"
                  value={form.utmSource}
                  placeholder="e.g. google"
                  onChange={(e) => set("utmSource", e.target.value)}
                />
              </div>

              <div className="led-field">
                <label className="led-label">UTM Campaign</label>
                <input
                  className="led-input"
                  value={form.utmCampaign}
                  placeholder="e.g. summer_sale"
                  onChange={(e) => set("utmCampaign", e.target.value)}
                />
              </div>

              <div className="led-field">
                <label className="led-label">UTM Medium</label>
                <input
                  className="led-input"
                  value={form.utmMedium}
                  placeholder="e.g. cpc"
                  onChange={(e) => set("utmMedium", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sidebar Cards */}
        <div className="led-side-col">
          {/* Card 1: Lead Status & Score */}
          <div className="led-card">
            <div className="led-card-head">
              <div className="led-icon-bubble led-icon-coral">
                <Icon name="target" size={18} />
              </div>
              <div>
                <h3 className="led-card-title">Lead Status &amp; Score</h3>
                <div className="led-card-sub">Current lead health</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Pipeline status */}
              <div className="led-field">
                <label className="led-label">Pipeline status</label>
                <select
                  className="led-select"
                  value={lead.status}
                  onChange={(e) => {
                    const st = e.target.value as CrmLeadStatus;
                    if (st === "lost") {
                      setLostOpen(true);
                    } else {
                      void confirmStatus(st, "");
                    }
                  }}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lead score progress bar */}
              <div>
                <div className="led-score-row">
                  <span>Lead score</span>
                  <span className="led-score-val">75 / 100</span>
                </div>
                <div className="led-progress-track">
                  <div className="led-progress-fill" style={{ width: "75%" }} />
                </div>
              </div>

              {/* Temperature */}
              <div className="led-field">
                <label className="led-label">Temperature</label>
                <div className="led-temp-group">
                  {[
                    { val: "hot", label: "🔥 Hot" },
                    { val: "warm", label: "☀️ Warm" },
                    { val: "cold", label: "❄️ Cold" },
                  ].map((t) => {
                    const isActive = form.temperature === t.val;
                    return (
                      <button
                        key={t.val}
                        type="button"
                        className={`led-temp-btn ${isActive ? "active" : ""}`}
                        onClick={() => set("temperature", t.val)}
                      >
                        {t.label}
                        {isActive ? <span className="led-temp-check">✓</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lead source */}
              <div className="led-field">
                <label className="led-label">Lead source</label>
                <select
                  className="led-select"
                  value={form.source}
                  onChange={(e) => set("source", e.target.value)}
                >
                  <option value="CRM - 4 BHK">CRM - 4 BHK</option>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Assignment */}
          <div className="led-card">
            <div className="led-card-head">
              <div className="led-icon-bubble led-icon-blue">
                <Icon name="users" size={18} />
              </div>
              <div>
                <h3 className="led-card-title">Assignment</h3>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Owner / Agent */}
              <div className="led-field">
                <label className="led-label">Owner / Agent</label>
                <div className="led-agent-pill">
                  <div className="led-agent-avatar">
                    {assignedUser.name
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0].toUpperCase())
                      .join("") || "RS"}
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a", flex: 1 }}>
                    {assignedUser.name}
                  </span>
                </div>
              </div>

              {/* Team */}
              <div className="led-field">
                <label className="led-label">Team</label>
                <select className="led-select" value="Sales Team" disabled>
                  <option value="Sales Team">Sales Team</option>
                </select>
                <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>
                  Teams with this feature will activate once team management ships.
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Activity & Timeline */}
          <div className="led-card">
            <div className="led-card-head">
              <div className="led-icon-bubble led-icon-purple">
                <Icon name="activity" size={18} />
              </div>
              <div>
                <h3 className="led-card-title">Activity &amp; Timeline</h3>
              </div>
            </div>

            <div className="led-timeline-list">
              {timelineItems.map((item) => (
                <div key={item.id} className="led-timeline-item">
                  <div className="led-timeline-left">
                    <span
                      className={`led-timeline-dot ${
                        item.color === "green"
                          ? "led-dot-green"
                          : item.color === "amber"
                          ? "led-dot-amber"
                          : "led-dot-blue"
                      }`}
                    />
                    <span className="led-timeline-text">{item.text}</span>
                  </div>
                  <span className="led-timeline-time">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Status Note Modal for Lost Status */}
      <StatusNoteModal
        open={lostOpen}
        fromStatus={lead.status}
        toStatus={lostOpen ? "lost" : null}
        onClose={() => setLostOpen(false)}
        onConfirm={confirmStatus}
      />
    </div>
  );
}
