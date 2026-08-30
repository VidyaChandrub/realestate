"use client";

import { useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon } from "@/components/icons";
import "@/app/admin-console/superadmin.css";
import "../../projects.css";

type Mode = "project" | "standalone";

const CONFIGS = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "Penthouse", "Plot", "Shop / Office"];
const FACING = ["East", "West", "North", "South", "Sea", "Garden"];
const STATUSES = ["Available", "Held / Blocked", "Booked", "Sold"];
const PARKING = ["1 covered", "2 covered", "Open"];

export default function UnitCreatePage() {
  const [mode, setMode] = useState<Mode>("project");
  const [project, setProject] = useState("Palm Residency");
  const [tower, setTower] = useState("Tower A");
  const [floor, setFloor] = useState("");
  const [unitNo, setUnitNo] = useState("");
  const [config, setConfig] = useState("2 BHK");
  const [unitType, setUnitType] = useState("");
  const [carpet, setCarpet] = useState("");
  const [builtup, setBuiltup] = useState("");
  const [facing, setFacing] = useState("East");
  const [parking, setParking] = useState("1 covered");
  const [price, setPrice] = useState("");
  const [priceSqft, setPriceSqft] = useState("");
  const [status, setStatus] = useState("Available");
  const [location, setLocation] = useState("");
  const [owner, setOwner] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Link href="/org/projects/all-units" style={{ color: "inherit", textDecoration: "none" }}><Icon name="building" size={14} /> Units</Link> · Add</div>
          <h1>Add a unit</h1>
          <div className="sub">Add a unit to an existing project, or create a standalone unit (resale / broker listing) without a full project.</div>
        </div>
        <div className="actions">
          <Link href="/org/projects/all-units" className="btn btn-ghost">✕ Cancel</Link>
          <Link href="/org/projects/all-units" className="btn btn-primary">💾 Save unit</Link>
        </div>
      </div>

      <Reveal delay={1}>
        <div className="cgrid">
          <div className="card" style={{ padding: 26 }}>
            <div className="sec">
              <div className="lbl">📦 How do you want to add this unit?</div>
              <div className="mode">
                <div className={`modecard ${mode === "project" ? "on" : ""}`} onClick={() => setMode("project")}>
                  <div className="ic">🏗️</div><b>Inside a project</b><small>Attach to an existing development &amp; tower.</small>
                </div>
                <div className={`modecard ${mode === "standalone" ? "on" : ""}`} onClick={() => setMode("standalone")}>
                  <div className="ic">🏠</div><b>Standalone unit</b><small>Resale / broker listing — no full project needed.</small>
                </div>
              </div>
            </div>

            {mode === "project" && (
              <div className="sec" id="projField">
                <div className="lbl">🏗️ Project placement</div>
                <div className="g3">
                  <div className="field">
                    <label>Project</label>
                    <select className="inp" value={project} onChange={(e) => setProject(e.target.value)}>
                      <option>Palm Residency</option><option>Green Vista Towers</option><option>Marina Bay</option><option>Skyline Heights</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Tower / block</label>
                    <select className="inp" value={tower} onChange={(e) => setTower(e.target.value)}>
                      <option>Tower A</option><option>Tower B</option><option>Tower C</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Floor</label>
                    <input className="inp" placeholder="12" value={floor} onChange={(e) => setFloor(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            <div className="sec">
              <div className="lbl">🏠 Unit details</div>
              <div className="g3">
                <div className="field">
                  <label>Unit number <span className="req">*</span></label>
                  <input className="inp" placeholder="B-1204" value={unitNo} onChange={(e) => setUnitNo(e.target.value)} />
                </div>
                <div className="field">
                  <label>Configuration <span className="req">*</span></label>
                  <select className="inp" value={config} onChange={(e) => setConfig(e.target.value)}>
                    {CONFIGS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Unit type</label>
                  <input className="inp" placeholder="Type A" value={unitType} onChange={(e) => setUnitType(e.target.value)} />
                </div>
              </div>
              <div className="g3">
                <div className="field">
                  <label>Carpet area (sqft)</label>
                  <input className="inp" placeholder="1,450" value={carpet} onChange={(e) => setCarpet(e.target.value)} />
                </div>
                <div className="field">
                  <label>Built-up area (sqft)</label>
                  <input className="inp" placeholder="1,720" value={builtup} onChange={(e) => setBuiltup(e.target.value)} />
                </div>
                <div className="field">
                  <label>Facing</label>
                  <select className="inp" value={facing} onChange={(e) => setFacing(e.target.value)}>
                    {FACING.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Parking</label>
                <div className="opts">
                  {PARKING.map((p) => (
                    <span key={p} className={`opt ${parking === p ? "on" : ""}`} onClick={() => setParking(p)}>
                      <span className="b">{parking === p ? "✓" : ""}</span>{p}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="sec">
              <div className="lbl">💰 Pricing &amp; status</div>
              <div className="g3">
                <div className="field">
                  <label>Price <span className="req">*</span></label>
                  <input className="inp" placeholder="₹ 1,65,00,000" value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
                <div className="field">
                  <label>Price / sqft</label>
                  <input className="inp" placeholder="₹ 6,400" value={priceSqft} onChange={(e) => setPriceSqft(e.target.value)} />
                </div>
                <div className="field">
                  <label>Status</label>
                  <select className="inp" value={status} onChange={(e) => setStatus(e.target.value)}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="sec">
              <div className="lbl">🖼️ Media &amp; documents</div>
              <div className="g2">
                <div className="field">
                  <label>Floor plan</label>
                  <div className="drop"><div style={{ fontSize: 24 }}>📐</div>Upload floor plan</div>
                </div>
                <div className="field">
                  <label>Photos</label>
                  <div className="drop"><div style={{ fontSize: 24 }}>📷</div>Add photos</div>
                </div>
              </div>
            </div>

            <div className="sec" style={{ borderBottom: 0 }}>
              <div className="lbl">📋 For standalone / resale (optional)</div>
              <div className="g2">
                <div className="field">
                  <label>Location / address</label>
                  <input className="inp" placeholder="SG Highway, Ahmedabad" value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
                <div className="field">
                  <label>Owner / seller name</label>
                  <input className="inp" placeholder="Resale owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
                </div>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Notes</label>
                <textarea className="inp" rows={2} placeholder="Ready to move, semi-furnished, negotiable…" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="card">
              <div className="card-h"><span className="t">Preview</span></div>
              <div className="card-b">
                <div className="media plan" style={{ height: 120, borderRadius: 12, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center" }}><span>📐</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <b>{unitNo || "New unit"}</b>
                  <span className="badge b-green">{status}</span>
                </div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                  {config}{tower && mode === "project" ? ` · ${tower}` : ""}{floor ? ` · Floor ${floor}` : ""}
                  <br />{carpet ? `${carpet} sqft` : "Fill the form to preview."}
                </div>
              </div>
            </div>
            <div className="help">💡 Standalone units are great for brokers &amp; channel partners listing resale inventory without a full project.</div>
            <Link href="/org/projects/all-units" className="btn btn-primary" style={{ display: "block", textAlign: "center" }}>💾 Save unit</Link>
          </div>
        </div>
      </Reveal>
    </>
  );
}
