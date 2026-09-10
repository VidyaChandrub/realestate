"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, getOrgCatalogOptions, getOrgLandingPages, setProjectSalesAgents } from "@/lib/api";
import { parseAmount, parseCount, parseDecimal } from "@/lib/parse";
import { CURRENCY_LABELS, PROJECT_CURRENCIES } from "@/lib/money";
import {
  CatalogOptions,
  ConfigSizePriceTable,
  MoneyInput,
  SpecificationRows,
  type ConfigSizePriceRow,
} from "@/components/org/project-form-fields";
import {
  findDuplicateConfigurations,
  isEmptyRow,
  pickUnitTypeForConfiguration,
  plannedMixRemoval,
} from "@/lib/unit-types";
import { allMissing, projectRequirements } from "@/lib/project-validation";
import {
  normalizeSpecifications,
  serializeSpecifications,
  type SpecRow,
} from "@/lib/specifications";
import { GalleryUpload, MediaUpload } from "@/components/org/media-upload";
import "@/app/org/org.css";
import type {
  Amenity,
  LandingPageRow,
  OrgCatalogOption,
  OrgUser,
  OrgUsersListResponse,
  ProjectDetail,
  ProjectStatus,
  SafeOrganisation,
  UnitType,
  UpdateProjectInput,
} from "@/lib/types";

function userLabel(u: OrgUser): string {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
}

function toField(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

/**
 * One size/price table row for a configuration, filled from whichever
 * `UnitType` row represents it (see `pickUnitTypeForConfiguration` — a project
 * can hold more than one row per label). Keyed by that row's id so the save
 * knows to PATCH it; keyed by the label when the configuration was ticked in
 * this session and has no row yet.
 */
function toConfigRow(label: string, unitTypes: UnitType[]): ConfigSizePriceRow {
  const row = pickUnitTypeForConfiguration(label, unitTypes);
  return {
    key: row?.id ?? label,
    name: label,
    carpetSqft: toField(row?.carpetSqft),
    builtupSqft: toField(row?.builtupSqft),
    price: toField(row?.price),
    totalUnits: row ? String(row.totalUnits) : "",
  };
}

const AD_SOURCES = ["Meta", "Google", "LinkedIn", "Portals"] as const;
// Same fixed lists the create wizard offers, so both forms agree. A stored
// value that isn't in the list stays selectable (see `withCurrent`) so editing
// an older project can't silently rewrite it.
const CONSTRUCTION_STAGES = [
  "Planning",
  "Excavation",
  "Under construction",
  "Finishing",
  "Ready to move",
];
const SALES_TEAMS = ["Ahmedabad — West", "Ahmedabad — Core", "NRI Desk"];

/** The option list plus the current value, when that value has fallen off it. */
function withCurrent(options: string[], value: string): string[] {
  return value && !options.includes(value) ? [...options, value] : options;
}

/**
 * Which section of this page owns each wizard step's required fields.
 *
 * The rules themselves come from lib/project-validation — the same module the
 * create wizard uses — so the two can't drift. Only the *placement* differs:
 * this page is one scrolling form. The project-manager field (step 6) lives in
 * the Team & access section, alongside the other access controls.
 */
const STEP_SECTION: Record<number, string> = {
  0: "sec-basics",
  2: "sec-pricing",
  3: "sec-location",
  6: "sec-team",
};

const NAV = [
  ["sec-basics", "Basics"],
  ["sec-pricing", "Pricing"],
  ["sec-location", "Location"],
  ["sec-inventory", "Inventory & specs"],
  ["sec-marketing", "Marketing"],
  ["sec-team", "Team & access"],
  ["sec-media", "Documents & media"],
] as const;

export default function OrgProjectEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const { accessToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [orgName, setOrgName] = useState("");

  // --- Basics ---
  const [name, setName] = useState("");
  const [projectType, setProjectType] = useState("");
  const [tagline, setTagline] = useState("");
  const [launchDate, setLaunchDate] = useState("");
  const [constructionStage, setConstructionStage] = useState("");
  const [reraId, setReraId] = useState("");
  const [possession, setPossession] = useState("");
  const [managerId, setManagerId] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [managers, setManagers] = useState<OrgUser[]>([]);
  const [currentManager, setCurrentManager] = useState<{ id: string; name: string } | null>(null);

  // --- Pricing & payment ---
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [baseRate, setBaseRate] = useState("");
  const [bookingAmount, setBookingAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [priceIncludes, setPriceIncludes] = useState<string[]>([]);
  const [paymentPlan, setPaymentPlan] = useState("");
  const [offers, setOffers] = useState("");

  // --- Location & connectivity ---
  const [location, setLocation] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [locality, setLocality] = useState("");
  const [pincode, setPincode] = useState("");
  const [connectivity, setConnectivity] = useState<string[]>([]);
  const [landmarks, setLandmarks] = useState("");

  // --- Inventory & specs ---
  // Unit configurations are catalog labels (same `unit_type` list the create
  // wizard uses), stored as one UnitType row each. `unitTypeRows` is the
  // loaded server state, kept so the save can tell an untouched placeholder
  // row from one that has real inventory behind it.
  const [selectedConfigs, setSelectedConfigs] = useState<string[]>([]);
  const [highlights, setHighlights] = useState("");
  const [unitTypeRows, setUnitTypeRows] = useState<UnitType[]>([]);
  // Editable carpet / built-up / price / planned per configuration — the same
  // table the create wizard shows, so this information is editable where it is
  // created rather than only on the Units page. Keyed by UnitType id for saved
  // rows, and by label for configurations ticked in this session.
  const [configRows, setConfigRows] = useState<ConfigSizePriceRow[]>([]);
  /** Label whose duplicate cleanup is in flight, so its link can show progress. */
  const [dedupeBusy, setDedupeBusy] = useState<string | null>(null);
  /** Configuration awaiting confirmation before its planned mix is dropped. */
  const [pendingUntick, setPendingUntick] = useState<
    { label: string; message: string } | null
  >(null);
  const [towerCount, setTowerCount] = useState("");
  const [floorsDescription, setFloorsDescription] = useState("");
  const [carpetRange, setCarpetRange] = useState("");
  const [landArea, setLandArea] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  // Dynamic { label, value } rows. Projects saved before the rework hold the
  // old fixed-key blob; normalizeSpecifications reads both, so an old project
  // opens with its data intact as labelled rows.
  const [specRows, setSpecRows] = useState<SpecRow[]>([]);
  const [specNotes, setSpecNotes] = useState("");

  // --- Marketing ---
  const [adSources, setAdSources] = useState<string[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [targetCpl, setTargetCpl] = useState("");
  const [leadGoal, setLeadGoal] = useState("");
  const [landingPageChoice, setLandingPageChoice] = useState("");
  const [aiCalling, setAiCalling] = useState(false);
  const [whatsappWelcome, setWhatsappWelcome] = useState(false);
  const [roundRobin, setRoundRobin] = useState(false);
  const [aiKnowledgeBase, setAiKnowledgeBase] = useState(false);

  // --- Team & access ---
  const [salesUsers, setSalesUsers] = useState<OrgUser[]>([]);
  const [salesTeam, setSalesTeam] = useState("");
  const [agentAssign, setAgentAssign] = useState<string[]>([]);
  const [requireBookingApproval, setRequireBookingApproval] = useState(false);
  const [visibleToTelecallers, setVisibleToTelecallers] = useState(true);
  const [publishedToWebsite, setPublishedToWebsite] = useState(false);

  // --- Documents & media ---
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [brochureUrl, setBrochureUrl] = useState<string | null>(null);
  const [reraCertificateUrl, setReraCertificateUrl] = useState<string | null>(null);
  const [floorPlanUrls, setFloorPlanUrls] = useState<string[]>([]);

  // --- Catalogs (option pickers) ---
  const [catalog, setCatalog] = useState<OrgCatalogOption[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [orgLandingPages, setOrgLandingPages] = useState<LandingPageRow[]>([]);
  const [activeSection, setActiveSection] = useState<string>(NAV[0][0]);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Inline field errors appear only once Save has been attempted, so a project
  // that predates a required field isn't shouting red on first load. The
  // jump-nav markers are always live, though — those state a fact about the
  // project rather than complaining about the user.
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [jumpWarning, setJumpWarning] = useState<{ to: string; label: string; missing: string[] } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!accessToken || !id) return;
    apiFetch<ProjectDetail>(`/org/projects/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((p) => {
        setProjectName(p.name);
        setName(p.name);
        setProjectType(p.projectType ?? "");
        setTagline(p.tagline ?? "");
        setLaunchDate(p.launchDate ?? "");
        setConstructionStage(p.constructionStage ?? "");
        setReraId(p.reraId ?? "");
        setPossession(p.possession ?? "");
        setManagerId(p.managerId ?? "");
        setCurrentManager(p.manager ? { id: p.manager.id, name: p.manager.name } : null);
        setStatus(p.status);

        setPriceMin(toField(p.priceMin));
        setPriceMax(toField(p.priceMax));
        setBaseRate(toField(p.baseRate));
        setBookingAmount(toField(p.bookingAmount));
        setCurrency(p.currency || "INR");
        setPriceIncludes(p.priceIncludes ?? []);
        setPaymentPlan(p.paymentPlan ?? "");
        setOffers(p.offers ?? "");

        setLocation(p.location ?? "");
        setAddressLine(p.addressLine ?? "");
        setCity(p.city ?? "");
        setLocality(p.locality ?? "");
        setPincode(p.pincode ?? "");
        setConnectivity(p.connectivity ?? []);
        setLandmarks(p.landmarks ?? "");

        setTowerCount(toField(p.towerCount));
        setFloorsDescription(p.floorsDescription ?? "");
        setCarpetRange(p.carpetRange ?? "");
        setLandArea(toField(p.landArea));
        setAmenities(p.amenities.map((a) => a.name));
        const loadedTypes = p.unitTypes ?? [];
        setUnitTypeRows(loadedTypes);
        // One entry per distinct label — a project can hold several rows for
        // the same configuration (see lib/unit-types), and the chip list and
        // the table are both per-configuration, not per-row.
        const labels = [...new Set(loadedTypes.map((u) => u.name))];
        setSelectedConfigs(labels);
        setConfigRows(labels.map((label) => toConfigRow(label, loadedTypes)));
        setHighlights(p.highlights ?? "");
        setSalesTeam(p.salesTeam ?? "");

        const spec = normalizeSpecifications(p.specifications);
        setSpecRows(spec.rows);
        setSpecNotes(spec.notes);

        const mkt = (p.marketing ?? {}) as {
          adSources?: string[];
          monthlyBudget?: number | null;
          targetCpl?: number | null;
          leadGoal?: number | null;
          landingPageChoice?: string;
          aiCallingEnabled?: boolean;
          whatsappWelcomeEnabled?: boolean;
          roundRobinEnabled?: boolean;
          aiKnowledgeBaseEnabled?: boolean;
        };
        setAdSources(mkt.adSources ?? []);
        setMonthlyBudget(toField(mkt.monthlyBudget ?? null));
        setTargetCpl(toField(mkt.targetCpl ?? null));
        setLeadGoal(toField(mkt.leadGoal ?? null));
        setLandingPageChoice(mkt.landingPageChoice ?? "");
        setAiCalling(!!mkt.aiCallingEnabled);
        setWhatsappWelcome(!!mkt.whatsappWelcomeEnabled);
        setRoundRobin(!!mkt.roundRobinEnabled);
        setAiKnowledgeBase(!!mkt.aiKnowledgeBaseEnabled);

        setAgentAssign(p.salesAgentIds ?? []);
        setRequireBookingApproval(p.requireBookingApproval);
        setVisibleToTelecallers(p.visibleToTelecallers);
        setPublishedToWebsite(p.publishedToWebsite);

        setCoverImageUrl(p.coverImageUrl);
        setGalleryUrls(p.galleryUrls ?? []);
        setBrochureUrl(p.brochureUrl);
        setReraCertificateUrl(p.reraCertificateUrl);
        setFloorPlanUrls(p.floorPlanUrls ?? []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [accessToken, id]);

  useEffect(() => {
    if (!accessToken) return;
    const auth = { headers: { Authorization: `Bearer ${accessToken}` } };
    apiFetch<OrgUsersListResponse>("/org/users?role=manager&limit=100&status=active", auth)
      .then((res) => setManagers(res.data))
      .catch(() => setManagers([]));
    // Any active org member who isn't an admin or a manager can be assigned to
    // work a project's leads (sales, telecaller, custom roles, …). Filtered
    // client-side so a single call covers every eligible role.
    apiFetch<OrgUsersListResponse>("/org/users?limit=100&status=active", auth)
      .then((res) =>
        setSalesUsers(
          res.data.filter(
            (u) => u.role?.key !== "admin" && u.role?.key !== "manager",
          ),
        ),
      )
      .catch(() => setSalesUsers([]));
    apiFetch<SafeOrganisation>("/org/settings", auth)
      .then((o) => setOrgName(o.name))
      .catch(() => setOrgName(""));
    getOrgCatalogOptions()
      .then((rows) => { setCatalog(rows); setCatalogError(null); })
      .catch((e) => setCatalogError(e instanceof Error ? e.message : "Couldn't load catalog options."));
    getOrgLandingPages()
      .then((rows) => setOrgLandingPages(rows.filter((lp) => lp.pageType === "landing")))
      .catch(() => setOrgLandingPages([]));
  }, [accessToken]);

  // Scroll-spy: highlight the jump-nav item for whichever section is near the
  // top. Runs once the form (sections) is mounted.
  useEffect(() => {
    if (loading) return;
    const els = NAV.map(([anchor]) => document.getElementById(anchor)).filter(
      (el): el is HTMLElement => el != null,
    );
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const topMost = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (topMost) setActiveSection(topMost.target.id);
      },
      { rootMargin: "-80px 0px -65% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [loading]);

  const connectivityOptions = (catalog ?? []).filter((o) => o.category === "connectivity");
  const amenityOptions = (catalog ?? []).filter((o) => o.category === "amenity");
  // --- Required fields, from the shared rules (see STEP_SECTION) -----------
  const requirements = projectRequirements({
    name, projectType, reraId, priceMin, address: addressLine, city, managerId,
  });
  const missingFields = allMissing(requirements);
  /** The inline message for a field, once Save has been attempted. */
  const fieldError = (id: string) =>
    (attemptedSave && missingFields.find((f) => f.id === id)?.error) || "";
  const fieldClass = (id: string) =>
    `field${fieldError(id) ? " field-invalid" : ""}`;
  /** How many required fields are still empty in one section of this page. */
  const sectionMissingCount = (anchor: string) =>
    missingFields.filter((f) => STEP_SECTION[f.step] === anchor).length;

  function jumpToSection(anchor: string, label: string) {
    const currentIndex = NAV.findIndex(([current]) => current === activeSection);
    const targetIndex = NAV.findIndex(([target]) => target === anchor);
    const missing = missingFields
      .filter((f) => STEP_SECTION[f.step] === activeSection)
      .map((f) => f.label);

    if (targetIndex <= currentIndex || missing.length === 0) {
      setJumpWarning(null);
      setActiveSection(anchor);
      document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setJumpWarning({ to: anchor, label, missing });
  }

  function confirmSectionJump() {
    if (!jumpWarning) return;
    const { to } = jumpWarning;
    setJumpWarning(null);
    setActiveSection(to);
    document.getElementById(to)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const projectTypeOptions = (catalog ?? []).filter((o) => o.category === "project_type");
  const unitTypeOptions = (catalog ?? []).filter((o) => o.category === "unit_type");
  const duplicateConfigs = findDuplicateConfigurations(unitTypeRows);
  const priceIncludeOptions = (catalog ?? []).filter((o) => o.category === "price_includes");
  const paymentPlanOptions = (catalog ?? []).filter((o) => o.category === "payment_plan");

  function toggle(list: string[], v: string): string[] {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  // Values already on the project that no longer exist in the catalog — still
  // shown as removable chips so an edit never silently drops them.
  function offCatalog(selected: string[], options: OrgCatalogOption[]): string[] {
    return selected.filter((s) => !options.some((o) => o.label === s));
  }

  /** Units on this project carrying this configuration label. */
  function unitsUsing(label: string): number {
    // `unitCount` is derived server-side by matching Unit.configuration to
    // UnitType.name, so every duplicate row for a label reports the same
    // figure — take the max rather than summing, which would double-count.
    return unitTypeRows
      .filter((u) => u.name === label)
      .reduce((max, u) => Math.max(max, u.unitCount), 0);
  }

  /**
   * What unticking this configuration would do. Uses the shared rule so this
   * and the Units page's "Remove from planned mix" — the same row, reached two
   * ways — behave identically and say the same thing.
   */
  function untickOutcome(label: string) {
    const rows = unitTypeRows.filter((u) => u.name === label);
    // Ticked in this session and not saved yet: nothing to lose, nothing to ask.
    if (rows.length === 0) return { kind: "allowed" as const };
    return plannedMixRemoval(label, unitsUsing(label), rows);
  }

  /** Drop the configuration and its table row. */
  function detachConfig(label: string) {
    setError(null);
    setPendingUntick(null);
    setSelectedConfigs((prev) => prev.filter((x) => x !== label));
    setConfigRows((prev) => prev.filter((r) => r.name !== label));
  }

  function toggleConfig(label: string) {
    if (selectedConfigs.includes(label)) {
      const outcome = untickOutcome(label);
      if (outcome.kind === "blocked") {
        setNotice(null);
        setError(outcome.reason);
        return;
      }
      if (outcome.kind === "confirm") {
        // Values would be discarded — ask before dropping them, rather than
        // refusing and forcing the user to zero the row out by hand first.
        setNotice(null);
        setError(null);
        setPendingUntick({ label, message: outcome.message });
        return;
      }
      detachConfig(label);
      return;
    }
    setError(null);
    setSelectedConfigs((prev) => [...prev, label]);
    // The row appears immediately, in place — no navigating away to set sizes.
    setConfigRows((prev) =>
      prev.some((r) => r.name === label)
        ? prev
        : [...prev, toConfigRow(label, unitTypeRows)],
    );
  }

  function updateConfigRow(
    key: string | number,
    patch: Partial<ConfigSizePriceRow>,
  ) {
    setConfigRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  }

  /**
   * Drop the empty duplicate rows for a label, keeping the one in use. Only
   * ever called with ids that `isEmptyRow` cleared, so nothing with sizes,
   * pricing, a planned count or media can be removed this way — and units are
   * untouched regardless, since they don't reference UnitType.
   */
  async function removeEmptyDuplicates(label: string, ids: string[]) {
    if (!accessToken || ids.length === 0) return;
    setDedupeBusy(label);
    setError(null);
    try {
      for (const rowId of ids) {
        await apiFetch(`/org/projects/${id}/unit-types/${rowId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }
      const remaining = unitTypeRows.filter((r) => !ids.includes(r.id));
      setUnitTypeRows(remaining);
      // Re-key the table row onto the surviving UnitType so the save PATCHes
      // it; the values the user has already typed are left alone.
      const survivor = pickUnitTypeForConfiguration(label, remaining);
      setConfigRows((prev) =>
        prev.map((r) =>
          r.name === label ? { ...r, key: survivor?.id ?? label } : r,
        ),
      );
      setNotice(
        `Removed ${ids.length} empty duplicate of "${label}". The entry with your values is kept.`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't remove the duplicate entry.",
      );
    } finally {
      setDedupeBusy(null);
    }
  }

  async function save() {
    if (!accessToken) return;
    setAttemptedSave(true);
    // Same required set the create wizard enforces before publishing.
    if (missingFields.length > 0) {
      setNotice(null);
      setError(
        `Fill in the required field${missingFields.length > 1 ? "s" : ""} first: ${missingFields.map((f) => f.label).join(", ")}.`,
      );
      const firstSection = STEP_SECTION[missingFields[0].step];
      document.getElementById(firstSection)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const amenityPayload: Amenity[] = amenities.map((a) => ({ name: a, iconUrl: null }));

      // `{}` clears the blob when every row and the notes were emptied —
      // `serializeSpecifications` returns undefined in that case.
      const specifications = serializeSpecifications(specRows, specNotes) ?? {};

      const marketing = {
        adSources,
        monthlyBudget: parseAmount(monthlyBudget) ?? null,
        targetCpl: parseAmount(targetCpl) ?? null,
        leadGoal: parseCount(leadGoal) ?? null,
        landingPageChoice: landingPageChoice || null,
        aiCallingEnabled: aiCalling,
        whatsappWelcomeEnabled: whatsappWelcome,
        roundRobinEnabled: roundRobin,
        aiKnowledgeBaseEnabled: aiKnowledgeBase,
      };

      const body: UpdateProjectInput = {
        name: name.trim(),
        projectType: projectType || null,
        tagline: tagline.trim() || null,
        launchDate: launchDate || null,
        constructionStage: constructionStage || null,
        highlights: highlights.trim() || null,
        salesTeam: salesTeam || null,
        location: location.trim() || null,
        reraId: reraId.trim() || null,
        possession: possession.trim() || null,
        managerId: managerId || null,
        status,

        priceMin: parseAmount(priceMin) ?? null,
        priceMax: parseAmount(priceMax) ?? null,
        baseRate: parseAmount(baseRate) ?? null,
        bookingAmount: parseAmount(bookingAmount) ?? null,
        currency: currency as (typeof PROJECT_CURRENCIES)[number],
        priceIncludes,
        paymentPlan: paymentPlan || null,
        offers: offers.trim() || null,

        addressLine: addressLine.trim() || null,
        city: city.trim() || null,
        locality: locality.trim() || null,
        pincode: pincode.trim() || null,
        connectivity,
        landmarks: landmarks.trim() || null,

        towerCount: parseCount(towerCount) ?? null,
        floorsDescription: floorsDescription.trim() || null,
        carpetRange: carpetRange.trim() || null,
        landArea: parseDecimal(landArea) ?? null,
        amenities: amenityPayload,
        specifications,
        marketing,

        requireBookingApproval,
        visibleToTelecallers,
        publishedToWebsite,

        coverImageUrl: coverImageUrl ?? null,
        galleryUrls,
        brochureUrl: brochureUrl ?? null,
        reraCertificateUrl: reraCertificateUrl ?? null,
        floorPlanUrls,
      };

      await apiFetch(`/org/projects/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });

      // Unit configurations live as UnitType rows, reconciled through their own
      // endpoints after the project PATCH. Newly ticked labels are created with
      // whatever sizes/pricing were entered in the table; existing ones are
      // PATCHed when their values changed. Removals only reach rows that
      // `untickBlockedReason` cleared — nothing with units or recorded values
      // can be deleted from here.
      const auth = { headers: { Authorization: `Bearer ${accessToken}` } };
      const originalConfigs = unitTypeRows.map((u) => u.name);
      const rowFor = (label: string) => configRows.find((r) => r.name === label);
      const valuesOf = (r: ConfigSizePriceRow | undefined) => ({
        carpetSqft: parseCount(r?.carpetSqft ?? "") ?? null,
        builtupSqft: parseCount(r?.builtupSqft ?? "") ?? null,
        price: parseAmount(r?.price ?? "") ?? null,
        totalUnits: parseCount(r?.totalUnits ?? "") ?? 0,
      });
      try {
        for (const label of selectedConfigs) {
          const values = valuesOf(rowFor(label));
          if (!originalConfigs.includes(label)) {
            await apiFetch(`/org/projects/${id}/unit-types`, {
              method: "POST",
              ...auth,
              body: JSON.stringify({ name: label, ...values }),
            });
            continue;
          }
          // Existing configuration — update the row the table is bound to, and
          // only when something actually changed. Editing these values never
          // touches units that already exist: prefill is a snapshot taken at
          // unit-creation time, and no unit references a UnitType.
          const current = pickUnitTypeForConfiguration(label, unitTypeRows);
          if (!current) continue;
          const changed =
            current.carpetSqft !== values.carpetSqft ||
            current.builtupSqft !== values.builtupSqft ||
            current.price !== values.price ||
            current.totalUnits !== values.totalUnits;
          if (!changed) continue;
          await apiFetch(`/org/projects/${id}/unit-types/${current.id}`, {
            method: "PATCH",
            ...auth,
            body: JSON.stringify({ name: label, ...values }),
          });
        }
        for (const row of unitTypeRows) {
          if (selectedConfigs.includes(row.name)) continue;
          await apiFetch(`/org/projects/${id}/unit-types/${row.id}`, {
            method: "DELETE",
            ...auth,
          });
        }
      } catch {
        setSaving(false);
        setNotice(
          "Project saved, but updating the unit configurations failed — try that part again from here.",
        );
        return;
      }

      // Sales-agent set is a separate endpoint. A failure here shouldn't
      // lose the rest of the save — surface a non-blocking notice.
      try {
        await setProjectSalesAgents(id, agentAssign);
      } catch {
        setSaving(false);
        setNotice(
          "Project saved, but updating the assigned sales agents failed — try that part again from here.",
        );
        return;
      }

      router.push(`/org/projects/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
      setSaving(false);
    }
  }

  async function remove() {
    if (!accessToken) return;
    setDeleting(true);
    try {
      await apiFetch(`/org/projects/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      router.push("/org/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project.");
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (notFound) {
    return (
      <div className="card">
        <div className="card-b">
          <p className="muted">Project not found.</p>
          <Link href="/org/projects" className="btn btn-ghost btn-sm">← Back to projects</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-b"><p className="muted">Loading…</p></div>
      </div>
    );
  }

  const saveBtn = (
    <button className="btn btn-primary" type="button" disabled={saving} onClick={() => void save()}>
      {saving ? "Saving…" : "Save changes"}
    </button>
  );

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">Projects</div>
          <h1>Edit {projectName}</h1>
          <div className="sub">Update every part of the project — pricing, location, specs, marketing, team, media.</div>
        </div>
        <div className="actions">
          <Link href={`/org/projects/${id}`} className="btn btn-ghost">Cancel</Link>
          {saveBtn}
        </div>
      </div>

      {/* Section nav — sticky underline tab bar (edit page only). Replaces the
          project workspace tabs here: this page only edits the Overview
          sections, so the section jump-nav takes the tab-bar slot and pins
          below the top bar while the form scrolls. */}
      <div
        style={{
          position: "sticky",
          top: 64,
          zIndex: 20,
          background: "var(--bg)",
          marginBottom: 16,
        }}
      >
        <div className="tabs" style={{ marginBottom: 0 }}>
          {NAV.map(([anchor, label]) => (
            <a
              key={anchor}
              href={`#${anchor}`}
              className={activeSection === anchor ? "active" : ""}
              onClick={(event) => {
                event.preventDefault();
                jumpToSection(anchor, label);
              }}
              title={sectionMissingCount(anchor) > 0 ? `${label} is missing required fields` : undefined}
            >
              {label}
              {sectionMissingCount(anchor) > 0 ? (
                <span className="nav-warn" aria-label="missing required fields"> !</span>
              ) : null}
            </a>
          ))}
        </div>
      </div>

      {jumpWarning ? (
        <div className="help err mb-20">
          <b>{activeSection === jumpWarning.to ? jumpWarning.label : "This section"} has missing required fields.</b>
          <div style={{ marginTop: 4 }}>
            Still needed here: {jumpWarning.missing.join(", ")}. You can fill them in now, or go to <b>{jumpWarning.label}</b> and come back before saving.
          </div>
          <div className="row gap-10 mt-8">
            <button className="btn btn-primary btn-sm" type="button" onClick={() => setJumpWarning(null)}>Stay and fill it in</button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={confirmSectionJump}>Go to {jumpWarning.label} anyway →</button>
          </div>
        </div>
      ) : null}

      {error ? <div className="form-alert">{error}</div> : null}
      {notice ? <div className="form-alert ok">{notice}</div> : null}

      <div className="col gap-18">

          {/* BASICS */}
          <div className="card" id="sec-basics" style={{ scrollMarginTop: 128 }}>
            <div className="card-h"><span className="t">Basics</span></div>
            <div className="card-b">
              <div className="row2">
                <div className={fieldClass("name")}>
                  <label>Project name <span className="req">*</span></label>
                  <input className="inp" value={name} onChange={(e) => setName(e.target.value)} />
                  {fieldError("name") ? <div className="field-err">{fieldError("name")}</div> : null}
                </div>
                <div className="field">
                  <label>Developer / channel partner</label>
                  <input className="inp" value={orgName} readOnly placeholder="Loading…" />
                  <div className="hint">Your organisation — change it in Settings → General.</div>
                </div>
              </div>
              <div className={fieldClass("projectType")}>
                <label>Project type <span className="req">*</span></label>
                <CatalogOptions
                  category="project_type"
                  options={projectTypeOptions}
                  loaded={catalog !== null}
                  error={catalogError}
                  single
                  isSelected={(label) => projectType === label}
                  onToggle={(label) => setProjectType((cur) => (cur === label ? "" : label))}
                />
                {projectType && !projectTypeOptions.some((o) => o.label === projectType) ? (
                  <div className="row gap-8 wrap mt-8">
                    <span className="chip">
                      {projectType}
                      <button type="button" className="x-btn" aria-label={`Remove ${projectType}`} onClick={() => setProjectType("")}>✕</button>
                    </span>
                  </div>
                ) : null}
                {fieldError("projectType") ? <div className="field-err">{fieldError("projectType")}</div> : null}
              </div>
              <div className="field">
                <label>Short tagline</label>
                <input className="inp" placeholder="e.g. 2 &amp; 3 BHK homes on SG Highway" value={tagline} onChange={(e) => setTagline(e.target.value)} />
                <div className="hint">Shown on the public page and ad landing pages.</div>
              </div>
              <div className="row2">
                <div className={fieldClass("reraId")}>
                  <label>RERA ID <span className="req">*</span></label>
                  <input className="inp" value={reraId} onChange={(e) => setReraId(e.target.value)} />
                  {fieldError("reraId") ? <div className="field-err">{fieldError("reraId")}</div> : null}
                </div>
                <div className="field">
                  <label>Possession</label>
                  <input className="inp" placeholder="e.g. Dec 2027" value={possession} onChange={(e) => setPossession(e.target.value)} />
                </div>
              </div>
              <div className="row2">
                <div className="field">
                  <label>Launch date</label>
                  <input className="inp" type="date" value={launchDate} onChange={(e) => setLaunchDate(e.target.value)} />
                </div>
                <div className="field">
                  <label>Construction stage</label>
                  <select value={constructionStage} onChange={(e) => setConstructionStage(e.target.value)}>
                    <option value="">Not set</option>
                    {withCurrent(CONSTRUCTION_STAGES, constructionStage).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field mb-0">
                <label>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* PRICING */}
          <div className="card" id="sec-pricing" style={{ scrollMarginTop: 128 }}>
            <div className="card-h"><span className="t">Pricing &amp; payment</span></div>
            <div className="card-b">
              <div className="row2">
                <div className={fieldClass("priceMin")}>
                  <label>Price range — from <span className="req">*</span></label>
                  <MoneyInput currency={currency} value={priceMin} onChange={setPriceMin} placeholder="62,00,000" />
                  {fieldError("priceMin") ? <div className="field-err">{fieldError("priceMin")}</div> : null}
                </div>
                <div className="field"><label>Price range — to</label><MoneyInput currency={currency} value={priceMax} onChange={setPriceMax} placeholder="1,20,00,000" /></div>
              </div>
              <div className="row2">
                <div className="field"><label>Price per sqft</label><MoneyInput currency={currency} value={baseRate} onChange={setBaseRate} placeholder="6,400" /></div>
                <div className="field"><label>Booking amount</label><MoneyInput currency={currency} value={bookingAmount} onChange={setBookingAmount} placeholder="1,00,000" /></div>
              </div>
              <div className="field">
                <label>Currency</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {PROJECT_CURRENCIES.map((c) => (
                    <option key={c} value={c}>{CURRENCY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>What&apos;s included in the price?</label>
                <CatalogOptions
                  category="price_includes"
                  options={priceIncludeOptions}
                  loaded={catalog !== null}
                  error={catalogError}
                  isSelected={(label) => priceIncludes.includes(label)}
                  onToggle={(label) => setPriceIncludes((p) => toggle(p, label))}
                />
                {offCatalog(priceIncludes, priceIncludeOptions).length > 0 ? (
                  <div className="row gap-8 wrap mt-8">
                    {offCatalog(priceIncludes, priceIncludeOptions).map((v) => (
                      <span key={v} className="chip">
                        {v}
                        <button type="button" className="x-btn" aria-label={`Remove ${v}`} onClick={() => setPriceIncludes((prev) => prev.filter((x) => x !== v))}>✕</button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="field">
                <label>Payment plan</label>
                <CatalogOptions
                  category="payment_plan"
                  options={paymentPlanOptions}
                  loaded={catalog !== null}
                  error={catalogError}
                  single
                  isSelected={(label) => paymentPlan === label}
                  onToggle={(label) => setPaymentPlan(paymentPlan === label ? "" : label)}
                />
                {paymentPlan && !paymentPlanOptions.some((o) => o.label === paymentPlan) ? (
                  <div className="row gap-8 wrap mt-8">
                    <span className="chip">
                      {paymentPlan}
                      <button type="button" className="x-btn" aria-label={`Remove ${paymentPlan}`} onClick={() => setPaymentPlan("")}>✕</button>
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="field mb-0">
                <label>Current offers / schemes</label>
                <textarea className="inp" rows={3} value={offers} onChange={(e) => setOffers(e.target.value)} />
              </div>
            </div>
          </div>

          {/* LOCATION */}
          <div className="card" id="sec-location" style={{ scrollMarginTop: 128 }}>
            <div className="card-h"><span className="t">Location &amp; connectivity</span></div>
            <div className="card-b">
              <div className="field">
                <label>Location (display line)</label>
                <input className="inp" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="SG Highway, Ahmedabad" />
                <div className="hint">Shown on project cards and the header. Usually locality + city.</div>
              </div>
              <div className={fieldClass("address")}>
                <label>Full address <span className="req">*</span></label>
                <textarea className="inp" rows={2} value={addressLine} onChange={(e) => setAddressLine(e.target.value)} />
                {fieldError("address") ? <div className="field-err">{fieldError("address")}</div> : null}
              </div>
              <div className="row3">
                <div className={fieldClass("city")}>
                  <label>City <span className="req">*</span></label>
                  <input className="inp" value={city} onChange={(e) => setCity(e.target.value)} />
                  {fieldError("city") ? <div className="field-err">{fieldError("city")}</div> : null}
                </div>
                <div className="field"><label>Locality</label><input className="inp" value={locality} onChange={(e) => setLocality(e.target.value)} /></div>
                <div className="field"><label>Pincode</label><input className="inp" value={pincode} onChange={(e) => setPincode(e.target.value)} /></div>
              </div>
              <div className="field">
                <label>Nearby (connectivity)</label>
                <CatalogOptions
                  category="connectivity"
                  options={connectivityOptions}
                  loaded={catalog !== null}
                  error={catalogError}
                  isSelected={(label) => connectivity.includes(label)}
                  onToggle={(label) => setConnectivity((c) => toggle(c, label))}
                />
                {offCatalog(connectivity, connectivityOptions).length > 0 ? (
                  <div className="row gap-8 wrap mt-8">
                    {offCatalog(connectivity, connectivityOptions).map((c) => (
                      <span key={c} className="chip">
                        {c}
                        <button type="button" className="x-btn" aria-label={`Remove ${c}`} onClick={() => setConnectivity((prev) => prev.filter((x) => x !== c))}>✕</button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="field mb-0">
                <label>Key landmarks (with distance)</label>
                <textarea className="inp" rows={3} value={landmarks} onChange={(e) => setLandmarks(e.target.value)} />
              </div>
            </div>
          </div>

          {/* INVENTORY & SPECS */}
          <div className="card" id="sec-inventory" style={{ scrollMarginTop: 128 }}>
            <div className="card-h"><span className="t">Inventory &amp; specifications</span></div>
            <div className="card-b">
              <div className="field">
                <label>Unit configurations</label>
                <CatalogOptions
                  category="unit_type"
                  options={unitTypeOptions}
                  loaded={catalog !== null}
                  error={catalogError}
                  isSelected={(label) => selectedConfigs.includes(label)}
                  onToggle={toggleConfig}
                />
                {offCatalog(selectedConfigs, unitTypeOptions).length > 0 ? (
                  <div className="row gap-8 wrap mt-8">
                    {offCatalog(selectedConfigs, unitTypeOptions).map((c) => (
                      <span key={c} className="chip">
                        {c}
                        <button type="button" className="x-btn" aria-label={`Remove ${c}`} onClick={() => toggleConfig(c)}>✕</button>
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="hint">
                  Set each configuration&apos;s size and price below. Individual units are
                  added on the{" "}
                  <Link className="brand-link" href={`/org/projects/${id}/units`}>Units page</Link>.
                </div>
              </div>

              {/* A project can hold more than one row per configuration (the
                  table has no uniqueness constraint). Say which one is in use
                  rather than silently picking, and offer to drop an empty
                  twin — the only case that's safe to remove from here. */}
              {duplicateConfigs.length > 0 ? (
                <div className="form-alert mb-12">
                  {duplicateConfigs.map((d) => {
                    const removable = d.others.filter(isEmptyRow);
                    return (
                      <div key={d.label} style={{ marginBottom: 6 }}>
                        <b>&ldquo;{d.label}&rdquo; has {d.rows.length} entries on this project.</b>{" "}
                        Editing and prefill both use the one with{" "}
                        {isEmptyRow(d.used)
                          ? "the most recent change"
                          : `carpet ${d.used.carpetSqft ?? "—"}, price ${d.used.price ?? "—"}`}
                        .{" "}
                        {removable.length > 0 ? (
                          <>
                            The {removable.length === 1 ? "other is" : "others are"} empty.{" "}
                            <button
                              type="button"
                              className="brand-link"
                              style={{ background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit" }}
                              disabled={dedupeBusy === d.label}
                              onClick={() => void removeEmptyDuplicates(d.label, removable.map((r) => r.id))}
                            >
                              {dedupeBusy === d.label
                                ? "Removing…"
                                : `Remove the empty duplicate${removable.length === 1 ? "" : "s"}`}
                            </button>
                          </>
                        ) : (
                          <>Both carry data, so neither can be removed from here — merge them on the Units page.</>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <ConfigSizePriceTable
                configurations={selectedConfigs}
                rows={configRows}
                onChange={updateConfigRow}
                hint="Optional. Filling these in means adding a unit prefills its area and price from here instead of asking for them again. Changing them later never alters units that already exist."
              />
              <div className="row3">
                <div className="field"><label>No. of towers / blocks</label><input className="inp" type="number" min={0} value={towerCount} onChange={(e) => setTowerCount(e.target.value)} /></div>
                <div className="field"><label>Floors / structure</label><input className="inp" placeholder="G+22" value={floorsDescription} onChange={(e) => setFloorsDescription(e.target.value)} /></div>
                <div className="field"><label>Land area (acres)</label><input className="inp" type="number" min={0} step="0.01" value={landArea} onChange={(e) => setLandArea(e.target.value)} /></div>
              </div>

              <div className="field">
                <label>Carpet area range (sqft)</label>
                <input className="inp" placeholder="640 – 1,850" value={carpetRange} onChange={(e) => setCarpetRange(e.target.value)} />
                <div className="hint">Whole-project summary. Per-unit-type carpet area is set on each unit type.</div>
              </div>

              <div className="field">
                <label>Highlights (one per line)</label>
                <textarea className="inp" rows={4} placeholder={"Riverfront view\n5 mins from SG Highway\nVastu-compliant layouts"} value={highlights} onChange={(e) => setHighlights(e.target.value)} />
                <div className="hint">Used across ads, WhatsApp templates and AI-calling scripts.</div>
              </div>

              <div className="field">
                <label>Amenities</label>
                <CatalogOptions
                  category="amenity"
                  options={amenityOptions}
                  loaded={catalog !== null}
                  error={catalogError}
                  isSelected={(label) => amenities.includes(label)}
                  onToggle={(label) => setAmenities((a) => toggle(a, label))}
                />
                {offCatalog(amenities, amenityOptions).length > 0 ? (
                  <div className="row gap-8 wrap mt-8">
                    {offCatalog(amenities, amenityOptions).map((a) => (
                      <span key={a} className="chip">
                        {a}
                        <button type="button" className="x-btn" aria-label={`Remove ${a}`} onClick={() => setAmenities((prev) => prev.filter((x) => x !== a))}>✕</button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="field">
                <label>Specifications</label>
                <SpecificationRows
                  rows={specRows}
                  onChange={setSpecRows}
                  notes={specNotes}
                  onNotesChange={setSpecNotes}
                />
              </div>
            </div>
          </div>

          {/* MARKETING */}
          <div className="card" id="sec-marketing" style={{ scrollMarginTop: 128 }}>
            <div className="card-h"><span className="t">Marketing &amp; leads</span></div>
            <div className="card-b">
              <div className="field">
                <label>Ad sources</label>
                <div className="opts">
                  {AD_SOURCES.map((s) => (
                    <span key={s} className={`opt ${adSources.includes(s) ? "on" : ""}`} onClick={() => setAdSources((p) => toggle(p, s))}>
                      <span className="b">{adSources.includes(s) ? "✓" : ""}</span>{s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="row3">
                <div className="field"><label>Monthly ad budget</label><MoneyInput currency={currency} value={monthlyBudget} onChange={setMonthlyBudget} placeholder="1,50,000" /></div>
                <div className="field"><label>Target CPL</label><MoneyInput currency={currency} value={targetCpl} onChange={setTargetCpl} placeholder="300" /></div>
                <div className="field"><label>Monthly lead goal</label><input className="inp" type="number" min={0} value={leadGoal} onChange={(e) => setLeadGoal(e.target.value)} /></div>
              </div>
              <div className="field">
                <label>Landing page</label>
                <select value={landingPageChoice} onChange={(e) => setLandingPageChoice(e.target.value)}>
                  <option value="">Not set</option>
                  <option>Create new from template…</option>
                  {orgLandingPages.map((lp) => (
                    <option key={lp.id} value={`Use existing — ${lp.name}`}>Use existing — {lp.name}</option>
                  ))}
                  <option>External URL</option>
                  {landingPageChoice &&
                  !["", "Create new from template…", "External URL"].includes(landingPageChoice) &&
                  !orgLandingPages.some((lp) => `Use existing — ${lp.name}` === landingPageChoice) ? (
                    <option value={landingPageChoice}>{landingPageChoice} (current)</option>
                  ) : null}
                </select>
              </div>
              <div className="sw-row"><div className="tx"><b>AI voice calling</b><small>Auto-call &amp; qualify new leads</small></div><div className={`switch ${aiCalling ? "on" : ""}`} onClick={() => setAiCalling(!aiCalling)} /></div>
              <div className="sw-row"><div className="tx"><b>WhatsApp auto-welcome</b></div><div className={`switch ${whatsappWelcome ? "on" : ""}`} onClick={() => setWhatsappWelcome(!whatsappWelcome)} /></div>
              <div className="sw-row"><div className="tx"><b>Round-robin assignment</b></div><div className={`switch ${roundRobin ? "on" : ""}`} onClick={() => setRoundRobin(!roundRobin)} /></div>
              <div className="sw-row" style={{ borderBottom: 0 }}><div className="tx"><b>Add to AI knowledge base</b></div><div className={`switch ${aiKnowledgeBase ? "on" : ""}`} onClick={() => setAiKnowledgeBase(!aiKnowledgeBase)} /></div>
            </div>
          </div>

          {/* TEAM & ACCESS */}
          <div className="card" id="sec-team" style={{ scrollMarginTop: 128 }}>
            <div className="card-h"><span className="t">Team &amp; access</span></div>
            <div className="card-b">
              <div className="row2">
                <div className={fieldClass("managerId")}>
                  <label>Project manager <span className="req">*</span></label>
                  <select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
                    <option value="">Unassigned</option>
                    {currentManager && !managers.some((u) => u.id === currentManager.id) ? (
                      <option value={currentManager.id}>{currentManager.name} (current)</option>
                    ) : null}
                    {managers.map((u) => (
                      <option key={u.id} value={u.id}>{userLabel(u)}</option>
                    ))}
                  </select>
                  {fieldError("managerId") ? <div className="field-err">{fieldError("managerId")}</div> : null}
                </div>
                <div className="field">
                  <label>Sales team</label>
                  <select value={salesTeam} onChange={(e) => setSalesTeam(e.target.value)}>
                    <option value="">Not set</option>
                    {withCurrent(SALES_TEAMS, salesTeam).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Assigned sales agents</label>
                {salesUsers.length === 0 ? (
                  <div className="hint">No assignable users in your organisation yet — add them under Users.</div>
                ) : (
                  <div className="opts">
                    {salesUsers.map((u) => {
                      const on = agentAssign.includes(u.id);
                      return (
                        <span key={u.id} className={`opt ${on ? "on" : ""}`} onClick={() => setAgentAssign((prev) => (on ? prev.filter((x) => x !== u.id) : [...prev, u.id]))}>
                          <span className="b">{on ? "✓" : ""}</span>{userLabel(u)}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="sw-row"><div className="tx"><b>Require manager approval on bookings</b></div><div className={`switch ${requireBookingApproval ? "on" : ""}`} onClick={() => setRequireBookingApproval(!requireBookingApproval)} /></div>
              <div className="sw-row"><div className="tx"><b>Visible to telecallers</b></div><div className={`switch ${visibleToTelecallers ? "on" : ""}`} onClick={() => setVisibleToTelecallers(!visibleToTelecallers)} /></div>
              <div className="sw-row" style={{ borderBottom: 0 }}><div className="tx"><b>Publish to public website</b></div><div className={`switch ${publishedToWebsite ? "on" : ""}`} onClick={() => setPublishedToWebsite(!publishedToWebsite)} /></div>
            </div>
          </div>

          {/* MEDIA */}
          <div className="card" id="sec-media" style={{ scrollMarginTop: 128 }}>
            <div className="card-h"><span className="t">Documents &amp; media</span></div>
            <div className="card-b">
              <div className="row2">
                <MediaUpload field="gallery" label="Cover / elevation image" value={coverImageUrl} onChange={setCoverImageUrl} ctx={{ projectId: id }} />
                <GalleryUpload value={galleryUrls} onChange={setGalleryUrls} ctx={{ projectId: id }} />
              </div>
              <div className="row2">
                <MediaUpload field="brochure" label="Brochure (PDF)" value={brochureUrl} onChange={setBrochureUrl} ctx={{ projectId: id }} />
                <MediaUpload field="brochure" label="RERA certificate (PDF)" value={reraCertificateUrl} onChange={setReraCertificateUrl} ctx={{ projectId: id }} />
              </div>
              <div className="field mb-0">
                <GalleryUpload
                  value={floorPlanUrls}
                  onChange={setFloorPlanUrls}
                  ctx={{ projectId: id }}
                  label="Project floor / site plan"
                  field="floorPlan"
                />
                <div className="hint">The overall plan for the development — master site layout, tower plans, podium levels.</div>
              </div>
            </div>
          </div>

          <div className="row gap-10 mt-8 between">
            <button
              className="btn btn-ghost btn-sm text-rose"
              type="button"
              onClick={() => setDeleteOpen(true)}
              disabled={saving || deleting}
            >
              Delete project
            </button>
            <div className="row gap-10">
              <Link href={`/org/projects/${id}`} className="btn btn-ghost">Cancel</Link>
              {saveBtn}
            </div>
          </div>
        </div>

      {pendingUntick ? (
        <div className="modal-scrim" onClick={() => setPendingUntick(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 className="fw8 mb-8">Remove configuration?</h2>
            <p className="ink-2 fs-13-5 m-0">{pendingUntick.message}</p>
            <p className="ink-2 fs-13-5 mt-8 m-0">
              No units are affected — this only removes the planned mix entry.
            </p>
            <div className="row end gap-10 mt-22">
              <button className="btn btn-ghost" type="button" onClick={() => setPendingUntick(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                type="button"
                onClick={() => detachConfig(pendingUntick.label)}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteOpen ? (
        <div className="modal-scrim" onClick={() => { if (!deleting) setDeleteOpen(false); }}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 className="fw8 mb-8">Delete project?</h2>
            <p className="ink-2 fs-13-5 m-0">
              <strong>&quot;{projectName}&quot;</strong> and all its unit types and units will be
              permanently deleted. This cannot be undone.
            </p>
            <div className="row end gap-10 mt-22">
              <button className="btn btn-ghost" type="button" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</button>
              <button className="btn btn-danger" type="button" onClick={() => void remove()} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete project"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
