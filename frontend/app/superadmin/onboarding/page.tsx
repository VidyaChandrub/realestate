import type { Metadata } from "next";
import { Switch } from "@/components/superadmin/switch";

export const metadata: Metadata = {
  title: "Onboard Organisation · iPixxel Realty Super Admin",
};

const STEPS = [
  { n: "1", label: "Company", state: "done" },
  { n: "2", label: "Admin account", state: "on" },
  { n: "3", label: "Plan", state: "" },
  { n: "4", label: "Templates & modules", state: "" },
  { n: "5", label: "Review", state: "" },
];

export default function SuperAdminOnboardingPage() {
  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">✨ New organisation</div>
          <h1>Onboard an organisation</h1>
          <div className="sub">
            Set up a developer or agency, create its admin, choose a plan, and grant starter templates — all in
            one flow.
          </div>
        </div>
      </div>

      <div className="wiz reveal in">
        {STEPS.map((s) => (
          <div key={s.n} className={`st ${s.state}`} data-n={s.n}>
            {s.label}
          </div>
        ))}
      </div>

      <div className="grid g-2-1">
        <div className="card reveal in" data-delay="1">
          <div className="card-h">
            <span className="t">Step 2 · Organisation admin</span>
            <span className="x">This person manages the whole organisation</span>
          </div>
          <div className="card-b">
            <div className="row2">
              <div className="field">
                <label>First name</label>
                <input className="inp" defaultValue="Rohan" />
              </div>
              <div className="field">
                <label>Last name</label>
                <input className="inp" defaultValue="Shah" />
              </div>
            </div>
            <div className="field">
              <label>Work email (login)</label>
              <input className="inp" defaultValue="admin@skylinedev.com" />
              <div className="hint">A temporary password &amp; login link will be emailed. Must be unique.</div>
            </div>
            <div className="row2">
              <div className="field">
                <label>Phone number</label>
                <input className="inp" defaultValue="+91 98250 12345" />
              </div>
              <div className="field">
                <label>Role</label>
                <select>
                  <option>Admin (full org access)</option>
                  <option>Manager</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Send credentials via</label>
              <div style={{ display: "flex", gap: 18, marginTop: 4 }}>
                <label className="check">
                  <input type="checkbox" defaultChecked /> Email
                </label>
                <label className="check">
                  <input type="checkbox" defaultChecked /> WhatsApp
                </label>
                <label className="check">
                  <input type="checkbox" /> SMS
                </label>
              </div>
            </div>
            <div
              className="field"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: "14px 16px",
              }}
            >
              <div>
                <b style={{ fontSize: 13.5 }}>Force password change on first login</b>
                <div className="hint" style={{ marginTop: 2 }}>
                  Recommended for security
                </div>
              </div>
              <Switch defaultOn />
            </div>
            <div className="divider" />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button className="btn btn-ghost">← Back</button>
              <button className="btn btn-primary">Continue to plan →</button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card reveal in" data-delay="2">
            <div className="card-h">
              <span className="t">Summary</span>
            </div>
            <div className="card-b">
              <div className="u" style={{ marginBottom: 14 }}>
                <span className="av" style={{ width: 44, height: 44, borderRadius: 12, fontSize: 15 }}>
                  SD
                </span>
                <span>
                  <span className="nm" style={{ fontSize: 15 }}>
                    Skyline Developers
                  </span>
                  <br />
                  <span className="sm">Ahmedabad, India</span>
                </span>
              </div>
              <ul className="timeline" style={{ marginTop: 6 }}>
                <li>
                  <span className="td" style={{ background: "var(--green)" }} />
                  <b style={{ fontSize: 13 }}>Company details</b>
                  <div className="tt">Skyline Developers · slug skyline-developers</div>
                </li>
                <li>
                  <span className="td" />
                  <b style={{ fontSize: 13 }}>Admin account</b>
                  <div className="tt">Rohan Shah · admin@skylinedev.com</div>
                </li>
                <li>
                  <span className="td" style={{ background: "var(--line-2)" }} />
                  <b style={{ fontSize: 13, color: "var(--muted)" }}>Plan</b>
                  <div className="tt">Pending</div>
                </li>
                <li>
                  <span className="td" style={{ background: "var(--line-2)" }} />
                  <b style={{ fontSize: 13, color: "var(--muted)" }}>Templates &amp; modules</b>
                  <div className="tt">Pending</div>
                </li>
              </ul>
            </div>
          </div>
          <div className="help reveal in" data-delay="3">
            <b>What happens on activate</b>
            <br />
            The organisation is created, the admin is emailed a login, granted templates become available, and
            audit logs start recording. The admin can then create teams &amp; landing pages.
          </div>
        </div>
      </div>
    </>
  );
}