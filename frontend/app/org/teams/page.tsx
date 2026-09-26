"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Reveal } from "@/components/superadmin/reveal";
import { CountUp } from "@/components/superadmin/count-up";
import { Icon } from "@/components/icons";
import { AvatarStack } from "@/components/org/team-fields";
import { listTeams } from "@/lib/api";
import type { Team } from "@/lib/types";
import "./teams.css";

export default function OrgTeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & View State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    listTeams()
      .then((res) => {
        if (mounted) {
          setTeams(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load teams.");
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalMembers = teams.reduce((sum, t) => sum + (t.memberCount || 0), 0);
  const totalActiveLeads = teams.reduce((sum, t) => sum + (t.activeLeads || 0), 0);
  const avgConversion =
    teams.length === 0
      ? 0
      : Math.round(teams.reduce((sum, t) => sum + (t.conversionPct || 0), 0) / teams.length);

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (team.teamLead?.name && team.teamLead.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (team.region && team.region.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" || team.status.toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [teams, searchQuery, statusFilter]);

  return (
    <div className="tm-wrap">
      {/* Page Header matching mockup */}
      <Reveal delay={1}>
        <div className="tm-header">
          <div className="tm-header-icon" aria-hidden="true">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="tm-header-content">
            <div className="tm-eyebrow">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 17L17 7M7 7h10v10" />
              </svg>
              TEAM
            </div>
            <h1 className="tm-title">Teams</h1>
            <p className="tm-sub">
              Group members into teams, assign a lead, and grant them project access.
            </p>
          </div>
        </div>
      </Reveal>

      {error ? (
        <div
          className="help"
          style={{
            background: "#fef2f2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            padding: "12px 16px",
          }}
        >
          Couldn&apos;t load teams — {error}
        </div>
      ) : null}

      {/* 4 Stat Cards */}
      <div className="tm-stats-grid">
        {/* Card 1: Total Teams */}
        <Reveal delay={1}>
          <div className="tm-stat-card blue">
            <div className="tm-stat-top">
              <div style={{ display: "flex", alignItems: "center" }}>
                <div className="tm-stat-icon-wrapper">
                  <div className="tm-stat-ic-box">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div className="tm-stat-indicator" />
                </div>
                <div className="tm-stat-label-group">
                  <span className="tm-stat-label">Total Teams</span>
                </div>
              </div>
              <button
                type="button"
                className="tm-stat-arrow-btn"
                title="View teams"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="tm-stat-value">
              {loading ? "—" : <CountUp value={teams.length} />}
            </div>
            <div className="tm-stat-delta">Across the organisation</div>

            {/* Subtle background decorative paper plane watermark */}
            <div className="tm-stat-watermark" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                <path d="m2 12 20-9-9 20-2-8-9-3z" />
              </svg>
            </div>
          </div>
        </Reveal>

        {/* Card 2: Team Members */}
        <Reveal delay={2}>
          <div className="tm-stat-card green">
            <div className="tm-stat-top">
              <div style={{ display: "flex", alignItems: "center" }}>
                <div className="tm-stat-icon-wrapper">
                  <div className="tm-stat-ic-box">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="tm-stat-indicator" />
                </div>
                <div className="tm-stat-label-group">
                  <span className="tm-stat-label">Team Members</span>
                </div>
              </div>
              <Link
                href="/org/teams/onboard"
                className="tm-stat-arrow-btn"
                title="Onboard members"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="tm-stat-value">
              {loading ? "—" : <CountUp value={totalMembers} />}
            </div>
            <div className="tm-stat-delta">Assigned to a team</div>
          </div>
        </Reveal>

        {/* Card 3: Leads Assigned */}
        <Reveal delay={3}>
          <div className="tm-stat-card orange">
            <div className="tm-stat-top">
              <div style={{ display: "flex", alignItems: "center" }}>
                <div className="tm-stat-icon-wrapper">
                  <div className="tm-stat-ic-box">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  </div>
                  <div className="tm-stat-indicator" />
                </div>
                <div className="tm-stat-label-group">
                  <span className="tm-stat-label">Leads Assigned</span>
                </div>
              </div>
              <Link
                href="/org/leads"
                className="tm-stat-arrow-btn"
                title="View leads"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="tm-stat-value">
              {loading ? "—" : <CountUp value={totalActiveLeads} />}
            </div>
            <div className="tm-stat-delta">Across teams</div>
          </div>
        </Reveal>

        {/* Card 4: Avg Conversion */}
        <Reveal delay={4}>
          <div className="tm-stat-card purple">
            <div className="tm-stat-top">
              <div style={{ display: "flex", alignItems: "center" }}>
                <div className="tm-stat-icon-wrapper">
                  <div className="tm-stat-ic-box">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 20V10" />
                      <path d="M12 20V4" />
                      <path d="M6 20v-6" />
                    </svg>
                  </div>
                  <div className="tm-stat-indicator" />
                </div>
                <div className="tm-stat-label-group">
                  <span className="tm-stat-label">Avg Conversion</span>
                </div>
              </div>
              <Link
                href="/org/reports"
                className="tm-stat-arrow-btn"
                title="View reports"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="tm-stat-value">
              {loading ? "—" : <CountUp value={avgConversion} suf="%" />}
            </div>
            <div className="tm-stat-delta">Won + Decided, per team</div>
          </div>
        </Reveal>
      </div>

      {/* Tabs & Controls Toolbar */}
      <Reveal delay={2}>
        <div className="tm-toolbar-row">
          {/* Sub Navigation Tabs */}
          <div className="tm-tabs">
            <Link href="/org/teams" className="tm-tab-item active">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Teams
            </Link>
            <Link href="/org/team-chat" className="tm-tab-item">
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Team Chat
            </Link>
            <Link href="/org/teams/onboard" className="tm-tab-item">
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
              Onboarding
            </Link>
          </div>

          {/* Right Toolbar Controls */}
          <div className="tm-controls">
            {/* Search Input */}
            <div className="tm-search-box">
              <span className="tm-search-icon">
                <Icon name="search" size={16} />
              </span>
              <input
                type="text"
                className="tm-search-input"
                placeholder="Search teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#9ca3af",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  title="Clear search"
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <div className="tm-dropdown-wrapper" ref={dropdownRef}>
              <button
                type="button"
                className="tm-filter-btn"
                onClick={() => setStatusDropdownOpen((prev) => !prev)}
                aria-expanded={statusDropdownOpen}
              >
                <Icon name="filter" size={14} />
                <span>
                  {statusFilter === "all"
                    ? "All Status"
                    : statusFilter === "active"
                    ? "Active"
                    : "Inactive"}
                </span>
                <Icon name="chevron-down" size={14} />
              </button>

              {statusDropdownOpen && (
                <div className="tm-dropdown-menu">
                  <button
                    type="button"
                    className={`tm-dropdown-item ${statusFilter === "all" ? "selected" : ""}`}
                    onClick={() => {
                      setStatusFilter("all");
                      setStatusDropdownOpen(false);
                    }}
                  >
                    All Status
                    {statusFilter === "all" && <Icon name="check" size={14} />}
                  </button>
                  <button
                    type="button"
                    className={`tm-dropdown-item ${statusFilter === "active" ? "selected" : ""}`}
                    onClick={() => {
                      setStatusFilter("active");
                      setStatusDropdownOpen(false);
                    }}
                  >
                    Active
                    {statusFilter === "active" && <Icon name="check" size={14} />}
                  </button>
                  <button
                    type="button"
                    className={`tm-dropdown-item ${statusFilter === "inactive" ? "selected" : ""}`}
                    onClick={() => {
                      setStatusFilter("inactive");
                      setStatusDropdownOpen(false);
                    }}
                  >
                    Inactive
                    {statusFilter === "inactive" && <Icon name="check" size={14} />}
                  </button>
                </div>
              )}
            </div>

            {/* View Switchers (Grid / List) */}
            <button
              type="button"
              className={`tm-view-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grid View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
                <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
                <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
                <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
              </svg>
            </button>

            <button
              type="button"
              className={`tm-view-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
              title="List View"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </Reveal>

      {/* Main Content Area */}
      {loading ? (
        <div className="tm-empty-card" style={{ minHeight: 300 }}>
          <div className="muted" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="dot" style={{ background: "#059669" }} /> Loading teams…
          </div>
        </div>
      ) : filteredTeams.length === 0 ? (
        /* Empty State */
        <Reveal delay={2}>
          <div className="tm-empty-card">
            {/* Custom SVG Illustration exactly matching the design */}
            <div className="tm-illustration">
              <svg
                width="140"
                height="115"
                viewBox="0 0 140 115"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Radiating burst lines above */}
                <line
                  x1="46"
                  y1="25"
                  x2="38"
                  y2="14"
                  stroke="#A855F7"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <line
                  x1="58"
                  y1="19"
                  x2="56"
                  y2="8"
                  stroke="#EC4899"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <line
                  x1="70"
                  y1="17"
                  x2="70"
                  y2="5"
                  stroke="#3B82F6"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <line
                  x1="82"
                  y1="19"
                  x2="84"
                  y2="8"
                  stroke="#F59E0B"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <line
                  x1="94"
                  y1="25"
                  x2="102"
                  y2="14"
                  stroke="#F97316"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />

                {/* Left Figure (Soft Violet / Purple) */}
                <circle cx="44" cy="54" r="16" fill="#8B5CF6" />
                <path
                  d="M24 94C24 79 33 71 44 71C55 71 64 79 64 94V98H24V94Z"
                  fill="#8B5CF6"
                  opacity="0.95"
                />

                {/* Right Figure (Fresh Emerald Green) */}
                <circle cx="96" cy="54" r="16" fill="#10B981" />
                <path
                  d="M76 94C76 79 85 71 96 71C107 71 116 79 116 94V98H76V94Z"
                  fill="#10B981"
                  opacity="0.95"
                />

                {/* Center Figure (Electric Blue, in front) */}
                <circle cx="70" cy="46" r="18" fill="#2563EB" />
                <path
                  d="M46 94C46 76 56 67 70 67C84 67 94 76 94 94V98H46V94Z"
                  fill="#2563EB"
                />
              </svg>
            </div>

            {searchQuery || statusFilter !== "all" ? (
              <>
                <h2 className="tm-empty-title">No teams match your filter</h2>
                <p className="tm-empty-desc">
                  Try adjusting your search query or clear the status filter to see other teams.
                </p>
                <button
                  type="button"
                  className="tm-btn-create"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <h2 className="tm-empty-title">Create your first team</h2>
                <p className="tm-empty-desc">
                  Group members, assign a lead, and set project access to start collaborating
                  efficiently.
                </p>
                <Link href="/org/teams/create" className="tm-btn-create">
                  <Icon name="plus" size={16} />
                  <span>Create team</span>
                </Link>
              </>
            )}
          </div>
        </Reveal>
      ) : viewMode === "grid" ? (
        /* Grid View with Cards */
        <div className="tm-cards-grid">
          {filteredTeams.map((team, i) => (
            <Reveal delay={i + 1} key={team.id}>
              <div
                className="tm-team-card"
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/org/teams/${team.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") router.push(`/org/teams/${team.id}`);
                }}
              >
                <div className="tm-team-card-head">
                  <span className="tm-team-name">{team.name}</span>
                  <span
                    className={`tm-team-status ${
                      team.status === "active" ? "active" : "inactive"
                    }`}
                  >
                    <span
                      className="dot"
                      style={{
                        background: team.status === "active" ? "#059669" : "#9ca3af",
                      }}
                    />
                    {team.status === "active" ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="tm-team-meta-row">
                  <AvatarStack people={team.memberPreviews || []} />
                  <span style={{ fontSize: 13, color: "#6b7280" }}>
                    {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
                  </span>
                </div>

                <div className="tm-team-stats-box">
                  <div>
                    <div className="tm-stat-num">{team.activeLeads}</div>
                    <div className="tm-stat-sublabel">Active leads</div>
                  </div>
                  <div>
                    <div className="tm-stat-num">{team.projectCount}</div>
                    <div className="tm-stat-sublabel">Projects</div>
                  </div>
                  <div>
                    <div className="tm-stat-num" style={{ color: "#059669" }}>
                      {team.conversionPct}%
                    </div>
                    <div className="tm-stat-sublabel">Conversion</div>
                  </div>
                </div>

                <div className="tm-team-actions">
                  <Link
                    className="btn btn-soft btn-sm"
                    href={`/org/teams/${team.id}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{ flex: 1, textAlign: "center" }}
                  >
                    Open team
                  </Link>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/org/teams/onboard?team=${team.id}`);
                    }}
                  >
                    Add member
                  </button>
                </div>
              </div>
            </Reveal>
          ))}

          {/* "+ Create a new team" dashed card */}
          <Reveal delay={filteredTeams.length + 1}>
            <Link href="/org/teams/create" className="tm-create-dashed-card">
              <span className="tm-dashed-plus">＋</span>
              <span className="tm-dashed-title">Create a new team</span>
              <span className="tm-dashed-desc">Group members &amp; set access</span>
            </Link>
          </Reveal>
        </div>
      ) : (
        /* List View */
        <Reveal delay={2}>
          <div className="tm-table-card">
            <table className="tm-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Status</th>
                  <th>Lead</th>
                  <th>Region</th>
                  <th>Members</th>
                  <th>Active Leads</th>
                  <th>Conversion</th>
                  <th>Projects</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map((team) => (
                  <tr key={team.id}>
                    <td>
                      <Link
                        href={`/org/teams/${team.id}`}
                        style={{ fontWeight: 600, color: "#059669" }}
                      >
                        {team.name}
                      </Link>
                    </td>
                    <td>
                      <span
                        className={`tm-team-status ${
                          team.status === "active" ? "active" : "inactive"
                        }`}
                      >
                        <span
                          className="dot"
                          style={{
                            background: team.status === "active" ? "#059669" : "#9ca3af",
                          }}
                        />
                        {team.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{team.teamLead ? team.teamLead.name : <span className="muted">—</span>}</td>
                    <td>{team.region ?? <span className="muted">—</span>}</td>
                    <td>{team.memberCount}</td>
                    <td>{team.activeLeads}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: team.conversionPct >= 20 ? "#ecfdf5" : "#fffbeb",
                          color: team.conversionPct >= 20 ? "#059669" : "#d97706",
                        }}
                      >
                        {team.conversionPct}%
                      </span>
                    </td>
                    <td>{team.projectCount}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        className="btn btn-soft btn-sm"
                        href={`/org/teams/${team.id}`}
                        style={{ marginRight: 6 }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      )}
    </div>
  );
}
