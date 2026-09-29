"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Crown } from "lucide-react";
import type { Plan } from "@/lib/types";

/** Plan filter for Template Management — lists every subscription plan the
 *  Super Admin has created (fetched from /admin/plans), so new plans show up
 *  without code changes. `value` is a plan id or "all". */
export function PlanFilterDropdown({
  plans,
  value,
  onChange,
  counts,
  totalCount,
}: {
  plans: Plan[];
  value: string;
  onChange: (planId: string) => void;
  /** Templates available to each plan id. */
  counts: Record<string, number>;
  totalCount: number;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () =>
      [...plans].sort(
        (a, b) =>
          Number(b.isActive !== false) - Number(a.isActive !== false) ||
          (a.priceMonthly ?? 0) - (b.priceMonthly ?? 0) ||
          a.name.localeCompare(b.name),
      ),
    [plans],
  );
  const selected = plans.find((p) => p.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
  }

  const countBadge = (n: number, active: boolean) => (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: "1px 6px",
        borderRadius: 999,
        background: active ? "var(--brand-050)" : "rgba(0,0,0,0.05)",
        color: active ? "var(--brand)" : "var(--muted)",
      }}
    >
      {n}
    </span>
  );

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Filter by subscription plan"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          height: 38,
          padding: "0 12px",
          borderRadius: 10,
          border: `1px solid ${selected ? "var(--brand)" : "var(--line-2)"}`,
          background: selected ? "var(--brand-050)" : "var(--surface-2, #f8fafc)",
          color: "var(--ink)",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <Crown size={14} style={{ color: selected ? "var(--brand)" : "var(--muted)" }} />
        {selected ? selected.name : "All Plans"}
        {countBadge(selected ? (counts[selected.id] ?? 0) : totalCount, !!selected)}
        <ChevronDown
          size={14}
          style={{ color: "var(--muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Subscription plans"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 40,
            minWidth: 240,
            maxHeight: 320,
            overflowY: "auto",
            background: "var(--surface)",
            border: "1px solid var(--line-2)",
            borderRadius: 12,
            boxShadow: "0 16px 36px -12px rgba(14, 21, 37, 0.22)",
            padding: 4,
          }}
        >
          {[{ id: "all", name: "All Plans", price: null as string | null, inactive: false, n: totalCount }]
            .concat(
              sorted.map((p) => ({
                id: p.id,
                name: p.name,
                price: p.priceMonthly ? `₹${p.priceMonthly.toLocaleString()}/mo` : "Free",
                inactive: p.isActive === false,
                n: counts[p.id] ?? 0,
              })),
            )
            .map((opt) => {
              const active = value === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(opt.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "8px 10px",
                    border: "none",
                    borderRadius: 8,
                    background: active ? "var(--brand-050)" : "transparent",
                    color: "var(--ink)",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 13,
                  }}
                >
                  <span style={{ width: 14, display: "inline-flex", color: "var(--brand)" }}>
                    {active ? <Check size={14} /> : null}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: active ? 700 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {opt.name}
                      {opt.inactive ? (
                        <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 600, color: "var(--muted)" }}>(Inactive)</span>
                      ) : null}
                    </span>
                    {opt.price ? <span style={{ fontSize: 11, color: "var(--muted)" }}>{opt.price}</span> : null}
                  </span>
                  {countBadge(opt.n, active)}
                </button>
              );
            })}
          {plans.length === 0 ? (
            <div style={{ padding: "8px 10px", fontSize: 12, color: "var(--muted)" }}>No subscription plans found.</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
