import type { Metadata } from "next";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Audit Logs · iPixxel Realty Super Admin",
};

const LOGS = [
  { time: "18 Aug 2026, 14:32", av: "PP", tone: "", actor: "Pranab Patel", org: "Dubai Prime Estates", badge: "b-green", action: "Payment verified", entity: "pay_9Fk2Lm", ip: "103.42.18.7" },
  { time: "18 Aug 2026, 13:58", av: "AR", tone: "a2", actor: "Ananya Rao", org: "Skyline Developers", badge: "b-indigo", action: "Template activated", entity: "tpl_penthouse", ip: "49.36.220.14" },
  { time: "18 Aug 2026, 12:41", av: "VM", tone: "a3", actor: "Vikram Menon", org: "Green Acres Realty", badge: "b-violet", action: "User invited", entity: "usr_ops_04", ip: "157.32.9.201" },
  { time: "18 Aug 2026, 11:15", av: "FZ", tone: "a4", actor: "Fatima Al Zahra", org: "Marina Bay Realty", badge: "b-green", action: "Payment verified", entity: "pay_7Qx0Rt", ip: "94.203.44.19" },
  { time: "18 Aug 2026, 10:07", av: "RS", tone: "a5", actor: "Rohan Shetty", org: "Urban Roots Housing", badge: "b-gray", action: "Login", entity: "sess_a81c", ip: "122.170.5.88" },
  { time: "17 Aug 2026, 18:52", av: "PP", tone: "", actor: "Pranab Patel", org: "Coastal Vistas LLP", badge: "b-rose", action: "Org suspended", entity: "org_coastal", ip: "103.42.18.7" },
  { time: "17 Aug 2026, 17:20", av: "AR", tone: "a2", actor: "Ananya Rao", org: "Dubai Prime Estates", badge: "b-indigo", action: "Template activated", entity: "tpl_nri_invest", ip: "49.36.220.14" },
  { time: "17 Aug 2026, 15:44", av: "VM", tone: "a3", actor: "Vikram Menon", org: "Palm Grove Realty", badge: "b-violet", action: "User invited", entity: "usr_sales_11", ip: "157.32.9.201" },
  { time: "17 Aug 2026, 14:09", av: "FZ", tone: "a4", actor: "Fatima Al Zahra", org: "Al Reem Properties", badge: "b-green", action: "Payment verified", entity: "pay_3Zn8Wc", ip: "94.203.44.19" },
  { time: "17 Aug 2026, 09:33", av: "RS", tone: "a5", actor: "Rohan Shetty", org: "Green Acres Realty", badge: "b-amber", action: "Plan upgraded", entity: "sub_growth", ip: "122.170.5.88" },
  { time: "16 Aug 2026, 20:11", av: "PP", tone: "", actor: "Pranab Patel", org: "Skyline Developers", badge: "b-indigo", action: "Template activated", entity: "tpl_township", ip: "103.42.18.7" },
  { time: "16 Aug 2026, 16:48", av: "AR", tone: "a2", actor: "Ananya Rao", org: "Marina Bay Realty", badge: "b-gray", action: "Login", entity: "sess_f20d", ip: "49.36.220.14" },
  { time: "16 Aug 2026, 13:27", av: "FZ", tone: "a4", actor: "Fatima Al Zahra", org: "Dubai Prime Estates", badge: "b-violet", action: "User invited", entity: "usr_admin_02", ip: "94.203.44.19" },
  { time: "16 Aug 2026, 10:02", av: "VM", tone: "a3", actor: "Vikram Menon", org: "Urban Roots Housing", badge: "b-rose", action: "Org suspended", entity: "org_urbanroots", ip: "157.32.9.201" },
  { time: "15 Aug 2026, 21:19", av: "RS", tone: "a5", actor: "Rohan Shetty", org: "Al Reem Properties", badge: "b-green", action: "Payment verified", entity: "pay_1Yv6Kp", ip: "122.170.5.88" },
];

export default function SuperAdminAuditLogsPage() {
  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Icon name="shield" size={14} /> System</div>
          <h1>Audit Logs</h1>
          <div className="sub">Every significant action across the platform.</div>
        </div>
        <div className="actions">
          <button className="btn btn-ghost">⤓ Export CSV</button>
        </div>
      </div>

      <div className="card reveal" style={{ marginBottom: 18 }}>
        <div className="card-b" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <input className="inp" placeholder="Search actions, entities, IPs…" style={{ paddingLeft: 38 }} />
            <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--faint)" }}>
              <Icon name="search" size={14} />
            </span>
          </div>
          <select style={{ maxWidth: 200 }}>
            <option>All actors</option>
            <option>Pranab Patel</option>
            <option>Ananya Rao</option>
            <option>Vikram Menon</option>
            <option>Fatima Al Zahra</option>
            <option>Rohan Shetty</option>
          </select>
          <select style={{ maxWidth: 200 }}>
            <option>All actions</option>
            <option>Template activated</option>
            <option>Org suspended</option>
            <option>Payment verified</option>
            <option>User invited</option>
            <option>Login</option>
          </select>
          <input className="inp" type="date" defaultValue="2026-08-18" style={{ maxWidth: 180 }} />
        </div>
      </div>

      <div className="card reveal">
        <div className="card-h">
          <span className="t">Activity — last 30 days</span>
          <span className="badge b-gray">1,284 events</span>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Organisation</th>
                <th>Action</th>
                <th>Entity</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {LOGS.map((l) => (
                <tr key={l.entity + l.time}>
                  <td>
                    <span className="mono">{l.time}</span>
                  </td>
                  <td>
                    <span className="u">
                      <span className={`av ${l.tone}`}>{l.av}</span>
                      <span className="nm">{l.actor}</span>
                    </span>
                  </td>
                  <td>{l.org}</td>
                  <td>
                    <span className={`badge ${l.badge}`}>{l.action}</span>
                  </td>
                  <td>
                    <span className="mono">{l.entity}</span>
                  </td>
                  <td>
                    <span className="mono">{l.ip}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}