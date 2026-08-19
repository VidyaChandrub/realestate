import Link from "next/link";

export default function SuperAdminLoginPage() {
  return (
    <div className="auth">
      <aside className="brandside">
        <div className="glow" />
        <div style={{ position: "relative", zIndex: 2 }}>
          <div className="logo">iR</div>
        </div>
        <div style={{ position: "relative", zIndex: 2 }}>
          <h1>One console for the entire platform.</h1>
          <p>
            Manage every organisation on iPixxel Realty — from Ahmedabad developers to Dubai agencies —
            with subscriptions, templates and approvals in a single super-admin console.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "26px 0 0", display: "flex", flexDirection: "column", gap: 14 }}>
            <li style={{ display: "flex", alignItems: "center", gap: 12, color: "#dfe3f5", fontSize: 14.5 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                🏢
              </span>
              Onboard &amp; oversee 142 organisations
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: 12, color: "#dfe3f5", fontSize: 14.5 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                💳
              </span>
              Verify template payments &amp; subscriptions
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: 12, color: "#dfe3f5", fontSize: 14.5 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                ✅
              </span>
              Approve landing pages before they go live
            </li>
          </ul>
        </div>
        <div style={{ position: "relative", zIndex: 2, color: "#8891b4", fontSize: 12.5 }}>
          © 2026 iPixxel Realty · Super Admin
        </div>
      </aside>
      <main className="formside">
        <div className="fw">
          <h2>Super Admin sign in</h2>
          <div className="muted" style={{ margin: "6px 0 26px", fontSize: 14 }}>
            Restricted platform access
          </div>
          <form>
            <div className="field">
              <label>Email address</label>
              <input className="inp" type="email" defaultValue="pranab@ipixxel.com" placeholder="you@ipixxel.com" />
            </div>
            <div className="field">
              <label>Password</label>
              <input className="inp" type="password" defaultValue="••••••••••••" placeholder="Enter your password" />
              <div className="hint">Forgot your password? Contact platform security.</div>
            </div>
            <Link className="btn btn-primary btn-block btn-lg" href="/superadmin">
              Sign in →
            </Link>
          </form>
          <div className="help" style={{ marginTop: 22 }}>
            🛡️ Protected by two-factor authentication. You&apos;ll be asked for a 6-digit code from your
            authenticator app after signing in.
          </div>
        </div>
      </main>
    </div>
  );
}
