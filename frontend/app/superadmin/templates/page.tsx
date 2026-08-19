import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { Seg } from "@/components/superadmin/seg";

export const metadata: Metadata = {
  title: "Templates · iPixxel Realty Super Admin",
};

const TEMPLATES = [
  { name: "Plot Launch Pro", grad: "linear-gradient(135deg,#4f46e5,#6366f1 55%,#0ea5e9)", tag: "b-green", tagTxt: "Free", state: "b-green", stateTxt: "Active", pricing: "Global · Free" },
  { name: "Flat Booking Hero", grad: "linear-gradient(135deg,#7c3aed,#db2777 60%,#f59e0b)", tag: "b-violet", tagTxt: "Paid", state: "b-green", stateTxt: "Active", pricing: "Global · ₹4,999" },
  { name: "Township Landing", grad: "linear-gradient(135deg,#0d9488,#16a34a 60%,#a3e635)", tag: "b-violet", tagTxt: "Paid", state: "b-green", stateTxt: "Active", pricing: "Org-specific · ₹4,999" },
  { name: "Villa Showcase", grad: "linear-gradient(135deg,#0ea5e9,#4f46e5 60%,#1e3a8a)", tag: "b-green", tagTxt: "Free", state: "b-amber", stateTxt: "Draft", pricing: "Global · Free" },
  { name: "NRI Investment", grad: "linear-gradient(135deg,#d97706,#e11d48 55%,#7c3aed)", tag: "b-violet", tagTxt: "Paid", state: "b-green", stateTxt: "Active", pricing: "Org-specific · ₹9,999" },
  { name: "Luxury Penthouse", grad: "linear-gradient(135deg,#1e1b4b,#4338ca 55%,#0ea5e9)", tag: "b-violet", tagTxt: "Paid", state: "b-amber", stateTxt: "Draft", pricing: "Global · ₹18,000" },
];

export default function SuperAdminTemplatesPage() {
  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">🧩 Product</div>
          <h1>Landing Page Templates</h1>
          <div className="sub">
            Design, price and assign high-converting real-estate landing pages to organisations across India and
            the Gulf.
          </div>
        </div>
        <div className="actions">
          <button className="btn btn-ghost">⤓ Export</button>
          <Link className="btn btn-primary" href="/superadmin/template-detail">
            + Create template
          </Link>
        </div>
      </div>

      {/* Lifecycle strip */}
      <div className="card reveal" style={{ marginBottom: 18 }}>
        <div className="card-b">
          <div className="flow">
            <span className="step">🧩 Create</span>
            <span className="arr">→</span>
            <span className="step">🏷️ Set Type</span>
            <span className="arr">→</span>
            <span className="step">💰 Set Pricing</span>
            <span className="arr">→</span>
            <span className="step">🏢 Assign to Orgs</span>
            <span className="arr">→</span>
            <span className="step">💳 Payment &amp; Activation</span>
            <span className="arr">→</span>
            <span className="step">✅ Active</span>
          </div>
        </div>
      </div>

      <div className="reveal" style={{ marginBottom: 18 }}>
        <Seg options={["All", "Free", "Paid", "Draft"]} defaultIndex={0} />
      </div>

      {/* Template cards */}
      <div className="grid g3">
        {TEMPLATES.map((t, i) => (
          <Reveal key={t.name} delay={i + 1}>
            <div className="card hover">
              <div
                style={{
                  height: 150,
                  borderRadius: "16px 16px 0 0",
                  position: "relative",
                  background: t.grad,
                  display: "flex",
                  alignItems: "flex-end",
                  padding: 16,
                }}
              >
                <span
                  style={{
                    color: "#fff",
                    fontWeight: 700,
                    fontFamily: "var(--display)",
                    fontSize: 18,
                    textShadow: "0 2px 12px rgba(0,0,0,.25)",
                  }}
                >
                  {t.name}
                </span>
              </div>
              <div className="card-b">
                <h3>{t.name}</h3>
                <div style={{ display: "flex", gap: 8, margin: "10px 0 12px" }}>
                  <span className={`badge ${t.tag}`}>{t.tagTxt}</span>
                  <span className={`badge ${t.state}`}>
                    <span className="dot" style={{ background: "currentColor" }} />
                    {t.stateTxt}
                  </span>
                </div>
                <div className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>
                  Pricing: <b style={{ color: "var(--ink)" }}>{t.pricing}</b>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link className="btn btn-soft btn-sm" href="/superadmin/template-detail">
                    Assign
                  </Link>
                  <Link className="btn btn-ghost btn-sm" href="/superadmin/template-detail">
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </>
  );
}