import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { ProgressBar } from "@/components/superadmin/progress-bar";
import { ProjectPageHead } from "@/components/org/project-tabs";

export const metadata = {
  title: "Palm Residency · Overview",
};

const SPECS = [
  { k: "Location", v: "SG Highway, Ahmedabad" },
  { k: "Configuration", v: "2, 3 & 4 BHK" },
  { k: "Price range", v: "₹68 L – ₹2.4 Cr" },
  { k: "Total area", v: "6.2 acres" },
  { k: "Towers", v: "4 towers · G+22" },
  { k: "Total units", v: "348" },
  { k: "Available", v: "126" },
  { k: "Possession", v: "Dec 2027" },
  { k: "RERA", v: "PR/GJ/AHM/2026/00842", mono: true },
];

const UNIT_TYPES = [
  { name: "2 BHK", sqft: "1,180 sqft · ₹68 L", avail: "42 available", badge: "b-green" },
  { name: "3 BHK", sqft: "1,650 sqft · ₹1.1 Cr", avail: "61 available", badge: "b-green" },
  { name: "4 BHK Penthouse", sqft: "2,940 sqft · ₹2.4 Cr", avail: "23 available", badge: "b-amber" },
];

const AMENITIES = [
  "🏊 Swimming pool",
  "🏋️ Clubhouse & gym",
  "🌳 Landscaped garden",
  "🅿️ 2-level parking",
  "🛝 Kids play area",
  "🔒 24×7 security",
  "⚡ Power backup",
  "🏸 Sports court",
  "🧘 Yoga deck",
];

export default function OrgProjectOverviewPage() {
  return (
    <>
      <ProjectPageHead
        active="overview"
        actions={
          <>
            <button className="btn btn-ghost">🔗 Public page</button>
            <button className="btn btn-ghost">✏️ Edit</button>
            <button className="btn btn-primary">＋ Add lead</button>
          </>
        }
      />

      <div className="grid g-2-1">
        {/* LEFT: media + details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Reveal delay={1}>
            <div className="media" style={{ height: 280 }}>
              <span>🏙️</span>
              <span className="cap">Palm Residency — Elevation</span>
            </div>
          </Reveal>
          <Reveal delay={2}>
            <div className="gallery">
              <div className="thumb media"><span>🏢</span></div>
              <div className="thumb media g2v"><span>🌳</span></div>
              <div className="thumb media g3v"><span>🏊</span></div>
              <div className="thumb media g4v"><span>🛋️</span></div>
            </div>
          </Reveal>

          <Reveal delay={2}>
            <div className="card">
              <div className="card-h">
                <span className="t">Project details</span>
                <span className="badge b-green">Under construction</span>
              </div>
              <div className="card-b">
                <div className="spec-grid">
                  {SPECS.map((s) => (
                    <div className="sp" key={s.k}>
                      <div className="k">{s.k}</div>
                      <div className={`v${s.mono ? " mono" : ""}`}>{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={3}>
            <div className="card">
              <div className="card-h">
                <span className="t">Unit types</span>
                <Link className="x" href="/org/projects/palm-residency/units" style={{ color: "var(--brand)" }}>
                  Manage inventory →
                </Link>
              </div>
              <div className="card-b">
                <div className="grid g3">
                  {UNIT_TYPES.map((u) => (
                    <Link
                      key={u.name}
                      href="/org/projects/palm-residency/units"
                      className="card hover"
                      style={{ textDecoration: "none" }}
                    >
                      <div className="media plan" style={{ height: 120, borderRadius: "14px 14px 0 0" }}>
                        <span>📐</span>
                        <span className="cap">{u.name}</span>
                      </div>
                      <div style={{ padding: 14 }}>
                        <b>{u.name}</b>
                        <div className="muted" style={{ fontSize: 12.5 }}>{u.sqft}</div>
                        <span className={`badge ${u.badge}`} style={{ marginTop: 8 }}>{u.avail}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={3}>
            <div className="card">
              <div className="card-h"><span className="t">Amenities</span></div>
              <div className="card-b" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {AMENITIES.map((a) => (
                  <span className="chip" key={a}>{a}</span>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={3}>
            <div className="card">
              <div className="card-h"><span className="t">Floor plans</span></div>
              <div className="card-b">
                <div className="grid g3">
                  <div className="media plan" style={{ height: 170 }}>
                    <span>📐</span>
                    <span className="cap">2 BHK — Type A</span>
                  </div>
                  <div className="media plan" style={{ height: 170 }}>
                    <span>📐</span>
                    <span className="cap">3 BHK — Type B</span>
                  </div>
                  <div className="media plan" style={{ height: 170 }}>
                    <span>📐</span>
                    <span className="cap">4 BHK — Penthouse</span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* RIGHT: apply/enquire + stats + agent */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Reveal delay={1}>
            <div className="card">
              <div className="card-h"><span className="t">Enquire / Apply</span></div>
              <div className="card-b">
                <div className="field">
                  <label>Full name</label>
                  <input className="inp" placeholder="Customer name" />
                </div>
                <div className="field">
                  <label>Phone</label>
                  <input className="inp" defaultValue="+91 " />
                </div>
                <div className="row2">
                  <div className="field">
                    <label>Configuration</label>
                    <select defaultValue="2 BHK">
                      <option>2 BHK</option>
                      <option>3 BHK</option>
                      <option>4 BHK</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Budget</label>
                    <select defaultValue="₹60–80 L">
                      <option>₹60–80 L</option>
                      <option>₹1–1.5 Cr</option>
                      <option>₹2 Cr +</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>Source</label>
                  <select defaultValue="Walk-in">
                    <option>Walk-in</option>
                    <option>Meta Ad</option>
                    <option>Google</option>
                    <option>Reference</option>
                  </select>
                </div>
                <button className="btn btn-primary btn-block">Apply &amp; create lead →</button>
                <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }}>⬇ Download brochure</button>
              </div>
            </div>
          </Reveal>
          <Reveal delay={2}>
            <div className="card">
              <div className="card-h"><span className="t">Performance</span></div>
              <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="muted">Total leads</span>
                  <b><CountUp value={214} /></b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="muted">Site visits</span>
                  <b><CountUp value={18} /></b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="muted">Bookings</span>
                  <b><CountUp value={6} /></b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="muted">Cost / lead</span>
                  <b>₹298</b>
                </div>
                <div className="divider" />
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                    <span>Inventory sold</span>
                    <b>64%</b>
                  </div>
                  <ProgressBar width="64%" />
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={3}>
            <div className="card">
              <div className="card-h"><span className="t">Assigned team</span></div>
              <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="u">
                  <span className="av a2">VC</span>
                  <span>
                    <span className="nm">Vijay Chandel</span><br />
                    <span className="sm">Project Manager</span>
                  </span>
                </div>
                <div className="u">
                  <span className="av">PS</span>
                  <span>
                    <span className="nm">Priya Sharma</span><br />
                    <span className="sm">Sales Agent</span>
                  </span>
                </div>
                <div className="u">
                  <span className="av a3">AV</span>
                  <span>
                    <span className="nm">Aditya Verma</span><br />
                    <span className="sm">Sales Agent</span>
                  </span>
                </div>
                <Link
                  className="btn btn-ghost btn-block"
                  href="/org/projects/palm-residency/ai-calling"
                  style={{ marginTop: 4 }}
                >
                  ✨ AI agent: Aarohi
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </>
  );
}
