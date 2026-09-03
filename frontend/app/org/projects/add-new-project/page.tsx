"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, getOrgCatalogOptions, getOrgLandingPages, setProjectSalesAgents } from "@/lib/api";
import { parseAmount, parseCoord, parseCount, parseDecimal } from "@/lib/parse";
import { CURRENCY_LABELS, formatMoneyRange, PROJECT_CURRENCIES } from "@/lib/money";
import { GalleryUpload, MediaUpload } from "@/components/org/media-upload";
import { CatalogOptions, MoneyInput } from "@/components/org/project-form-fields";
import { Reveal } from "@/components/superadmin/reveal";
import "@/app/org/org.css";
import type {
  CreateProjectInput,
  CreateUnitTypeInput,
  OrgCatalogCategory,
  OrgCatalogOption,
  LandingPageRow,
  OrgUser,
  OrgUsersListResponse,
  Project,
  ProjectStatus,
  SafeOrganisation,
} from "@/lib/types";

function userLabel(u: OrgUser): string {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
}

interface UnitTypeDraft {
  key: number;
  name: string;
  carpetSqft: string;
  builtupSqft: string;
  price: string;
  totalUnits: string;
}

const makeUnitType = (): UnitTypeDraft => ({
  key: Date.now() + Math.random(),
  name: "",
  carpetSqft: "",
  builtupSqft: "",
  price: "",
  totalUnits: "",
});

// The four wizard option lists are org-managed catalogs now (Settings →
// Project Catalogs), fetched per step (see CatalogOptions in
// components/org/project-form-fields).
//
// Wizard steps (0-indexed) that read a catalog — used to refetch on entry so
// options just added in Settings appear without a full page reload.
const CATALOG_STEPS = new Set([0, 1, 3, 4]);

const STEPS = [
  { label: "Project basics", sub: "Name, type, RERA" },
  { label: "Inventory & config", sub: "Unit types & sizes" },
  { label: "Pricing & payment", sub: "Price, plans, offers" },
  { label: "Location", sub: "Address & connectivity" },
  { label: "Amenities & specs", sub: "Features & finishes" },
  { label: "Marketing & leads", sub: "Sources, budget, AI" },
  { label: "Team & access", sub: "Manager, agents" },
  { label: "Documents & media", sub: "Brochure, photos" },
  { label: "Review & launch", sub: "Confirm & publish" },
];

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
const DRAFT_KEY_PREFIX = "be.project-draft.v1.";
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
  latitude: string; longitude: string; nearby: string[]; landmarks: string;
  amenities: string[]; flooring: string; kitchen: string; doorsWindows: string;
  fittings: string; specNotes: string;
  metaAds: boolean; googleAds: boolean; linkedinAds: boolean; portalAds: boolean;
  monthlyBudget: string; targetCpl: string; leadGoal: string; landingPage: string;
  aiCalling: boolean; whatsappAuto: boolean; roundRobin: boolean; aiKnowledgeBase: boolean;
  managerId: string; salesTeam: string; agentAssign: string[];
  requireApproval: boolean; visibleTele: boolean; publishWeb: boolean;
  coverImageUrl: string | null; galleryUrls: string[]; brochureUrl: string | null; reraCertificateUrl: string | null;
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
  const [priceIncludes, setPriceIncludes] = useState<string[]>(["Floor rise", "1 covered parking"]);
  const [paymentPlan, setPaymentPlan] = useState("Construction-linked");
  const [offers, setOffers] = useState("");

  // Step 4 — location
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [locality, setLocality] = useState("");
  const [pincode, setPincode] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [nearby, setNearby] = useState<string[]>([]);
  const [landmarks, setLandmarks] = useState("");

  // Step 5 — amenities
  const [amenities, setAmenities] = useState<string[]>([]);
  const [flooring, setFlooring] = useState("");
  const [kitchen, setKitchen] = useState("");
  const [doorsWindows, setDoorsWindows] = useState("");
  const [fittings, setFittings] = useState("");
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
  const [salesAgents, setSalesAgents] = useState<OrgUser[]>([]);
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

  // Wizard state
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Set once the project is created. If a follow-up call (e.g. sales-agent
  // assignment) then fails, we stop auto-redirecting and offer a manual link
  // so a partial failure never strands the user on the wizard.
  const [publishedProjectId, setPublishedProjectId] = useState<string | null>(null);

  // Draft persistence (localStorage stopgap — see notes above the component).
  // `hydrated` gates auto-save so we never write over a stored draft before
  // the user has chosen to resume or discard it.
  const [hydrated, setHydrated] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<WizardDraft | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

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
    apiFetch<OrgUsersListResponse>("/org/users?role=sales&limit=100&status=active", auth)
      .then((res) => setSalesAgents(res.data))
      .catch(() => setSalesAgents([]));
    apiFetch<SafeOrganisation>("/org/settings", auth)
      .then((o) => setOrgName(o.name))
      .catch(() => setOrgName(""));
    getOrgLandingPages()
      .then((rows) => setOrgLandingPages(rows.filter((lp) => lp.pageType === "landing")))
      .catch(() => setOrgLandingPages([]));
  }, [accessToken]);

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
    };
    for (const opt of catalog ?? []) grouped[opt.category]?.push(opt);
    for (const key of Object.keys(grouped) as OrgCatalogCategory[]) {
      grouped[key].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
    }
    return grouped;
  }, [catalog]);

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
      address, city, locality, pincode, latitude, longitude, nearby, landmarks,
      amenities, flooring, kitchen, doorsWindows, fittings, specNotes,
      metaAds, googleAds, linkedinAds, portalAds, monthlyBudget, targetCpl, leadGoal, landingPage, aiCalling, whatsappAuto, roundRobin, aiKnowledgeBase,
      managerId, salesTeam, agentAssign, requireApproval, visibleTele, publishWeb,
      coverImageUrl, galleryUrls, brochureUrl, reraCertificateUrl,
    }),
    [
      step, name, projectType, tagline, reraId, status, launchDate, possession, constructionStage,
      selectedConfigs, towerCount, floorsDescription, landArea, carpetRange, highlights, unitTypes,
      priceMin, priceMax, baseRate, bookingAmount, currency, priceIncludes, paymentPlan, offers,
      address, city, locality, pincode, latitude, longitude, nearby, landmarks,
      amenities, flooring, kitchen, doorsWindows, fittings, specNotes,
      metaAds, googleAds, linkedinAds, portalAds, monthlyBudget, targetCpl, leadGoal, landingPage, aiCalling, whatsappAuto, roundRobin, aiKnowledgeBase,
      managerId, salesTeam, agentAssign, requireApproval, visibleTele, publishWeb,
      coverImageUrl, galleryUrls, brochureUrl, reraCertificateUrl,
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
    setSelectedConfigs((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
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

  function updateUnitType(key: number, patch: Partial<UnitTypeDraft>) {
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
    setPaymentPlan(d.paymentPlan ?? "Construction-linked"); setOffers(d.offers ?? "");
    setAddress(d.address ?? ""); setCity(d.city ?? ""); setLocality(d.locality ?? ""); setPincode(d.pincode ?? "");
    setLatitude(d.latitude ?? ""); setLongitude(d.longitude ?? ""); setNearby(d.nearby ?? []); setLandmarks(d.landmarks ?? "");
    setAmenities(d.amenities ?? []); setFlooring(d.flooring ?? ""); setKitchen(d.kitchen ?? "");
    setDoorsWindows(d.doorsWindows ?? ""); setFittings(d.fittings ?? ""); setSpecNotes(d.specNotes ?? "");
    setMetaAds(d.metaAds ?? true); setGoogleAds(d.googleAds ?? true); setLinkedinAds(d.linkedinAds ?? false);
    setPortalAds(d.portalAds ?? true); setMonthlyBudget(d.monthlyBudget ?? ""); setTargetCpl(d.targetCpl ?? "");
    setLeadGoal(d.leadGoal ?? ""); setLandingPage(d.landingPage ?? "Create new from template…");
    setAiCalling(d.aiCalling ?? true); setWhatsappAuto(d.whatsappAuto ?? true); setRoundRobin(d.roundRobin ?? true);
    setAiKnowledgeBase(d.aiKnowledgeBase ?? true);
    setManagerId(d.managerId ?? ""); setSalesTeam(d.salesTeam ?? "Ahmedabad — West"); setAgentAssign(d.agentAssign ?? []);
    setRequireApproval(d.requireApproval ?? true); setVisibleTele(d.visibleTele ?? true); setPublishWeb(d.publishWeb ?? false);
    setCoverImageUrl(d.coverImageUrl ?? null); setGalleryUrls(d.galleryUrls ?? []);
    setBrochureUrl(d.brochureUrl ?? null); setReraCertificateUrl(d.reraCertificateUrl ?? null);
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

  async function submit() {
    if (!accessToken) return;
    if (!name.trim()) { setError("Give the project a name."); setStep(0); return; }

    setSubmitting(true);
    setError(null);
    try {
      // Step 5 — specifications blob. Omitted entirely when nothing was typed.
      const specEntries: Record<string, string> = {
        flooring: flooring.trim(),
        kitchen: kitchen.trim(),
        doorsWindows: doorsWindows.trim(),
        fittings: fittings.trim(),
        notes: specNotes.trim(),
      };
      const specifications = Object.values(specEntries).some(Boolean)
        ? Object.fromEntries(Object.entries(specEntries).filter(([, v]) => v))
        : undefined;

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
        latitude: parseCoord(latitude),
        longitude: parseCoord(longitude),
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
      };

      const project = await apiFetch<Project>("/org/projects", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });

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

      if (orgId) {
        try { window.localStorage.removeItem(draftKey(orgId)); } catch { /* ignore */ }
      }

      if (agentsFailed) {
        setPublishedProjectId(project.id);
        setError(
          "Project published, but assigning sales agents failed. You can add them from the project's Team section.",
        );
        setSubmitting(false);
        return;
      }

      router.push(`/org/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create the project.");
      setSubmitting(false);
    }
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
                {STEPS.map((s, i) => (
                  <button key={i} className={i === step ? "on" : i < step ? "done" : ""} onClick={() => setStep(i)}>
                    <span className="num">{i < step ? "✓" : i + 1}</span>
                    <span className="tx"><b>{s.label}</b><small>{s.sub}</small></span>
                  </button>
                ))}
              </div>
            </div>
            <div className="help mt-14">
              💡 <b>Tip:</b> Fields marked <span className="req">*</span> are required to publish. You can save a draft anytime and finish later.
            </div>
          </div>

          {/* PANES */}
          <div className="card pad-26">

            {/* STEP 1 — Basics */}
            {step === 0 && (
              <div className="wz-pane on">
                <div className="q-h"><div className="st">Step 1 of 9</div><h2>Project basics</h2><div className="sub">The essentials that identify this development across the CRM, website and ads.</div></div>
                <div className="q-sec">
                  <div className="lbl">📋 Identity</div>
                  <div className="grid g2">
                    <div className="field"><label>Project name <span className="req">*</span></label><input className="inp" placeholder="e.g. Palm Residency" value={name} onChange={(e) => setName(e.target.value)} /></div>
                    <div className="field"><label>Developer / channel partner <span className="req">*</span></label><input className="inp" value={orgName} placeholder="Loading…" readOnly /><div className="hint">Your organisation, set during onboarding. Change it in Settings → General.</div></div>
                  </div>
                  <div className="field"><label>Project type <span className="req">*</span></label>
                    <CatalogOptions
                      category="project_type"
                      options={catalogByCategory.project_type}
                      loaded={catalog !== null}
                      error={catalogError}
                      single
                      isSelected={(label) => projectType === label}
                      onToggle={(label) => setProjectType((cur) => (cur === label ? "" : label))}
                    />
                  </div>
                  <div className="field"><label>Short tagline</label><input className="inp" placeholder="e.g. 2 &amp; 3 BHK homes on SG Highway" value={tagline} onChange={(e) => setTagline(e.target.value)} /><div className="hint">Shown on the public page and ad landing pages.</div></div>
                </div>
                <div className="q-sec">
                  <div className="lbl">🏛️ Approvals &amp; timeline</div>
                  <div className="grid g2">
                    <div className="field"><label>RERA registration no. <span className="req">*</span></label><input className="inp mono" placeholder="PR/GJ/AHM/2026/00842" value={reraId} onChange={(e) => setReraId(e.target.value)} /></div>
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
                    <div className="field"><label>Price range — from <span className="req">*</span></label><MoneyInput placeholder="62,00,000" value={priceMin} onChange={setPriceMin} /></div>
                    <div className="field"><label>Price range — to</label><MoneyInput placeholder="1,20,00,000" value={priceMax} onChange={setPriceMax} /></div>
                  </div>
                  <div className="grid g3">
                    <div className="field"><label>Price per sqft</label><MoneyInput placeholder="6,400" value={baseRate} onChange={setBaseRate} /></div>
                    <div className="field"><label>Booking amount</label><MoneyInput placeholder="1,00,000" value={bookingAmount} onChange={setBookingAmount} /></div>
                    <div className="field"><label>Currency</label><select className="inp" value={currency} onChange={(e) => setCurrency(e.target.value)}>{PROJECT_CURRENCIES.map((c) => <option key={c} value={c}>{CURRENCY_LABELS[c]}</option>)}</select></div>
                  </div>
                  <div className="field"><label>What&apos;s included in the price?</label>
                    <div className="opts">
                      {["Floor rise", "1 covered parking", "Club membership", "GST", "Registration & stamp duty"].map((v) => (
                        <span key={v} className={`opt ${priceIncludes.includes(v) ? "on" : ""}`} onClick={() => toggleIncludes(v)}><span className="b">{priceIncludes.includes(v) ? "✓" : ""}</span>{v}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="q-sec">
                  <div className="lbl">📄 Payment plan</div>
                  <div className="field"><label>Plan type</label>
                    <div className="opts" data-single>
                      {["Construction-linked", "Down payment", "Flexi (20:80)", "Subvention"].map((p) => (
                        <span key={p} className={`opt rad ${paymentPlan === p ? "on" : ""}`} onClick={() => setPaymentPlan(p)}><span className="b">{paymentPlan === p ? "●" : ""}</span>{p}</span>
                      ))}
                    </div>
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
                  <div className="field"><label>Full address <span className="req">*</span></label><textarea className="inp" rows={2} placeholder="Survey No. 214, SG Highway, Bopal, Ahmedabad, Gujarat 380058" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
                  <div className="grid g3">
                    <div className="field"><label>City <span className="req">*</span></label><input className="inp" placeholder="Ahmedabad" value={city} onChange={(e) => setCity(e.target.value)} /></div>
                    <div className="field"><label>Locality</label><input className="inp" placeholder="SG Highway" value={locality} onChange={(e) => setLocality(e.target.value)} /></div>
                    <div className="field"><label>Pincode</label><input className="inp" placeholder="380058" value={pincode} onChange={(e) => setPincode(e.target.value)} /></div>
                  </div>
                  <div className="grid g2">
                    <div className="field"><label>Map latitude</label><input className="inp mono" type="number" step="any" placeholder="23.0301" value={latitude} onChange={(e) => setLatitude(e.target.value)} /></div>
                    <div className="field"><label>Map longitude</label><input className="inp mono" type="number" step="any" placeholder="72.5100" value={longitude} onChange={(e) => setLongitude(e.target.value)} /></div>
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
                  <div className="grid g2">
                    <div className="field"><label>Flooring</label><input className="inp" placeholder="Vitrified tiles / marble in living" value={flooring} onChange={(e) => setFlooring(e.target.value)} /></div>
                    <div className="field"><label>Kitchen</label><input className="inp" placeholder="Granite platform, SS sink" value={kitchen} onChange={(e) => setKitchen(e.target.value)} /></div>
                    <div className="field"><label>Doors &amp; windows</label><input className="inp" placeholder="UPVC windows, teak main door" value={doorsWindows} onChange={(e) => setDoorsWindows(e.target.value)} /></div>
                    <div className="field"><label>Fittings</label><input className="inp" placeholder="Branded CP &amp; sanitaryware" value={fittings} onChange={(e) => setFittings(e.target.value)} /></div>
                  </div>
                  <div className="field mb-0"><label>Additional notes</label><textarea className="inp" rows={2} placeholder="Green-building certified, seismic zone-III compliant structure…" value={specNotes} onChange={(e) => setSpecNotes(e.target.value)} /></div>
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
                    <div className="field"><label>Project manager <span className="req">*</span></label><select className="inp" value={managerId} onChange={(e) => setManagerId(e.target.value)}><option value="">Unassigned</option>{managers.map((u) => <option key={u.id} value={u.id}>{userLabel(u)}</option>)}</select></div>
                    <div className="field"><label>Sales team</label><select className="inp" value={salesTeam} onChange={(e) => setSalesTeam(e.target.value)}><option>Ahmedabad — West</option><option>Ahmedabad — Core</option><option>NRI Desk</option></select></div>
                  </div>
                  <div className="field"><label>Assign sales agents</label>
                    {salesAgents.length === 0 ? (
                      <div className="hint">No sales agents in your organisation yet — add them under Users.</div>
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
                              <span className="b">{on ? "✓" : ""}</span>{userLabel(u)}
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
                  <div className="field mb-0"><label>Floor plans</label><div className="drop"><div className="ic">📐</div><div>Added per unit type from the Units section after publishing</div><div className="hint">Not collected in the wizard</div></div></div>
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
                        <div className="sp"><span className="k">Land area</span><span className="v">{landArea ? `${landArea} acres` : "—"}</span></div>
                        <div className="sp"><span className="k">Price range</span><span className="v">{priceRangeLabel(priceMin, priceMax, currency)}</span></div>
                      </div>
                      <div className="q-sec"><div className="lbl">📍 Location</div>
                        <div className="sp"><span className="k">City</span><span className="v">{city || "—"}</span></div>
                        <div className="sp"><span className="k">Locality</span><span className="v">{locality || "—"}</span></div>
                      </div>
                      <div className="q-sec"><div className="lbl">🧱 Specifications</div>
                        <div className="sp"><span className="k">Flooring</span><span className="v">{flooring || "—"}</span></div>
                        <div className="sp"><span className="k">Kitchen</span><span className="v">{kitchen || "—"}</span></div>
                        <div className="sp"><span className="k">Doors &amp; windows</span><span className="v">{doorsWindows || "—"}</span></div>
                        <div className="sp"><span className="k">Fittings</span><span className="v">{fittings || "—"}</span></div>
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
                  <div className="help mt-20">🚀 <b>Ready to go live.</b> Publishing creates the project, wires up the connected ad sources and starts routing new leads immediately.</div>
                </div>
              </div>
            )}

            {/* FOOTER NAV */}
            <div className="wz-foot">
              <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>← Back</button>
              <span className="save">{savedAt ? `Draft saved · ${formatRelative(savedAt)}` : "Not saved yet"}</span>
              <div className="row gap-10">
                {step < STEPS.length - 1 && <button className="btn btn-ghost" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Skip</button>}
                {step < STEPS.length - 1 ? (
                  <button className="btn btn-primary" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Continue →</button>
                ) : publishedProjectId ? (
                  <button className="btn btn-primary" onClick={() => router.push(`/org/projects/${publishedProjectId}`)}>Go to project →</button>
                ) : (
                  <button className="btn btn-primary" disabled={submitting} onClick={() => void submit()}>{submitting ? "Publishing…" : "🚀 Publish project"}</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </>
  );
}
