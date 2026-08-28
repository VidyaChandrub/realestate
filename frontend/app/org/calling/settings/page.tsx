import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { CallingPageHead } from "@/components/org/crm-tabs";

export const metadata = { title: "iPixxel Realty · Calling Settings" };

export default function OrgCallingSettingsPage() {
  return (
    <>
      <CallingPageHead
        active="settings"
        actions={
          <>
            <Link className="btn btn-ghost" href="#">Reset</Link>
            <Link className="btn btn-primary" href="#">Save changes</Link>
          </>
        }
      />

      <div className="bal reveal in" data-delay="1">
        <div className="l">
          <div className="zap">⚡</div>
          <div>
            <div className="cr">1,000 credits <span className="muted" style={{ fontWeight: 500, fontSize: 14 }}>· ~66 mins of AI calling left</span></div>
            <div className="muted" style={{ fontSize: 12.5 }}>Auto-recharge below 200 credits</div>
          </div>
        </div>
        <Link className="btn btn-soft" href="#">＋ Recharge</Link>
      </div>

      <div className="grid g2" style={{ marginBottom: 18 }}>
        <Reveal delay={1}>
          <div className="card">
            <div className="card-h"><span className="t">General</span><span className="x">Caller behaviour</span></div>
            <div className="card-b">
              <div className="field">
                <label>Caller ID</label>
                <select defaultValue="+91 79 4890 2210 — Ahmedabad">
                  <option>+91 79 4890 2210 — Ahmedabad</option>
                  <option>+91 22 6820 5500 — Mumbai</option>
                  <option>+971 4 512 8890 — Dubai</option>
                </select>
              </div>
              <div className="row2">
                <div className="field"><label>Working hours start</label><input className="inp" type="time" defaultValue="09:30" /></div>
                <div className="field"><label>Working hours end</label><input className="inp" type="time" defaultValue="20:00" /></div>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Max retries per lead</label>
                <select defaultValue="3 retries">
                  <option>2 retries</option><option selected>3 retries</option><option>4 retries</option><option>5 retries</option>
                </select>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={2}>
          <div className="card">
            <div className="card-h"><span className="t">AI Voice Defaults</span><span className="x">Applied to new agents</span></div>
            <div className="card-b">
              <div className="field">
                <label>Default voice</label>
                <select defaultValue="Aarohi"><option>Aarohi — warm female (Hindi/English)</option><option>Vihaan — confident male (English/Arabic)</option><option>Meera — friendly female (Gujarati)</option></select>
              </div>
              <div className="field">
                <label>Language</label>
                <select defaultValue="hi"><option>Hindi + English (Hinglish)</option><option>English</option><option>Gujarati</option><option>Arabic + English</option></select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Max call duration</label>
                <select defaultValue="3 minutes"><option>2 minutes</option><option selected>3 minutes</option><option>5 minutes</option><option>No limit</option></select>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      <div className="grid g2">
        <Reveal delay={3}>
          <div className="card">
            <div className="card-h"><span className="t">Recording &amp; Compliance</span><span className="x">TRAI / DND</span></div>
            <div className="card-b">
              <div className="swrow">
                <div className="lbl"><b>Record calls</b><span>Store call recordings for quality &amp; training</span></div>
                <div className="switch on" />
              </div>
              <div className="field" style={{ margin: "14px 0" }}>
                <label>Consent message</label>
                <textarea className="inp" rows={3} defaultValue="Namaste! This call from Skyline Developers may be recorded for quality and training purposes. Kindly stay on the line to continue." />
              </div>
              <div className="swrow">
                <div className="lbl"><b>Respect DND registry</b><span>Skip numbers on the National Do-Not-Disturb list</span></div>
                <div className="switch on" />
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={4}>
          <div className="card">
            <div className="card-h"><span className="t">Credits</span><span className="x">Billing summary</span></div>
            <div className="card-b">
              <div className="csum"><span className="muted">Current balance</span><b>1,000 credits</b></div>
              <div className="csum"><span className="muted">Usage this month</span><b>3,420 credits</b></div>
              <div className="csum"><span className="muted">≈ Minutes remaining</span><b>66 mins</b></div>
              <div style={{ margin: "14px 0 10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}><span className="muted">Monthly quota used</span><span className="muted">3,420 / 5,000</span></div>
                <div className="bar"><i data-w="68%" /></div>
              </div>
              <div className="swrow" style={{ borderTop: "1px solid var(--line)", marginTop: 8 }}>
                <div className="lbl"><b>Auto-recharge</b><span>Top up 2,000 credits when balance &lt; 200</span></div>
                <div className="switch on" />
              </div>
              <Link className="btn btn-soft btn-block" style={{ marginTop: 8 }} href="#">＋ Recharge credits</Link>
            </div>
          </div>
        </Reveal>
      </div>
    </>
  );
}
