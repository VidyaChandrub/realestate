import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Seg } from "@/components/superadmin/seg";
import { Icon } from "@/components/icons";
import { LeadsPageHead } from "@/components/org/crm-tabs";

export const metadata = { title: "iPixxel Realty · Lead Center" };

type Lead = {
  initials: string;
  avClass?: string;
  name: string;
  phone: string;
  project: string;
  source: string;
  sourceBadge: string;
  assignee: { initials: string; avClass?: string; name: string } | null;
  status: string;
  statusBadge: string;
  summary: string;
};

const LEADS: Lead[] = [
  {
    initials: "AR", name: "Aarav Reddy", phone: "+91 98220 41567", project: "Palm Residency",
    source: "Meta", sourceBadge: "b-indigo", assignee: { initials: "SK", avClass: "a2", name: "Sneha K." },
    status: "Follow-up", statusBadge: "b-amber", summary: "Wants 3 BHK, budget ₹1.4 Cr, call back Fri.",
  },
  {
    initials: "MI", avClass: "a2", name: "Meera Iyer", phone: "+91 99870 22314", project: "Green Vista Towers",
    source: "Google", sourceBadge: "b-sky", assignee: { initials: "RM", avClass: "a3", name: "Rohit M." },
    status: "Contacted", statusBadge: "b-sky", summary: "Comparing with rival tower, price-sensitive.",
  },
  {
    initials: "KP", avClass: "a5", name: "Karan Patel", phone: "+91 97250 88109", project: "Dholera Greenfield",
    source: "WhatsApp", sourceBadge: "b-green", assignee: null,
    status: "New", statusBadge: "b-gray", summary: "Plot enquiry, investor intent, high urgency.",
  },
  {
    initials: "DS", avClass: "a4", name: "Divya Shah", phone: "+91 98980 33471", project: "Palm Residency",
    source: "Meta", sourceBadge: "b-indigo", assignee: { initials: "SK", avClass: "a2", name: "Sneha K." },
    status: "Negotiation", statusBadge: "b-violet", summary: "Finalising ₹1.62 Cr, wants floor-rise waiver.",
  },
  {
    initials: "FS", avClass: "a3", name: "Farhan Sheikh", phone: "+971 50 442 8810", project: "Marina Bay Dubai",
    source: "Landing", sourceBadge: "b-amber", assignee: { initials: "VC", avClass: "a4", name: "Vijay C." },
    status: "Site Visit", statusBadge: "b-indigo", summary: "NRI buyer, visit booked Sat 11 AM.",
  },
  {
    initials: "PN", name: "Priyanka Nambiar", phone: "+91 90040 17722", project: "Green Vista Towers",
    source: "WhatsApp", sourceBadge: "b-green", assignee: { initials: "RM", avClass: "a3", name: "Rohit M." },
    status: "Follow-up", statusBadge: "b-amber", summary: "Needs home-loan help, EMI ~₹95k okay.",
  },
  {
    initials: "AK", avClass: "a2", name: "Arjun Khanna", phone: "+91 98111 90042", project: "Palm Residency",
    source: "Google", sourceBadge: "b-sky", assignee: { initials: "PN", name: "Priya N." },
    status: "Won", statusBadge: "b-green", summary: "Booked 2 BHK, token ₹5 L received.",
  },
  {
    initials: "RG", avClass: "a4", name: "Rhea Gupta", phone: "+91 96540 33128", project: "Marina Bay Dubai",
    source: "Meta", sourceBadge: "b-indigo", assignee: { initials: "VC", avClass: "a4", name: "Vijay C." },
    status: "Contacted", statusBadge: "b-sky", summary: "Golden-visa interest, requested brochure.",
  },
  {
    initials: "SV", avClass: "a5", name: "Sameer Verma", phone: "+91 98250 71190", project: "Dholera Greenfield",
    source: "Landing", sourceBadge: "b-amber", assignee: null,
    status: "New", statusBadge: "b-gray", summary: "Downloaded price list, no reply yet.",
  },
  {
    initials: "NB", avClass: "a3", name: "Nisha Bhatt", phone: "+971 55 209 3376", project: "Marina Bay Dubai",
    source: "WhatsApp", sourceBadge: "b-green", assignee: { initials: "PN", name: "Priya N." },
    status: "Negotiation", statusBadge: "b-violet", summary: "AED 1.9 M, wants payment-plan split.",
  },
  {
    initials: "TC", avClass: "a2", name: "Tarun Chopra", phone: "+91 99300 46651", project: "Green Vista Towers",
    source: "Meta", sourceBadge: "b-indigo", assignee: { initials: "RM", avClass: "a3", name: "Rohit M." },
    status: "Not responding", statusBadge: "b-rose", summary: "4 calls unanswered, DND after 8 PM.",
  },
  {
    initials: "LM", avClass: "a4", name: "Lakshmi Menon", phone: "+91 94480 55219", project: "Palm Residency",
    source: "Google", sourceBadge: "b-sky", assignee: { initials: "SK", avClass: "a2", name: "Sneha K." },
    status: "Site Visit", statusBadge: "b-indigo", summary: "Visited sample flat, liked east-facing.",
  },
  {
    initials: "HG", avClass: "a5", name: "Harshad Gandhi", phone: "+91 97020 88431", project: "Dholera Greenfield",
    source: "WhatsApp", sourceBadge: "b-green", assignee: { initials: "VC", avClass: "a4", name: "Vijay C." },
    status: "Lost", statusBadge: "b-rose", summary: "Bought elsewhere, budget mismatch.",
  },
];

export default function OrgLeadsPage() {
  return (
    <>
      <LeadsPageHead
        active="lead-center"
        actions={
          <>
            <button className="btn btn-ghost">Import</button>
            <button className="btn btn-primary">＋ Add lead</button>
          </>
        }
      />

      <Reveal delay={1}>
        <div style={{ marginBottom: 20 }}>
          <Seg options={["All Leads", "Follow Ups", "Site Visits", "Closures", "Settings"]} defaultIndex={0} />
        </div>
      </Reveal>

      <div className="grid g4" style={{ marginBottom: 20 }}>
        <Reveal delay={1}>
          <div className="stat">
            <div className="top"><span className="label">New today</span><span className="ic ic-indigo"><Icon name="download" size={16} /></span></div>
            <div className="value"><CountUp value={18} /></div>
            <div className="delta up">↑ 22% vs yesterday</div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="stat">
            <div className="top"><span className="label">Unassigned</span><span className="ic ic-rose"><Icon name="alert" size={16} /></span></div>
            <div className="value"><CountUp value={7} /></div>
            <div className="delta">Awaiting routing</div>
          </div>
        </Reveal>
        <Reveal delay={3}>
          <div className="stat">
            <div className="top"><span className="label">Follow-ups due</span><span className="ic ic-amber"><Icon name="bell" size={16} /></span></div>
            <div className="value"><CountUp value={23} /></div>
            <div className="delta">Today &amp; overdue</div>
          </div>
        </Reveal>
        <Reveal delay={4}>
          <div className="stat">
            <div className="top"><span className="label">Won this month</span><span className="ic ic-green"><Icon name="star" size={16} /></span></div>
            <div className="value"><CountUp value={9} /></div>
            <div className="delta up">₹7.4 Cr booked</div>
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
                <option>All Sources</option><option>Meta</option><option>Google</option><option>WhatsApp</option><option>Landing</option>
              </select>
              <select className="inp" style={{ width: "auto" }} defaultValue="All Statuses">
                <option>All Statuses</option><option>New</option><option>Contacted</option><option>Follow-up</option>
                <option>Site Visit</option><option>Negotiation</option><option>Won</option><option>Lost</option>
              </select>
              <select className="inp" style={{ width: "auto" }} defaultValue="All Agents">
                <option>All Agents</option><option>Priya Nair</option><option>Vijay Chandel</option><option>Rohit Menon</option><option>Sneha Kulkarni</option>
              </select>
            </div>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Lead</th><th>Project</th><th>Source</th><th>Assigned To</th><th>Status</th><th>AI Summary</th><th></th></tr>
              </thead>
              <tbody>
                {LEADS.map((l) => (
                  <tr key={l.phone}>
                    <td>
                      <Link className="u" href={`/org/leads/${l.name.toLowerCase().replace(/[^a-z]+/g, "-")}`} style={{ textDecoration: "none" }}>
                        <span className={`av ${l.avClass ?? ""}`}>{l.initials}</span>
                        <span><span className="nm">{l.name}</span><br /><span className="sm">{l.phone}</span></span>
                      </Link>
                    </td>
                    <td>{l.project}</td>
                    <td><span className={`badge ${l.sourceBadge}`}>{l.source}</span></td>
                    <td>
                      {l.assignee ? (
                        <span className="u">
                          <span className={`av ${l.assignee.avClass ?? ""}`}>{l.assignee.initials}</span>
                          <span className="nm">{l.assignee.name}</span>
                        </span>
                      ) : (
                        <span className="muted">Unassigned</span>
                      )}
                    </td>
                    <td><span className={`badge ${l.statusBadge}`}>{l.status}</span></td>
                    <td className="muted">{l.summary}</td>
                    <td><Link className="btn btn-ghost btn-sm" href={`/org/leads/${l.name.toLowerCase().replace(/[^a-z]+/g, "-")}`}>Open</Link></td>
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
