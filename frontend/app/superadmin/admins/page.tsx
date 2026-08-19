import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform Team · iPixxel Realty Super Admin",
};

const MEMBERS = [
  { av: "PP", tone: "", name: "Pranab Patel", email: "pranab@aoneapps.com", role: "b-violet", roleTxt: "Platform Owner", access: ["All areas"], status: "b-green", statusTxt: "Active", active: "2 min ago", remove: false },
  { av: "AN", tone: "a2", name: "Aditi Nair", email: "aditi.nair@ipixxel.com", role: "b-indigo", roleTxt: "Support", access: ["Organisations", "Approvals"], status: "b-green", statusTxt: "Active", active: "18 min ago", remove: true },
  { av: "RM", tone: "a3", name: "Rohan Mehta", email: "rohan.mehta@ipixxel.com", role: "b-amber", roleTxt: "Billing", access: ["Subscriptions", "Analytics"], status: "b-green", statusTxt: "Active", active: "1 hr ago", remove: true },
  { av: "SK", tone: "a4", name: "Sneha Kulkarni", email: "sneha.k@ipixxel.com", role: "b-teal", roleTxt: "Template Reviewer", access: ["Templates", "Approvals"], status: "b-green", statusTxt: "Active", active: "3 hrs ago", remove: true },
  { av: "VR", tone: "a5", name: "Vikram Reddy", email: "vikram.reddy@ipixxel.com", role: "b-indigo", roleTxt: "Support", access: ["Organisations", "Audit Logs"], status: "b-green", statusTxt: "Active", active: "Yesterday", remove: true },
  { av: "PI", tone: "", name: "Priya Iyer", email: "priya.iyer@ipixxel.com", role: "b-teal", roleTxt: "Template Reviewer", access: ["Templates"], status: "b-amber", statusTxt: "Invited", active: "—", remove: true },
  { av: "KD", tone: "a2", name: "Karan Desai", email: "karan.desai@ipixxel.com", role: "b-amber", roleTxt: "Billing", access: ["Subscriptions"], status: "b-amber", statusTxt: "Invited", active: "—", remove: true },
];

export default function SuperAdminAdminsPage() {
  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">👥 Manage</div>
          <h1>Platform Team</h1>
          <div className="sub">Internal iPixxel staff who operate the platform.</div>
        </div>
        <div className="actions">
          <button className="btn btn-primary">+ Invite admin</button>
        </div>
      </div>

      <div className="help reveal" style={{ marginBottom: 20 }}>
        🛡️ <b>Platform-level roles</b> control access to this Super Admin console and apply across every
        organisation. They are distinct from <b>organisation roles</b> (Org Admin, Agent, Viewer) that a customer
        manages inside their own workspace.
      </div>

      <div className="card reveal">
        <div className="card-h">
          <span className="t">Internal team members</span>
          <span className="badge b-gray">7 members</span>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Access</th>
                <th>Status</th>
                <th>Last active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {MEMBERS.map((m) => (
                <tr key={m.email}>
                  <td>
                    <div className="u">
                      <span className={`av ${m.tone}`}>{m.av}</span>
                      <span>
                        <span className="nm">{m.name}</span>
                        <br />
                        <span className="sm">{m.email}</span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${m.role}`}>{m.roleTxt}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {m.access.map((a) => (
                        <span className="chip" key={a}>
                          {a}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${m.status}`}>
                      <span className="dot" style={{ background: "currentColor" }} />
                      {m.statusTxt}
                    </span>
                  </td>
                  <td>{m.active}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-ghost btn-sm">Edit</button>
                      {m.remove && <button className="btn btn-ghost btn-sm">Remove</button>}
                    </div>
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