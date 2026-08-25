"use client";

import { useState } from "react";
import { Reveal } from "@/components/superadmin/reveal";
import { Seg } from "@/components/superadmin/seg";
import { ProjectPageHead } from "@/components/org/project-tabs";

type UnitStatus = "Available" | "Booked" | "Held" | "Limited";

type UnitType = {
  name: string;
  status: string;
  statusBadge: string;
  carpet: string;
  builtUp: string;
  price: string;
  rate: string;
  total: number;
  available: number;
  booked: number;
  held: number;
};

const UNIT_TYPES: UnitType[] = [
  {
    name: "2 BHK — Type A",
    status: "Available",
    statusBadge: "b-green",
    carpet: "742 sqft",
    builtUp: "1,180 sqft",
    price: "₹68.0 L",
    rate: "₹5,763",
    total: 96,
    available: 42,
    booked: 48,
    held: 6,
  },
  {
    name: "2.5 BHK — Type C",
    status: "Limited",
    statusBadge: "b-amber",
    carpet: "918 sqft",
    builtUp: "1,410 sqft",
    price: "₹86.5 L",
    rate: "₹6,135",
    total: 48,
    available: 11,
    booked: 33,
    held: 4,
  },
  {
    name: "3 BHK — Type B",
    status: "Available",
    statusBadge: "b-green",
    carpet: "1,064 sqft",
    builtUp: "1,650 sqft",
    price: "₹1.10 Cr",
    rate: "₹6,667",
    total: 120,
    available: 61,
    booked: 51,
    held: 8,
  },
  {
    name: "4 BHK — Penthouse",
    status: "Limited",
    statusBadge: "b-amber",
    carpet: "1,910 sqft",
    builtUp: "2,940 sqft",
    price: "₹2.40 Cr",
    rate: "₹8,163",
    total: 44,
    available: 23,
    booked: 18,
    held: 3,
  },
];

type CellStatus = "avl" | "bkd" | "hld";

const TOWER_A: CellStatus[] = [
  "avl", "bkd", "avl", "hld", "bkd", "avl", // floor 3
  "bkd", "avl", "avl", "bkd", "avl", "hld", // floor 4
  "avl", "bkd", "bkd", "avl", "avl", "bkd", // floor 5
  "hld", "avl", "bkd", "avl", "avl", "bkd", // floor 6
  "avl", "bkd", "avl", "hld", "bkd", "avl", // floor 7
  "bkd", "avl", "avl", "bkd", "hld", "avl", // floor 8
];

const CELL_LABELS: Record<CellStatus, string> = { avl: "Available", bkd: "Booked", hld: "Held" };

type TableRow = {
  unitNo: string;
  type: string;
  floor: number;
  carpet: string;
  facing: string;
  price: string;
  status: Exclude<UnitStatus, "Limited">;
  statusBadge: string;
};

const UNITS: TableRow[] = [
  { unitNo: "A-301", type: "2 BHK — Type A", floor: 3, carpet: "742", facing: "East", price: "₹68.0 L", status: "Available", statusBadge: "b-green" },
  { unitNo: "A-302", type: "2 BHK — Type A", floor: 3, carpet: "742", facing: "West", price: "₹67.5 L", status: "Booked", statusBadge: "b-rose" },
  { unitNo: "A-304", type: "2.5 BHK — Type C", floor: 3, carpet: "918", facing: "North-East", price: "₹86.5 L", status: "Held", statusBadge: "b-amber" },
  { unitNo: "B-506", type: "3 BHK — Type B", floor: 5, carpet: "1,064", facing: "East", price: "₹1.10 Cr", status: "Available", statusBadge: "b-green" },
  { unitNo: "B-511", type: "3 BHK — Type B", floor: 5, carpet: "1,064", facing: "South", price: "₹1.08 Cr", status: "Booked", statusBadge: "b-rose" },
  { unitNo: "B-708", type: "3 BHK — Type B", floor: 7, carpet: "1,064", facing: "West", price: "₹1.14 Cr", status: "Available", statusBadge: "b-green" },
  { unitNo: "C-902", type: "2.5 BHK — Type C", floor: 9, carpet: "918", facing: "North", price: "₹88.2 L", status: "Available", statusBadge: "b-green" },
  { unitNo: "D-2101", type: "4 BHK — Penthouse", floor: 21, carpet: "1,910", facing: "East", price: "₹2.40 Cr", status: "Held", statusBadge: "b-amber" },
  { unitNo: "D-2102", type: "4 BHK — Penthouse", floor: 21, carpet: "1,910", facing: "West", price: "₹2.46 Cr", status: "Available", statusBadge: "b-green" },
  { unitNo: "D-2201", type: "4 BHK — Penthouse", floor: 22, carpet: "1,910", facing: "North-East", price: "₹2.58 Cr", status: "Booked", statusBadge: "b-rose" },
];

const FILTER_OPTIONS = ["All", "2 BHK", "3 BHK", "4 BHK", "Available", "Booked"] as const;

function matchesFilter(t: UnitType, filter: string): boolean {
  switch (filter) {
    case "All":
      return true;
    case "Available":
      return t.available > 0;
    case "Booked":
      return t.booked > 0;
    default:
      // "2 BHK" also matches the "2.5 BHK" type card
      return t.name.startsWith(filter.charAt(0));
  }
}

export default function OrgProjectUnitsPage() {
  const [filterIndex, setFilterIndex] = useState(0);
  const filter = FILTER_OPTIONS[filterIndex];
  const visibleTypes = UNIT_TYPES.filter((t) => matchesFilter(t, filter));

  return (
    <>
      <ProjectPageHead
        active="units"
        actions={
          <>
            <button className="btn btn-ghost">🔗 Public page</button>
            <button className="btn btn-primary">＋ Add unit type</button>
          </>
        }
      />

      <Reveal delay={1}>
        <div style={{ marginBottom: 18 }}>
          <Seg options={[...FILTER_OPTIONS]} value={filterIndex} onChange={setFilterIndex} />
        </div>
      </Reveal>

      <div className="grid g2">
        {visibleTypes.map((u) => (
          <Reveal delay={1} key={u.name}>
            <div className="card">
              <div className="media plan" style={{ height: 150, borderRadius: "18px 18px 0 0" }}>
                <span>📐</span>
                <span className="cap">{u.name}</span>
              </div>
              <div style={{ padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <b style={{ fontSize: 16 }}>{u.name}</b>
                  <span className={`badge ${u.statusBadge}`}>{u.status}</span>
                </div>
                <div className="uspec">
                  <div><div className="k">Carpet</div><div className="v">{u.carpet}</div></div>
                  <div><div className="k">Built-up</div><div className="v">{u.builtUp}</div></div>
                  <div><div className="k">Price</div><div className="v">{u.price}</div></div>
                  <div><div className="k">₹/sqft</div><div className="v">{u.rate}</div></div>
                </div>
                <div className="badge-row">
                  <span className="badge">Total {u.total}</span>
                  <span className="badge b-green">{u.available} Available</span>
                  <span className="badge b-rose">{u.booked} Booked</span>
                  <span className="badge b-amber">{u.held} Held</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button className="btn btn-ghost">✏️ Edit</button>
                  <button className="btn btn-ghost">📐 View floor plan</button>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Availability matrix */}
      <Reveal delay={2}>
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-h">
            <span className="t">Availability — Tower A</span>
            <span className="badge b-green">Floors 3–8 · G+22</span>
          </div>
          <div className="card-b">
            <div className="avail">
              {TOWER_A.map((status, i) => (
                <div key={i} className={`u-cell ${status}`} title={CELL_LABELS[status]}>
                  {301 + i}
                </div>
              ))}
            </div>
            <div className="legend">
              <span><i style={{ background: "#10b981" }} /> Available</span>
              <span><i style={{ background: "#f43f5e" }} /> Booked</span>
              <span><i style={{ background: "#f59e0b" }} /> Held</span>
            </div>
          </div>
        </div>
      </Reveal>

      {/* All units table */}
      <Reveal delay={3}>
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-h">
            <span className="t">All units</span>
            <a href="#" className="x" style={{ color: "var(--brand)" }}>Export CSV →</a>
          </div>
          <div className="card-b">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Unit No</th><th>Type</th><th>Floor</th><th>Carpet sqft</th>
                  <th>Facing</th><th>Price ₹</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {UNITS.map((row) => (
                  <tr key={row.unitNo}>
                    <td className="mono">{row.unitNo}</td>
                    <td>{row.type}</td>
                    <td>{row.floor}</td>
                    <td>{row.carpet}</td>
                    <td>{row.facing}</td>
                    <td>{row.price}</td>
                    <td><span className={`badge ${row.statusBadge}`}>{row.status}</span></td>
                    <td><a href="#" style={{ color: "var(--brand)" }}>View</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
    </>
  );
}
