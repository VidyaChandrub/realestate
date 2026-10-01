"use client";

import { useCallback, useMemo, useState } from "react";
import { Icon } from "@/components/icons";

/** Rows per page for every paginated list in both consoles. */
export const LIST_PAGE_SIZE = 10;

/**
 * Pages an already-loaded list 10 rows at a time — for lists whose KPI
 * cards, tab counts and filters are computed from the full list on the
 * client (paging them on the server would break those numbers).
 *
 * The page resets to 1 whenever `resetKey` changes (e.g. search / filter
 * text) and is clamped when the list shrinks (e.g. after a delete).
 */
export function usePagedRows<T>(rows: T[], resetKey: string, pageSize = LIST_PAGE_SIZE) {
  const [state, setState] = useState({ key: resetKey, page: 1 });
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(state.key === resetKey ? state.page : 1, totalPages);
  const setPage = useCallback((p: number) => setState({ key: resetKey, page: p }), [resetKey]);
  const pageRows = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page, pageSize]);
  return { page, setPage, pageRows, total: rows.length, pageSize };
}

/** Page numbers with ellipses, e.g. 1 … 4 5 6 … 12. */
function pageList(current: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

function PagerButton({
  children,
  label,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      style={{
        minWidth: 32,
        height: 32,
        padding: "0 6px",
        borderRadius: 8,
        border: active ? "none" : "1px solid #e2e8f0",
        background: active ? "#2563eb" : "#ffffff",
        color: active ? "#ffffff" : disabled ? "#94a3b8" : "#334155",
        fontWeight: active ? 700 : 500,
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled && !active ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

/**
 * "Showing X–Y of Z" + numbered pager, driven by a server-side total.
 * Renders nothing when everything fits on one page (the `page > 1` guard
 * keeps the pager reachable if a list shrinks while on a later page).
 */
export function ListPager({
  page,
  total,
  pageSize = LIST_PAGE_SIZE,
  onPageChange,
  loading,
  noun = "records",
}: {
  page: number;
  total: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  noun?: string;
}) {
  if (total <= 0 || (total <= pageSize && page <= 1)) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        padding: "14px 16px",
        borderTop: "1px solid #eef2f6",
        fontSize: 13,
        color: "#64748b",
      }}
    >
      <span>
        Showing {from}–{to} of {total.toLocaleString()} {noun}
      </span>
      {totalPages > 1 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <PagerButton label="Previous page" disabled={loading || page <= 1} onClick={() => onPageChange(page - 1)}>
            <Icon name="chevron-left" size={14} />
          </PagerButton>
          {pageList(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} style={{ padding: "0 4px", color: "#94a3b8" }}>
                …
              </span>
            ) : (
              <PagerButton
                key={p}
                label={`Page ${p}`}
                active={p === page}
                disabled={loading && p !== page}
                onClick={() => p !== page && onPageChange(p)}
              >
                {p}
              </PagerButton>
            ),
          )}
          <PagerButton
            label="Next page"
            disabled={loading || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <Icon name="chevron-right" size={14} />
          </PagerButton>
        </div>
      ) : null}
    </div>
  );
}
