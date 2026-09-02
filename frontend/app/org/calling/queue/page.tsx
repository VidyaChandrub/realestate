import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Icon } from "@/components/icons";
import { CallingPageHead } from "@/components/org/crm-tabs";

export const metadata = { title: "iPixxel Realty · Call Queue" };

const QUEUE = [
  { initials: "RM", avClass: "a4", name: "Rahul Mehta", phone: "+91 98204 55127", badge: "b-indigo", badgeLabel: "Meta", chip: "Due now", chipClass: "" },
  { initials: "AR", name: "Aarav Reddy", phone: "+91 98220 41567", badge: "b-sky", badgeLabel: "Google", badge2: "b-amber", badge2Label: "Follow-up" },
  { initials: "MI", avClass: "a2", name: "Meera Iyer", phone: "+91 99870 22314", badge: "b-green", badgeLabel: "WhatsApp", chip: "10:30" },
  { initials: "KP", avClass: "a5", name: "Karan Patel", phone: "+91 97250 88109", badge: "b-indigo", badgeLabel: "Meta", badge2: "b-gray", badge2Label: "New" },
  { initials: "FS", name: "Farhan Sheikh", phone: "+91 98111 90042", badge: "b-amber", badgeLabel: "Landing", chip: "11:15" },
  { initials: "DS", avClass: "a2", name: "Divya Shah", phone: "+91 98980 33471", badge: "b-indigo", badgeLabel: "Meta", badge2: "b-sky", badge2Label: "Contacted" },
  { initials: "AH", avClass: "a4", name: "Ahmed Hassan", phone: "+971 50 442 7781", badge: "b-green", badgeLabel: "WhatsApp", chip: "2:00" },
  { initials: "NK", avClass: "a5", name: "Neha Kulkarni", phone: "+91 98330 71265", badge: "b-sky", badgeLabel: "Google", badge2: "b-amber", badge2Label: "Follow-up" },
];

export default function OrgCallingQueuePage() {
  return (
    <>
      <CallingPageHead
        active="queue"
        actions={
          <>
            <button className="btn btn-ghost">Filters</button>
            <button className="btn btn-primary">Start calling ▶</button>
          </>
        }
      />

      <div className="page-head reveal in" style={{ marginTop: 4 }}>
        <div>
          <div className="eyebrow"><Icon name="phone" size={14} /> Sales</div>
          <h1>My Call Queue · Priya</h1>
          <div className="sub">18 leads to work today</div>
        </div>
      </div>

      <div className="grid g3" style={{ marginBottom: 18 }}>
        <Reveal delay={1}><div className="stat"><div className="top"><span className="label">Calls today</span><span className="ic ic-indigo"><Icon name="phone" size={16} /></span></div><div className="value"><CountUp value={42} /></div><div className="delta up">↑ 8 vs yesterday</div></div></Reveal>
        <Reveal delay={2}><div className="stat"><div className="top"><span className="label">Connected</span><span className="ic ic-green"><Icon name="bell" size={16} /></span></div><div className="value"><CountUp value={27} /></div><div className="delta up">64% connect rate</div></div></Reveal>
        <Reveal delay={3}><div className="stat"><div className="top"><span className="label">Visits booked</span><span className="ic ic-amber"><Icon name="calendar" size={16} /></span></div><div className="value"><CountUp value={4} /></div><div className="delta up">↑ 1 vs yesterday</div></div></Reveal>
      </div>

      <div className="tc-grid">
        <Reveal delay={1}>
          <div className="card">
            <div className="card-h"><span className="t">Call queue</span><span className="x">8 pending</span></div>
            <div className="card-b">
              <div className="q-list">
                {QUEUE.map((q, i) => (
                  <div className={`q-row ${i === 0 ? "on" : ""}`} key={q.phone}>
                    <span className={`av ${q.avClass ?? ""}`}>{q.initials}</span>
                    <span><span className="nm">{q.name}</span><br /><span className="sm">{q.phone}</span></span>
                    <span className="rt">
                      <span className={`badge ${q.badge}`}>{q.badgeLabel}</span>
                      {q.badge2 ? <span className={`badge ${q.badge2}`}>{q.badge2Label}</span> : null}
                      {q.chip ? <span className="chip">{q.chip}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={2}>
          <div className="card">
            <div className="card-h"><span className="t">Current lead</span><Link className="x" href="/org/leads" style={{ color: "var(--brand)" }}>Open full profile →</Link></div>
            <div className="card-b">
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <span className="av a4" style={{ width: 48, height: 48, borderRadius: 14, fontSize: 17 }}>RM</span>
                <div>
                  <b style={{ fontSize: 17 }}>Rahul Mehta</b>
                  <div className="mono">+91 98204 55127</div>
                  <div className="muted" style={{ fontSize: 12.5 }}>Palm Residency · 3 BHK · Meta Lead Ad</div>
                </div>
                <span className="chip" style={{ marginLeft: "auto" }}><Icon name="star" size={13} /> Score 86</span>
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                <button className="btn btn-primary" style={{ flex: 1 }}><Icon name="phone" size={15} /> Call now</button>
                <button className="btn btn-success" style={{ flex: 1 }}><Icon name="mail" size={15} /> WhatsApp</button>
              </div>

              <div className="field"><label>Disposition</label>
                <select className="inp" defaultValue="Connected">
                  <option>Connected</option><option>Busy</option><option>Not interested</option><option>Callback</option><option>Site visit booked</option>
                </select>
              </div>

              <div className="field"><label>Notes</label>
                <textarea className="inp" rows={4} placeholder="Notes from this call…" />
              </div>

              <div className="row2">
                <div className="field"><label>Follow-up date</label><input className="inp" type="date" defaultValue="2026-08-20" /></div>
                <div className="field" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <label>&nbsp;</label>
                  <button className="btn btn-primary btn-block">Save &amp; next →</button>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </>
  );
}
