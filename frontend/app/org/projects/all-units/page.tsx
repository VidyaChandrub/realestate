"use client";

import { useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Icon } from "@/components/icons";
import "@/app/admin-console/superadmin.css";
import "../projects.css";

type UnitRow = {
  unitNo: string;
  project: string;
  projectId: string;
  config: string;
  carpet: string;
  floor: string;
  facing: string;
  price: string;
  status: "available" | "booked" | "held" | "sold";
  statusLabel: string;
  badgeClass: string;
};

const UNITS: UnitRow[] = [
  { unitNo: "B-1204", project: "Palm Residency", projectId: "p1", config: "3 BHK", carpet: "1,450 sqft", floor: "12", facing: "East", price: "₹1.65 Cr", status: "available", statusLabel: "Available", badgeClass: "b-green" },
  { unitNo: "B-1205", project: "Palm Residency", projectId: "p1", config: "3 BHK", carpet: "1,450 sqft", floor: "12", facing: "West", price: "₹1.58 Cr", status: "booked", statusLabel: "Booked", badgeClass: "b-rose" },
  { unitNo: "A-1108", project: "Palm Residency", projectId: "p1", config: "3 BHK", carpet: "1,410 sqft", floor: "11", facing: "East", price: "₹1.58 Cr", status: "available", statusLabel: "Available", badgeClass: "b-green" },
  { unitNo: "B-1502", project: "Palm Residency", projectId: "p1", config: "3 BHK", carpet: "1,480 sqft", floor: "15", facing: "North", price: "₹1.72 Cr", status: "held", statusLabel: "Held", badgeClass: "b-amber" },
  { unitNo: "GV-703", project: "Green Vista Towers", projectId: "p2", config: "2 BHK", carpet: "980 sqft", floor: "7", facing: "East", price: "₹95 L", status: "available", statusLabel: "Available", badgeClass: "b-green" },
  { unitNo: "GV-902", project: "Green Vista Towers", projectId: "p2", config: "4 BHK", carpet: "2,100 sqft", floor: "9", facing: "South", price: "₹1.9 Cr", status: "booked", statusLabel: "Booked", badgeClass: "b-rose" },
  { unitNo: "DG-P142", project: "Dholera Greenfield", projectId: "p3", config: "Plot", carpet: "2,400 sqft", floor: "—", facing: "Corner", price: "₹48 L", status: "available", statusLabel: "Available", badgeClass: "b-green" },
  { unitNo: "DG-P088", project: "Dholera Greenfield", projectId: "p3", config: "Plot", carpet: "1,800 sqft", floor: "—", facing: "—", price: "₹42 L", status: "sold", statusLabel: "Sold", badgeClass: "b-gray" },
  { unitNo: "MB-2203", project: "Marina Bay", projectId: "p4", config: "2 BHK", carpet: "1,150 sqft", floor: "22", facing: "Sea", price: "AED 2.1M", status: "available", statusLabel: "Available", badgeClass: "b-green" },
  { unitNo: "MB-1804", project: "Marina Bay", projectId: "p4", config: "3 BHK", carpet: "1,620 sqft", floor: "18", facing: "Sea", price: "AED 3.4M", status: "held", statusLabel: "Held", badgeClass: "b-amber" },
  { unitNo: "PR-401", project: "Palm Residency", projectId: "p1", config: "2 BHK", carpet: "1,050 sqft", floor: "4", facing: "East", price: "₹1.12 Cr", status: "booked", statusLabel: "Booked", badgeClass: "b-rose" },
  { unitNo: "SH-1201", project: "Skyline Heights", projectId: "p5", config: "3 BHK", carpet: "1,390 sqft", floor: "12", facing: "East", price: "₹1.35 Cr", status: "available", statusLabel: "Available", badgeClass: "b-green" },
];

const GRID_UNITS = [
  { no: "B-301", status: "avl" }, { no: "B-302", status: "bkd" }, { no: "B-303", status: "avl" },
  { no: "B-304", status: "hld" }, { no: "B-305", status: "bkd" }, { no: "B-306", status: "avl" },
  { no: "B-307", status: "sld" }, { no: "B-401", status: "avl" }, { no: "B-402", status: "bkd" },
  { no: "B-403", status: "avl" }, { no: "B-404", status: "avl" }, { no: "B-405", status: "bkd" },
  { no: "B-406", status: "hld" }, { no: "B-407", status: "avl" }, { no: "B-501", status: "bkd" },
  { no: "B-502", status: "avl" }, { no: "B-503", status: "avl" }, { no: "B-504", status: "bkd" },
  { no: "B-505", status: "avl" }, { no: "B-506", status: "sld" }, { no: "B-507", status: "avl" },
];

const STATUS_TABS = ["All", "Available", "Booked", "Held", "Sold"] as const;
const PROJECT_FILTERS = ["All projects", "Palm Residency", "Green Vista Towers", "Dholera Greenfield", "Marina Bay", "Skyline Heights"];
const CONFIG_FILTERS = ["All configs", "2 BHK", "3 BHK", "4 BHK", "Plot"];

export default function AllUnitsPage() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState(0);
  const [projectFilter, setProjectFilter] = useState("All projects");
  const [configFilter, setConfigFilter] = useState("All configs");

  const filtered = UNITS.filter((u) => {
    if (search && !u.unitNo.toLowerCase().includes(search.toLowerCase()) && !u.project.toLowerCase().includes(search.toLowerCase())) return false;
    if (projectFilter !== "All projects" && u.project !== projectFilter) return false;
    if (configFilter !== "All configs" && u.config !== configFilter) return false;
    if (statusTab === 1 && u.status !== "available") return false;
    if (statusTab === 2 && u.status !== "booked") return false;
    if (statusTab === 3 && u.status !== "held") return false;
    if (statusTab === 4 && u.status !== "sold") return false;
    return true;
  });

  const totalUnits = UNITS.length;
  const availableUnits = UNITS.filter((u) => u.status === "available").length;
  const bookedUnits = UNITS.filter((u) => u.status === "booked").length;
  const heldUnits = UNITS.filter((u) => u.status === "held").length;
  const soldUnits = UNITS.filter((u) => u.status === "sold").length;

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Icon name="building" size={14} /> Sales</div>
          <h1>All Units</h1>
          <div className="sub">Every unit across all projects in one place — status, pricing and availability without opening each project.</div>
        </div>
        <div className="actions">
          <button className="btn btn-ghost">⬇ Export</button>
          <Link href="/org/projects/all-units/create" className="btn btn-primary">＋ Add unit</Link>
        </div>
      </div>

      <div className="psub reveal in" data-delay="1">
        <Link href="/org/projects">All Projects</Link>
        <Link href="/org/projects/all-units" className="active">All Units</Link>
      </div>

      <div className="ustatus reveal in" data-delay="1">
        <div className="ust tot"><div className="n"><CountUp value={totalUnits} /></div><div className="l">Total units</div></div>
        <div className="ust av"><div className="n" style={{ color: "#0f9d6f" }}><CountUp value={availableUnits} /></div><div className="l">Available</div></div>
        <div className="ust bk"><div className="n" style={{ color: "#e11d48" }}><CountUp value={bookedUnits} /></div><div className="l">Booked</div></div>
        <div className="ust hl"><div className="n" style={{ color: "#b45309" }}><CountUp value={heldUnits} /></div><div className="l">Held / Blocked</div></div>
        <div className="ust sl"><div className="n" style={{ color: "#475569" }}><CountUp value={soldUnits} /></div><div className="l">Sold &amp; registered</div></div>
      </div>

      <Reveal delay={1}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
          <div className="tb-search" style={{ flex: 1, minWidth: 220, maxWidth: 320, position: "static", margin: 0 }}>
            <span className="si"><Icon name="search" size={14} /></span>
            <input className="inp" style={{ paddingLeft: 40 }} placeholder="Search unit no. / lead…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="inp" style={{ maxWidth: 190 }} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            {PROJECT_FILTERS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <select className="inp" style={{ maxWidth: 150 }} value={configFilter} onChange={(e) => setConfigFilter(e.target.value)}>
            {CONFIG_FILTERS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <div className="seg">
            {STATUS_TABS.map((t, i) => (
              <span key={t} className={statusTab === i ? "on" : ""} onClick={() => setStatusTab(i)}>{t}</span>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={2}>
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-h"><span className="t">Availability — Palm Residency, Tower B</span><span className="x">Click a unit to open</span></div>
          <div className="card-b">
            <div className="avail">
              {GRID_UNITS.map((u) => (
                <div key={u.no} className={`u-cell ${u.status}`}>{u.no}</div>
              ))}
            </div>
            <div className="legend">
              <span><i style={{ background: "#10b981" }} />Available</span>
              <span><i style={{ background: "#f43f5e" }} />Booked</span>
              <span><i style={{ background: "#f59e0b" }} />Held</span>
              <span><i style={{ background: "#64748b" }} />Sold</span>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={3}>
        <div className="card">
          <div className="card-h"><span className="t">Units</span><span className="x">{totalUnits} total · showing {filtered.length}</span></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Unit</th><th>Project</th><th>Config</th><th>Carpet</th><th>Floor</th><th>Facing</th><th>Price</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="muted">No units match this filter.</td></tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u.unitNo}>
                      <td><Link href={`/org/projects/${u.projectId}/units`} style={{ fontWeight: 600, color: "var(--brand)" }}>{u.unitNo}</Link></td>
                      <td>{u.project}</td>
                      <td>{u.config}</td>
                      <td>{u.carpet}</td>
                      <td>{u.floor}</td>
                      <td>{u.facing}</td>
                      <td>{u.price}</td>
                      <td><span className={`badge ${u.badgeClass}`}>{u.statusLabel}</span></td>
                      <td><Link href={`/org/projects/${u.projectId}/units`} className="btn btn-ghost btn-sm">Open</Link></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
    </>
  );
}
