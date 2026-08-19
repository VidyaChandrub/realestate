import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Approvals · iPixxel Realty Super Admin",
};

const SUBMISSIONS = [
  { av: "DP", tone: "a3", name: "Luxury Penthouse — Palm Jumeirah", meta: "Dubai Prime Estates · submitted 18 Aug 2026", active: true },
  { av: "SD", tone: "", name: "Riverfront Township — Phase II", meta: "Skyline Developers · submitted 17 Aug 2026", active: false },
  { av: "MB", tone: "a5", name: "NRI Investment — Sea View Towers", meta: "Marina Bay Realty · submitted 17 Aug 2026", active: false },
  { av: "GA", tone: "a2", name: "Green Acres Villas — Kharadi", meta: "Green Acres Realty · submitted 16 Aug 2026", active: false },
  { av: "UR", tone: "a4", name: "Urban Roots — Whitefield Plots", meta: "Urban Roots Housing · submitted 15 Aug 2026", active: false },
  { av: "AH", tone: "", name: "Al Habtoor — Corniche Residences", meta: "Al Habtoor Homes · submitted 15 Aug 2026", active: false },
];

const CHECKS = ["No misleading claims", "RERA number present", "Contact valid", "Images OK", "GTM configured"];

export default function SuperAdminApprovalsPage() {
  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">✅ Review</div>
          <h1>Landing Page Approvals</h1>
          <div className="sub">Review content &amp; compliance before pages go live.</div>
        </div>
        <div className="actions">
          <span className="badge b-amber">6 pending</span>
        </div>
      </div>

      <div className="grid g-2-1">
        {/* LEFT: submissions list */}
        <div className="card reveal in">
          <div className="card-h">
            <span className="t">Submitted pages</span>
            <span className="badge b-amber">6</span>
          </div>
          <div className="card-b" style={{ padding: 8 }}>
            {SUBMISSIONS.map((s, i) => (
              <div key={s.name}>
                <div
                  className="hov"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    borderRadius: 12,
                    background: s.active ? "var(--surface-2)" : undefined,
                    cursor: "pointer",
                  }}
                >
                  <span className={`av ${s.tone}`}>{s.av}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="nm" style={{ fontWeight: 600 }}>
                      {s.name}
                    </span>
                    <br />
                    <span className="sm muted" style={{ fontSize: 12 }}>
                      {s.meta}
                    </span>
                  </span>
                  <span className="badge b-amber">Pending</span>
                </div>
                {i < SUBMISSIONS.length - 1 && <div className="divider" style={{ margin: "6px 8px" }} />}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: review panel */}
        <div className="card reveal in" data-delay="1">
          <div className="card-h">
            <span className="t">Review</span>
            <span className="badge b-violet">Luxury Penthouse</span>
          </div>
          <div className="card-b">
            {/* preview mock */}
            <div
              style={{
                height: 150,
                borderRadius: 14,
                background: "linear-gradient(135deg,#4f46e5,#6366f1 45%,#0ea5e9)",
                position: "relative",
                overflow: "hidden",
                boxShadow: "var(--sh)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: 16,
                color: "#fff",
              }}
            >
              <div style={{ position: "absolute", top: 14, left: 16, fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", opacity: 0.85 }}>
                DUBAI PRIME ESTATES
              </div>
              <div
                style={{
                  position: "absolute",
                  width: 180,
                  height: 180,
                  borderRadius: "50%",
                  background: "radial-gradient(circle,rgba(255,255,255,.25),transparent 70%)",
                  top: -60,
                  right: -40,
                }}
              />
              <div style={{ fontFamily: "var(--display)", fontSize: 20, fontWeight: 700 }}>
                Luxury Penthouse · Palm Jumeirah
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.9, marginTop: 2 }}>
                Sea-facing 4BHK · Starting AED 8.5M · RERA-registered
              </div>
            </div>

            <div className="divider" />

            <h4 style={{ marginBottom: 14 }}>Compliance checklist</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {CHECKS.map((c) => (
                <div key={c} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "var(--green-050)",
                      color: "var(--green)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </span>
                  <span style={{ fontSize: 13.5 }}>{c}</span>
                </div>
              ))}
            </div>

            <div className="divider" />

            <div className="field">
              <label>Feedback to organisation (optional)</label>
              <textarea rows={3} placeholder="Add notes for the organisation before approving or rejecting…" />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-success" style={{ flex: 1, justifyContent: "center" }}>
                ✅ Approve &amp; publish
              </button>
              <button className="btn btn-danger" style={{ flex: 1, justifyContent: "center" }}>
                ✕ Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}