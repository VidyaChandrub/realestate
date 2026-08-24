import type { Metadata } from "next";
import { Icon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Platform Team · iPixxel Realty Super Admin",
};

const MEMBERS: { av: string; tone: string; name: string; email: string; role: string; roleTxt: string; access: string[]; status: string; statusTxt: string; active: string; remove: boolean }[] = [];

export default function SuperAdminAdminsPage() {
  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow"><Icon name="users" size={14} /> Manage</div>
          <h1>Platform Team</h1>
          <div className="sub">Internal iPixxel staff who operate the platform.</div>
        </div>
        <div className="actions">
          <button className="btn btn-primary">+ Invite admin</button>
        </div>
      </div>

      <div className="help reveal" style={{ marginBottom: 20 }}>
        <Icon name="shield" size={14} /> <b>Platform-level roles</b> control access to this Super Admin console and apply across every
        organisation. They are distinct from <b>organisation roles</b> (Org Admin, Agent, Viewer) that a customer
        manages inside their own workspace.
      </div>

      <div className="card reveal">
        <div className="card-h">
          <span className="t">Internal team members</span>
          <span className="badge b-gray">{MEMBERS.length} members</span>
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
              {MEMBERS.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>No team members — invite your first admin.</td></tr>
                ) : MEMBERS.map((m) => (
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