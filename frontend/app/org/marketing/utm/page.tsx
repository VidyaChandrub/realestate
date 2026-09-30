"use client";

import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon } from "@/components/icons";
import "@/app/org/org.css";

const PARAMS = [
  {
    key: "utm_source",
    tip: "Traffic source (google, facebook, newsletter)",
  },
  {
    key: "utm_medium",
    tip: "Marketing medium (cpc, social, email)",
  },
  {
    key: "utm_campaign",
    tip: "Campaign name for grouping ads",
  },
  {
    key: "utm_content",
    tip: "Creative or link variant",
  },
  {
    key: "utm_term",
    tip: "Paid search keywords",
  },
];

export default function OrgMarketingUtmPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            <Icon name="link" size={14} /> Marketing
          </div>
          <h1>UTM Tracking</h1>
          <div className="sub">
            Website visitors are tagged with UTM and referrer data, then merged into
            Lead Center on form submit.
          </div>
        </div>
        <div className="actions">
          <Link className="btn btn-ghost" href="/org/marketing">
            Dashboard
          </Link>
          <Link className="btn btn-primary" href="/org/landing-pages">
            Landing Pages
          </Link>
        </div>
      </div>

      <Reveal delay={1}>
        <div className="help mb-14">
          Tracking is always on for published landing pages and lead forms. First-touch
          and last-touch UTM values are stored on each lead for attribution.
        </div>
      </Reveal>

      <Reveal delay={2}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-h">
            <span className="t">Captured parameters</span>
          </div>
          <div className="card-b">
            <div className="mkt-stub-list">
              {PARAMS.map((p) => (
                <div className="mkt-stub-row" key={p.key}>
                  <div>
                    <code style={{ fontWeight: 650 }}>{p.key}</code>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {p.tip}
                    </div>
                  </div>
                  <span className="badge b-green">Active</span>
                </div>
              ))}
              <div className="mkt-stub-row">
                <div>
                  <code style={{ fontWeight: 650 }}>referrer / landing_page</code>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    Document referrer and first landing URL from the session
                  </div>
                </div>
                <span className="badge b-green">Active</span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={3}>
        <div className="card">
          <div className="card-h">
            <span className="t">Example URL</span>
          </div>
          <div className="card-b">
            <pre
              style={{
                margin: 0,
                padding: 14,
                background: "#F8FAFC",
                borderRadius: 10,
                fontSize: 12,
                overflowX: "auto",
                border: "1px solid #E2E8F0",
              }}
            >
              {`https://yoursite.com/landing?\nutm_source=facebook&utm_medium=cpc&utm_campaign=spring_launch`}
            </pre>
            <p className="muted" style={{ marginBottom: 0, marginTop: 12, fontSize: 13 }}>
              Open Lead Center and check the Source column plus Marketing Attribution on
              a lead detail to verify capture.
            </p>
          </div>
        </div>
      </Reveal>
    </>
  );
}
