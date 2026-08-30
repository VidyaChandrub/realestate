"use client";

// Static mockup carried over from the previous hardcoded project folder.
// AI Calling is out of scope for this build — nothing here is wired to the
// backend. It exists so the project tab bar doesn't 404.

import Link from "next/link";
import { useParams } from "next/navigation";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { ProgressBar } from "@/components/superadmin/progress-bar";
import { Icon } from "@/components/icons";
import { ProjectPageHead } from "@/components/org/project-tabs";
import "@/app/admin-console/superadmin.css";
import "../../projects.css";

const CALLS = [
  {
    lead: "Meera Joshi",
    outcome: "Connected",
    badge: "b-green",
    duration: "3:12",
    summary: "Interested in 3 BHK, budget ₹1.1 Cr — booked Sat 11 AM site visit.",
    time: "10:42 AM",
  },
  {
    lead: "Rakesh Patel",
    outcome: "Connected",
    badge: "b-green",
    duration: "2:05",
    summary: "Wants 2 BHK near SG Highway; asked for brochure on WhatsApp.",
    time: "10:18 AM",
  },
  {
    lead: "Nilesh Shah",
    outcome: "Voicemail",
    badge: "b-amber",
    duration: "0:38",
    summary: "Left callback message; retry scheduled for evening.",
    time: "09:55 AM",
  },
  {
    lead: "Anjali Desai",
    outcome: "Connected",
    badge: "b-green",
    duration: "2:47",
    summary: "4 BHK penthouse enquiry, budget ₹2.4 Cr — visit Sun 4 PM.",
    time: "09:30 AM",
  },
  {
    lead: "Sanjay Mehta",
    outcome: "Busy",
    badge: "b-rose",
    duration: "0:00",
    summary: "Line busy on 2 attempts; queued for auto-retry.",
    time: "Yesterday",
  },
  {
    lead: "Pooja Trivedi",
    outcome: "Connected",
    badge: "b-green",
    duration: "1:54",
    summary: "Comparing 2 & 3 BHK; possession Dec 2027 confirmed, follow-up set.",
    time: "Yesterday",
  },
];

export default function OrgProjectAiCallingPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  return (
    <>
      <ProjectPageHead
        active="ai-calling"
        actions={
          <>
            <button className="btn btn-ghost">🔗 Public page</button>
            <button className="btn btn-primary">＋ Add lead</button>
          </>
        }
      />

      <Reveal delay={1}>
        <div className="help" style={{ marginBottom: 18 }}>
          AI calling isn&apos;t wired up yet — this is a preview of the agent
          workspace.
        </div>
      </Reveal>

      {/* AI AGENT ASSIGNED */}
      <Reveal delay={1}>
        <div className="card">
          <div className="card-h">
            <span className="t">AI agent assigned</span>
            <span className="badge b-green">● Active</span>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div className="u" style={{ flex: "0 0 auto" }}>
              <span className="av a2" style={{ width: 54, height: 54, fontSize: 18 }}>AA</span>
              <span>
                <span className="nm" style={{ fontSize: 16 }}>Aarohi</span><br />
                <span className="sm">Site Visit Booker · Voice AI</span>
              </span>
            </div>
            <div style={{ flex: "1 1 320px", minWidth: 280, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <span className="chip">🗣️ Hindi / English</span>
                <span className="chip">📚 Project knowledge</span>
                <span className="chip">📞 Outbound</span>
              </div>
              <p className="muted" style={{ fontSize: 13.5, margin: 0, lineHeight: 1.6 }}>
                <b style={{ color: "var(--ink)" }}>Goal:</b> Qualify inbound leads,
                confirm budget &amp; configuration (2/3/4 BHK), and book a weekend site
                visit. Pitches project pricing, possession and RERA-approved status;
                hands warm leads to the sales team and logs the visit slot to the CRM.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: "0 0 auto" }}>
              <button className="btn btn-ghost">✏️ Edit</button>
              <button className="btn btn-primary">▶ Test call</button>
            </div>
          </div>
        </div>
      </Reveal>

      {/* STAT TILES */}
      <div className="grid g4" style={{ marginTop: 18 }}>
        <Reveal delay={1}>
          <div className="stat">
            <div className="top">
              <span className="label">AI calls</span>
              <span className="ic ic-indigo"><Icon name="sparkles" size={16} /></span>
            </div>
            <div className="value"><CountUp value={342} /></div>
            <div className="delta up">▲ this month</div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="stat">
            <div className="top">
              <span className="label">Connect rate</span>
              <span className="ic ic-sky"><Icon name="phone" size={16} /></span>
            </div>
            <div className="value"><CountUp value={61} suf="%" /></div>
            <div className="delta up">▲ 4 pts</div>
          </div>
        </Reveal>
        <Reveal delay={3}>
          <div className="stat">
            <div className="top">
              <span className="label">Visits booked</span>
              <span className="ic ic-green"><Icon name="calendar" size={16} /></span>
            </div>
            <div className="value"><CountUp value={12} /></div>
            <div className="delta up">▲ 3 this week</div>
          </div>
        </Reveal>
        <Reveal delay={4}>
          <div className="stat">
            <div className="top">
              <span className="label">Avg duration</span>
              <span className="ic ic-amber"><Icon name="bell" size={16} /></span>
            </div>
            <div className="value">2:20</div>
            <div className="delta muted">per connected call</div>
          </div>
        </Reveal>
      </div>

      {/* ACTIVE CAMPAIGN */}
      <Reveal delay={2}>
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-h">
            <span className="t">Active campaign — Weekend Visits</span>
            <span className="badge b-green">● Running</span>
          </div>
          <div className="card-b">
            <div className="grid g3" style={{ marginBottom: 16 }}>
              <div className="sp">
                <div className="k">Leads</div>
                <div className="v"><CountUp value={120} /></div>
              </div>
              <div className="sp">
                <div className="k">Reached</div>
                <div className="v"><CountUp value={98} /></div>
              </div>
              <div className="sp">
                <div className="k">Connected</div>
                <div className="v"><CountUp value={61} /></div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
              <span className="muted">Campaign progress</span>
              <b>82% dialed</b>
            </div>
            <ProgressBar width="82%" />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="btn btn-ghost">⏸ Pause</button>
              <button className="btn btn-primary">View</button>
            </div>
          </div>
        </div>
      </Reveal>

      {/* RECENT AI CALLS */}
      <Reveal delay={2}>
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-h">
            <span className="t">Recent AI calls</span>
            <Link className="x" href="/org/calling" style={{ color: "var(--brand)" }}>All calls →</Link>
          </div>
          <div className="card-b" style={{ padding: 0 }}>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>Lead</th><th>Outcome</th><th>Duration</th><th>AI summary</th><th>Time</th></tr>
                </thead>
                <tbody>
                  {CALLS.map((c) => (
                    <tr key={c.lead + c.time}>
                      <td><span className="u"><span className="nm">{c.lead}</span></span></td>
                      <td><span className={`badge ${c.badge}`}>{c.outcome}</span></td>
                      <td className="mono">{c.duration}</td>
                      <td className="muted">{c.summary}</td>
                      <td className="muted">{c.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={2}>
        <div className="help" style={{ marginTop: 18 }}>
          💡 Aarohi&apos;s call scripts, pricing lines and FAQ answers are pulled live from the{" "}
          <Link
            href={`/org/projects/${id}/knowledge`}
            style={{ color: "var(--brand)", fontWeight: 600 }}
          >
            Knowledge tab
          </Link>{" "}
          for this project. Update project details there and the AI agent speaks the latest.
        </div>
      </Reveal>
    </>
  );
}
