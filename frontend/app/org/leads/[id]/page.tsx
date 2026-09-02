import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon } from "@/components/icons";
import { LeadsPageHead } from "@/components/org/crm-tabs";

export const metadata = { title: "iPixxel Realty · Lead detail" };

export default async function OrgLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <LeadsPageHead active="lead-center" />

      <div className="page-head reveal in" style={{ marginTop: 4 }}>
        <div>
          <div className="eyebrow"><Icon name="crm" size={14} /> Lead</div>
          <h1>Rahul Mehta</h1>
          <div className="sub">Palm Residency · 3 BHK enquiry · captured 2 days ago</div>
        </div>
        <div className="actions">
          <Link className="btn btn-ghost" href="/org/leads">← Back to leads</Link>
          <button className="btn btn-primary">Edit lead</button>
        </div>
      </div>

      <div className="ld-grid">
        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Reveal delay={1}>
            <div className="card">
              <div className="card-b">
                <div className="prof">
                  <div className="av av-lg a4">RM</div>
                  <div className="mono">+91 98204 55127</div>
                  <div className="muted" style={{ fontSize: 13 }}>rahul.mehta@gmail.com</div>
                  <span className="chip" style={{ marginTop: 4 }}><Icon name="star" size={13} /> Lead score <b style={{ color: "var(--brand)", marginLeft: 4 }}>86 / Hot</b></span>
                </div>
                <div className="field" style={{ marginTop: 14 }}>
                  <label>Pipeline status</label>
                  <select className="inp" defaultValue="Follow-up">
                    <option>New</option><option>Contacted</option><option selected>Follow-up</option>
                    <option>Site Visit</option><option>Negotiation</option><option>Won</option><option>Lost</option>
                  </select>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={2}>
            <div className="card">
              <div className="card-h"><span className="t">Lead details</span></div>
              <div className="card-b">
                <div className="kv">
                  <div className="row"><span className="k">Source</span><span className="v"><span className="badge b-indigo">Meta Lead Ad</span></span></div>
                  <div className="row"><span className="k">Landing page</span><span className="v mono">palm.skylinedev.in</span></div>
                  <div className="row"><span className="k">Project</span><span className="v">Palm Residency · 3 BHK</span></div>
                  <div className="row"><span className="k">Campaign</span><span className="v">Palm_Q3_Meta</span></div>
                  <div className="row"><span className="k">UTM</span><span className="v mono">fb / cpc / palm3bhk</span></div>
                  <div className="row"><span className="k">Budget</span><span className="v">₹1.4 – 1.8 Cr</span></div>
                  <div className="row"><span className="k">Assigned agent</span><span className="v"><span className="badge b-violet">Priya S.</span></span></div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* CENTER */}
        <Reveal delay={2}>
          <div className="card">
            <div className="card-h"><span className="t">Activity timeline</span><span className="x">All interactions</span></div>
            <div className="card-b">
              <ul className="timeline">
                <li><b><Icon name="phone" size={14} /> Call logged</b> — Connected 4m 12s. Interested in 3 BHK, asked for floor plan.<div className="tt">Today · 11:20 AM · Priya S.</div></li>
                <li><b><Icon name="mail" size={14} /> WhatsApp sent</b> — Shared Palm Residency brochure &amp; price sheet.<div className="tt">Today · 11:32 AM · Priya S.</div></li>
                <li><b><Icon name="document" size={14} /> Note added</b> — Prefers higher floor, sea-facing. Decision by month end.<div className="tt">Today · 11:40 AM · Priya S.</div></li>
                <li><b><Icon name="refresh" size={14} /> Status changed</b> — Contacted → Follow-up.<div className="tt">Today · 11:41 AM · System</div></li>
                <li><b><Icon name="home" size={14} /> Site visit scheduled</b> — Palm Residency show flat, Sat 3:00 PM.<div className="tt">Yesterday · 6:15 PM · Priya S.</div></li>
              </ul>

              <div className="field" style={{ marginTop: 16 }}>
                <label>Add note</label>
                <textarea className="inp" rows={3} placeholder="Log a note about this lead…" />
              </div>
              <div style={{ marginBottom: 18 }}><button className="btn btn-primary btn-sm">Add note</button></div>

              <div className="help" style={{ marginBottom: 10 }}><b>Schedule site visit</b> — pick a date and confirm with the buyer.</div>
              <div className="sched">
                <div className="field" style={{ flex: 1, margin: 0 }}><label>Visit date</label><input className="inp" type="date" defaultValue="2026-08-22" /></div>
                <button className="btn btn-primary">Schedule site visit</button>
              </div>
            </div>
          </div>
        </Reveal>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Reveal delay={3}>
            <div className="card">
              <div className="card-h"><span className="t">Quick actions</span></div>
              <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button className="btn btn-primary btn-block"><Icon name="phone" size={15} /> Call +91 98204 55127</button>
                <button className="btn btn-success btn-block"><Icon name="mail" size={15} /> WhatsApp</button>
                <button className="btn btn-ghost btn-block"><Icon name="mail" size={15} /> Email</button>
              </div>
            </div>
          </Reveal>

          <Reveal delay={4}>
            <div className="card">
              <div className="card-h"><span className="t">Follow-up</span></div>
              <div className="card-b">
                <div className="field"><label>Reminder date</label><input className="inp" type="date" defaultValue="2026-08-20" /></div>
                <button className="btn btn-soft btn-block"><Icon name="bell" size={15} /> Set reminder</button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </>
  );
}
