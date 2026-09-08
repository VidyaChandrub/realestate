"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Icon } from "@/components/icons";
import { getSalesAgents } from "@/lib/api";
import type { SalesAgent } from "@/lib/types";

type AgentRole = "Admin" | "Manager" | "Sales";

const ROLE_BADGE: Record<AgentRole, string> = {
  Admin: "b-indigo",
  Manager: "b-violet",
  Sales: "b-teal",
};

const AV_MODIFIERS = ["", "a2", "a3", "a4", "a5"];

type DisplayRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  bridgeMissing: boolean;
  online: boolean;
  role: AgentRole;
  chip: string;
  added: string;
  av: string;
};

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function roleLabel(api: SalesAgent): AgentRole {
  switch (api.role?.key) {
    case "manager":
      return "Manager";
    case "sales":
      return "Sales";
    default:
      return "Admin";
  }
}

function avClass(id: string): string {
  const n = id.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return AV_MODIFIERS[n % AV_MODIFIERS.length];
}

function formatAdded(date: string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function apiRows(agents: SalesAgent[]): DisplayRow[] {
  return agents.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    phone: a.phoneNumber,
    bridgeMissing: a.bridgeMissing,
    online: a.online,
    role: roleLabel(a),
    chip: a.status === "active" ? "Active" : "Paused",
    added: formatAdded(a.joinedAt),
    av: avClass(a.id),
  }));
}

export default function OrgSalesAgentsPage() {
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getSalesAgents()
      .then((res) => {
        if (mounted) {
          setRows(apiRows(res.data));
          setError(null);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (mounted) {
          setRows([]);
          setError(e instanceof Error ? e.message : "Failed to load sales agents.");
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const paused = rows.filter((r) => r.chip === "Paused").length;
  const missing = rows.filter((r) => r.bridgeMissing).length;
  const online = rows.filter((r) => r.online).length;

  return (
    <>
      <div className="page-head reveal in">
        <div>
          <div className="eyebrow">
            <Icon name="users" size={14} /> Team
          </div>
          <h1>Sales Agents</h1>
          <div className="sub">
            Your calling &amp; sales team, phone bridge and lead assignment.
          </div>
        </div>
        <div className="actions">
          <Link className="btn btn-primary" href="/org/users">
            <Icon name="plus" size={15} /> Add agent
          </Link>
        </div>
      </div>

      {missing > 0 ? (
        <Reveal delay={1}>
          <div
            className="help"
            style={{
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
              background: "linear-gradient(120deg, var(--amber-050), #fff)",
              borderColor: "#f6d9a8",
            }}
          >
            <span>
              <b>
                {missing} agent{missing === 1 ? " is" : "s are"} missing a phone
                number
              </b>{" "}
              — masked calling is disabled for them.
            </span>
            <a href="#missing" style={{ color: "var(--amber)", fontWeight: 600, whiteSpace: "nowrap" }}>
              Identify missing →
            </a>
          </div>
        </Reveal>
      ) : null}

      <div className="grid g4" style={{ marginBottom: 20 }}>
        <Reveal delay={1}>
          <div className="stat">
            <div className="top">
              <span className="label">Agents</span>
              <span className="ic ic-green">
                <Icon name="users" size={17} />
              </span>
            </div>
            <div className="value">
              {loading ? "—" : <CountUp value={rows.length} />}
            </div>
            <div className="delta">Managers and sales users</div>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <div className="stat">
            <div className="top">
              <span className="label">Paused assignment</span>
              <span className="ic ic-violet">
                <Icon name="target" size={17} />
              </span>
            </div>
            <div className="value">
              {loading ? "—" : <CountUp value={paused} />}
            </div>
            <div className="delta">{paused === 0 ? "None paused" : "Inactive accounts"}</div>
          </div>
        </Reveal>
        <Reveal delay={3}>
          <div className="stat">
            <div className="top">
              <span className="label">Missing phones</span>
              <span className="ic ic-rose">
                <Icon name="alert" size={17} />
              </span>
            </div>
            <div className="value">
              {loading ? "—" : <CountUp value={missing} />}
            </div>
            <div className="delta">{missing === 0 ? "All have a number" : "Needs a number"}</div>
          </div>
        </Reveal>
        <Reveal delay={4}>
          <div className="stat">
            <div className="top">
              <span className="label">Active accounts</span>
              <span className="ic ic-sky">
                <Icon name="phone" size={17} />
              </span>
            </div>
            <div className="value">
              {loading ? "—" : <CountUp value={online} />}
            </div>
            <div className="delta">Status from user accounts</div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={2}>
        <div className="card" id="missing">
          <div className="card-h">
            <span className="t">Team members</span>
            <span className="x">{loading ? "Loading…" : `${rows.length} agents`}</span>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Phone / Bridge</th>
                  <th>Status</th>
                  <th>Assignment</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="muted">Loading sales agents…</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="muted">{error}</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted">
                      No sales agents yet. Create a manager or sales user in Users.
                    </td>
                  </tr>
                ) : (
                  rows.map((agent) => (
                    <tr key={agent.id}>
                      <td>
                        <div className="u">
                          <span className={`av ${agent.av}`}>
                            {initialsFor(agent.name)}
                          </span>
                          <span>
                            <Link
                              className="nm"
                              href={`/org/sales-agents/${agent.id}`}
                              style={{ color: "var(--brand)" }}
                            >
                              {agent.name}
                            </Link>
                            <br />
                            <span className="sm">{agent.email}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${ROLE_BADGE[agent.role]}`}>
                          {agent.role}
                        </span>
                      </td>
                      <td>
                        {agent.bridgeMissing ? (
                          <span className="badge b-rose">Missing</span>
                        ) : (
                          <span className="mono">{agent.phone}</span>
                        )}
                      </td>
                      <td>
                        <span
                          className="dot"
                          style={{
                            background: agent.online ? "var(--green)" : "var(--faint)",
                          }}
                        ></span>{" "}
                        {agent.online ? "Active" : "Inactive"}
                      </td>
                      <td>
                        <span className="chip">{agent.chip}</span>
                      </td>
                      <td className="muted">{agent.added}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
    </>
  );
}
