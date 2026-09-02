"use client";

// Static mockup carried over from the previous hardcoded project folder.
// Analytics/Insights is out of scope for this build — nothing here is wired
// to the backend. It exists so the project tab bar doesn't 404.

import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { ProgressBar } from "@/components/superadmin/progress-bar";
import { Icon } from "@/components/icons";
import { ProjectPageHead } from "@/components/org/project-tabs";
import "@/app/org/org.css";

const SPEND = [
  { m: "Mar", val: "₹1.9L", h: "52%" },
  { m: "Apr", val: "₹2.2L", h: "61%" },
  { m: "May", val: "₹2.8L", h: "74%" },
  { m: "Jun", val: "₹2.5L", h: "67%" },
  { m: "Jul", val: "₹3.1L", h: "86%" },
  { m: "Aug", val: "₹3.4L", h: "100%" },
];

const SOURCES = [
  { name: "Meta", pct: "46%" },
  { name: "Google", pct: "24%" },
  { name: "WhatsApp", pct: "18%" },
  { name: "Walk-in", pct: "12%" },
];

const FUNNEL = [
  { stage: "New", count: 214, w: "100%" },
  { stage: "Contacted", count: 168, w: "78%" },
  { stage: "Site visit", count: 18, w: "8.4%" },
  { stage: "Negotiation", count: 11, w: "5.1%" },
  { stage: "Booked", count: 6, w: "2.8%" },
];

const AGENTS = [
  { initials: "PS", av: "a2", name: "Priya Sharma", leads: 64, visits: 7, bookings: 3 },
  { initials: "AV", av: "a3", name: "Aditya Verma", leads: 58, visits: 5, bookings: 2 },
  { initials: "RM", av: "", name: "Rohit Menon", leads: 52, visits: 4, bookings: 1 },
  { initials: "SK", av: "a5", name: "Sneha Kulkarni", leads: 40, visits: 2, bookings: 0 },
];

export default function OrgProjectInsightsPage() {
  return (
    <>
      <ProjectPageHead
        active="insights"
        actions={
          <button className="btn btn-primary">＋ Add lead</button>
        }
      />

      <Reveal delay={1}>
        <div className="help mb-18">
          Insights aren&apos;t wired up yet — figures below are placeholder data.
        </div>
      </Reveal>

      <div className="grid g4 mb-20">
        <Reveal delay={1}>
          <div className="stat">
            <div className="top">
              <span className="label">Leads</span>
              <span className="ic ic-indigo"><Icon name="crm" size={16} /></span>
            </div>
            <div className="value"><CountUp value={214} /></div>
            <div className="delta up">↑ 12% this month</div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="stat">
            <div className="top">
              <span className="label">Cost per lead</span>
              <span className="ic ic-sky"><Icon name="billing" size={16} /></span>
            </div>
            <div className="value"><CountUp value={298} pre="₹" /></div>
            <div className="delta up">↓ 8% vs last month</div>
          </div>
        </Reveal>
        <Reveal delay={3}>
          <div className="stat">
            <div className="top">
              <span className="label">Site-visit rate</span>
              <span className="ic ic-amber"><Icon name="calendar" size={16} /></span>
            </div>
            <div className="value"><CountUp value={8.4} dec={1} suf="%" /></div>
            <div className="delta">18 of 214 leads</div>
          </div>
        </Reveal>
        <Reveal delay={4}>
          <div className="stat">
            <div className="top">
              <span className="label">Booking rate</span>
              <span className="ic ic-green"><Icon name="star" size={16} /></span>
            </div>
            <div className="value"><CountUp value={2.8} dec={1} suf="%" /></div>
            <div className="delta up">6 bookings</div>
          </div>
        </Reveal>
      </div>

      <div className="grid g2 mb-20">
        <Reveal delay={1}>
          <div className="card">
            <div className="card-h">
              <span className="t">Leads by source</span>
              <span className="badge b-gray">Last 30 days</span>
            </div>
            <div className="card-b">
              {SOURCES.map((s) => (
                <div className="barrow" key={s.name}>
                  <div className="lab">
                    <span>{s.name}</span>
                    <b>{s.pct}</b>
                  </div>
                  <ProgressBar width={s.pct} />
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="card">
            <div className="card-h">
              <span className="t">Spend vs leads</span>
              <span className="badge b-gray">6 months</span>
            </div>
            <div className="card-b">
              <div className="vchart">
                {SPEND.map((c) => (
                  <div className="col" key={c.m}>
                    <span className="val">{c.val}</span>
                    <div className="track">
                      <div className="fill" style={{ height: c.h }} />
                    </div>
                    <span className="m">{c.m}</span>
                  </div>
                ))}
              </div>
              <div className="muted fs-12-5 mt-10">
                Total spend ₹15.9 L · 214 leads · blended CPL ₹298
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      <div className="grid g2">
        <Reveal delay={1}>
          <div className="card">
            <div className="card-h"><span className="t">Conversion funnel</span></div>
            <div className="card-b">
              {FUNNEL.map((f) => (
                <div className="barrow" key={f.stage}>
                  <div className="lab">
                    <span>{f.stage}</span>
                    <b>{f.count}</b>
                  </div>
                  <ProgressBar width={f.w} />
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="card">
            <div className="card-h"><span className="t">Agent performance</span></div>
            <div className="card-b">
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr><th>Agent</th><th>Leads</th><th>Visits</th><th>Bookings</th></tr>
                  </thead>
                  <tbody>
                    {AGENTS.map((a) => (
                      <tr key={a.name}>
                        <td>
                          <span className="u">
                            <span className={`av ${a.av}`}>{a.initials}</span>
                            <span className="nm">{a.name}</span>
                          </span>
                        </td>
                        <td>{a.leads}</td>
                        <td>{a.visits}</td>
                        <td>{a.bookings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </>
  );
}
