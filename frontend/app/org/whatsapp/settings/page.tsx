import { Reveal } from "@/components/superadmin/reveal";
import { WhatsAppPageHead } from "@/components/org/crm-tabs";

export const metadata = { title: "iPixxel Realty · WhatsApp Settings" };

const TEMPLATES = [
  { name: "welcome_brochure", category: "b-indigo", categoryLabel: "Marketing", lang: "English", status: "b-green", statusLabel: "Approved" },
  { name: "site_visit_reminder", category: "b-sky", categoryLabel: "Utility", lang: "English", status: "b-green", statusLabel: "Approved" },
  { name: "price_followup_hi", category: "b-indigo", categoryLabel: "Marketing", lang: "Hindi", status: "b-green", statusLabel: "Approved" },
  { name: "thank_you_booking", category: "b-sky", categoryLabel: "Utility", lang: "English", status: "b-green", statusLabel: "Approved" },
  { name: "marina_bay_nri_ar", category: "b-indigo", categoryLabel: "Marketing", lang: "Arabic", status: "b-amber", statusLabel: "Pending" },
];

export default function OrgWhatsAppSettingsPage() {
  return (
    <>
      <WhatsAppPageHead active="settings" />

      <div className="grid g2" style={{ marginBottom: 18 }}>
        <Reveal delay={1}>
          <div className="card">
            <div className="card-h"><span className="t">Business number</span><span className="badge b-green"><span className="dot" style={{ background: "var(--green)" }} /> Connected</span></div>
            <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span className="muted">Connection type</span><b>WhatsApp Business API</b></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span className="muted">Number</span><b>+91 98250 41200</b></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span className="muted">Provider</span><span className="chip">Gupshup</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span className="muted">Quality rating</span><span className="badge b-green">High</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span className="muted">Messaging limit</span><b>100K / day</b></div>
              <div className="divider" />
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-ghost">Manage number</button>
                <button className="btn btn-danger">Disconnect</button>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={2}>
          <div className="card">
            <div className="card-h"><span className="t">Business profile</span><span className="x">Shown to customers</span></div>
            <div className="card-b">
              <div className="field"><label>Display name</label><input className="inp" defaultValue="Skyline Developers" /></div>
              <div className="field"><label>About</label><input className="inp" defaultValue="Premium homes across Ahmedabad, Dholera & Dubai." /></div>
              <div className="row2">
                <div className="field"><label>Working hours from</label><input className="inp" defaultValue="09:30 AM" /></div>
                <div className="field"><label>Working hours to</label><input className="inp" defaultValue="07:30 PM" /></div>
              </div>
              <div className="field" style={{ marginBottom: 0 }}><label>Address</label><input className="inp" defaultValue="S.G. Highway, Ahmedabad, Gujarat 380054" /></div>
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={1}>
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-h"><span className="t">Message templates</span><span className="x">4 approved · 1 pending</span></div>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Template</th><th>Category</th><th>Language</th><th>Status</th></tr></thead>
            <tbody>
              {TEMPLATES.map((t) => (
                <tr key={t.name}>
                  <td><b>{t.name}</b></td>
                  <td><span className={`badge ${t.category}`}>{t.categoryLabel}</span></td>
                  <td>{t.lang}</td>
                  <td><span className={`badge ${t.status}`}>{t.statusLabel}</span></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </Reveal>

      <Reveal delay={2}>
        <div className="card">
          <div className="card-h"><span className="t">Automation &amp; AI</span><span className="x">Applies to all inbound chats</span></div>
          <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
              <div><b>Auto-reply</b><div className="muted" style={{ fontSize: 12.5 }}>Instantly reply to new messages with AI.</div></div>
              <div className="switch on" />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
              <div><b>AI handoff to agent</b><div className="muted" style={{ fontSize: 12.5 }}>Route hot leads to Priya when intent is high.</div></div>
              <div className="switch on" />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
              <div><b>Away message</b><div className="muted" style={{ fontSize: 12.5 }}>Send outside working hours (9:30 AM – 7:30 PM).</div></div>
              <div className="switch on" />
            </div>
            <div className="divider" />
            <button className="btn btn-primary" style={{ alignSelf: "flex-start" }}>Save changes</button>
          </div>
        </div>
      </Reveal>
    </>
  );
}
