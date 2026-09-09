"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getOrgLeadStageDisplays } from "@/lib/api";
import type { CrmLeadStatus, OrgLeadStageDisplay } from "@/lib/types";

/**
 * THE single source of truth for how a lead pipeline stage is *displayed*
 * (its label and badge colour). Every screen that shows a stage — the status
 * dropdown, the leads list, lead detail, project leads, sales-agent pages and
 * the dashboard pipeline chart — reads from here via `useLeadStages()` /
 * `<StageBadge>` instead of keeping its own `Record<CrmLeadStatus, ...>` map.
 *
 * The seven stages and their enum keys are FIXED. Only label + colour are
 * org-customisable; the keys used for filtering, DTOs and API calls never
 * change.
 */

export const LEAD_STAGE_ORDER: CrmLeadStatus[] = [
  "new",
  "contacted",
  "follow_up",
  "site_visit",
  "negotiation",
  "won",
  "lost",
];

/** Built-in label + colour, used until (and unless) an org overrides a stage.
 *  Colours match the swatches the Settings screen has always shown. */
export const DEFAULT_LEAD_STAGES: Record<
  CrmLeadStatus,
  { label: string; color: string }
> = {
  new: { label: "New", color: "#94a3b8" },
  contacted: { label: "Contacted", color: "#0ea5e9" },
  follow_up: { label: "Follow-up", color: "#f59e0b" },
  site_visit: { label: "Site Visit", color: "#6366f1" },
  negotiation: { label: "Negotiation", color: "#7c3aed" },
  won: { label: "Won", color: "#16a34a" },
  lost: { label: "Lost", color: "#e11d48" },
};

export function defaultLeadStages(): OrgLeadStageDisplay[] {
  return LEAD_STAGE_ORDER.map((status) => ({
    status,
    label: DEFAULT_LEAD_STAGES[status].label,
    color: DEFAULT_LEAD_STAGES[status].color,
    customized: false,
  }));
}

/** Pale fill for a badge/pill background from a #RRGGBB hex (≈12% alpha). */
export function stageTint(hexColor: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(hexColor) ? `${hexColor}1f` : "#eef1f6";
}

interface LeadStagesContextValue {
  /** All seven stages, canonical order, each resolved to label+colour. */
  stages: OrgLeadStageDisplay[];
  byStatus: Record<CrmLeadStatus, OrgLeadStageDisplay>;
  label: (status: CrmLeadStatus) => string;
  color: (status: CrmLeadStatus) => string;
  loading: boolean;
  error: string | null;
  /** Re-fetch from the server. */
  refresh: () => Promise<void>;
  /** Push server results (or an optimistic edit) into the shared store so the
   *  whole app reflects a Settings change without a reload. */
  applyServer: (rows: OrgLeadStageDisplay[]) => void;
}

const FALLBACK_STAGES = defaultLeadStages();

function toByStatus(
  rows: OrgLeadStageDisplay[],
): Record<CrmLeadStatus, OrgLeadStageDisplay> {
  const base = { ...toRecord(FALLBACK_STAGES) };
  for (const row of rows) {
    if (row && LEAD_STAGE_ORDER.includes(row.status)) base[row.status] = row;
  }
  return base;
}

function toRecord(
  rows: OrgLeadStageDisplay[],
): Record<CrmLeadStatus, OrgLeadStageDisplay> {
  return rows.reduce(
    (acc, row) => {
      acc[row.status] = row;
      return acc;
    },
    {} as Record<CrmLeadStatus, OrgLeadStageDisplay>,
  );
}

const LeadStagesContext = createContext<LeadStagesContextValue | null>(null);

export function LeadStagesProvider({ children }: { children: ReactNode }) {
  const [rows, setRows] = useState<OrgLeadStageDisplay[]>(FALLBACK_STAGES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const data = await getOrgLeadStageDisplays();
      if (Array.isArray(data) && data.length > 0) setRows(data);
      setError(null);
    } catch (e) {
      // Non-fatal: fall back to defaults so every screen still renders.
      setError(e instanceof Error ? e.message : "Failed to load pipeline stages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    void refresh();
  }, [refresh]);

  const applyServer = useCallback((next: OrgLeadStageDisplay[]) => {
    if (Array.isArray(next) && next.length > 0) setRows(next);
  }, []);

  const value = useMemo<LeadStagesContextValue>(() => {
    // Always present all seven, in order, even if the server omitted one.
    const byStatus = toByStatus(rows);
    const stages = LEAD_STAGE_ORDER.map((status) => byStatus[status]);
    return {
      stages,
      byStatus,
      label: (status) =>
        byStatus[status]?.label ?? DEFAULT_LEAD_STAGES[status]?.label ?? String(status),
      color: (status) =>
        byStatus[status]?.color ?? DEFAULT_LEAD_STAGES[status]?.color ?? "#94a3b8",
      loading,
      error,
      refresh,
      applyServer,
    };
  }, [rows, loading, error, refresh, applyServer]);

  return (
    <LeadStagesContext.Provider value={value}>
      {children}
    </LeadStagesContext.Provider>
  );
}

/**
 * Read the org's stage labels/colours. Safe to call outside the provider —
 * it degrades to built-in defaults (used by e.g. Storybook / tests).
 */
export function useLeadStages(): LeadStagesContextValue {
  const ctx = useContext(LeadStagesContext);
  if (ctx) return ctx;
  const byStatus = toByStatus(FALLBACK_STAGES);
  return {
    stages: FALLBACK_STAGES,
    byStatus,
    label: (status) => DEFAULT_LEAD_STAGES[status]?.label ?? String(status),
    color: (status) => DEFAULT_LEAD_STAGES[status]?.color ?? "#94a3b8",
    loading: false,
    error: null,
    refresh: async () => {},
    applyServer: () => {},
  };
}

/** A pipeline-stage badge coloured by the org's setting for that stage. */
export function StageBadge({
  status,
  className,
  style,
}: {
  status: CrmLeadStatus;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { label, color } = useLeadStages();
  const c = color(status);
  return (
    <span
      className={className ? `badge ${className}` : "badge"}
      style={{ background: stageTint(c), color: c, ...style }}
    >
      {label(status)}
    </span>
  );
}
