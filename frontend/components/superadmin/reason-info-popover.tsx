"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons";

// Mirrors RowActionsMenu's portal + fixed-position approach: this icon
// commonly sits inside a table cell within a horizontally-scrolling
// .tbl-wrap (overflow-x: auto forces overflow-y: auto too per spec), so an
// absolutely-positioned popover nested in that wrapper would get clipped.
export function ReasonInfoPopover({
  reason,
  label = "Rejection reason",
}: {
  reason: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const reposition = () => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 260;
      const left = Math.min(rect.left, window.innerWidth - width - 12);
      setPos({ top: rect.bottom + 6, left: Math.max(12, left) });
    };
    reposition();
    setPortalTarget((btnRef.current?.closest(".superadmin") as HTMLElement | null) ?? document.body);

    const close = () => setOpen(false);
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", reposition);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="reason-info-trigger"
        title={`${label}: ${reason}`}
        aria-label={`View ${label.toLowerCase()}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <Icon name="info" size={14} />
      </button>
      {open && pos && portalTarget
        ? createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              className="reason-info-popover"
              style={{ top: pos.top, left: pos.left }}
            >
              <div className="reason-info-popover-label">{label}</div>
              <div className="reason-info-popover-text">{reason}</div>
            </div>,
            portalTarget,
          )
        : null}
    </>
  );
}
