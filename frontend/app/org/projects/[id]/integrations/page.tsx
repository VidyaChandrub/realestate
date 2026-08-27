"use client";

// Static mockup carried over from the previous hardcoded project folder.
// Lead-source integrations / distribution rules are out of scope for this
// build — nothing here is wired to the backend. It exists so the project
// tab bar doesn't 404.

import { Reveal } from "@/components/superadmin/reveal";
import { ProjectPageHead } from "@/components/org/project-tabs";

type SourceCard = {
  icon: string;
  name: React.ReactNode;
  desc: string;
  connected: boolean;
};

const SOURCES: SourceCard[] = [
  {
    icon: "📣",
    name: "Facebook & Instagram Lead Ads",
    desc: "Instant-form leads sync in real time from Meta campaigns.",
    connected: true,
  },
  {
    icon: "🔍",
    name: "Google Ads Lead Forms",
    desc: "Lead-form extensions from Search & Discovery campaigns.",
    connected: true,
  },
  {
    icon: "📝",
    name: "Google Forms",
    desc: "Pull responses from a shared Google Form into the CRM.",
    connected: false,
  },
  {
    icon: "🌐",
    name: "Website / landing form",
    desc: "Enquiry form on the project's landing page.",
    connected: true,
  },
  {
    icon: "🔗",
    name: "Webhook",
    desc: "POST JSON payloads from any external portal (99acres, Housing).",
    connected: true,
  },
  {
    icon: "🎪",
    name: <>Property Expo <span className="badge b-gray" style={{ marginLeft: 4 }}>Custom</span></>,
    desc: "Walk-in leads captured at the Ahmedabad Property Expo 2026 stall.",
    connected: true,
  },
];

const RULES = [
  {
    on: true,
    title: "All new leads",
    sub: "Round-robin: Priya Sharma, Aditya Verma",
    badge: "Round-robin",
    badgeClass: "b-indigo",
  },
  {
    on: true,
    title: "Budget ₹2 Cr+",
    sub: "Aditya Verma (NRI desk)",
    badge: "Priority route",
    badgeClass: "b-violet",
  },
  {
    on: false,
    title: "Meta Lead Ads · 4 BHK Penthouse",
    sub: "Vijay Chandel → then AI voice agent Aarohi within 2 min",
    badge: "Fast-track",
    badgeClass: "b-amber",
  },
];

export default function OrgProjectIntegrationsPage() {
  return (
    <>
      <ProjectPageHead
        active="integrations"
        actions={
          <>
            <button className="btn btn-ghost">🔗 Public page</button>
            <button className="btn btn-primary">＋ Add lead</button>
          </>
        }
      />

      <Reveal delay={1}>
        <div className="help" style={{ marginBottom: 14 }}>
          Lead-source integrations aren&apos;t wired up yet — this is a preview.
        </div>
      </Reveal>

      <Reveal delay={1}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            margin: "6px 0 14px",
            color: "var(--muted)",
            fontSize: 11.5,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <span>INCOMING · Lead sources for this project</span>
          <button className="btn btn-ghost" style={{ textTransform: "none", letterSpacing: 0 }}>
            ＋ Add custom source
          </button>
        </div>
      </Reveal>

      <div className="grid g3">
        {SOURCES.map((s, i) => (
          <Reveal delay={(i % 3) + 1} key={typeof s.name === "string" ? s.name : "expo"}>
            <div className="card hover">
              <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 26 }}>{s.icon}</span>
                  {s.connected ? (
                    <span className="badge b-green">Connected</span>
                  ) : (
                    <span className="badge b-gray">Not connected</span>
                  )}
                </div>
                <b>{s.name}</b>
                <div className="muted" style={{ fontSize: 12.5 }}>{s.desc}</div>
                {s.connected ? (
                  <button className="btn btn-ghost btn-block" style={{ marginTop: 4 }}>Configure</button>
                ) : (
                  <button className="btn btn-primary btn-block" style={{ marginTop: 4 }}>Connect</button>
                )}
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={2}>
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-h">
            <span className="t">Distribution rules</span>
            <span className="badge b-sky">3 rules</span>
          </div>
          <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {RULES.map((r) => (
              <div
                key={r.title}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 14px",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                }}
              >
                <div className={`switch${r.on ? " on" : ""}`} />
                <div style={{ flex: 1 }}>
                  <b>{r.title}</b>
                  <div className="muted" style={{ fontSize: 12.5 }}>{r.sub}</div>
                </div>
                <span className={`badge ${r.badgeClass}`}>{r.badge}</span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </>
  );
}
