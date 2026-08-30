"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/superadmin/reveal";
import "@/app/org/org.css";
import type {
  CreateProjectInput,
  CreateUnitTypeInput,
  OrgUser,
  OrgUsersListResponse,
  Project,
  ProjectStatus,
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

const AMENITY_OPTIONS = [
  "Swimming pool", "Clubhouse", "Gymnasium", "Kids play area",
  "Landscaped garden", "24×7 security", "Power backup", "Jogging track",
  "Indoor games", "Amphitheatre", "EV charging", "Rainwater harvesting",
];

const PROJECT_TYPES = ["Apartments", "Villas", "Plots", "Commercial", "Farmhouse", "Mixed-use"];
const CONFIGS = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "Penthouse", "Duplex", "Shop / Office"];
const NEARBY = ["Metro / transit", "Schools", "Hospitals", "Airport", "Malls / retail", "IT / business park", "Highway access"];

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

function numOrUndef(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

export default function AddNewProjectPage() {
  const router = useRouter();
  const { accessToken } = useAuth();

  // Step 1 — basics
  const [name, setName] = useState("");
  const [projectType, setProjectType] = useState("Apartments");
  const [tagline, setTagline] = useState("");
  const [reraId, setReraId] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [launchDate, setLaunchDate] = useState("");
  const [possession, setPossession] = useState("");
  const [constructionStage, setConstructionStage] = useState("Under construction");

  // Step 2 — inventory
  const [selectedConfigs, setSelectedConfigs] = useState<string[]>(["2 BHK", "3 BHK"]);
  const [totalUnits, setTotalUnits] = useState("");
  const [towerCount, setTowerCount] = useState("");
  const [landArea, setLandArea] = useState("");
  const [carpetRange, setCarpetRange] = useState("");
  const [unitsAvailable, setUnitsAvailable] = useState("");
  const [highlights, setHighlights] = useState("");
  const [unitTypes, setUnitTypes] = useState<UnitTypeDraft[]>([]);

  // Step 3 — pricing
  const [priceMin, setPriceMin] = useState("");
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
  const [nearby, setNearby] = useState<string[]>(["Metro / transit", "Schools", "Hospitals", "Malls / retail"]);
  const [landmarks, setLandmarks] = useState("");

  // Step 5 — amenities
  const [amenities, setAmenities] = useState<string[]>(["Swimming pool", "Clubhouse", "Gymnasium", "Kids play area", "Landscaped garden", "24×7 security", "Power backup", "Rainwater harvesting"]);
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
  const [aiCalling, setAiCalling] = useState(true);
  const [whatsappAuto, setWhatsappAuto] = useState(true);
  const [roundRobin, setRoundRobin] = useState(true);

  // Step 7 — team
  const [managerId, setManagerId] = useState("");
  const [managers, setManagers] = useState<OrgUser[]>([]);
  const [salesTeam, setSalesTeam] = useState("Ahmedabad — West");
  const [agentAssign, setAgentAssign] = useState<string[]>(["Priya Sharma", "Aman Verma", "Neha Patel"]);
  const [requireApproval, setRequireApproval] = useState(true);
  const [visibleTele, setVisibleTele] = useState(true);
  const [publishWeb, setPublishWeb] = useState(false);

  // Wizard state
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<OrgUsersListResponse>("/org/users?role=manager&limit=100&status=active", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => setManagers(res.data))
      .catch(() => setManagers([]));
  }, [accessToken]);

  const unitRollup = useMemo(() => {
    const total = unitTypes.reduce((s, u) => s + (parseInt(u.totalUnits, 10) || 0), 0);
    return { total };
  }, [unitTypes]);

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

  const pct = Math.round(((step + 1) / STEPS.length) * 100);

  async function submit() {
    if (!accessToken) return;
    if (!name.trim()) { setError("Give the project a name."); setStep(0); return; }

    setSubmitting(true);
    setError(null);
    try {
      const body: CreateProjectInput = {
        name: name.trim(),
        location: [locality, city].filter(Boolean).join(", ") || undefined,
        reraId: reraId.trim() || undefined,
        possession: possession.trim() || undefined,
        managerId: managerId || undefined,
        status,
        priceMin: numOrUndef(priceMin),
        priceMax: undefined,
        baseRate: numOrUndef(baseRate),
        landArea: numOrUndef(landArea),
        towerCount: numOrUndef(towerCount),
        floorsDescription: undefined,
        amenities: amenities.map((a) => ({ name: a, iconUrl: null })),
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
          carpetSqft: numOrUndef(u.carpetSqft),
          builtupSqft: numOrUndef(u.builtupSqft),
          price: numOrUndef(u.price),
          totalUnits: numOrUndef(u.totalUnits),
        };
        await apiFetch(`/org/projects/${project.id}/unit-types`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(utBody),
        });
      }

      router.push(`/org/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create the project.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">🏗️ Projects</div>
          <h1>Onboard a new project</h1>
          <div className="sub">Set up a real-estate development end-to-end — inventory, pricing, marketing sources, team access and go-live.</div>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => router.push("/org/projects")}>✕ Cancel</button>
          <button className="btn btn-ghost">💾 Save draft</button>
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
                  <div className="g2">
                    <div className="field"><label>Project name <span className="req">*</span></label><input className="inp" placeholder="e.g. Palm Residency" value={name} onChange={(e) => setName(e.target.value)} /></div>
                    <div className="field"><label>Developer / channel partner <span className="req">*</span></label><input className="inp" value="Skyline Developers" readOnly /></div>
                  </div>
                  <div className="field"><label>Project type <span className="req">*</span></label>
                    <div className="opts" data-single>
                      {PROJECT_TYPES.map((t) => (
                        <span key={t} className={`opt rad ${projectType === t ? "on" : ""}`} onClick={() => setProjectType(t)}><span className="b">{projectType === t ? "●" : ""}</span>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="field"><label>Short tagline</label><input className="inp" placeholder="e.g. 2 &amp; 3 BHK homes on SG Highway" value={tagline} onChange={(e) => setTagline(e.target.value)} /><div className="hint">Shown on the public page and ad landing pages.</div></div>
                </div>
                <div className="q-sec">
                  <div className="lbl">🏛️ Approvals &amp; timeline</div>
                  <div className="g2">
                    <div className="field"><label>RERA registration no. <span className="req">*</span></label><input className="inp mono" placeholder="PR/GJ/AHM/2026/00842" value={reraId} onChange={(e) => setReraId(e.target.value)} /></div>
                    <div className="field"><label>Status</label><select className="inp" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                  </div>
                  <div className="g3">
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
                  <div className="field"><div className="opts">
                    {CONFIGS.map((c) => (
                      <span key={c} className={`opt ${selectedConfigs.includes(c) ? "on" : ""}`} onClick={() => toggleConfig(c)}><span className="b">{selectedConfigs.includes(c) ? "✓" : ""}</span>{c}</span>
                    ))}
                  </div></div>
                  <div className="g3">
                    <div className="field"><label>Total units</label><input className="inp" type="number" placeholder="240" value={totalUnits} onChange={(e) => setTotalUnits(e.target.value)} /></div>
                    <div className="field"><label>No. of towers / blocks</label><input className="inp" type="number" placeholder="4" value={towerCount} onChange={(e) => setTowerCount(e.target.value)} /></div>
                    <div className="field"><label>Total land area</label><input className="inp" placeholder="5.2 acres" value={landArea} onChange={(e) => setLandArea(e.target.value)} /></div>
                  </div>
                  <div className="g2">
                    <div className="field"><label>Carpet area range (sqft)</label><input className="inp" placeholder="640 – 1,850" value={carpetRange} onChange={(e) => setCarpetRange(e.target.value)} /></div>
                    <div className="field"><label>Units available now</label><input className="inp" type="number" placeholder="86" value={unitsAvailable} onChange={(e) => setUnitsAvailable(e.target.value)} /></div>
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
                  <div className="g2">
                    <div className="field"><label>Starting price <span className="req">*</span></label><input className="inp" placeholder="₹ 62,00,000" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} /></div>
                    <div className="field"><label>Price per sqft</label><input className="inp" placeholder="₹ 6,400 / sqft" value={baseRate} onChange={(e) => setBaseRate(e.target.value)} /></div>
                  </div>
                  <div className="g2">
                    <div className="field"><label>Booking amount</label><input className="inp" placeholder="₹ 1,00,000" value={bookingAmount} onChange={(e) => setBookingAmount(e.target.value)} /></div>
                    <div className="field"><label>Currency</label><select className="inp" value={currency} onChange={(e) => setCurrency(e.target.value)}><option value="INR">INR — Indian Rupee (₹)</option><option value="AED">AED — UAE Dirham</option><option value="USD">USD — US Dollar ($)</option></select></div>
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
                  <div className="g3">
                    <div className="field"><label>City <span className="req">*</span></label><input className="inp" placeholder="Ahmedabad" value={city} onChange={(e) => setCity(e.target.value)} /></div>
                    <div className="field"><label>Locality</label><input className="inp" placeholder="SG Highway" value={locality} onChange={(e) => setLocality(e.target.value)} /></div>
                    <div className="field"><label>Pincode</label><input className="inp" placeholder="380058" value={pincode} onChange={(e) => setPincode(e.target.value)} /></div>
                  </div>
                  <div className="g2">
                    <div className="field"><label>Map latitude</label><input className="inp mono" placeholder="23.0301" value={latitude} onChange={(e) => setLatitude(e.target.value)} /></div>
                    <div className="field"><label>Map longitude</label><input className="inp mono" placeholder="72.5100" value={longitude} onChange={(e) => setLongitude(e.target.value)} /></div>
                  </div>
                </div>
                <div className="q-sec">
                  <div className="lbl">🛣️ Connectivity &amp; landmarks</div>
                  <div className="field"><label>Nearby (select all that apply)</label>
                    <div className="opts">
                      {NEARBY.map((n) => (
                        <span key={n} className={`opt ${nearby.includes(n) ? "on" : ""}`} onClick={() => toggleNearby(n)}><span className="b">{nearby.includes(n) ? "✓" : ""}</span>{n}</span>
                      ))}
                    </div>
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
                  <div className="field"><div className="opts">
                    {AMENITY_OPTIONS.map((a) => (
                      <span key={a} className={`opt ${amenities.includes(a) ? "on" : ""}`} onClick={() => toggleAmenity(a)}><span className="b">{amenities.includes(a) ? "✓" : ""}</span>{a}</span>
                    ))}
                  </div></div>
                </div>
                <div className="q-sec">
                  <div className="lbl">🧱 Specifications</div>
                  <div className="g2">
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
                  <div className="g3">
                    <div className="field"><label>Monthly ad budget</label><input className="inp" placeholder="₹ 1,50,000" value={monthlyBudget} onChange={(e) => setMonthlyBudget(e.target.value)} /></div>
                    <div className="field"><label>Target CPL</label><input className="inp" placeholder="₹ 300" value={targetCpl} onChange={(e) => setTargetCpl(e.target.value)} /></div>
                    <div className="field"><label>Monthly lead goal</label><input className="inp" type="number" placeholder="400" value={leadGoal} onChange={(e) => setLeadGoal(e.target.value)} /></div>
                  </div>
                  <div className="field"><label>Landing page</label><select className="inp" value={landingPage} onChange={(e) => setLandingPage(e.target.value)}><option>Create new from template…</option><option>Use existing — Palm Residency LP</option><option>External URL</option></select></div>
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
                  <div className="g2">
                    <div className="field"><label>Project manager <span className="req">*</span></label><select className="inp" value={managerId} onChange={(e) => setManagerId(e.target.value)}><option value="">Unassigned</option>{managers.map((u) => <option key={u.id} value={u.id}>{userLabel(u)}</option>)}</select></div>
                    <div className="field"><label>Sales team</label><select className="inp" value={salesTeam} onChange={(e) => setSalesTeam(e.target.value)}><option>Ahmedabad — West</option><option>Ahmedabad — Core</option><option>NRI Desk</option></select></div>
                  </div>
                  <div className="field"><label>Assign sales agents</label>
                    <div className="opts">
                      {["Priya Sharma", "Aman Verma", "Neha Patel", "Rohit Malhotra", "Sana Shaikh"].map((a) => (
                        <span key={a} className={`opt ${agentAssign.includes(a) ? "on" : ""}`} onClick={() => setAgentAssign((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a])}><span className="b">{agentAssign.includes(a) ? "✓" : ""}</span>{a}</span>
                      ))}
                    </div>
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
                  <div className="g2">
                    <div className="field"><label>Cover / elevation image</label><div className="drop"><div className="ic">🏙️</div><div>Drag &amp; drop or <b>browse</b></div><div className="hint">JPG / PNG · up to 10 MB</div></div></div>
                    <div className="field"><label>Gallery photos</label><div className="drop"><div className="ic">📷</div><div>Add up to 20 photos</div><div className="hint">Elevation, interiors, amenities</div></div></div>
                  </div>
                  <div className="field"><label>Floor plans</label><div className="drop"><div className="ic">📐</div><div>Upload floor plans per unit type</div><div className="hint">PDF or image, labelled by config</div></div></div>
                </div>
                <div className="q-sec">
                  <div className="lbl">📄 Documents</div>
                  <div className="g2">
                    <div className="field"><label>Brochure</label><div className="drop"><div className="ic">📕</div><div>Upload brochure (PDF)</div></div></div>
                    <div className="field"><label>RERA certificate</label><div className="drop"><div className="ic">🏛️</div><div>Upload RERA doc (PDF)</div></div></div>
                  </div>
                  <div className="sw-row"><div className="tx"><b>Add to AI knowledge base</b><small>Let AI calling &amp; WhatsApp answer from these documents</small></div><div className="switch on" /></div>
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
                        <div className="sp"><span className="k">Type</span><span className="v">{projectType}</span></div>
                        <div className="sp"><span className="k">RERA</span><span className="v">{reraId || "—"}</span></div>
                        <div className="sp"><span className="k">Status</span><span className="v"><span className={`badge ${status === "active" ? "b-green" : "b-gray"}`}>{status === "active" ? "Active" : "Inactive"}</span></span></div>
                      </div>
                      <div className="q-sec"><div className="lbl">🏠 Inventory</div>
                        <div className="sp"><span className="k">Configs</span><span className="v">{selectedConfigs.join(" & ") || "—"}</span></div>
                        <div className="sp"><span className="k">Total units</span><span className="v">{totalUnits || "—"}</span></div>
                        <div className="sp"><span className="k">Starting price</span><span className="v">{priceMin || "—"}</span></div>
                      </div>
                      <div className="q-sec"><div className="lbl">📍 Location</div>
                        <div className="sp"><span className="k">City</span><span className="v">{city || "—"}</span></div>
                        <div className="sp"><span className="k">Locality</span><span className="v">{locality || "—"}</span></div>
                      </div>
                    </div>
                    <div>
                      <div className="q-sec"><div className="lbl">📣 Marketing</div>
                        <div className="sp"><span className="k">Sources</span><span className="v">{[metaAds && "Meta", googleAds && "Google", linkedinAds && "LinkedIn", portalAds && "Portals"].filter(Boolean).join(", ") || "—"}</span></div>
                        <div className="sp"><span className="k">Monthly budget</span><span className="v">{monthlyBudget || "—"}</span></div>
                        <div className="sp"><span className="k">AI calling</span><span className="v"><span className={`badge ${aiCalling ? "b-green" : "b-gray"}`}>{aiCalling ? "On" : "Off"}</span></span></div>
                      </div>
                      <div className="q-sec"><div className="lbl">👤 Team</div>
                        <div className="sp"><span className="k">Manager</span><span className="v">{managers.find((m) => m.id === managerId) ? userLabel(managers.find((m) => m.id === managerId)!) : "Unassigned"}</span></div>
                        <div className="sp"><span className="k">Agents</span><span className="v">{agentAssign.length} assigned</span></div>
                      </div>
                      <div className="q-sec"><div className="lbl">📄 Media</div>
                        <div className="sp"><span className="k">Amenities</span><span className="v">{amenities.length} selected</span></div>
                        <div className="sp"><span className="k">Unit types</span><span className="v">{unitTypes.length} added</span></div>
                      </div>
                    </div>
                  </div>
                   {error && <div className="help err mt-16">⚠️ {error}</div>}
                  <div className="help mt-20">🚀 <b>Ready to go live.</b> Publishing creates the project, wires up the connected ad sources and starts routing new leads immediately.</div>
                </div>
              </div>
            )}

            {/* FOOTER NAV */}
            <div className="wz-foot">
              <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>← Back</button>
              <span className="save">Draft auto-saved · just now</span>
              <div className="row gap-10">
                {step < STEPS.length - 1 && <button className="btn btn-ghost" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Skip</button>}
                {step < STEPS.length - 1 ? (
                  <button className="btn btn-primary" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Continue →</button>
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
