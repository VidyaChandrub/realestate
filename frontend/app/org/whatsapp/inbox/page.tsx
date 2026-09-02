import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { Icon } from "@/components/icons";
import { WhatsAppPageHead } from "@/components/org/crm-tabs";

export const metadata = { title: "iPixxel Realty · WhatsApp Inbox" };

const CONVERSATIONS = [
  { initials: "AR", avClass: "", name: "Aarav Reddy", time: "10:24", preview: "Perfect, Saturday 11am works for me 👍", unread: 0, on: true },
  { initials: "MI", avClass: "a2", name: "Meera Iyer", time: "09:58", preview: "Can you share the Green Vista floor plan?", unread: 2 },
  { initials: "KP", avClass: "a5", name: "Karan Patel", time: "09:41", preview: "What is the price for 3BHK?", unread: 1 },
  { initials: "DS", avClass: "a4", name: "Divya Shah", time: "Yest", preview: "Thanks, I'll discuss with family and revert.", unread: 0 },
  { initials: "FS", avClass: "a3", name: "Farhan Sheikh", time: "Yest", preview: "Is Marina Bay open for NRI booking?", unread: 3 },
  { initials: "NV", name: "Nikhil Verma", time: "Yest", preview: "Site visit confirmed for Sunday, thank you.", unread: 0 },
  { initials: "SR", avClass: "a2", name: "Sana Rahman", time: "Mon", preview: "Please send the brochure again.", unread: 1 },
  { initials: "HT", avClass: "a5", name: "Harsh Trivedi", time: "Mon", preview: "What are the payment plan options?", unread: 0 },
];

const MESSAGES = [
  { dir: "in", text: "Hi, I saw your ad for Palm Residency. What's the price for a 3BHK?", time: "10:02" },
  { dir: "out", text: "Hello Aarav! 😊 Palm Residency 3BHK starts at ₹1.42 Cr (1,540 sq.ft, east-facing). We also have a limited launch offer with no floor-rise charges.", time: "10:05" },
  { dir: "in", text: "Sounds good. Can you send me the floor plan?", time: "10:09" },
  { dir: "out", text: "Sure — sharing the 3BHK floor plan PDF now. 📄 It includes the master bedroom layout, balcony dimensions and the club-house amenities.", time: "10:11" },
  { dir: "in", text: "Thanks! I'd like to visit the site. Are you open this Saturday?", time: "10:18" },
  { dir: "out", text: "Absolutely. We have slots at 11:00 AM and 4:00 PM this Saturday. Our sales lead Priya will host you at the Palm Residency experience centre, S.G. Highway.", time: "10:20" },
  { dir: "in", text: "Perfect, Saturday 11am works for me 👍", time: "10:24" },
];

export default function OrgWhatsAppInboxPage() {
  return (
    <>
      <WhatsAppPageHead active="inbox" />

      <div className="wa-shell reveal" data-delay="1">
        {/* LEFT: conversation list */}
        <div className="wa-list">
          <div className="lh">Chats <span className="badge b-green">6 unread</span></div>
          <div className="wa-conv">
            {CONVERSATIONS.map((c) => (
              <div className={`wa-row ${c.on ? "on" : ""}`} key={c.name}>
                <span className={`av ${c.avClass ?? ""}`}>{c.initials}</span>
                <div className="bd">
                  <div className="nm">{c.name}<span className="tm">{c.time}</span></div>
                  <div className="pv">{c.preview}</div>
                </div>
                {c.unread > 0 ? <span className="un">{c.unread}</span> : null}
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: chat thread */}
        <div className="wa-chat">
          <div className="wa-chead">
            <span className="av">AR</span>
            <div className="meta"><b>Aarav Reddy</b><span>+91 98220 41567</span></div>
            <span className="chip" style={{ marginLeft: "auto" }}><Icon name="building" size={13} /> Palm Residency</span>
          </div>
          <div className="wa-msgs">
            <div className="wa-day">Today</div>
            {MESSAGES.map((m, i) => (
              <div className={`bub ${m.dir}`} key={i}>
                {m.text}<span className="mt">{m.time}</span>
              </div>
            ))}
          </div>
          <div className="wa-comp">
            <button className="wa-ib" title="Attach"><Icon name="link" size={16} /></button>
            <button className="wa-ib" style={{ width: "auto", padding: "0 12px", fontSize: 13, fontWeight: 600, gap: 6 }} title="Templates"><Icon name="sparkles" size={15} /> Templates</button>
            <input className="inp" placeholder="Type a message…" />
            <button className="btn btn-primary">Send</button>
          </div>
        </div>

        {/* RIGHT: lead context */}
        <div className="wa-ctx">
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <span className="av" style={{ width: 56, height: 56, fontSize: 18, margin: "0 auto 10px", borderRadius: 16 }}>AR</span>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Aarav Reddy</div>
            <div className="muted" style={{ fontSize: 12.5 }}>+91 98220 41567</div>
          </div>
          <div className="card" style={{ boxShadow: "none", marginBottom: 14 }}>
            <div className="card-b" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Project</span><b>Palm Residency</b></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Status</span><span className="badge b-amber">Follow-up</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Source</span><span className="badge b-indigo">Meta</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Assigned</span><b>Priya Nair</b></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Budget</span><b>₹1.4 – 1.6 Cr</b></div>
            </div>
          </div>
          <div className="qa">
            <button className="btn btn-ghost btn-block"><Icon name="phone" size={14} /> Call</button>
            <button className="btn btn-ghost btn-block"><Icon name="calendar" size={14} /> Schedule visit</button>
            <button className="btn btn-ghost btn-block"><Icon name="document" size={14} /> Add note</button>
            <Link className="btn btn-primary btn-block" href="/org/leads">Open lead →</Link>
          </div>
        </div>
      </div>
    </>
  );
}
