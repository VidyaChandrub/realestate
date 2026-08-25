"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Seg } from "@/components/superadmin/seg";
import { Icon } from "@/components/icons";

type UnitType = {
  name: string;
  carpet: string;
  builtUp: string;
  price: string;
  rate: string;
  total: string;
  available: string;
  /** Uploaded photos as data URLs */
  gallery?: string[];
  /** Uploaded floor plan as a data URL */
  floorPlan?: string;
  /** Uploaded walkthrough video as a data URL */
  video?: string;
  /** Uploaded brochure (PDF or image) as a data URL */
  brochure?: string;
};

type Amenity = {
  name: string;
  /** Uploaded icon as a data URL */
  icon?: string;
};

type ProjectRow = {
  name: string;
  detail: string;
  manager: string;
  initials: string;
  avClass?: string;
  active: boolean;
  spend: number;
  cpl: number;
  leads: number;
  metaLeads: number;
  // Full profile — captured at creation, mirroring the Palm Residency tabs
  location?: string;
  reraId?: string;
  possession?: string;
  configurations?: string[];
  priceMin?: string;
  priceMax?: string;
  baseRate?: string;
  landArea?: string;
  towers?: string;
  totalUnits?: string;
  availableUnits?: string;
  amenities?: Amenity[];
  unitTypes?: UnitType[];
};

function managerInitials(manager: string): string {
  const parts = manager.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Accepts "68 L", "1.10 Cr", "6800000", "68,00,000" → rupees as a number */
function parseMoney(input: string): number {
  const m = input.replace(/,/g, "").trim().match(/^(\d+(?:\.\d+)?)\s*(l|lakh|cr|crore)?$/i);
  if (!m) return NaN;
  let v = parseFloat(m[1]);
  const unit = m[2]?.toLowerCase();
  if (unit === "l" || unit === "lakh") v *= 1e5;
  if (unit === "cr" || unit === "crore") v *= 1e7;
  return v;
}

/** Configurations are never hand-picked — they fall out of the unit-type
 *  names ("2 BHK — Type A" → "2 BHK", "Plot X" → "Plots"), keeping the two
 *  sections permanently in sync. */
export function deriveConfigs(unitNames: string[]): string[] {
  const found = new Set<string>();
  for (const n of unitNames) {
    const bhk = n.match(/(\d+(?:\.\d+)?)\s*bhk/i);
    if (bhk) {
      found.add(`${parseFloat(bhk[1])} BHK`);
    } else if (/penthouse/i.test(n)) {
      found.add("Penthouse");
    } else if (/plot/i.test(n)) {
      found.add("Plots");
    } else if (/villa/i.test(n)) {
      found.add("Villas");
    } else if (/shop|office|retail|commercial/i.test(n)) {
      found.add("Commercial");
    }
  }
  return [...found];
}

const num = (s: string) => parseFloat(s.replace(/,/g, ""));

/** Read a local file into a data URL, rejecting if it exceeds maxBytes. */
function readAsDataUrl(file: File, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(new Error("too-large"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
}

/** ₹ per sqft, computed live from built-up area × price */
export function unitRate(builtUp: string, price: string): string {
  const b = num(builtUp);
  const p = parseMoney(price);
  if (!b || !Number.isFinite(p) || p <= 0) return "";
  return `₹${Math.round(p / b).toLocaleString("en-IN")}`;
}

const SEED_UNIT_TYPES: UnitType[] = [
  { name: "2 BHK — Type A", carpet: "742", builtUp: "1180", price: "6800000", rate: "₹5,763", total: "96", available: "42" },
  { name: "2.5 BHK — Type C", carpet: "918", builtUp: "1410", price: "8650000", rate: "₹6,135", total: "48", available: "11" },
  { name: "3 BHK — Type B", carpet: "1064", builtUp: "1650", price: "11000000", rate: "₹6,667", total: "120", available: "61" },
  { name: "4 BHK — Penthouse", carpet: "1910", builtUp: "2940", price: "24000000", rate: "₹8,163", total: "44", available: "23" },
];

const SEED_PROJECTS: ProjectRow[] = [
  {
    name: "Dholera Greenfield",
    detail: "Plots · Dholera SIR",
    manager: "Priya Sharma",
    initials: "PS",
    active: true,
    spend: 104000,
    cpl: 288,
    leads: 361,
    metaLeads: 214,
  },
  {
    name: "Palm Residency",
    detail: "2 & 3 BHK · SG Highway, Ahmedabad",
    manager: "Vijay Chandel",
    initials: "VC",
    avClass: "a2",
    active: true,
    spend: 86500,
    cpl: 298,
    leads: 290,
    metaLeads: 176,
    location: "SG Highway, Ahmedabad",
    reraId: "PR/GJ/AHM/2026/00842",
    possession: "Dec 2027",
    configurations: ["2 BHK", "3 BHK", "4 BHK"],
    priceMin: "₹68 L",
    priceMax: "₹2.4 Cr",
    baseRate: "₹5,800",
    landArea: "6.2",
    towers: "4 towers · G+22",
    totalUnits: "348",
    availableUnits: "137",
    amenities: [
      { name: "🏊 Swimming pool" },
      { name: "🏋️ Clubhouse & gym" },
      { name: "🌳 Landscaped garden" },
      { name: "🅿️ 2-level parking" },
      { name: "🛝 Kids play area" },
      { name: "🔒 24×7 security" },
      { name: "⚡ Power backup" },
      { name: "🏸 Sports court" },
      { name: "🧘 Yoga deck" },
    ],
    unitTypes: SEED_UNIT_TYPES,
  },
  {
    name: "Green Vista Towers",
    detail: "3 & 4 BHK · Pune",
    manager: "Rohit Malhotra",
    initials: "RM",
    avClass: "a5",
    active: true,
    spend: 72000,
    cpl: 327,
    leads: 220,
    metaLeads: 121,
  },
  {
    name: "Skyline Heights",
    detail: "Luxury · Mumbai",
    manager: "Sneha Kapoor",
    initials: "SK",
    avClass: "a4",
    active: true,
    spend: 58000,
    cpl: 341,
    leads: 170,
    metaLeads: 92,
  },
  {
    name: "Marina Bay Dubai",
    detail: "NRI · Dubai Marina",
    manager: "Vijay Chandel",
    initials: "VC",
    avClass: "a3",
    active: true,
    spend: 62500,
    cpl: 356,
    leads: 176,
    metaLeads: 103,
  },
  {
    name: "Emerald Enclave",
    detail: "Villas · Bengaluru",
    manager: "Priya Sharma",
    initials: "PS",
    avClass: "a2",
    active: false,
    spend: 17000,
    cpl: 250,
    leads: 67,
    metaLeads: 41,
  },
];

const EMPTY_UNIT_TYPE: UnitType = {
  name: "",
  carpet: "",
  builtUp: "",
  price: "",
  rate: "",
  total: "",
  available: "",
};

const AMENITY_OPTIONS: Amenity[] = [
  { name: "🏊 Swimming pool" },
  { name: "🏋️ Clubhouse & gym" },
  { name: "🌳 Landscaped garden" },
  { name: "🅿️ 2-level parking" },
  { name: "🛝 Kids play area" },
  { name: "🔒 24×7 security" },
  { name: "⚡ Power backup" },
  { name: "🏸 Sports court" },
  { name: "🧘 Yoga deck" },
];

type ProjectForm = {
  name: string;
  location: string;
  reraId: string;
  possession: string;
  manager: string;
  status: "active" | "inactive";
  priceMin: string;
  priceMax: string;
  baseRate: string;
  landArea: string;
  towers: string;
  unitTypes: UnitType[];
  amenities: Amenity[];
};

const EMPTY_FORM: ProjectForm = {
  name: "",
  location: "",
  reraId: "",
  possession: "",
  manager: "",
  status: "active",
  priceMin: "",
  priceMax: "",
  baseRate: "",
  landArea: "",
  towers: "",
  unitTypes: [],
  amenities: [],
};

const rupee = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="muted"
      style={{
        fontSize: 11.5,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        margin: "18px 0 12px",
      }}
    >
      {children}
    </div>
  );
}

export default function OrgProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>(SEED_PROJECTS);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [amenityDraft, setAmenityDraft] = useState("");

  const totals = useMemo(() => {
    const spend = projects.reduce((s, p) => s + p.spend, 0);
    const leads = projects.reduce((s, p) => s + p.leads, 0);
    const metaLeads = projects.reduce((s, p) => s + p.metaLeads, 0);
    const active = projects.filter((p) => p.active).length;
    const avgCpl = leads > 0 ? Math.round(spend / leads) : 0;
    return { spend, leads, metaLeads, active, avgCpl };
  }, [projects]);

  // Live roll-ups from the unit-type repeater — inventory fields follow these
  const unitRollup = useMemo(() => {
    const total = form.unitTypes.reduce((s, u) => s + (parseInt(u.total, 10) || 0), 0);
    const available = form.unitTypes.reduce((s, u) => s + (parseInt(u.available, 10) || 0), 0);
    return { total, available };
  }, [form.unitTypes]);

  // "Configurations offered" mirrors whatever unit types exist — no manual picks
  const derivedConfigs = useMemo(
    () =>
      deriveConfigs(
        form.unitTypes.filter((u) => u.name.trim()).map((u) => u.name.trim()),
      ),
    [form.unitTypes],
  );

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setAddOpen(true);
  }

  function closeAdd() {
    setAddOpen(false);
  }

  function addAmenity() {
    const name = amenityDraft.trim();
    if (!name) return;
    setForm((f) =>
      f.amenities.some((a) => a.name.toLowerCase() === name.toLowerCase())
        ? f
        : { ...f, amenities: [...f.amenities, { name }] },
    );
    setAmenityDraft("");
  }

  function removeAmenity(index: number) {
    setForm((f) => ({ ...f, amenities: f.amenities.filter((_, i) => i !== index) }));
  }

  function onAmenityIcon(index: number, file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError(`"${file.name}" is not an image`);
      return;
    }
    if (file.size > 500_000) {
      setFormError(`${file.name} is over 500 KB — pick a smaller icon`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const icon = String(reader.result || "");
      if (!icon) return;
      setForm((f) => ({
        ...f,
        amenities: f.amenities.map((a, i) => (i === index ? { ...a, icon } : a)),
      }));
    };
    reader.readAsDataURL(file);
  }

  function updateUnit(index: number, patch: Partial<UnitType>) {
    setForm((f) => ({
      ...f,
      unitTypes: f.unitTypes.map((u, i) => (i === index ? { ...u, ...patch } : u)),
    }));
  }

  const MEDIA_LIMITS = { image: 1_000_000, video: 8_000_000, brochure: 5_000_000 } as const;

  async function onUnitMedia(
    index: number,
    kind: "gallery" | "floorPlan" | "video" | "brochure",
    files: FileList | null,
  ) {
    if (!files || files.length === 0) return;
    try {
      if (kind === "gallery") {
        const added: string[] = [];
        for (const file of Array.from(files)) {
          if (!file.type.startsWith("image/")) continue;
          added.push(await readAsDataUrl(file, MEDIA_LIMITS.image));
        }
        if (added.length > 0) {
          setForm((f) => ({
            ...f,
            unitTypes: f.unitTypes.map((u, i) =>
              i === index ? { ...u, gallery: [...(u.gallery ?? []), ...added] } : u,
            ),
          }));
        }
      } else if (kind === "brochure") {
        const file = files[0];
        if (!/^application\/pdf$|^image\//.test(file.type)) {
          setFormError(`${file.name} must be a PDF or image`);
          return;
        }
        const dataUrl = await readAsDataUrl(file, MEDIA_LIMITS.brochure);
        updateUnit(index, { brochure: dataUrl });
      } else {
        const file = files[0];
        const dataUrl = await readAsDataUrl(
          file,
          kind === "floorPlan" ? MEDIA_LIMITS.image : MEDIA_LIMITS.video,
        );
        updateUnit(index, kind === "floorPlan" ? { floorPlan: dataUrl } : { video: dataUrl });
      }
    } catch (err) {
      const name = files[0]?.name ?? "file";
      setFormError(
        err instanceof Error && err.message === "too-large"
          ? `${name} is too large — images must be under 1 MB, videos under 8 MB`
          : `Could not read ${name}`,
      );
    }
  }

  function removeUnitImage(index: number, imageIndex: number) {
    setForm((f) => ({
      ...f,
      unitTypes: f.unitTypes.map((u, i) =>
        i === index
          ? { ...u, gallery: (u.gallery ?? []).filter((_, gi) => gi !== imageIndex) }
          : u,
      ),
    }));
  }

  function submitAdd() {
    if (!form.name.trim()) {
      setFormError("Give the project a name");
      return;
    }
    if (!form.manager.trim()) {
      setFormError("Assign a project manager");
      return;
    }
    const namedUnits = form.unitTypes.filter((u) => u.name.trim());
    for (const u of namedUnits) {
      if (!num(u.builtUp) || !parseMoney(u.price)) {
        setFormError(`Unit type "${u.name.trim()}" needs built-up sqft and a price`);
        return;
      }
    }
    const configSummary =
      derivedConfigs.length > 0 ? derivedConfigs.join(" & ") : "";
    const row: ProjectRow = {
      name: form.name.trim(),
      detail:
        [configSummary, form.location.trim()].filter(Boolean).join(" · ") ||
        "New project",
      manager: form.manager.trim(),
      initials: managerInitials(form.manager),
      active: form.status === "active",
      spend: 0,
      cpl: 0,
      leads: 0,
      metaLeads: 0,
      location: form.location.trim() || undefined,
      reraId: form.reraId.trim() || undefined,
      possession: form.possession.trim() || undefined,
      configurations: derivedConfigs.length > 0 ? derivedConfigs : undefined,
      priceMin: form.priceMin.trim() || undefined,
      priceMax: form.priceMax.trim() || undefined,
      baseRate: form.baseRate.trim() || undefined,
      landArea: form.landArea.trim() || undefined,
      towers: form.towers.trim() || undefined,
      totalUnits: unitRollup.total > 0 ? String(unitRollup.total) : undefined,
      availableUnits: unitRollup.available > 0 ? String(unitRollup.available) : undefined,
      amenities: form.amenities.length > 0 ? form.amenities : undefined,
      unitTypes:
        namedUnits.length > 0
          ? namedUnits.map((u) => ({ ...u, rate: unitRate(u.builtUp, u.price) }))
          : undefined,
    };
    setProjects((prev) => [row, ...prev]);
    setAddOpen(false);
  }

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">
            <Icon name="building" size={14} /> Sales
          </div>
          <h1>Projects</h1>
          <div className="sub">
            Every property project — ad spend, cost-per-lead and lead volume across sources.
          </div>
        </div>
        <div className="actions">
          <button className="btn btn-primary" type="button" onClick={openAdd}>
            ＋ New project
          </button>
        </div>
      </div>

      {addOpen ? (
        <div
          style={{
            background:
              "linear-gradient(135deg, #6d28d9 0%, #db2777 45%, #f59e0b 100%)",
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid var(--line)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              padding: "22px 26px",
              color: "#fff",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  opacity: 0.85,
                }}
              >
                ✦ New
              </div>
              <h1 style={{ margin: "4px 0 0", fontSize: 24, color: "#fff" }}>
                Create a project
              </h1>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
                Add a property with configurations, unit types, media &amp; amenities.
              </div>
            </div>
            <button
              className="btn"
              type="button"
              onClick={closeAdd}
              style={{
                background: "rgba(255,255,255,.18)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,.35)",
                backdropFilter: "blur(4px)",
              }}
            >
              ✕ Close
            </button>
          </div>
          <div
            style={{
              background: "var(--surface)",
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              padding: 22,
            }}
          >
          <SectionLabel>Basics</SectionLabel>
              <div className="grid g3">
                <div className="field">
                  <label>Project name *</label>
                  <input
                    className="inp"
                    placeholder="e.g. Riverside Heights"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Location</label>
                  <input
                    className="inp"
                    placeholder="e.g. SG Highway, Ahmedabad"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>RERA ID</label>
                  <input
                    className="inp mono"
                    placeholder="PR/GJ/AHM/2026/00842"
                    value={form.reraId}
                    onChange={(e) => setForm((f) => ({ ...f, reraId: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid g3">
                <div className="field">
                  <label>Possession</label>
                  <input
                    className="inp"
                    placeholder="e.g. Dec 2027"
                    value={form.possession}
                    onChange={(e) => setForm((f) => ({ ...f, possession: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Project manager *</label>
                  <input
                    className="inp"
                    placeholder="Full name"
                    value={form.manager}
                    onChange={(e) => setForm((f) => ({ ...f, manager: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value as ProjectForm["status"] }))
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <SectionLabel>Configuration &amp; pricing</SectionLabel>
              <div className="field">
                <label>
                  Configurations offered{" "}
                  <span className="muted" style={{ fontWeight: 400 }}>
                    (auto-detected from unit types)
                  </span>
                </label>
                {derivedConfigs.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {derivedConfigs.map((c) => (
                      <span
                        className="chip"
                        key={c}
                        style={{
                          background: "var(--brand-050)",
                          color: "var(--brand)",
                          borderColor: "var(--brand)",
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="muted" style={{ fontSize: 13 }}>
                    Add unit types below — their configurations are listed here automatically.
                  </div>
                )}
              </div>
              <div className="grid g4" style={{ marginTop: 12 }}>
                <div className="field">
                  <label>Price from</label>
                  <input
                    className="inp"
                    placeholder="₹68 L"
                    value={form.priceMin}
                    onChange={(e) => setForm((f) => ({ ...f, priceMin: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Price to</label>
                  <input
                    className="inp"
                    placeholder="₹2.4 Cr"
                    value={form.priceMax}
                    onChange={(e) => setForm((f) => ({ ...f, priceMax: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Base rate / sqft</label>
                  <input
                    className="inp"
                    placeholder="₹5,800"
                    value={form.baseRate}
                    onChange={(e) => setForm((f) => ({ ...f, baseRate: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Land area (acres)</label>
                  <input
                    className="inp"
                    placeholder="6.2"
                    value={form.landArea}
                    onChange={(e) => setForm((f) => ({ ...f, landArea: e.target.value }))}
                  />
                </div>
              </div>

              <SectionLabel>Unit types</SectionLabel>
              {form.unitTypes.length === 0 ? (
                <div className="muted" style={{ fontSize: 13 }}>
                  No unit types yet — add one per configuration (e.g. 2 BHK — Type A).
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {form.unitTypes.map((u, i) => (
                    <div
                      key={i}
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: 12,
                        padding: 14,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 10,
                        }}
                      >
                        <b style={{ fontSize: 13.5 }}>
                          {u.name.trim() || `Unit type ${i + 1}`}
                          {unitRate(u.builtUp, u.price) ? (
                            <span className="badge b-indigo" style={{ marginLeft: 8 }}>
                              {unitRate(u.builtUp, u.price)} / sqft
                            </span>
                          ) : null}
                        </b>
                        <button
                          className="btn btn-ghost btn-sm"
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              unitTypes: f.unitTypes.filter((_, j) => j !== i),
                            }))
                          }
                        >
                          🗑 Remove
                        </button>
                      </div>
                      <div className="grid g3">
                        <div className="field">
                          <label>Name</label>
                          <input
                            className="inp"
                            placeholder="2 BHK — Type A"
                            value={u.name}
                            onChange={(e) => updateUnit(i, { name: e.target.value })}
                          />
                        </div>
                        <div className="field">
                          <label>Carpet (sqft)</label>
                          <input
                            className="inp"
                            placeholder="742"
                            value={u.carpet}
                            onChange={(e) => updateUnit(i, { carpet: e.target.value })}
                          />
                        </div>
                        <div className="field">
                          <label>Built-up (sqft)</label>
                          <input
                            className="inp"
                            placeholder="1180"
                            value={u.builtUp}
                            onChange={(e) => updateUnit(i, { builtUp: e.target.value })}
                          />
                        </div>
                      </div>
                       <div className="grid g3">
                         <div className="field">
                           <label>Price</label>
                           <input
                             className="inp"
                             placeholder="68 L · 1.10 Cr · 6800000"
                             value={u.price}
                             onChange={(e) => updateUnit(i, { price: e.target.value })}
                           />
                         </div>
                         <div className="field">
                           <label>Total units</label>
                           <input
                             className="inp"
                             placeholder="96"
                             value={u.total}
                             onChange={(e) => updateUnit(i, { total: e.target.value })}
                           />
                         </div>
                         <div className="field">
                           <label>Available</label>
                           <input
                             className="inp"
                             placeholder="42"
                             value={u.available}
                             onChange={(e) => updateUnit(i, { available: e.target.value })}
                           />
                         </div>
                       </div>
                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: "1px dashed var(--line)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                          }}
                        >
                         <div className="field">
                           <label>Images</label>
                           <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                             {(u.gallery ?? []).map((src, gi) => (
                               <span
                                 key={`${i}-${gi}`}
                                 style={{ position: "relative", display: "inline-flex" }}
                               >
                                 {/* eslint-disable-next-line @next/next/no-img-element -- data URL from local upload */}
                                 <img
                                   src={src}
                                   alt=""
                                   width={56}
                                   height={56}
                                   style={{
                                     objectFit: "cover",
                                     borderRadius: 8,
                                     border: "1px solid var(--line)",
                                   }}
                                 />
                                 <button
                                   type="button"
                                   aria-label={`Remove image ${gi + 1}`}
                                   onClick={() => removeUnitImage(i, gi)}
                                   style={{
                                     position: "absolute",
                                     top: -6,
                                     right: -6,
                                     width: 18,
                                     height: 18,
                                     borderRadius: "50%",
                                     border: "none",
                                     background: "var(--surface)",
                                     boxShadow: "0 0 0 1px var(--line)",
                                     cursor: "pointer",
                                     fontSize: 10,
                                     lineHeight: 1,
                                   }}
                                 >
                                   ✕
                                 </button>
                               </span>
                             ))}
                             <label
                               title="Upload images (multiple)"
                               style={{
                                 width: 56,
                                 height: 56,
                                 display: "inline-flex",
                                 alignItems: "center",
                                 justifyContent: "center",
                                 borderRadius: 8,
                                 border: "1px dashed var(--line)",
                                 cursor: "pointer",
                                 fontSize: 16,
                                 color: "var(--faint)",
                               }}
                             >
                               ＋
                               <input
                                 type="file"
                                 accept="image/*"
                                 multiple
                                 style={{ display: "none" }}
                                 onChange={(e) => {
                                   onUnitMedia(i, "gallery", e.target.files);
                                   e.target.value = "";
                                 }}
                               />
                              </label>
                            </div>
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                              gap: 12,
                            }}
                          >
                          <div className="field">
                            <label>Floor plan</label>
                           {u.floorPlan ? (
                             <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                               {/* eslint-disable-next-line @next/next/no-img-element -- data URL from local upload */}
                               <img
                                 src={u.floorPlan}
                                 alt="Floor plan"
                                 style={{
                                   width: "100%",
                                   height: 72,
                                   objectFit: "cover",
                                   borderRadius: 8,
                                   border: "1px solid var(--line)",
                                 }}
                               />
                               <div style={{ display: "flex", gap: 6 }}>
                                 <label
                                   className="btn btn-ghost btn-sm"
                                   title="Replace floor plan"
                                   style={{ cursor: "pointer", margin: 0 }}
                                 >
                                   Replace
                                   <input
                                     type="file"
                                     accept="image/*"
                                     style={{ display: "none" }}
                                     onChange={(e) => {
                                       onUnitMedia(i, "floorPlan", e.target.files);
                                       e.target.value = "";
                                     }}
                                   />
                                 </label>
                                 <button
                                   className="btn btn-ghost btn-sm"
                                   type="button"
                                   onClick={() => updateUnit(i, { floorPlan: undefined })}
                                 >
                                   ✕
                                 </button>
                               </div>
                             </div>
                           ) : (
                             <label
                               style={{
                                 height: 72,
                                 display: "flex",
                                 alignItems: "center",
                                 justifyContent: "center",
                                 gap: 6,
                                 borderRadius: 8,
                                 border: "1px dashed var(--line)",
                                 cursor: "pointer",
                                 fontSize: 12.5,
                                 color: "var(--faint)",
                               }}
                             >
                               📐 Upload floor plan
                               <input
                                 type="file"
                                 accept="image/*"
                                 style={{ display: "none" }}
                                 onChange={(e) => {
                                   onUnitMedia(i, "floorPlan", e.target.files);
                                   e.target.value = "";
                                 }}
                               />
                             </label>
                           )}
                         </div>
                         <div className="field">
                           <label>Video</label>
                           {u.video ? (
                             <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                               <video
                                 src={u.video}
                                 controls
                                 style={{
                                   width: "100%",
                                   height: 72,
                                   objectFit: "cover",
                                   borderRadius: 8,
                                   border: "1px solid var(--line)",
                                   background: "#000",
                                 }}
                               />
                               <div style={{ display: "flex", gap: 6 }}>
                                 <label
                                   className="btn btn-ghost btn-sm"
                                   title="Replace video"
                                   style={{ cursor: "pointer", margin: 0 }}
                                 >
                                   Replace
                                   <input
                                     type="file"
                                     accept="video/*"
                                     style={{ display: "none" }}
                                     onChange={(e) => {
                                       onUnitMedia(i, "video", e.target.files);
                                       e.target.value = "";
                                     }}
                                   />
                                 </label>
                                 <button
                                   className="btn btn-ghost btn-sm"
                                   type="button"
                                   onClick={() => updateUnit(i, { video: undefined })}
                                 >
                                   ✕
                                 </button>
                               </div>
                             </div>
                           ) : (
                             <label
                               style={{
                                 height: 72,
                                 display: "flex",
                                 alignItems: "center",
                                 justifyContent: "center",
                                 gap: 6,
                                 borderRadius: 8,
                                 border: "1px dashed var(--line)",
                                 cursor: "pointer",
                                 fontSize: 12.5,
                                 color: "var(--faint)",
                               }}
                             >
                               🎬 Upload video
                               <input
                                 type="file"
                                 accept="video/*"
                                 style={{ display: "none" }}
                                 onChange={(e) => {
                                   onUnitMedia(i, "video", e.target.files);
                                   e.target.value = "";
                                 }}
                               />
                                </label>
                            )}
                          </div>
                          <div className="field">
                            <label>Brochure</label>
                            {u.brochure ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <a
                                  href={u.brochure}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    height: 72,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "0 12px",
                                    borderRadius: 8,
                                    border: "1px solid var(--line)",
                                    background: "var(--brand-050)",
                                    color: "var(--brand)",
                                    fontSize: 12.5,
                                    textDecoration: "none",
                                  }}
                                >
                                  📄 View / download
                                </a>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <label
                                    className="btn btn-ghost btn-sm"
                                    title="Replace brochure"
                                    style={{ cursor: "pointer", margin: 0 }}
                                  >
                                    Replace
                                    <input
                                      type="file"
                                      accept="application/pdf,image/*"
                                      style={{ display: "none" }}
                                      onChange={(e) => {
                                        onUnitMedia(i, "brochure", e.target.files);
                                        e.target.value = "";
                                      }}
                                    />
                                  </label>
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    type="button"
                                    onClick={() => updateUnit(i, { brochure: undefined })}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label
                                style={{
                                  height: 72,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 6,
                                  borderRadius: 8,
                                  border: "1px dashed var(--line)",
                                  cursor: "pointer",
                                  fontSize: 12.5,
                                  color: "var(--faint)",
                                }}
                              >
                                📄 Upload brochure (PDF)
                                <input
                                  type="file"
                                  accept="application/pdf,image/*"
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    onUnitMedia(i, "brochure", e.target.files);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                        </div>
                    </div>
                  ))}
                </div>
              )}
              <button
                className="btn btn-ghost"
                type="button"
                style={{ marginTop: 12 }}
                onClick={() =>
                  setForm((f) => ({ ...f, unitTypes: [...f.unitTypes, { ...EMPTY_UNIT_TYPE }] }))
                }
              >
                ＋ Add unit type
              </button>

              <SectionLabel>Inventory</SectionLabel>
              <div className="grid g3">
                <div className="field">
                  <label>Towers</label>
                  <input
                    className="inp"
                    placeholder="e.g. 4 towers · G+22"
                    value={form.towers}
                    onChange={(e) => setForm((f) => ({ ...f, towers: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Total units {unitRollup.total > 0 ? "(from unit types)" : ""}</label>
                  <input
                    className="inp"
                    placeholder="e.g. 348"
                    value={unitRollup.total > 0 ? String(unitRollup.total) : ""}
                    readOnly
                  />
                </div>
                <div className="field">
                  <label>Available units {unitRollup.available > 0 ? "(from unit types)" : ""}</label>
                  <input
                    className="inp"
                    placeholder="e.g. 126"
                    value={unitRollup.available > 0 ? String(unitRollup.available) : ""}
                    readOnly
                  />
                </div>
              </div>

              <SectionLabel>Amenities</SectionLabel>
              {form.amenities.length === 0 ? (
                <div className="muted" style={{ fontSize: 13 }}>
                  No amenities selected yet — pick from the quick list or add your own.
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {form.amenities.map((a, i) => (
                    <span
                      className="chip"
                      key={`${a.name}-${i}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "var(--brand-050)",
                        color: "var(--brand)",
                        borderColor: "var(--brand)",
                      }}
                    >
                      {a.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element -- data URL from local upload, not a remote asset
                        <img
                          src={a.icon}
                          alt=""
                          width={14}
                          height={14}
                          style={{ borderRadius: 3, objectFit: "cover" }}
                        />
                      ) : null}
                      {a.name}
                      <label
                        title="Upload icon"
                        style={{ cursor: "pointer", display: "inline-flex" }}
                      >
                        🖼
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            onAmenityIcon(i, e.target.files?.[0] ?? null);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        aria-label={`Remove ${a.name}`}
                        onClick={() => removeAmenity(i)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "inherit",
                          cursor: "pointer",
                          fontWeight: 700,
                          padding: 0,
                          lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input
                  className="inp"
                  placeholder="Custom amenity — e.g. 🎾 Tennis court"
                  value={amenityDraft}
                  onChange={(e) => setAmenityDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAmenity();
                    }
                  }}
                />
                <button className="btn btn-ghost" type="button" onClick={addAmenity}>
                  ＋ Add
                </button>
              </div>

              {AMENITY_OPTIONS.filter(
                (a) => !form.amenities.some((x) => x.name === a.name),
              ).length > 0 ? (
                <>
                  <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                    Quick add:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                    {AMENITY_OPTIONS.filter(
                      (a) => !form.amenities.some((x) => x.name === a.name),
                    ).map((a) => (
                      <button
                        key={a.name}
                        type="button"
                        className="chip"
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          setForm((f) => ({ ...f, amenities: [...f.amenities, a] }))
                        }
                      >
                        ＋ {a.name}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  marginTop: 6,
                }}
              >
                {formError ? (
                  <div className="help" style={{ margin: 0, flex: 1 }}>
                    ⚠️ {formError}
                  </div>
                ) : (
                  <span className="muted" style={{ fontSize: 12.5, flex: 1 }}>
                    Configurations &amp; inventory roll up from unit types automatically.
                  </span>
                )}
                <button className="btn btn-ghost" type="button" onClick={closeAdd}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={submitAdd}
                  style={{
                    background: "linear-gradient(135deg,#6d28d9,#db2777)",
                    border: "none",
                  }}
                >
                  Create project
                </button>
              </div>
            </div>
          </div>
      ) : (
        <>
          <Reveal delay={1}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
              <div className="tb-search" style={{ flex: 1, minWidth: 220, maxWidth: 360, position: "static", margin: 0 }}>
                <span className="si">
                  <Icon name="search" size={14} />
                </span>
                <input className="inp" style={{ paddingLeft: 40 }} placeholder="Search projects…" />
              </div>
              <Seg options={["All", "Meta", "Google", "LinkedIn"]} defaultIndex={0} />
              <input className="inp" style={{ maxWidth: 220 }} value="01 Aug – 18 Aug 2026" aria-label="Date range" readOnly />
            </div>
          </Reveal>

          <div className="grid g4" style={{ marginBottom: 22 }}>
            <Reveal delay={1}>
              <div className="stat">
                <div className="top">
                  <span className="label">Active projects</span>
                  <span className="ic ic-indigo"><Icon name="building" size={16} /></span>
                </div>
                <div className="value"><CountUp value={totals.active} /></div>
                <div className="delta up">↑ 1 new this month</div>
              </div>
            </Reveal>
            <Reveal delay={2}>
              <div className="stat">
                <div className="top">
                  <span className="label">Total leads</span>
                  <span className="ic ic-sky"><Icon name="crm" size={16} /></span>
                </div>
                <div className="value"><CountUp value={totals.leads} /></div>
                <div className="delta up">↑ 12% vs last month</div>
              </div>
            </Reveal>
            <Reveal delay={3}>
              <div className="stat">
                <div className="top">
                  <span className="label">Avg CPL</span>
                  <span className="ic ic-amber"><Icon name="billing" size={16} /></span>
                </div>
                <div className="value"><CountUp value={totals.avgCpl} pre="₹" /></div>
                <div className="delta down">↓ ₹18 vs last month</div>
              </div>
            </Reveal>
            <Reveal delay={4}>
              <div className="stat">
                <div className="top">
                  <span className="label">Ad spend</span>
                  <span className="ic ic-violet"><Icon name="target" size={16} /></span>
                </div>
                <div className="value">
                  <CountUp value={totals.spend / 100000} pre="₹" suf="L" dec={1} />
                </div>
                <div className="delta up">↑ across all projects</div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={2}>
            <div className="card">
              <div className="card-h">
                <span className="t">All projects</span>
                <span className="x muted">
                  {projects.length} projects · spend across Meta, Google &amp; LinkedIn
                </span>
              </div>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Project Name</th>
                      <th>Manager</th>
                      <th>Status</th>
                      <th>Spend (All)</th>
                      <th>CPL (All)</th>
                      <th>Leads (All)</th>
                      <th>Leads (Meta)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.name}>
                        <td>
                          <Link
                            href="/org/projects/palm-residency"
                            style={{ fontWeight: 600, color: "var(--brand)" }}
                            title={[
                              p.reraId ? `RERA ${p.reraId}` : "",
                              p.possession ? `Possession ${p.possession}` : "",
                              p.unitTypes?.length ? `${p.unitTypes.length} unit types` : "",
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          >
                            {p.name}
                          </Link>
                          <div className="sm muted">{p.detail}</div>
                        </td>
                        <td>
                          <div className="u">
                            <span className={`av ${p.avClass ?? ""}`}>{p.initials}</span>
                            <span className="nm">{p.manager}</span>
                          </div>
                        </td>
                        <td>
                          {p.active ? (
                            <span className="badge b-green">
                              <span className="dot" style={{ background: "var(--green)" }} />Active
                            </span>
                          ) : (
                            <span className="badge b-gray">
                              <span className="dot" style={{ background: "var(--faint)" }} />Inactive
                            </span>
                          )}
                        </td>
                        <td>{rupee(p.spend)}</td>
                        <td>{p.cpl > 0 ? rupee(p.cpl) : "—"}</td>
                        <td>{p.leads.toLocaleString("en-IN")}</td>
                        <td>{p.metaLeads}</td>
                        <td>
                          <button className="btn btn-ghost btn-sm">⋯</button>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 700, background: "var(--surface-2)" }}>
                      <td>Totals</td>
                      <td className="muted">{totals.active} of {projects.length} active</td>
                      <td><span className="badge b-indigo">{totals.active} active</span></td>
                      <td>{rupee(totals.spend)}</td>
                      <td>{rupee(totals.avgCpl)}</td>
                      <td>{totals.leads.toLocaleString("en-IN")}</td>
                      <td>{totals.metaLeads.toLocaleString("en-IN")}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </>
      )}
    </>
  );
}
