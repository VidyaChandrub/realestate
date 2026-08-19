import type { Metadata } from "next";
import { Switch } from "@/components/superadmin/switch";

export const metadata: Metadata = {
  title: "Template detail · iPixxel Realty Super Admin",
};

const ASSIGNED = [
  { org: "Skyline Developers", price: "₹4,999", pay: "b-green", payTxt: "Verified", act: "12 Aug 2026" },
  { org: "Dubai Prime Estates", price: "₹9,999", pay: "b-amber", payTxt: "Paid", act: "—" },
  { org: "Green Acres Realty", price: "₹4,999", pay: "b-green", payTxt: "Verified", act: "09 Aug 2026" },
  { org: "Marina Bay Realty", price: "₹4,999", pay: "b-gray", payTxt: "Not required", act: "05 Aug 2026" },
  { org: "Urban Roots Housing", price: "₹4,999", pay: "b-amber", payTxt: "Paid", act: "—" },
];

export default function SuperAdminTemplateDetailPage() {
  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">🧩 Product · Template</div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 12 }}>
            Flat Booking Hero{" "}
            <span className="badge b-green">
              <span className="dot" style={{ background: "currentColor" }} />
              Active
            </span>
          </h1>
          <div className="sub">
            A high-converting flat &amp; apartment booking landing page with enquiry capture, floor plans and RERA
            trust badges.
          </div>
        </div>
        <div className="actions">
          <button className="btn btn-ghost">👁 Preview</button>
          <button className="btn btn-ghost">✎ Edit</button>
          <button className="btn btn-primary">⧉ Duplicate</button>
        </div>
      </div>

      <div className="tabs reveal in">
        <a className="active">Overview</a>
        <a>Pricing</a>
        <a>Assigned orgs</a>
        <a>Preview</a>
      </div>

      <div className="grid g-2-1">
        {/* LEFT preview */}
        <div className="card reveal in">
          <div className="card-h">
            <span className="t">Preview</span>
            <span className="badge b-indigo">Live layout</span>
          </div>
          <div className="card-b">
            <div
              style={{
                borderRadius: 16,
                overflow: "hidden",
                background: "linear-gradient(135deg,#4f46e5,#7c3aed 55%,#0ea5e9)",
                padding: "40px 34px",
                color: "#fff",
                minHeight: 340,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <div style={{ maxWidth: "58%" }}>
                <span className="badge" style={{ background: "rgba(255,255,255,.18)", color: "#fff", marginBottom: 14 }}>
                  RERA Approved · Now Booking
                </span>
                <h2 style={{ color: "#fff", fontFamily: "var(--display)", fontSize: 30, lineHeight: 1.15, marginBottom: 12 }}>
                  Own a 2 &amp; 3 BHK at Marina Heights
                </h2>
                <p style={{ color: "#e6e9ff", fontSize: 14, marginBottom: 18 }}>
                  Sea-facing homes in Mumbai from ₹1.42 Cr. Zero pre-EMI till possession. Limited launch-price
                  units.
                </p>
                <button className="btn btn-primary" style={{ background: "#fff", color: "var(--brand)" }}>
                  Book a site visit →
                </button>
              </div>
              <div
                style={{
                  position: "absolute",
                  right: 28,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 230,
                  background: "#fff",
                  borderRadius: 14,
                  padding: 18,
                  boxShadow: "0 24px 60px -20px rgba(0,0,0,.5)",
                }}
              >
                <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 14, marginBottom: 12 }}>
                  Enquire now
                </div>
                <div style={{ height: 38, border: "1px solid var(--line-2)", borderRadius: 10, marginBottom: 9, display: "flex", alignItems: "center", padding: "0 11px", color: "var(--faint)", fontSize: 12.5 }}>
                  Full name
                </div>
                <div style={{ height: 38, border: "1px solid var(--line-2)", borderRadius: 10, marginBottom: 9, display: "flex", alignItems: "center", padding: "0 11px", color: "var(--faint)", fontSize: 12.5 }}>
                  Mobile number
                </div>
                <div style={{ height: 38, border: "1px solid var(--line-2)", borderRadius: 10, marginBottom: 12, display: "flex", alignItems: "center", padding: "0 11px", color: "var(--faint)", fontSize: 12.5 }}>
                  Preferred config ▾
                </div>
                <div style={{ height: 40, borderRadius: 10, background: "var(--brand)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13 }}>
                  Get best price
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT stacked */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card reveal in" data-delay="1">
            <div className="card-h">
              <span className="t">Settings</span>
            </div>
            <div className="card-b">
              <div className="field">
                <label>Type</label>
                <div className="check" style={{ justifyContent: "space-between" }}>
                  <span className="muted" style={{ fontSize: 13 }}>
                    Free / Paid
                  </span>
                  <Switch defaultOn />
                </div>
              </div>
              <div className="field">
                <label>Pricing model</label>
                <select>
                  <option>Global</option>
                  <option selected>Org-specific</option>
                </select>
              </div>
              <div className="field">
                <label>Base price (₹)</label>
                <input className="inp" defaultValue="4,999" />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Status</label>
                <select>
                  <option>Draft</option>
                  <option selected>Active</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card reveal in" data-delay="2">
            <div className="card-h">
              <span className="t">Assigned to organisations</span>
              <span className="badge b-indigo">5</span>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Org</th>
                    <th>Price</th>
                    <th>Payment</th>
                    <th>Activated</th>
                  </tr>
                </thead>
                <tbody>
                  {ASSIGNED.map((a) => (
                    <tr key={a.org}>
                      <td>{a.org}</td>
                      <td>{a.price}</td>
                      <td>
                        <span className={`badge ${a.pay}`}>{a.payTxt}</span>
                      </td>
                      <td>{a.act}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}