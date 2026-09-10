"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, getOrgCatalogOptions, getOrgLandingPages, getProjectSalesAgentCandidates, setProjectSalesAgents } from "@/lib/api";
import { parseAmount, parseCount, parseDecimal } from "@/lib/parse";
import { CURRENCY_LABELS, formatMoneyRange, PROJECT_CURRENCIES } from "@/lib/money";
import { GalleryUpload, MediaUpload } from "@/components/org/media-upload";
import {
  CatalogOptions,
  ConfigSizePriceTable,
  MoneyInput,
  SpecificationRows,
  type ConfigSizePriceRow,
} from "@/components/org/project-form-fields";
import {
  defaultSpecRows,
  serializeSpecifications,
  type SpecRow,
} from "@/lib/specifications";
import {
  allMissing,
  missingOn,
  projectRequirements,
  PROJECT_STEPS as STEPS,
  stepIndicator,
  stepStatus,
} from "@/lib/project-validation";
import { Reveal } from "@/components/superadmin/reveal";
import { orgBuilderPath } from "@/lib/prestate/paths";
import "@/app/org/org.css";
import type {
  CreateProjectInput,
  CreateUnitTypeInput,
  OrgCatalogCategory,
  OrgCatalogOption,
  LandingPageRow,
  OrgUser,
  OrgUsersListResponse,
  OrgTemplateSummary,
  OrgTemplatesListResponse,
  OrgBillingSummary,
  Project,
  ProjectStatus,
  SafeOrganisation,
} from "@/lib/types";
import Link from "next/link";

function userLabel(u: OrgUser): string {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
}

// The wizard's draft rows are the shared table's rows — one shape, so the
// component and the localStorage draft can't drift apart.
type UnitTypeDraft = ConfigSizePriceRow;

const makeUnitType = (): UnitTypeDraft => ({
  key: Date.now() + Math.random(),
  name: "",
  carpetSqft: "",
  builtupSqft: "",
  price: "",
  totalUnits: "",
});

// The wizard's option lists are org-managed catalogs (Settings → Project
// Catalogs), fetched per step (see CatalogOptions in
// components/org/project-form-fields).
//
// Wizard steps (0-indexed) that read a catalog — used to refetch on entry so
// options just added in Settings appear without a full page reload. Step 2
// (pricing) joined the list when "Price includes" and "Payment plan" stopped
// being fixed frontend arrays and became catalogs of their own.
const CATALOG_STEPS = new Set([0, 1, 2, 3, 4]);

// Per-step required-field validation: Continue validates the step you're on and
// refuses to advance while something's missing, the step rail warns before
// letting you jump *ahead* out of an incomplete step (jumping back is always
// free), and Publish re-checks everything. The rules themselves live in
// lib/project-validation, shared with the edit page.

// 150000 -> "₹ 1,50,000". Unparseable input falls back to the raw text.
function formatRupees(value: string): string {
  const n = parseAmount(value);
  return n === undefined ? value.trim() || "—" : `₹ ${n.toLocaleString("en-IN")}`;
}

// ["2 BHK", "3 BHK"] -> "2 & 3 BHK"; anything not "<x> BHK" -> plain join.
function formatConfigs(labels: string[]): string {
  if (labels.length === 0) return "—";
  const nums = labels.map((l) => /^(.+?)\s+BHK$/i.exec(l)?.[1]);
  return nums.every(Boolean) ? `${nums.join(" & ")} BHK` : labels.join(", ");
}

// Currency-aware price-range string for the Review step. Parses the raw
// money-field text first, then defers to the shared money formatter.
function priceRangeLabel(from: string, to: string, currency: string): string {
  return formatMoneyRange(parseAmount(from), parseAmount(to), currency);
}

// ---------------------------------------------------------------------------
// Draft persistence — STOPGAP. The wizard has no backend save yet, so the
// whole form is mirrored to localStorage on every change and restored on
// mount. Keyed per-org so a draft never leaks between orgs that share a
// browser; cleared on successful publish. The proper backend-based,
// resumable-across-devices version is a separate, deliberately deferred task
// (waiting for the wizard's fields/steps to settle).
// NOTE: nothing here holds a File/Blob. Step 8's uploads aren't wired yet,
// and when they are they'll round-trip as plain R2 URL strings like any other
// text field — so restoring a draft never re-triggers an upload.
// ---------------------------------------------------------------------------
// v2: `specifications` became dynamic label/value rows (replacing the fixed
// flooring / kitchen / doorsWindows / fittings fields) and Step 8 gained
// project floor plans. sweepOldProjectDrafts drops the v1 drafts.
const DRAFT_KEY_PREFIX = "be.project-draft.v2.";
const draftKey = (orgId: string) => `${DRAFT_KEY_PREFIX}${orgId}`;

interface WizardDraft {
  _savedAt: number;
  step: number;
  name: string; projectType: string; tagline: string; reraId: string;
  status: ProjectStatus; launchDate: string; possession: string; constructionStage: string;
  selectedConfigs: string[]; towerCount: string; floorsDescription: string; landArea: string;
  carpetRange: string; highlights: string; unitTypes: UnitTypeDraft[];
  priceMin: string; priceMax: string; baseRate: string; bookingAmount: string; currency: string;
  priceIncludes: string[]; paymentPlan: string; offers: string;
  address: string; city: string; locality: string; pincode: string;
  nearby: string[]; landmarks: string;
  amenities: string[]; specRows: SpecRow[]; specNotes: string;
  metaAds: boolean; googleAds: boolean; linkedinAds: boolean; portalAds: boolean;
  monthlyBudget: string; targetCpl: string; leadGoal: string; landingPage: string;
  aiCalling: boolean; whatsappAuto: boolean; roundRobin: boolean; aiKnowledgeBase: boolean;
  managerId: string; salesTeam: string; agentAssign: string[];
  requireApproval: boolean; visibleTele: boolean; publishWeb: boolean;
  coverImageUrl: string | null; galleryUrls: string[]; brochureUrl: string | null; reraCertificateUrl: string | null;
  floorPlanUrls: string[];
  customLandingPageId?: string | null;
  customLandingPageSlug?: string | null;
  customLandingPageName?: string | null;
  selectedTemplateId?: string | null;
}

// "They actually started" — decides whether a stored draft is worth a
// resume/discard prompt, or is just a stale empty shell to clear silently.
function isMeaningfulDraft(d: WizardDraft): boolean {
  return (
    d.step > 0 ||
    !!d.name?.trim() ||
    d.projectType !== "" ||
    (d.selectedConfigs?.length ?? 0) > 0 ||
    (d.amenities?.length ?? 0) > 0 ||
    (d.nearby?.length ?? 0) > 0 ||
    !!d.tagline?.trim() ||
    !!d.address?.trim() ||
    !!d.city?.trim()
  );
}

// Drop project drafts written by an older wizard shape (different key
// version) so a stale "Resume" can never rehydrate a mismatched payload.
function sweepOldProjectDrafts() {
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith("be.project-draft.") && !k.startsWith(DRAFT_KEY_PREFIX)) {
        window.localStorage.removeItem(k);
      }
    }
  } catch {
    /* private mode / storage disabled — nothing to clean */
  }
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 45000) return "just now";
  const min = Math.round(diff / 60000);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(diff / 3600000);
  if (hr < 24) return `${hr} hr ago`;
  return new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function AddNewProjectPage() {
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const orgId = user?.org_id ?? null;

  // Step 1 — basics
  const [name, setName] = useState("");
  const [projectType, setProjectType] = useState("");
  const [tagline, setTagline] = useState("");
  const [reraId, setReraId] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [launchDate, setLaunchDate] = useState("");
  const [possession, setPossession] = useState("");
  const [constructionStage, setConstructionStage] = useState("Under construction");

  // Step 2 — inventory
  const [selectedConfigs, setSelectedConfigs] = useState<string[]>([]);
  const [towerCount, setTowerCount] = useState("");
  const [floorsDescription, setFloorsDescription] = useState("");
  const [landArea, setLandArea] = useState("");
  const [carpetRange, setCarpetRange] = useState("");
  const [highlights, setHighlights] = useState("");
  const [unitTypes, setUnitTypes] = useState<UnitTypeDraft[]>([]);

  // Step 3 — pricing
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [baseRate, setBaseRate] = useState("");
  const [bookingAmount, setBookingAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  // Both now come from the org's catalogs, so neither can be pre-seeded with
  // a label this org may not have configured.
  const [priceIncludes, setPriceIncludes] = useState<string[]>([]);
  const [paymentPlan, setPaymentPlan] = useState("");
  const [offers, setOffers] = useState("");

  // Step 4 — location
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [locality, setLocality] = useState("");
  const [pincode, setPincode] = useState("");
  const [nearby, setNearby] = useState<string[]>([]);
  const [landmarks, setLandmarks] = useState("");

  // Step 5 — amenities & specifications. A new project starts with the four
  // rows the old fixed form had, pre-labelled but all deletable.
  const [amenities, setAmenities] = useState<string[]>([]);
  const [specRows, setSpecRows] = useState<SpecRow[]>(() => defaultSpecRows());
  const [specNotes, setSpecNotes] = useState("");

  // Step 6 — marketing
  const [metaAds, setMetaAds] = useState(true);
  const [googleAds, setGoogleAds] = useState(true);
  const [linkedinAds, setLinkedinAds] = useState(false);
  const [portalAds, setPortalAds] = useState(true);
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [targetCpl, setTargetCpl] = useState("");
  const [leadGoal, setLeadGoal] = useState("");
  const [landingPage, setLandingPage] = useState("Create new from template…");
  const [orgLandingPages, setOrgLandingPages] = useState<LandingPageRow[]>([]);
  const [aiCalling, setAiCalling] = useState(true);
  const [whatsappAuto, setWhatsappAuto] = useState(true);
  const [roundRobin, setRoundRobin] = useState(true);
  // Collected via Step 8's "Add to AI knowledge base" toggle, but persisted
  // in the `marketing` blob (Piece A's schema design) — Piece E's file-upload
  // work must NOT add a separate column/toggle for this.
  const [aiKnowledgeBase, setAiKnowledgeBase] = useState(true);

  // The org's registered name — shown read-only as "Developer / channel
  // partner" (it's the organisation entered at onboarding, not a per-project
  // value). Fetched from /org/settings.
  const [orgName, setOrgName] = useState("");

  // Step 7 — team
  const [managerId, setManagerId] = useState("");
  const [managers, setManagers] = useState<OrgUser[]>([]);
  const [salesAgents, setSalesAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [salesTeam, setSalesTeam] = useState("Ahmedabad — West");
  // User ids of the agents ticked in Step 7.
  const [agentAssign, setAgentAssign] = useState<string[]>([]);
  const [requireApproval, setRequireApproval] = useState(true);
  const [visibleTele, setVisibleTele] = useState(true);
  const [publishWeb, setPublishWeb] = useState(false);

  // Step 8 — documents & media. Uploaded org-scoped during the wizard (the
  // project doesn't exist yet) via the shared MediaUpload / GalleryUpload
  // components; only the returned R2 public URLs are kept in state.
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [brochureUrl, setBrochureUrl] = useState<string | null>(null);
  const [reraCertificateUrl, setReraCertificateUrl] = useState<string | null>(null);
  // The project's overall floor / site plans. Separate concept from the
  // per-unit-type floor plan, which can only exist once real unit types are
  // created after publishing.
  const [floorPlanUrls, setFloorPlanUrls] = useState<string[]>([]);

  // Wizard state
  const [step, setStep] = useState(0);
  // Steps whose required fields have been checked at least once (by Continue,
  // a rail jump, or Publish). Only these show inline errors, so a field never
  // turns red before the user has tried to move past it.
  const [validatedSteps, setValidatedSteps] = useState<number[]>([]);
  // Set when a rail click would jump ahead out of an incomplete step — holds
  // the warning until the user either fixes the step or confirms the jump.
  const [jumpWarning, setJumpWarning] = useState<{ to: number; missing: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Set once the project is created. If a follow-up call (e.g. sales-agent
  // assignment) then fails, we stop auto-redirecting and offer a manual link
  // so a partial failure never strands the user on the wizard.
  const [publishedProjectId, setPublishedProjectId] = useState<string | null>(null);

  // Template selection & Instant landing page publishing
  const [selectedTemplate, setSelectedTemplate] = useState<OrgTemplateSummary | null>(null);
  const [templateAppliedToast, setTemplateAppliedToast] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [publishLandingPageNow, setPublishLandingPageNow] = useState(true);
  const [landingPageTitle, setLandingPageTitle] = useState("");
  const [createdLandingPage, setCreatedLandingPage] = useState<{ id: string; slug: string; name: string } | null>(null);
  const [orgDbTemplates, setOrgDbTemplates] = useState<OrgTemplateSummary[]>([]);

  // Visual Builder Customization state
  const [customLandingPageId, setCustomLandingPageId] = useState<string | null>(null);
  const [customLandingPageSlug, setCustomLandingPageSlug] = useState<string | null>(null);
  const [customLandingPageName, setCustomLandingPageName] = useState<string | null>(null);
  const [customizingInBuilder, setCustomizingInBuilder] = useState(false);

  const applyTemplate = useCallback((tpl: OrgTemplateSummary) => {
    setSelectedTemplate(tpl);
    setCustomLandingPageId(null);
    setCustomLandingPageSlug(null);
    setCustomLandingPageName(null);
    setPublishWeb(true);
    setPublishLandingPageNow(true);
    setTemplateAppliedToast(`"${tpl.name}" selected. The Super Admin template will be used for this project's landing page.`);
    setShowTemplateModal(false);
    setTimeout(() => setTemplateAppliedToast(null), 4000);
  }, []);

  // Draft persistence (localStorage stopgap — see notes above the component).
  // `hydrated` gates auto-save so we never write over a stored draft before
  // the user has chosen to resume or discard it.
  const [hydrated, setHydrated] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<WizardDraft | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Plan project quota. Blocks a fresh wizard when the org is already at its
  // limit (deep-link / bookmark guard — the projects list is the primary
  // block). A resumable draft is still allowed through; the Review step's
  // server-error path handles the "limit reached while mid-wizard" case.
  const [projectQuota, setProjectQuota] = useState<{
    used: number;
    limit: number | null;
    planName: string | null;
  } | null>(null);

  // Org catalogs (Settings → Project Catalogs). `null` = not loaded yet;
  // refetched on entry to each catalog step so freshly-added options show up.
  const [catalog, setCatalog] = useState<OrgCatalogOption[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    const auth = { headers: { Authorization: `Bearer ${accessToken}` } };
    apiFetch<OrgUsersListResponse>("/org/users?role=manager&limit=100&status=active", auth)
      .then((res) => setManagers(res.data))
      .catch(() => setManagers([]));
    // "Who can hold a lead" — resolved server-side (permission-based, admins
    // and managers excluded), and the same rule the PUT enforces.
    getProjectSalesAgentCandidates()
      .then((res) => setSalesAgents(res.data.map((u) => ({ id: u.id, name: u.name }))))
      .catch(() => setSalesAgents([]));
    apiFetch<SafeOrganisation>("/org/settings", auth)
      .then((o) => setOrgName(o.name))
      .catch(() => setOrgName(""));
    apiFetch<OrgBillingSummary>("/org/billing", auth)
      .then((b) =>
        setProjectQuota({
          used: b.usage.projectsUsed,
          limit: b.usage.projectsLimit,
          planName: b.plan?.name ?? null,
        }),
      )
      .catch(() => setProjectQuota(null));
    getOrgLandingPages()
      .then((rows) => setOrgLandingPages(rows.filter((lp) => lp.pageType === "landing")))
      .catch(() => setOrgLandingPages([]));
    apiFetch<OrgTemplatesListResponse>("/org/templates?limit=50", auth)
      .then((res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        setOrgDbTemplates(rows);
      })
      .catch(() => setOrgDbTemplates([]));
  }, [accessToken]);

  useEffect(() => {
    if (orgDbTemplates.length === 0) return;
    setSelectedTemplate((current) => {
      if (current && orgDbTemplates.some((t) => t.id === current.id)) return current;
      return orgDbTemplates[0];
    });
  }, [orgDbTemplates]);

  useEffect(() => {
    if (!accessToken || !CATALOG_STEPS.has(step)) return;
    let cancelled = false;
    getOrgCatalogOptions()
      .then((rows) => {
        if (!cancelled) { setCatalog(rows); setCatalogError(null); }
      })
      .catch((e) => {
        if (!cancelled) {
          setCatalogError(e instanceof Error ? e.message : "Couldn't load catalog options.");
        }
      });
    return () => { cancelled = true; };
  }, [accessToken, step]);

  const catalogByCategory = useMemo(() => {
    const grouped: Record<OrgCatalogCategory, OrgCatalogOption[]> = {
      project_type: [], unit_type: [], connectivity: [], amenity: [],
      price_includes: [], payment_plan: [], facing: [], parking: [], unit_variant: [],
      // Lead-only lists — unused by the project wizard, present only to keep
      // this record exhaustive over OrgCatalogCategory.
      lead_purpose: [], lead_financing: [], lead_loan_status: [],
      lead_timeline_to_buy: [], lead_preferred_floor: [], lead_tag: [],
    };
    for (const opt of catalog ?? []) grouped[opt.category]?.push(opt);
    for (const key of Object.keys(grouped) as OrgCatalogCategory[]) {
      grouped[key].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
    }
    return grouped;
  }, [catalog]);

  // --- Required fields, per step. The rules live in lib/project-validation
  // so the edit page enforces exactly the same set. ---
  const requiredByStep = useMemo(
    () => projectRequirements({ name, projectType, reraId, priceMin, address, city, managerId }),
    [name, projectType, reraId, priceMin, address, city, managerId],
  );

  const missingOnStep = useCallback(
    (i: number) => missingOn(requiredByStep, i),
    [requiredByStep],
  );

  // Every unfilled required field across the whole wizard, in step order —
  // Publish's own last-line check, and what the Review step lists.
  const allMissingFields = useMemo(() => allMissing(requiredByStep), [requiredByStep]);

  const currentMissing = missingOnStep(step);
  const showErrors = validatedSteps.includes(step);
  // True once this step has been checked and this specific field is still empty.
  const invalid = (id: string) =>
    showErrors && currentMissing.some((f) => f.id === id);
  const fieldClass = (id: string, extra = "") =>
    `field${extra ? ` ${extra}` : ""}${invalid(id) ? " field-invalid" : ""}`;
  // The inline message for a field, from the shared rules — never re-typed here.
  const fieldError = (id: string) =>
    currentMissing.find((f) => f.id === id)?.error ?? "";

  const markValidated = useCallback((i: number) => {
    setValidatedSteps((prev) => (prev.includes(i) ? prev : [...prev, i]));
  }, []);

  // Continue: check this step's own required fields right here. Anything
  // missing blocks the move and surfaces inline + in the footer summary.
  function goNext() {
    markValidated(step);
    if (missingOnStep(step).length > 0) return;
    setJumpWarning(null);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function goBack() {
    setJumpWarning(null);
    setStep((s) => Math.max(0, s - 1));
  }

  // Step-rail navigation. Going back to an earlier (or the current) step is
  // free. Jumping *ahead* out of a step with missing required fields raises a
  // warning first rather than silently navigating away from it.
  function goToStep(target: number) {
    if (target <= step || missingOnStep(step).length === 0) {
      setJumpWarning(null);
      setStep(target);
      return;
    }
    markValidated(step);
    setJumpWarning({ to: target, missing: missingOnStep(step).map((f) => f.label) });
  }

  // Filled specification rows, for the Review step's read-only summary.
  const reviewSpecRows = useMemo(
    () =>
      specRows
        .filter((r) => r.value.trim())
        .map((r) => [r.label.trim() || "—", r.value.trim()] as [string, string]),
    [specRows],
  );

  const unitRollup = useMemo(() => {
    const total = unitTypes.reduce((s, u) => s + (parseInt(u.totalUnits, 10) || 0), 0);
    return { total };
  }, [unitTypes]);

  const collectDraft = useCallback(
    (): WizardDraft => ({
      _savedAt: Date.now(),
      step, name, projectType, tagline, reraId, status, launchDate, possession, constructionStage,
      selectedConfigs, towerCount, floorsDescription, landArea, carpetRange, highlights, unitTypes,
      priceMin, priceMax, baseRate, bookingAmount, currency, priceIncludes, paymentPlan, offers,
      address, city, locality, pincode, nearby, landmarks,
      amenities, specRows, specNotes,
      metaAds, googleAds, linkedinAds, portalAds, monthlyBudget, targetCpl, leadGoal, landingPage, aiCalling, whatsappAuto, roundRobin, aiKnowledgeBase,
      managerId, salesTeam, agentAssign, requireApproval, visibleTele, publishWeb,
      coverImageUrl, galleryUrls, brochureUrl, reraCertificateUrl, floorPlanUrls,
      customLandingPageId, customLandingPageSlug, customLandingPageName,
      selectedTemplateId: selectedTemplate?.id ?? null,
    }),
    [
      step, name, projectType, tagline, reraId, status, launchDate, possession, constructionStage,
      selectedConfigs, towerCount, floorsDescription, landArea, carpetRange, highlights, unitTypes,
      priceMin, priceMax, baseRate, bookingAmount, currency, priceIncludes, paymentPlan, offers,
      address, city, locality, pincode, nearby, landmarks,
      amenities, specRows, specNotes,
      metaAds, googleAds, linkedinAds, portalAds, monthlyBudget, targetCpl, leadGoal, landingPage, aiCalling, whatsappAuto, roundRobin, aiKnowledgeBase,
      managerId, salesTeam, agentAssign, requireApproval, visibleTele, publishWeb,
      coverImageUrl, galleryUrls, brochureUrl, reraCertificateUrl, floorPlanUrls,
      customLandingPageId, customLandingPageSlug, customLandingPageName, selectedTemplate,
    ],
  );

  // Mount: look for a saved draft for this org. Never auto-applies and never
  // overwrites — a meaningful draft raises the resume/discard prompt; an
  // empty or unparseable one is cleaned and we start fresh.
  useEffect(() => {
    if (!orgId) return;
    sweepOldProjectDrafts();
    /* eslint-disable react-hooks/set-state-in-effect */
    let raw: string | null = null;
    try { raw = window.localStorage.getItem(draftKey(orgId)); } catch { raw = null; }
    if (!raw) { setHydrated(true); return; }
    let parsed: WizardDraft | null = null;
    try { parsed = JSON.parse(raw) as WizardDraft; } catch { parsed = null; }
    if (parsed && typeof parsed === "object" && isMeaningfulDraft(parsed)) {
      setPendingDraft(parsed);
    } else {
      try { window.localStorage.removeItem(draftKey(orgId)); } catch { /* ignore */ }
      setHydrated(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [orgId]);

  // Auto-save on every change once hydrated — the sole save mechanism; the
  // "Draft saved · {time}" footer indicator reflects it.
  useEffect(() => {
    if (!hydrated || !orgId) return;
    const draft = collectDraft();
    try {
      window.localStorage.setItem(draftKey(orgId), JSON.stringify(draft));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSavedAt(draft._savedAt);
    } catch {
      /* quota exceeded / storage disabled — the draft just won't persist */
    }
  }, [hydrated, orgId, collectDraft]);

  function toggleConfig(c: string) {
    setSelectedConfigs((prev) => {
      const on = prev.includes(c);
      // Keep one draft unit type per picked configuration. Entering carpet /
      // built-up / price here is what lets the unit form prefill from it after
      // publishing; leaving them blank still creates the planned type.
      setUnitTypes((rows) =>
        on
          ? rows.filter((r) => r.name !== c)
          : rows.some((r) => r.name === c)
            ? rows
            : [...rows, { ...makeUnitType(), name: c }],
      );
      return on ? prev.filter((x) => x !== c) : [...prev, c];
    });
  }
  function toggleAmenity(a: string) {
    setAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  }
  function toggleNearby(n: string) {
    setNearby((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]);
  }
  function toggleIncludes(v: string) {
    setPriceIncludes((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  }

  function updateUnitType(key: string | number, patch: Partial<UnitTypeDraft>) {
    setUnitTypes((prev) => prev.map((u) => (u.key === key ? { ...u, ...patch } : u)));
  }

  function applyDraft(d: WizardDraft) {
    setStep(typeof d.step === "number" ? d.step : 0);
    setName(d.name ?? ""); setProjectType(d.projectType ?? ""); setTagline(d.tagline ?? "");
    setReraId(d.reraId ?? ""); setStatus(d.status ?? "active"); setLaunchDate(d.launchDate ?? "");
    setPossession(d.possession ?? ""); setConstructionStage(d.constructionStage ?? "Under construction");
    setSelectedConfigs(d.selectedConfigs ?? []); setTowerCount(d.towerCount ?? "");
    setFloorsDescription(d.floorsDescription ?? "");
    setLandArea(d.landArea ?? ""); setCarpetRange(d.carpetRange ?? "");
    setHighlights(d.highlights ?? ""); setUnitTypes(d.unitTypes ?? []);
    setPriceMin(d.priceMin ?? ""); setPriceMax(d.priceMax ?? ""); setBaseRate(d.baseRate ?? ""); setBookingAmount(d.bookingAmount ?? "");
    setCurrency(d.currency ?? "INR"); setPriceIncludes(d.priceIncludes ?? []);
    setPaymentPlan(d.paymentPlan ?? ""); setOffers(d.offers ?? "");
    setAddress(d.address ?? ""); setCity(d.city ?? ""); setLocality(d.locality ?? ""); setPincode(d.pincode ?? "");
    setNearby(d.nearby ?? []); setLandmarks(d.landmarks ?? "");
    setAmenities(d.amenities ?? []);
    // A resumed draft keeps exactly the rows it was saved with — including
    // ones the user deleted — so restoring never re-adds the defaults.
    setSpecRows(Array.isArray(d.specRows) ? d.specRows : defaultSpecRows());
    setSpecNotes(d.specNotes ?? "");
    setMetaAds(d.metaAds ?? true); setGoogleAds(d.googleAds ?? true); setLinkedinAds(d.linkedinAds ?? false);
    setPortalAds(d.portalAds ?? true); setMonthlyBudget(d.monthlyBudget ?? ""); setTargetCpl(d.targetCpl ?? "");
    setLeadGoal(d.leadGoal ?? ""); setLandingPage(d.landingPage ?? "Create new from template…");
    setAiCalling(d.aiCalling ?? true); setWhatsappAuto(d.whatsappAuto ?? true); setRoundRobin(d.roundRobin ?? true);
    setAiKnowledgeBase(d.aiKnowledgeBase ?? true);
    setManagerId(d.managerId ?? ""); setSalesTeam(d.salesTeam ?? "Ahmedabad — West"); setAgentAssign(d.agentAssign ?? []);
    setRequireApproval(d.requireApproval ?? true); setVisibleTele(d.visibleTele ?? true); setPublishWeb(d.publishWeb ?? false);
    setCoverImageUrl(d.coverImageUrl ?? null); setGalleryUrls(d.galleryUrls ?? []);
    setBrochureUrl(d.brochureUrl ?? null); setReraCertificateUrl(d.reraCertificateUrl ?? null);
    setFloorPlanUrls(d.floorPlanUrls ?? []);
    if (d.customLandingPageId) setCustomLandingPageId(d.customLandingPageId);
    if (d.customLandingPageSlug) setCustomLandingPageSlug(d.customLandingPageSlug);
    if (d.customLandingPageName) setCustomLandingPageName(d.customLandingPageName);
    if (d.selectedTemplateId) {
      const match = orgDbTemplates.find((t) => t.id === d.selectedTemplateId);
      if (match) setSelectedTemplate(match);
    }
  }

  function resumeDraft() {
    if (pendingDraft) applyDraft(pendingDraft);
    setPendingDraft(null);
    setHydrated(true);
  }

  function discardDraft() {
    if (orgId) {
      try { window.localStorage.removeItem(draftKey(orgId)); } catch { /* ignore */ }
    }
    setPendingDraft(null);
    setHydrated(true);
  }

  const pct = Math.round(((step + 1) / STEPS.length) * 100);
  const selectedManager = managers.find((m) => m.id === managerId) ?? null;

  const openTemplateInVisualBuilder = useCallback(async (tplTarget?: OrgTemplateSummary) => {
    if (!accessToken) return;
    const tpl = tplTarget || selectedTemplate;
    if (!tpl) {
      setError("Select a Super Admin template first. If none appear, ask an administrator to assign templates to this organisation.");
      setShowTemplateModal(true);
      return;
    }
    setCustomizingInBuilder(true);
    setError(null);
    try {
      if (customLandingPageId) {
        router.push(orgBuilderPath(customLandingPageId, "/org/projects/add-new-project"));
        return;
      }

      const lpName = landingPageTitle.trim() || (name.trim() ? `${name.trim()} — Official Landing Page` : `${tpl.name} — Project Landing Page`);
      const lp = await apiFetch<LandingPageRow>("/org/landing-pages", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ templateId: tpl.id, name: lpName }),
      });

      if (lp?.id) {
        setCustomLandingPageId(lp.id);
        setCustomLandingPageSlug(lp.slug);
        setCustomLandingPageName(lpName);
        setPublishLandingPageNow(true);

        if (orgId) {
          const updatedDraft = {
            ...collectDraft(),
            customLandingPageId: lp.id,
            customLandingPageSlug: lp.slug,
            customLandingPageName: lpName,
            selectedTemplateId: tpl.id,
          };
          try {
            window.localStorage.setItem(draftKey(orgId), JSON.stringify(updatedDraft));
          } catch {}
        }

        router.push(orgBuilderPath(lp.id, "/org/projects/add-new-project"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open visual builder for this template.");
      setCustomizingInBuilder(false);
    }
  }, [
    accessToken,
    selectedTemplate,
    customLandingPageId,
    landingPageTitle,
    name,
    orgId,
    collectDraft,
    router,
  ]);

  async function submit() {
    if (!accessToken) return;
    // Last-line check. Each step already blocks its own Continue, but a draft
    // resumed straight onto Review — or a rail jump the user confirmed past a
    // warning — can still reach here incomplete.
    if (allMissingFields.length > 0) {
      for (const f of allMissingFields) markValidated(f.step);
      setError(
        `Fill in the required field${allMissingFields.length > 1 ? "s" : ""} first: ${allMissingFields.map((f) => f.label).join(", ")}.`,
      );
      setJumpWarning(null);
      setStep(allMissingFields[0].step);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // Step 5 — specifications: dynamic { label, value } rows plus notes.
      // Omitted entirely when nothing was filled in.
      const specifications = serializeSpecifications(specRows, specNotes);

      // Step 6 — marketing preference blob. Always sent (the toggles have
      // meaningful defaults). `aiKnowledgeBaseEnabled` is collected from
      // Step 8's UI but lives here, not a separate column.
      const marketing = {
        adSources: [
          metaAds && "Meta",
          googleAds && "Google",
          linkedinAds && "LinkedIn",
          portalAds && "Portals",
        ].filter(Boolean) as string[],
        monthlyBudget: parseAmount(monthlyBudget) ?? null,
        targetCpl: parseAmount(targetCpl) ?? null,
        leadGoal: parseCount(leadGoal) ?? null,
        landingPageChoice: landingPage,
        aiCallingEnabled: aiCalling,
        whatsappWelcomeEnabled: whatsappAuto,
        roundRobinEnabled: roundRobin,
        aiKnowledgeBaseEnabled: aiKnowledgeBase,
      };

      const body: CreateProjectInput = {
        name: name.trim(),
        // `location` stays the denormalised display string (project list,
        // cards, header, detail all read it) — kept in sync with the
        // structured city/locality fields below, same as before.
        location: [locality, city].filter(Boolean).join(", ") || undefined,
        reraId: reraId.trim() || undefined,
        possession: possession.trim() || undefined,
        managerId: managerId || undefined,
        status,
        priceMin: parseAmount(priceMin),
        priceMax: parseAmount(priceMax),
        baseRate: parseAmount(baseRate),
        landArea: parseDecimal(landArea),
        towerCount: parseCount(towerCount),
        floorsDescription: floorsDescription.trim() || undefined,
        carpetRange: carpetRange.trim() || undefined,
        projectType: projectType || undefined,
        tagline: tagline.trim() || undefined,
        launchDate: launchDate || undefined,
        constructionStage: constructionStage || undefined,
        highlights: highlights.trim() || undefined,
        salesTeam: salesTeam || undefined,
        amenities: amenities.map((a) => ({ name: a, iconUrl: null })),
        // Step 3 — pricing & payment (remaining fields)
        bookingAmount: parseAmount(bookingAmount),
        currency: currency as (typeof PROJECT_CURRENCIES)[number],
        priceIncludes: priceIncludes.length ? priceIncludes : undefined,
        paymentPlan: paymentPlan || undefined,
        offers: offers.trim() || undefined,
        // Step 4 — location & connectivity
        addressLine: address.trim() || undefined,
        city: city.trim() || undefined,
        locality: locality.trim() || undefined,
        pincode: pincode.trim() || undefined,
        connectivity: nearby.length ? nearby : undefined,
        landmarks: landmarks.trim() || undefined,
        // Step 5 & 6 — preference blobs
        specifications,
        marketing,
        // Step 7 — access toggles (assigned agents go via a follow-up call)
        requireBookingApproval: requireApproval,
        visibleToTelecallers: visibleTele,
        publishedToWebsite: publishWeb,
        // Step 8 — documents & media (R2 public URLs, uploaded org-scoped above)
        coverImageUrl: coverImageUrl ?? undefined,
        galleryUrls: galleryUrls.length ? galleryUrls : undefined,
        brochureUrl: brochureUrl ?? undefined,
        reraCertificateUrl: reraCertificateUrl ?? undefined,
        floorPlanUrls: floorPlanUrls.length ? floorPlanUrls : undefined,
      };

      const project = await apiFetch<Project>("/org/projects", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });

      const seededNames = new Set<string>();
      for (const u of unitTypes) {
        if (!u.name.trim()) continue;
        const utBody: CreateUnitTypeInput = {
          name: u.name.trim(),
          carpetSqft: parseCount(u.carpetSqft),
          builtupSqft: parseCount(u.builtupSqft),
          price: parseAmount(u.price),
          totalUnits: parseCount(u.totalUnits),
        };
        await apiFetch(`/org/projects/${project.id}/unit-types`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(utBody),
        });
        seededNames.add(utBody.name);
      }

      // Seed the planned unit mix from the configurations picked in Step 2.
      // Counts start at 0 — the user fills them in later on the Units tab.
      // Without this the picked configs are shown in Review and then vanish.
      for (const label of selectedConfigs) {
        if (seededNames.has(label)) continue;
        const utBody: CreateUnitTypeInput = { name: label, totalUnits: 0 };
        await apiFetch(`/org/projects/${project.id}/unit-types`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(utBody),
        });
      }

      // Step 7 — assign the picked sales agents. Follow-up call (needs the
      // new project id). A failure here must NOT fail the publish: the
      // project already exists, so we clear the draft and surface a
      // non-blocking notice with a manual link instead of redirecting.
      let agentsFailed = false;
      if (agentAssign.length > 0) {
        try {
          await setProjectSalesAgents(project.id, agentAssign);
        } catch {
          agentsFailed = true;
        }
      }

      // Automatically create and publish project landing page if enabled
      let publishedLp: { id: string; slug: string; name: string } | null = null;
      if (publishLandingPageNow) {
        try {
          const lpName = landingPageTitle.trim() || `${project.name} — Official Landing Page`;

          if (customLandingPageId) {
            // Already customized in the visual builder! Publish directly.
            await apiFetch(`/org/landing-pages/${customLandingPageId}/publish`, {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}` },
            });

            await apiFetch(`/org/projects/${project.id}`, {
              method: "PATCH",
              headers: { Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({
                publishedToWebsite: true,
                marketing: {
                  ...marketing,
                  landingPageId: customLandingPageId,
                  landingPageSlug: customLandingPageSlug,
                  landingPageChoice: customLandingPageName || lpName,
                },
              }),
            });

            publishedLp = {
              id: customLandingPageId,
              slug: customLandingPageSlug || "project",
              name: customLandingPageName || lpName,
            };
            setCreatedLandingPage(publishedLp);
          } else {
            if (!selectedTemplate) {
              throw new Error("Select a Super Admin template before publishing a landing page.");
            }

            const lp = await apiFetch<LandingPageRow>("/org/landing-pages", {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({
                templateId: selectedTemplate.id,
                name: lpName,
                projectId: project.id,
              }),
            });

            if (lp?.id) {
              await apiFetch(`/org/landing-pages/${lp.id}/publish`, {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}` },
              });

              await apiFetch(`/org/projects/${project.id}`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({
                  publishedToWebsite: true,
                  marketing: {
                    ...marketing,
                    landingPageId: lp.id,
                    landingPageSlug: lp.slug,
                    landingPageChoice: lpName,
                  },
                }),
              });

              publishedLp = { id: lp.id, slug: lp.slug, name: lpName };
              setCreatedLandingPage(publishedLp);
            }
          }
        } catch (lpErr) {
          setError(
            lpErr instanceof Error
              ? `Project saved, but the landing page was not created: ${lpErr.message}`
              : "Project saved, but the landing page was not created from the selected template.",
          );
        }
      }

      if (orgId) {
        try { window.localStorage.removeItem(draftKey(orgId)); } catch { /* ignore */ }
      }

      setPublishedProjectId(project.id);

      if (agentsFailed) {
        setError(
          "Project published, but assigning sales agents failed. You can add them from the project's Team section.",
        );
        setSubmitting(false);
        return;
      }

      if (publishedLp) {
        setSubmitting(false);
        return;
      }

      router.push(`/org/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create the project.");
      setSubmitting(false);
    }
  }

  const atProjectLimit =
    projectQuota != null &&
    projectQuota.limit != null &&
    projectQuota.used >= projectQuota.limit;

  // At the limit with no draft to resume — don't let the wizard open at all.
  if (atProjectLimit && !pendingDraft) {
    return (
      <div className="card reveal in" style={{ maxWidth: 620, margin: "40px auto", padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 8 }}>🚧</div>
        <h2 style={{ margin: "0 0 8px" }}>You&apos;ve reached your project limit</h2>
        <p className="muted" style={{ margin: "0 0 18px", fontSize: 14 }}>
          Your{projectQuota?.planName ? ` ${projectQuota.planName}` : ""} plan allows{" "}
          <b>{projectQuota?.limit}</b> project{projectQuota?.limit === 1 ? "" : "s"} and you already have{" "}
          <b>{projectQuota?.used}</b>. Upgrade your plan to create another.
        </p>
        <div className="row gap-10" style={{ justifyContent: "center" }}>
          <button className="btn btn-ghost" type="button" onClick={() => router.push("/org/projects")}>← Back to projects</button>
          <Link href="/org/settings?section=billing" className="btn btn-primary">Upgrade plan</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {pendingDraft && (
        <div
          className="card reveal in"
          style={{ marginBottom: 16, borderColor: "var(--brand)", padding: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
        >
          <span style={{ fontSize: 22 }}>📝</span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <b>Unfinished draft found</b>
            <div className="muted" style={{ fontSize: 13 }}>
              You started a project and left it {formatRelative(pendingDraft._savedAt)}. Resume where you left off, or discard it and start a new one.
            </div>
          </div>
          <div className="row gap-10">
            <button className="btn btn-ghost" onClick={discardDraft}>Discard &amp; start new</button>
            <button className="btn btn-primary" onClick={resumeDraft}>Resume draft</button>
          </div>
        </div>
      )}

      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">🏗️ Projects</div>
          <h1>Onboard a new project</h1>
          <div className="sub">Set up a real-estate development end-to-end — inventory, pricing, marketing sources, team access and go-live.</div>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => router.push("/org/projects")}>✕ Cancel</button>
        </div>
      </div>

      <Reveal delay={1}>
        <div className="wz">
          {/* RAIL */}
          <div className="wz-rail">
            <div className="card pad-16">
              <div className="row between fw6 fs-12-5">
                <span>Setup progress</span><span className="brand">{pct}%</span>
              </div>
              <div className="wz-prog"><i style={{ width: `${pct}%` }} /></div>
              <div className="wz-steps">
                {STEPS.map((s, i) => {
                  // A step earns its green tick only by passing its own
                  // required-field check — one bypassed via "Go to X anyway"
                  // shows an alert instead, and flips to the tick by itself
                  // once the user goes back and fills it in.
                  const status = stepStatus(i, step, requiredByStep);
                  const { className, glyph } = stepIndicator(status, i);
                  return (
                    <button
                      key={i}
                      className={className}
                      onClick={() => goToStep(i)}
                      title={status === "incomplete" ? `${s.label} is missing required fields` : undefined}
                    >
                      <span className="num">{glyph}</span>
                      <span className="tx"><b>{s.label}</b><small>{s.sub}</small></span>
                      {status === "incomplete" ? <span className="sr-only"> — incomplete</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Template Badge in Rail */}
            <div className="card pad-14 mt-14" style={{ background: "var(--surface-2, #f8fafc)", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", letterSpacing: ".05em" }}>
                  Active Template
                </div>
                {customLandingPageId && <span className="badge b-green" style={{ fontSize: 10, padding: "1px 6px" }}>Edited</span>}
              </div>
              <div style={{ fontWeight: 600, fontSize: 13, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <span>✨</span> {selectedTemplate ? selectedTemplate.name : "None"}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-block mt-8"
                onClick={() => openTemplateInVisualBuilder()}
                disabled={customizingInBuilder}
                style={{ fontSize: 11.5 }}
              >
                ✏️ {customLandingPageId ? "Re-open in Builder" : "Customize in Builder"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-block mt-6"
                onClick={() => setShowTemplateModal(true)}
                style={{ fontSize: 11.5 }}
              >
                Change Template 🔄
              </button>
            </div>

            <div className="help mt-14">
              💡 <b>Tip:</b> Fields marked <span className="req">*</span> are checked when you continue past their step. You can save a draft anytime and finish later.
            </div>
          </div>

          {/* PANES */}
          <div className="card pad-26">

            {/* Raised when a step-rail click would jump ahead out of a step
                with required fields still empty. */}
            {jumpWarning && (
              <div className="help err mb-20">
                <b>⚠️ {STEPS[step].label} isn&apos;t complete.</b>
                <div style={{ marginTop: 4 }}>
                  Still needed here: {jumpWarning.missing.join(", ")}. You can fill it in now, or skip ahead to <b>{STEPS[jumpWarning.to].label}</b> and come back — the project can&apos;t be published until it&apos;s filled in.
                </div>
                <div className="row gap-10 mt-8">
                  <button className="btn btn-primary btn-sm" onClick={() => setJumpWarning(null)}>Stay and fill it in</button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { const to = jumpWarning.to; setJumpWarning(null); setStep(to); }}
                  >
                    Go to {STEPS[jumpWarning.to].label} anyway →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 1 — Basics */}
            {step === 0 && (
              <div className="wz-pane on">
                <div className="q-h"><div className="st">Step 1 of 9</div><h2>Project basics</h2><div className="sub">The essentials that identify this development across the CRM, website and ads.</div></div>

                {/* PREDEFINED TEMPLATE SELECTOR BANNER */}
                <div
                  className="card pad-16 mb-20"
                  style={{
                    background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(79, 70, 229, 0.03) 100%)",
                    border: "1.5px solid var(--brand, #4f46e5)",
                    borderRadius: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 10,
                          overflow: "hidden",
                          flexShrink: 0,
                          border: "1px solid rgba(0,0,0,0.1)",
                          background: "#fff",
                        }}
                      >
                        {selectedTemplate?.thumbnail ? (
                          <img
                            src={selectedTemplate.thumbnail}
                            alt={selectedTemplate.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <span style={{ fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>🏛️</span>
                        )}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--brand, #4f46e5)" }}>
                            Selected Project Template
                          </span>
                          {selectedTemplate?.category ? <span className="badge b-blue">{selectedTemplate.category}</span> : null}
                          {customLandingPageId ? (
                            <span className="badge b-green">✨ Visually Edited in Builder</span>
                          ) : null}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 1 }}>
                          {selectedTemplate ? selectedTemplate.name : "None selected"}
                        </div>
                        <div className="muted fs-12-5" style={{ maxWidth: 460 }}>
                          {customLandingPageId
                            ? "This template has been customized in the visual builder. Any canvas edits, custom sections and layouts will be published with this project."
                            : selectedTemplate
                            ? (selectedTemplate.category ? `${selectedTemplate.category} · assigned by Super Admin` : "Assigned by Super Admin")
                            : "Choose a Super Admin template assigned to this organisation. The landing page will use that design."}
                        </div>
                      </div>
                    </div>

                    <div className="row gap-8" style={{ alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openTemplateInVisualBuilder()}
                        disabled={customizingInBuilder}
                        style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}
                      >
                        <span>✏️</span> {customizingInBuilder ? "Opening Builder…" : customLandingPageId ? "Re-open in Visual Builder" : "Customize in Visual Builder"}
                      </button>
                      {customLandingPageId && (
                        <a
                          href={`/preview/${customLandingPageId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost btn-sm"
                          style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}
                        >
                          <span>👁️</span> Preview
                        </a>
                      )}
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowTemplateModal(true)}
                        style={{ display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <span>🎨</span> Change Template
                      </button>
                    </div>
                  </div>
                </div>

                <div className="q-sec">
                  <div className="lbl">📋 Identity</div>
                  <div className="grid g2">
                    <div className={fieldClass("name")}><label>Project name <span className="req">*</span></label><input className="inp" placeholder="e.g. Palm Residency" value={name} onChange={(e) => setName(e.target.value)} />{invalid("name") && <div className="field-err">Project name is required.</div>}</div>
                    <div className="field"><label>Developer / channel partner <span className="req">*</span></label><input className="inp" value={orgName} placeholder="Loading…" readOnly /><div className="hint">Your organisation, set during onboarding. Change it in Settings → General.</div></div>
                  </div>
                  <div className={fieldClass("projectType")}><label>Project type <span className="req">*</span></label>
                    <CatalogOptions
                      category="project_type"
                      options={catalogByCategory.project_type}
                      loaded={catalog !== null}
                      error={catalogError}
                      single
                      isSelected={(label) => projectType === label}
                      onToggle={(label) => setProjectType((cur) => (cur === label ? "" : label))}
                    />
                    {invalid("projectType") && <div className="field-err">Pick a project type.</div>}
                  </div>
                  <div className="field"><label>Short tagline</label><input className="inp" placeholder="e.g. 2 &amp; 3 BHK homes on SG Highway" value={tagline} onChange={(e) => setTagline(e.target.value)} /><div className="hint">Shown on the public page and ad landing pages.</div></div>
                </div>
                <div className="q-sec">
                  <div className="lbl">🏛️ Approvals &amp; timeline</div>
                  <div className="grid g2">
                    <div className={fieldClass("reraId")}><label>RERA registration no. <span className="req">*</span></label><input className="inp" placeholder="PR/GJ/AHM/2026/00842" value={reraId} onChange={(e) => setReraId(e.target.value)} />{invalid("reraId") && <div className="field-err">RERA registration number is required.</div>}</div>
                    <div className="field"><label>Status</label><select className="inp" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                  </div>
                  <div className="grid g3">
                    <div className="field"><label>Launch date</label><input className="inp" type="date" value={launchDate} onChange={(e) => setLaunchDate(e.target.value)} /></div>
                    <div className="field"><label>Expected possession</label><input className="inp" type="month" value={possession} onChange={(e) => setPossession(e.target.value)} /></div>
                    <div className="field"><label>Construction stage</label><select className="inp" value={constructionStage} onChange={(e) => setConstructionStage(e.target.value)}><option>Planning</option><option>Excavation</option><option>Under construction</option><option>Finishing</option><option>Ready to move</option></select></div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 — Inventory */}
            {step === 1 && (
              <div className="wz-pane on">
                <div className="q-h"><div className="st">Step 2 of 9</div><h2>Inventory &amp; configuration</h2><div className="sub">Which unit types this project offers and the overall inventory picture.</div></div>
                <div className="q-sec">
                  <div className="lbl">🏠 Unit configurations (select all)</div>
                  <div className="field">
                    <CatalogOptions
                      category="unit_type"
                      options={catalogByCategory.unit_type}
                      loaded={catalog !== null}
                      error={catalogError}
                      isSelected={(label) => selectedConfigs.includes(label)}
                      onToggle={toggleConfig}
                    />
                  </div>
                  <div className="grid g3">
                    <div className="field"><label>No. of towers / blocks</label><input className="inp" type="number" placeholder="4" value={towerCount} onChange={(e) => setTowerCount(e.target.value)} /></div>
                    <div className="field"><label>Floors / structure</label><input className="inp" placeholder="G+22" value={floorsDescription} onChange={(e) => setFloorsDescription(e.target.value)} /></div>
                    <div className="field"><label>Carpet area range (sqft)</label><input className="inp" placeholder="640 – 1,850" value={carpetRange} onChange={(e) => setCarpetRange(e.target.value)} /></div>
                  </div>
                  <ConfigSizePriceTable
                    configurations={selectedConfigs}
                    rows={unitTypes}
                    onChange={updateUnitType}
                    hint="Optional, and editable later from the project's Edit page or the Units page. Filling these in means adding a unit prefills its area and price from here instead of asking for them again."
                  />
                  <div className="field mb-0"><label>Total land area</label>
                    <div style={{ position: "relative", maxWidth: 260 }}>
                      <input className="inp" type="number" step="0.01" min={0} style={{ paddingRight: 52 }} placeholder="5.2" value={landArea} onChange={(e) => setLandArea(e.target.value)} />
                      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: 13, pointerEvents: "none" }}>acres</span>
                    </div>
                    <div className="hint">Unit counts (planned / available) come from the Units section after publishing.</div>
                  </div>
                </div>
                <div className="q-sec">
                  <div className="lbl">⭐ Unique selling points</div>
                  <div className="field"><label>Highlights (one per line)</label><textarea className="inp" rows={4} placeholder={"Riverfront view\n5 mins from SG Highway\nVastu-compliant layouts\n90% open space"} value={highlights} onChange={(e) => setHighlights(e.target.value)} /><div className="hint">Used across ads, WhatsApp templates and AI-calling scripts.</div></div>
                </div>
              </div>
            )}

            {/* STEP 3 — Pricing */}
            {step === 2 && (
              <div className="wz-pane on">
                <div className="q-h"><div className="st">Step 3 of 9</div><h2>Pricing &amp; payment</h2><div className="sub">How units are priced and the payment structure buyers will see.</div></div>
                <div className="q-sec">
                  <div className="lbl">💰 Pricing</div>
                  <div className="grid g2">
                    <div className={fieldClass("priceMin")}><label>Price range — from <span className="req">*</span></label><MoneyInput placeholder="62,00,000" value={priceMin} onChange={setPriceMin} />{invalid("priceMin") && <div className="field-err">Enter the starting price.</div>}</div>
                    <div className="field"><label>Price range — to</label><MoneyInput placeholder="1,20,00,000" value={priceMax} onChange={setPriceMax} /></div>
                  </div>
                  <div className="grid g3">
                    <div className="field"><label>Price per sqft</label><MoneyInput placeholder="6,400" value={baseRate} onChange={setBaseRate} /></div>
                    <div className="field"><label>Booking amount</label><MoneyInput placeholder="1,00,000" value={bookingAmount} onChange={setBookingAmount} /></div>
                    <div className="field"><label>Currency</label><select className="inp" value={currency} onChange={(e) => setCurrency(e.target.value)}>{PROJECT_CURRENCIES.map((c) => <option key={c} value={c}>{CURRENCY_LABELS[c]}</option>)}</select></div>
                  </div>
                  <div className="field"><label>What&apos;s included in the price?</label>
                    <CatalogOptions
                      category="price_includes"
                      options={catalogByCategory.price_includes}
                      loaded={catalog !== null}
                      error={catalogError}
                      isSelected={(label) => priceIncludes.includes(label)}
                      onToggle={toggleIncludes}
                    />
                  </div>
                </div>
                <div className="q-sec">
                  <div className="lbl">📄 Payment plan</div>
                  <div className="field"><label>Plan type</label>
                    <CatalogOptions
                      category="payment_plan"
                      options={catalogByCategory.payment_plan}
                      loaded={catalog !== null}
                      error={catalogError}
                      single
                      isSelected={(label) => paymentPlan === label}
                      onToggle={(label) => setPaymentPlan((cur) => (cur === label ? "" : label))}
                    />
                  </div>
                  <div className="field"><label>Current offers / schemes</label><textarea className="inp" rows={3} placeholder={"No floor-rise charges till 30 Sep\nFree modular kitchen on 3 BHK\nAssured rental for 2 years"} value={offers} onChange={(e) => setOffers(e.target.value)} /></div>
                </div>
              </div>
            )}

            {/* STEP 4 — Location */}
            {step === 3 && (
              <div className="wz-pane on">
                <div className="q-h"><div className="st">Step 4 of 9</div><h2>Location &amp; connectivity</h2><div className="sub">Where the project is and what surrounds it — powers maps and ad targeting.</div></div>
                <div className="q-sec">
                  <div className="lbl">📍 Address</div>
                  <div className={fieldClass("address")}><label>Full address <span className="req">*</span></label><textarea className="inp" rows={2} placeholder="Survey No. 214, SG Highway, Bopal, Ahmedabad, Gujarat 380058" value={address} onChange={(e) => setAddress(e.target.value)} />{invalid("address") && <div className="field-err">Full address is required.</div>}</div>
                  <div className="grid g3">
                    <div className={fieldClass("city")}><label>City <span className="req">*</span></label><input className="inp" placeholder="Ahmedabad" value={city} onChange={(e) => setCity(e.target.value)} />{invalid("city") && <div className="field-err">City is required.</div>}</div>
                    <div className="field"><label>Locality</label><input className="inp" placeholder="SG Highway" value={locality} onChange={(e) => setLocality(e.target.value)} /></div>
                    <div className="field"><label>Pincode</label><input className="inp" placeholder="380058" value={pincode} onChange={(e) => setPincode(e.target.value)} /></div>
                  </div>
                </div>
                <div className="q-sec">
                  <div className="lbl">🛣️ Connectivity &amp; landmarks</div>
                  <div className="field"><label>Nearby (select all that apply)</label>
                    <CatalogOptions
                      category="connectivity"
                      options={catalogByCategory.connectivity}
                      loaded={catalog !== null}
                      error={catalogError}
                      isSelected={(label) => nearby.includes(label)}
                      onToggle={toggleNearby}
                    />
                  </div>
                  <div className="field"><label>Key landmarks (with distance)</label><textarea className="inp" rows={3} placeholder={"SG Highway — 0.5 km\nAhmedabad Airport — 14 km\nNirma University — 6 km"} value={landmarks} onChange={(e) => setLandmarks(e.target.value)} /></div>
                </div>
              </div>
            )}

            {/* STEP 5 — Amenities */}
            {step === 4 && (
              <div className="wz-pane on">
                <div className="q-h"><div className="st">Step 5 of 9</div><h2>Amenities &amp; specifications</h2><div className="sub">Lifestyle features and build quality — shown on the project page and brochures.</div></div>
                <div className="q-sec">
                  <div className="lbl">🏊 Amenities (select all)</div>
                  <div className="field">
                    <CatalogOptions
                      category="amenity"
                      options={catalogByCategory.amenity}
                      loaded={catalog !== null}
                      error={catalogError}
                      isSelected={(label) => amenities.includes(label)}
                      onToggle={toggleAmenity}
                    />
                  </div>
                </div>
                <div className="q-sec">
                  <div className="lbl">🧱 Specifications</div>
                  <div className="hint" style={{ marginBottom: 12 }}>
                    Name each specification and describe it. The four below are just a starting point — rename or remove any of them, and add your own.
                  </div>
                  <SpecificationRows
                    rows={specRows}
                    onChange={setSpecRows}
                    notes={specNotes}
                    onNotesChange={setSpecNotes}
                  />
                </div>
              </div>
            )}

            {/* STEP 6 — Marketing */}
            {step === 5 && (
              <div className="wz-pane on">
                <div className="q-h"><div className="st">Step 6 of 9</div><h2>Marketing &amp; lead sources</h2><div className="sub">Where leads come from and how they&apos;ll be worked — connect ads, AI calling and WhatsApp.</div></div>
                <div className="q-sec">
                  <div className="lbl">📣 Ad sources (enable &amp; set budget)</div>
                  <div className="sw-row"><div className="tx"><b>Meta Ads (Facebook / Instagram)</b><small>Lead-form &amp; click campaigns</small></div><div className={`switch ${metaAds ? "on" : ""}`} onClick={() => setMetaAds(!metaAds)} /></div>
                  <div className="sw-row"><div className="tx"><b>Google Ads</b><small>Search &amp; Performance Max</small></div><div className={`switch ${googleAds ? "on" : ""}`} onClick={() => setGoogleAds(!googleAds)} /></div>
                  <div className="sw-row"><div className="tx"><b>LinkedIn Ads</b><small>Premium / NRI targeting</small></div><div className={`switch ${linkedinAds ? "on" : ""}`} onClick={() => setLinkedinAds(!linkedinAds)} /></div>
                  <div className="sw-row"><div className="tx"><b>Housing / 99acres / MagicBricks</b><small>Portal listings</small></div><div className={`switch ${portalAds ? "on" : ""}`} onClick={() => setPortalAds(!portalAds)} /></div>
                </div>
                <div className="q-sec">
                  <div className="lbl">🎯 Targets &amp; landing</div>
                  <div className="grid g3">
                    <div className="field"><label>Monthly ad budget</label><MoneyInput placeholder="1,50,000" value={monthlyBudget} onChange={setMonthlyBudget} /></div>
                    <div className="field"><label>Target CPL</label><MoneyInput placeholder="300" value={targetCpl} onChange={setTargetCpl} /></div>
                    <div className="field"><label>Monthly lead goal</label><input className="inp" type="number" placeholder="400" value={leadGoal} onChange={(e) => setLeadGoal(e.target.value)} /></div>
                  </div>
                  <div className="field"><label>Landing page</label>
                    <select className="inp" value={landingPage} onChange={(e) => setLandingPage(e.target.value)}>
                      <option>Create new from template…</option>
                      {orgLandingPages.map((lp) => (
                        <option key={lp.id} value={`Use existing — ${lp.name}`}>Use existing — {lp.name}</option>
                      ))}
                      <option>External URL</option>
                    </select>
                    {orgLandingPages.length === 0 ? <div className="hint">No landing pages yet — create one from Landing Pages.</div> : null}
                  </div>

                  <div className="card pad-14 mt-16" style={{ background: "var(--surface-2, #f8fafc)", border: "1.5px solid var(--line)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>🚀 Publish Live Landing Page</span>
                          <span className="badge b-green">Instant Go-Live</span>
                          {customLandingPageId && <span className="badge b-blue">✨ Visually Edited in Builder</span>}
                        </div>
                        <div className="muted fs-12" style={{ marginTop: 2 }}>
                          {customLandingPageId
                            ? `Visual customisations made to "${customLandingPageName || selectedTemplate?.name}" will be published live with this project.`
                            : `Automatically create and publish a dynamic landing page using "${selectedTemplate?.name || "the selected template"}".`}
                        </div>
                      </div>
                      <div className={`switch ${publishLandingPageNow ? "on" : ""}`} onClick={() => setPublishLandingPageNow(!publishLandingPageNow)} />
                    </div>

                    {publishLandingPageNow && (
                      <>
                        <div className="grid g2 mt-12">
                          <div className="field mb-0">
                            <label style={{ fontSize: 12 }}>Landing Page Title</label>
                            <input
                              className="inp"
                              value={landingPageTitle}
                              placeholder={`${name.trim() || "Project"} — Official Launch`}
                              onChange={(e) => setLandingPageTitle(e.target.value)}
                            />
                          </div>
                          <div className="field mb-0">
                            <label style={{ fontSize: 12 }}>Live Web URL Preview</label>
                            <div style={{ height: 38, background: "#fff", border: "1px solid var(--line)", borderRadius: 6, display: "flex", alignItems: "center", padding: "0 10px", fontSize: 12, color: "var(--muted)" }}>
                              /p/{name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "project-slug"}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => openTemplateInVisualBuilder()}
                            disabled={customizingInBuilder}
                            style={{ display: "flex", alignItems: "center", gap: 6 }}
                          >
                            <span>✏️</span> {customizingInBuilder ? "Opening Builder…" : customLandingPageId ? "Re-open in Visual Builder" : "Customize Template in Visual Builder"}
                          </button>
                          {customLandingPageId && (
                            <a
                              href={`/preview/${customLandingPageId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-ghost btn-sm"
                              style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}
                            >
                              <span>👁️</span> Preview
                            </a>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="q-sec">
                  <div className="lbl">🤖 Automation &amp; assignment</div>
                  <div className="sw-row"><div className="tx"><b>AI voice calling</b><small>Auto-call &amp; qualify new leads within 60s</small></div><div className={`switch ${aiCalling ? "on" : ""}`} onClick={() => setAiCalling(!aiCalling)} /></div>
                  <div className="sw-row"><div className="tx"><b>WhatsApp auto-welcome</b><small>Send brochure + book site visit</small></div><div className={`switch ${whatsappAuto ? "on" : ""}`} onClick={() => setWhatsappAuto(!whatsappAuto)} /></div>
                  <div className="sw-row"><div className="tx"><b>Round-robin assignment</b><small>Distribute leads across the sales team</small></div><div className={`switch ${roundRobin ? "on" : ""}`} onClick={() => setRoundRobin(!roundRobin)} /></div>
                </div>
              </div>
            )}

            {/* STEP 7 — Team */}
            {step === 6 && (
              <div className="wz-pane on">
                <div className="q-h"><div className="st">Step 7 of 9</div><h2>Team &amp; access</h2><div className="sub">Who owns this project and which agents can work its leads.</div></div>
                <div className="q-sec">
                  <div className="lbl">👤 Ownership</div>
                  <div className="grid g2">
                    <div className={fieldClass("managerId")}><label>Project manager <span className="req">*</span></label><select className="inp" value={managerId} onChange={(e) => setManagerId(e.target.value)}><option value="">Unassigned</option>{managers.map((u) => <option key={u.id} value={u.id}>{userLabel(u)}</option>)}</select>{invalid("managerId") && <div className="field-err">Assign a project manager.</div>}</div>
                    <div className="field"><label>Sales team</label><select className="inp" value={salesTeam} onChange={(e) => setSalesTeam(e.target.value)}><option>Ahmedabad — West</option><option>Ahmedabad — Core</option><option>NRI Desk</option></select></div>
                  </div>
                  <div className="field"><label>Assign sales agents</label>
                    {salesAgents.length === 0 ? (
                      <div className="hint">No assignable users in your organisation yet — add them under Users.</div>
                    ) : (
                      <div className="opts">
                        {salesAgents.map((u) => {
                          const on = agentAssign.includes(u.id);
                          return (
                            <span
                              key={u.id}
                              className={`opt ${on ? "on" : ""}`}
                              onClick={() => setAgentAssign((prev) => (on ? prev.filter((x) => x !== u.id) : [...prev, u.id]))}
                            >
                              <span className="b">{on ? "✓" : ""}</span>{u.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="q-sec">
                  <div className="lbl">🔐 Visibility &amp; approvals</div>
                  <div className="sw-row"><div className="tx"><b>Require manager approval on bookings</b><small>Bookings move to Pending until approved</small></div><div className={`switch ${requireApproval ? "on" : ""}`} onClick={() => setRequireApproval(!requireApproval)} /></div>
                  <div className="sw-row"><div className="tx"><b>Visible to telecallers</b><small>Show in the calling dashboard queue</small></div><div className={`switch ${visibleTele ? "on" : ""}`} onClick={() => setVisibleTele(!visibleTele)} /></div>
                  <div className="sw-row"><div className="tx"><b>Publish to public website</b><small>List on skylinedev.in projects page</small></div><div className={`switch ${publishWeb ? "on" : ""}`} onClick={() => setPublishWeb(!publishWeb)} /></div>
                </div>
              </div>
            )}

            {/* STEP 8 — Documents */}
            {step === 7 && (
              <div className="wz-pane on">
                <div className="q-h"><div className="st">Step 8 of 9</div><h2>Documents &amp; media</h2><div className="sub">Upload the assets that power the public page, brochures and AI knowledge base.</div></div>
                <div className="q-sec">
                  <div className="lbl">🖼️ Images</div>
                  <div className="grid g2">
                    <MediaUpload field="gallery" label="Cover / elevation image" value={coverImageUrl} onChange={setCoverImageUrl} />
                    <GalleryUpload value={galleryUrls} onChange={setGalleryUrls} />
                  </div>
                  <GalleryUpload
                    value={floorPlanUrls}
                    onChange={setFloorPlanUrls}
                    label="Project floor / site plan"
                    field="floorPlan"
                  />
                  <div className="hint" style={{ marginTop: -4 }}>
                    The overall plan for the development — master site layout, tower plans, podium levels. Add as many as you need.
                  </div>
                </div>
                <div className="q-sec">
                  <div className="lbl">📄 Documents</div>
                  <div className="grid g2">
                    <MediaUpload field="brochure" label="Brochure (PDF)" value={brochureUrl} onChange={setBrochureUrl} />
                    <MediaUpload field="brochure" label="RERA certificate (PDF)" value={reraCertificateUrl} onChange={setReraCertificateUrl} />
                  </div>
                  <div className="sw-row"><div className="tx"><b>Add to AI knowledge base</b><small>Let AI calling &amp; WhatsApp answer from these documents</small></div><div className={`switch ${aiKnowledgeBase ? "on" : ""}`} onClick={() => setAiKnowledgeBase(!aiKnowledgeBase)} /></div>
                </div>
              </div>
            )}

            {/* STEP 9 — Review */}
            {step === 8 && (
              <div className="wz-pane on">
                <div className="q-h"><div className="st">Step 9 of 9</div><h2>Review &amp; launch</h2><div className="sub">Confirm the details below, then publish. You can edit everything later from the project page.</div></div>
                <div className="rev">
                  <div className="rev-grid">
                    <div>
                      <div className="q-sec"><div className="lbl">📋 Basics</div>
                        <div className="sp"><span className="k">Project</span><span className="v">{name || "—"}</span></div>
                        <div className="sp"><span className="k">Type</span><span className="v">{projectType || "—"}</span></div>
                        <div className="sp"><span className="k">RERA</span><span className="v">{reraId || "—"}</span></div>
                        <div className="sp"><span className="k">Status</span><span className="v"><span className={`badge ${status === "active" ? "b-green" : "b-gray"}`}>{status === "active" ? "Active" : "Inactive"}</span></span></div>
                      </div>
                      <div className="q-sec"><div className="lbl">🏠 Inventory</div>
                        <div className="sp"><span className="k">Configs</span><span className="v">{formatConfigs(selectedConfigs)}</span></div>
                        <div className="sp"><span className="k">Towers / floors</span><span className="v">{[towerCount, floorsDescription].filter(Boolean).join(" · ") || "—"}</span></div>
                        <div className="sp"><span className="k">Carpet range</span><span className="v">{carpetRange || "—"}</span></div>
                        <div className="sp"><span className="k">Land area</span><span className="v">{landArea ? `${landArea} acres` : "—"}</span></div>
                        <div className="sp"><span className="k">Price range</span><span className="v">{priceRangeLabel(priceMin, priceMax, currency)}</span></div>
                      </div>
                      <div className="q-sec"><div className="lbl">📍 Location</div>
                        <div className="sp"><span className="k">City</span><span className="v">{city || "—"}</span></div>
                        <div className="sp"><span className="k">Locality</span><span className="v">{locality || "—"}</span></div>
                      </div>
                      <div className="q-sec"><div className="lbl">🧱 Specifications</div>
                        {reviewSpecRows.length === 0 ? (
                          <div className="sp"><span className="k">Specifications</span><span className="v">—</span></div>
                        ) : (
                          reviewSpecRows.map(([label, value], i) => (
                            <div className="sp" key={`${label}-${i}`}><span className="k">{label}</span><span className="v">{value}</span></div>
                          ))
                        )}
                        <div className="sp"><span className="k">Notes</span><span className="v">{specNotes.trim() || "—"}</span></div>
                      </div>
                    </div>
                    <div>
                      <div className="q-sec"><div className="lbl">📣 Marketing</div>
                        <div className="sp"><span className="k">Sources</span><span className="v">{[metaAds && "Meta", googleAds && "Google", linkedinAds && "LinkedIn", portalAds && "Portals"].filter(Boolean).join(", ") || "—"}</span></div>
                        <div className="sp"><span className="k">Monthly budget</span><span className="v">{monthlyBudget ? formatRupees(monthlyBudget) : "—"}</span></div>
                        <div className="sp"><span className="k">Target CPL</span><span className="v">{targetCpl ? formatRupees(targetCpl) : "—"}</span></div>
                        <div className="sp"><span className="k">Lead goal</span><span className="v">{leadGoal || "—"}</span></div>
                        <div className="sp"><span className="k">AI calling</span><span className="v"><span className={`badge ${aiCalling ? "b-green" : "b-gray"}`}>{aiCalling ? "On" : "Off"}</span></span></div>
                        <div className="sp"><span className="k">WhatsApp welcome</span><span className="v"><span className={`badge ${whatsappAuto ? "b-green" : "b-gray"}`}>{whatsappAuto ? "On" : "Off"}</span></span></div>
                        <div className="sp"><span className="k">Round-robin</span><span className="v"><span className={`badge ${roundRobin ? "b-green" : "b-gray"}`}>{roundRobin ? "On" : "Off"}</span></span></div>
                      </div>
                      <div className="q-sec"><div className="lbl">🌐 Project Template &amp; Website</div>
                        <div className="sp"><span className="k">Template</span><span className="v">{selectedTemplate?.name || "Standard Template"}</span></div>
                        <div className="sp">
                          <span className="k">Customization</span>
                          <span className="v">
                            {customLandingPageId ? (
                              <span className="badge b-green">✨ Visually Customized in Builder</span>
                            ) : (
                              <span className="badge b-gray">Default Presets</span>
                            )}
                          </span>
                        </div>
                        <div className="sp"><span className="k">Live landing page</span><span className="v"><span className={`badge ${publishLandingPageNow ? "b-green" : "b-gray"}`}>{publishLandingPageNow ? "Yes — Auto Publish" : "Disabled"}</span></span></div>
                        {publishLandingPageNow && (
                          <div className="sp"><span className="k">Target URL</span><span className="v mono">/p/{name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "project-slug"}</span></div>
                        )}
                        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => openTemplateInVisualBuilder()}
                            disabled={customizingInBuilder}
                          >
                            ✏️ {customLandingPageId ? "Re-open in Visual Builder" : "Customize Template in Visual Builder"}
                          </button>
                          {customLandingPageId && (
                            <a
                              href={`/preview/${customLandingPageId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-ghost btn-sm"
                              style={{ textDecoration: "none" }}
                            >
                              👁️ Preview
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="q-sec"><div className="lbl">👤 Team &amp; access</div>
                        <div className="sp"><span className="k">Manager</span><span className="v">{selectedManager ? userLabel(selectedManager) : "Unassigned"}</span></div>
                        <div className="sp"><span className="k">Agents</span><span className="v">{agentAssign.length} assigned</span></div>
                        <div className="sp"><span className="k">Booking approval</span><span className="v">{requireApproval ? "Required" : "Not required"}</span></div>
                        <div className="sp"><span className="k">Visible to telecallers</span><span className="v"><span className={`badge ${visibleTele ? "b-green" : "b-gray"}`}>{visibleTele ? "On" : "Off"}</span></span></div>
                        <div className="sp"><span className="k">Publish to website</span><span className="v"><span className={`badge ${publishWeb ? "b-green" : "b-gray"}`}>{publishWeb ? "On" : "Off"}</span></span></div>
                      </div>
                      <div className="q-sec"><div className="lbl">📄 Media</div>
                        <div className="sp"><span className="k">Cover image</span><span className="v">{coverImageUrl ? "✓ Uploaded" : "—"}</span></div>
                        <div className="sp"><span className="k">Gallery</span><span className="v">{galleryUrls.length ? `${galleryUrls.length} photo${galleryUrls.length > 1 ? "s" : ""}` : "—"}</span></div>
                        <div className="sp"><span className="k">Brochure</span><span className="v">{brochureUrl ? "✓ Uploaded" : "—"}</span></div>
                        <div className="sp"><span className="k">RERA certificate</span><span className="v">{reraCertificateUrl ? "✓ Uploaded" : "—"}</span></div>
                        <div className="sp"><span className="k">Project floor / site plan</span><span className="v">{floorPlanUrls.length ? `${floorPlanUrls.length} plan${floorPlanUrls.length > 1 ? "s" : ""}` : "—"}</span></div>
                        <div className="sp"><span className="k">AI knowledge</span><span className="v"><span className={`badge ${aiKnowledgeBase ? "b-green" : "b-gray"}`}>{aiKnowledgeBase ? "On" : "Off"}</span></span></div>
                      </div>
                    </div>
                  </div>
                   {error && (
                    <div className="help err mt-16">
                      ⚠️ {error}
                      {publishedProjectId ? (
                        <>
                          {" "}
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ marginLeft: 8 }}
                            onClick={() => router.push(`/org/projects/${publishedProjectId}`)}
                          >
                            Go to project →
                          </button>
                        </>
                      ) : null}
                    </div>
                  )}
                  {allMissingFields.length > 0 ? (
                    <div className="help err mt-20">
                      <b>⚠️ {allMissingFields.length} required field{allMissingFields.length > 1 ? "s" : ""} still empty.</b>
                      <ul>
                        {allMissingFields.map((f) => (
                          <li key={f.id}>
                            {f.label}{" "}
                            <button className="brand-link" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }} onClick={() => { setJumpWarning(null); setStep(f.step); }}>
                              — go to {STEPS[f.step].label} →
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="help mt-20">🚀 <b>Ready to go live.</b> Publishing creates the project, wires up the connected ad sources and starts routing new leads immediately.</div>
                  )}
                </div>
              </div>
            )}

            {/* Blocked-Continue summary — sits directly above the footer so the
                reason is next to the button that refused. */}
            {showErrors && currentMissing.length > 0 && step < STEPS.length - 1 ? (
              <div className="help err mt-16">
                <b>⚠️ Fill in {currentMissing.length === 1 ? "this field" : "these fields"} to continue:</b>
                <ul>
                  {currentMissing.map((f) => <li key={f.id}>{f.label}</li>)}
                </ul>
              </div>
            ) : null}

            {/* FOOTER NAV — no Skip: every step's required fields are checked
                on Continue, so there's no way past them. */}
            <div className="wz-foot">
              <button className="btn btn-ghost" disabled={step === 0} onClick={goBack}>← Back</button>
              <span className="save">{savedAt ? `Draft saved · ${formatRelative(savedAt)}` : "Not saved yet"}</span>
              <div className="row gap-10">
                {step < STEPS.length - 1 ? (
                  <button className="btn btn-primary" onClick={goNext}>Continue →</button>
                ) : publishedProjectId && !createdLandingPage ? (
                  <button className="btn btn-primary" onClick={() => router.push(`/org/projects/${publishedProjectId}`)}>Go to project →</button>
                ) : (
                  <button className="btn btn-primary" disabled={submitting} onClick={() => void submit()}>{submitting ? "Publishing…" : "🚀 Publish project"}</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* TEMPLATE PICKER MODAL */}
      {showTemplateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setShowTemplateModal(false)}
        >
          <div
            className="card pad-26 reveal in"
            style={{
              maxWidth: 960,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--brand, #4f46e5)" }}>
                  Super Admin Templates
                </div>
                <h2 style={{ margin: "4px 0 6px", fontSize: 22 }}>Select a Project Template</h2>
                <p className="muted fs-13" style={{ margin: 0 }}>
                  These are the templates Super Admin assigned to your organisation. The selected design is copied onto this project&apos;s landing page.
                </p>
              </div>
              <button className="btn btn-ghost" onClick={() => setShowTemplateModal(false)} style={{ fontSize: 18, padding: "4px 10px" }}>
                ✕
              </button>
            </div>

            <div className="grid g2" style={{ gap: 20 }}>
              {orgDbTemplates.length === 0 ? (
                <div className="muted" style={{ gridColumn: "1 / -1", padding: 24, textAlign: "center" }}>
                  No templates are assigned to this organisation yet. Ask Super Admin to assign templates, or open{" "}
                  <a href="/org/templates" style={{ color: "var(--brand)", fontWeight: 600 }}>Templates</a>.
                </div>
              ) : orgDbTemplates.map((tpl) => {
                const isSelected = selectedTemplate?.id === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    style={{
                      border: isSelected ? "2px solid var(--brand, #4f46e5)" : "1px solid var(--line, #e2e8f0)",
                      borderRadius: 14,
                      overflow: "hidden",
                      background: isSelected ? "rgba(79, 70, 229, 0.02)" : "#fff",
                      display: "flex",
                      flexDirection: "column",
                      transition: "all 0.2s ease",
                      boxShadow: isSelected ? "0 4px 20px rgba(79, 70, 229, 0.15)" : "none",
                    }}
                  >
                    <div style={{ height: 160, position: "relative", overflow: "hidden", background: "#1e293b" }}>
                      {tpl.thumbnail ? (
                        <img
                          src={tpl.thumbnail}
                          alt={tpl.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 28 }}>
                          🏛️
                        </div>
                      )}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%)",
                        }}
                      />
                      <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6 }}>
                        {tpl.category ? (
                          <span className="badge b-teal" style={{ background: "rgba(0,0,0,0.6)", color: "#fff", backdropFilter: "blur(4px)" }}>
                            {tpl.category}
                          </span>
                        ) : null}
                      </div>
                      <div style={{ position: "absolute", bottom: 12, left: 12, right: 12 }}>
                        <b style={{ color: "#fff", fontSize: 16, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>{tpl.name}</b>
                      </div>
                    </div>

                    <div style={{ padding: 16, display: "flex", flexDirection: "column", flex: 1 }}>
                      <p className="muted fs-12-5" style={{ margin: "0 0 12px", lineHeight: 1.5, flex: 1 }}>
                        Super Admin template · {tpl.template || "landing"}
                      </p>

                      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <div className="row gap-8">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              applyTemplate(tpl);
                              void openTemplateInVisualBuilder(tpl);
                            }}
                            disabled={customizingInBuilder}
                            style={{ display: "flex", alignItems: "center", gap: 4 }}
                          >
                            <span>✏️</span> Customize in Builder
                          </button>
                          <button
                            type="button"
                            className={`btn ${isSelected ? "btn-secondary" : "btn-primary"} btn-sm`}
                            onClick={() => applyTemplate(tpl)}
                          >
                            {isSelected ? "✓ Active Template" : "Use this template →"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* LAUNCH CELEBRATION MODAL */}
      {createdLandingPage && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(6px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            className="card pad-26 reveal in"
            style={{
              maxWidth: 520,
              width: "100%",
              background: "#fff",
              borderRadius: 16,
              textAlign: "center",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div style={{ fontSize: 52, marginBottom: 12, lineHeight: 1 }}>🚀</div>
            <h2 style={{ fontSize: 24, margin: "0 0 8px" }}>Project Published Successfully!</h2>
            <p className="muted fs-13" style={{ margin: "0 0 20px", lineHeight: 1.6 }}>
              <b>{name}</b> is now live. Its dedicated landing page has been generated using <b>{selectedTemplate?.name || "the selected template"}</b> and is immediately accessible.
            </p>

            <div
              className="card pad-16"
              style={{
                background: "var(--surface-2, #f8fafc)",
                border: "1px solid var(--line, #e2e8f0)",
                borderRadius: 12,
                textAlign: "left",
                marginBottom: 24,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", letterSpacing: ".05em" }}>
                  Public Landing Page
                </span>
                <span className="badge b-green">● Published</span>
              </div>
              <a
                href={`/p/${createdLandingPage.slug}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "var(--brand, #4f46e5)",
                  fontWeight: 600,
                  fontSize: 14,
                  wordBreak: "break-all",
                  display: "inline-block",
                }}
              >
                {typeof window !== "undefined" ? window.location.origin : ""}/p/{createdLandingPage.slug} ↗
              </a>
              <div className="muted fs-11" style={{ marginTop: 6 }}>
                💡 You can edit, add, or remove any sections anytime without affecting the original master template.
              </div>
            </div>

            <div className="col gap-10">
              <a
                href={`/p/${createdLandingPage.slug}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary btn-block"
                style={{ textDecoration: "none" }}
              >
                🌐 View Live Landing Page
              </a>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={() => router.push(`/org-builder?id=${createdLandingPage.id}`)}
              >
                ✏️ Customize in Visual Builder
              </button>
              {publishedProjectId && (
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  onClick={() => router.push(`/org/projects/${publishedProjectId}`)}
                >
                  🏗️ Go to Project Dashboard →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
