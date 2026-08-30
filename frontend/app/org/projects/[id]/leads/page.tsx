"use client";

// Static mockup carried over from the previous hardcoded project folder.
// The Leads domain is out of scope for this build — nothing here is wired
// to the backend. It exists so the project tab bar doesn't 404.

import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Seg } from "@/components/superadmin/seg";
import { Icon } from "@/components/icons";
import { ProjectPageHead } from "@/components/org/project-tabs";
import "@/app/admin-console/superadmin.css";
import "../../projects.css";

type Lead = {
  name: string;
  initials: string;
  avClass?: string;
  phone: string;
  interest: string;
  source: string;
  sourceBadge: string;
  assignee: string | null;
  assigneeInitials?: string;
  assigneeAv?: string;
  status: string;
  statusBadge: string;
  summary: string;
};

const LEADS: Lead[] = [
  {
    name: "Rakesh Mehta", initials: "RM", phone: "+91 98250 43117",
    interest: "3 BHK", source: "Meta", sourceBadge: "b-sky",
    assignee: "Priya Sharma", assigneeInitials: "PS", assigneeAv: "a2",
    status: "Site Visit", statusBadge: "b-indigo",
    summary: "Ready buyer, budget ₹1.1 Cr, visited Tower B.",
  },
  {
    name: "Nisha Shah", initials: "NS", avClass: "a3", phone: "+91 99040 22876",
    interest: "2 BHK", source: "Google", sourceBadge: "b-amber",
    assignee: "Aditya Verma", assigneeInitials: "AV", assigneeAv: "a3",
    status: "Follow-up", statusBadge: "b-amber",
    summary: "First-time buyer, wants Dec-2027 possession clarity.",
  },
  {
    name: "Dhruv Kapadia", initials: "DK", avClass: "a5", phone: "+91 97250 11903",
    interest: "4 BHK", source: "WhatsApp", sourceBadge: "b-green",
    assignee: "Rohit Menon", assigneeInitials: "RM",
    status: "Negotiation", statusBadge: "b-violet",
    summary: "Penthouse interest, negotiating on floor-rise charge.",
  },
  {
    name: "Meera Patel", initials: "MP", avClass: "a2", phone: "+91 98790 55402",
    interest: "3 BHK", source: "Walk-in", sourceBadge: "b-gray",
    assignee: "Sneha Kulkarni", assigneeInitials: "SK", assigneeAv: "a2",
    status: "New", statusBadge: "b-gray",
    summary: "Walk-in at site office, took brochure, warm intent.",
  },
  {
    name: "Harsh Trivedi", initials: "HT", phone: "+91 96240 78811",
    interest: "2 BHK", source: "Meta", sourceBadge: "b-sky",
    assignee: "Priya Sharma", assigneeInitials: "PS", assigneeAv: "a2",
    status: "Contacted", statusBadge: "b-sky",
    summary: "Investor, comparing with SG Highway resale rates.",
  },
  {
    name: "Anjali Vora", initials: "AV", avClass: "a3", phone: "+91 99250 30014",
    interest: "3 BHK", source: "WhatsApp", sourceBadge: "b-green",
    assignee: "Aditya Verma", assigneeInitials: "AV", assigneeAv: "a3",
    status: "Won", statusBadge: "b-green",
    summary: "Booked Unit 1204, token paid ₹2 L, loan in process.",
  },
  {
    name: "Kunal Joshi", initials: "KJ", avClass: "a5", phone: "+91 97120 66233",
    interest: "4 BHK", source: "Google", sourceBadge: "b-amber",
    assignee: "Rohit Menon", assigneeInitials: "RM",
    status: "Site Visit", statusBadge: "b-indigo",
    summary: "NRI buyer, virtual tour done, site visit on weekend.",
  },
  {
    name: "Riya Desai", initials: "RD", avClass: "a2", phone: "+91 98980 41590",
    interest: "2 BHK", source: "Meta", sourceBadge: "b-sky",
    assignee: "Sneha Kulkarni", assigneeInitials: "SK", assigneeAv: "a2",
    status: "Lost", statusBadge: "b-rose",
    summary: "Budget mismatch, went for a 2 BHK resale nearby.",
  },
  {
    name: "Sameer Gandhi", initials: "SG", phone: "+91 99790 87456",
    interest: "3 BHK", source: "Walk-in", sourceBadge: "b-gray",
    assignee: "Priya Sharma", assigneeInitials: "PS", assigneeAv: "a2",
    status: "Follow-up", statusBadge: "b-amber",
    summary: "Wants corner unit, awaiting availability confirmation.",
  },
  {
    name: "Tanvi Pandya", initials: "TP", avClass: "a3", phone: "+91 98240 90021",
    interest: "4 BHK", source: "WhatsApp", sourceBadge: "b-green",
    assignee: null,
    status: "New", statusBadge: "b-gray",
    summary: "Penthouse enquiry, high budget, needs callback.",
  },
];

export default function OrgProjectLeadsPage() {
  return (
    <>
      <ProjectPageHead
        active="leads"
        actions={
          <>
            <button className="btn btn-ghost">🔗 Public page</button>
            <button className="btn btn-primary">＋ Add lead</button>
          </>
        }
      />

      <Reveal delay={1}>
        <div className="help" style={{ marginBottom: 18 }}>
          Lead management isn&apos;t wired up yet — this is a preview of the
          project Leads workspace.
        </div>
      </Reveal>

      <Reveal delay={1}>
        <div style={{ marginBottom: 20 }}>
          <Seg options={["All Leads", "Follow Ups", "Site Visits", "Closures"]} defaultIndex={0} />
        </div>
      </Reveal>

      <div className="grid g4" style={{ marginBottom: 20 }}>
        <Reveal delay={1}>
          <div className="stat">
            <div className="top">
              <span className="label">Total leads</span>
              <span className="ic ic-indigo"><Icon name="crm" size={16} /></span>
            </div>
            <div className="value"><CountUp value={214} /></div>
            <div className="delta up">↑ 12% this month</div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="stat">
            <div className="top">
              <span className="label">New</span>
              <span className="ic ic-sky"><Icon name="download" size={16} /></span>
            </div>
            <div className="value"><CountUp value={22} /></div>
            <div className="delta">Awaiting first touch</div>
          </div>
        </Reveal>
        <Reveal delay={3}>
          <div className="stat">
            <div className="top">
              <span className="label">Site visits</span>
              <span className="ic ic-amber"><Icon name="calendar" size={16} /></span>
            </div>
            <div className="value"><CountUp value={18} /></div>
            <div className="delta up">6 scheduled this week</div>
          </div>
        </Reveal>
        <Reveal delay={4}>
          <div className="stat">
            <div className="top">
              <span className="label">Booked</span>
              <span className="ic ic-green"><Icon name="star" size={16} /></span>
            </div>
            <div className="value"><CountUp value={6} /></div>
            <div className="delta up">₹5.9 Cr booked value</div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={2}>
        <div className="card">
          <div className="card-h">
            <div className="tb-search" style={{ maxWidth: 320, position: "static", margin: 0 }}>
              <span className="si"><Icon name="search" size={14} /></span>
              <input placeholder="Search by name or phone…" />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select className="inp" style={{ width: "auto" }} defaultValue="All Sources">
                <option>All Sources</option><option>Meta</option><option>Google</option>
                <option>WhatsApp</option><option>Walk-in</option>
              </select>
              <select className="inp" style={{ width: "auto" }} defaultValue="All Statuses">
                <option>All Statuses</option><option>New</option><option>Contacted</option>
                <option>Follow-up</option><option>Site Visit</option><option>Negotiation</option>
                <option>Won</option><option>Lost</option>
              </select>
              <select className="inp" style={{ width: "auto" }} defaultValue="All Agents">
                <option>All Agents</option><option>Priya Sharma</option><option>Aditya Verma</option>
                <option>Rohit Menon</option><option>Sneha Kulkarni</option>
              </select>
            </div>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Lead</th><th>Interested in</th><th>Source</th><th>Assigned To</th>
                  <th>Status</th><th>AI Summary</th><th></th>
                </tr>
              </thead>
              <tbody>
                {LEADS.map((l) => (
                  <tr key={l.phone}>
                    <td>
                      <Link className="u" href="/org/leads" style={{ textDecoration: "none" }}>
                        <span className={`av ${l.avClass ?? ""}`}>{l.initials}</span>
                        <span>
                          <span className="nm">{l.name}</span><br />
                          <span className="sm">{l.phone}</span>
                        </span>
                      </Link>
                    </td>
                    <td><span className="chip">{l.interest}</span></td>
                    <td><span className={`badge ${l.sourceBadge}`}>{l.source}</span></td>
                    <td>
                      {l.assignee ? (
                        <span className="u">
                          <span className={`av ${l.assigneeAv ?? ""}`}>{l.assigneeInitials}</span>
                          <span className="nm">{l.assignee}</span>
                        </span>
                      ) : (
                        <span className="muted">Unassigned</span>
                      )}
                    </td>
                    <td><span className={`badge ${l.statusBadge}`}>{l.status}</span></td>
                    <td className="muted">{l.summary}</td>
                    <td>
                      <Link className="btn btn-ghost btn-sm" href="/org/leads">Open</Link>
                    </td>
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
