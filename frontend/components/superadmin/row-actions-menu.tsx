"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons";

export interface RowAction {
  key: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

// Renders the trigger as a normal inline element, but portals the open menu
// out to the nearest .superadmin ancestor, positioned via the trigger's live
// bounding rect. Table action columns commonly sit inside a horizontally-
// scrolling wrapper (.tbl-wrap uses overflow-x: auto, which forces
// overflow-y to auto too per spec) — an absolutely-positioned menu nested
// inside that wrapper would get clipped for any row near the table's edge.
// Portaling sidesteps that entirely and keeps the menu correctly placed
// regardless of table scroll.
export function RowActionsMenu({ actions, disabled }: { actions: RowAction[]; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  // .row-menu's styling (and the --surface/--ink/etc. custom properties it
  // reads) is scoped under the .superadmin wrapper, so the portal target
  // must stay a descendant of that wrapper — portaling to document.body
  // would land the menu as .superadmin's sibling instead, rendering it
  // completely unstyled and in-flow at the very bottom of the document
  // instead of positioned near the click. Resolved in the effect below
  // (not during render, where reading a ref is disallowed).
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const reposition = () => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const estimatedHeight = actions.length * 38 + 12;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < estimatedHeight + 12 && rect.top > estimatedHeight;
      setPos({
        top: openUp ? rect.top - estimatedHeight - 6 : rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    };
    reposition();
    setPortalTarget((btnRef.current?.closest(".superadmin") as HTMLElement | null) ?? document.body);

    const close = () => setOpen(false);
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
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
  }, [open, actions.length]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="row-menu-trigger"
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="dots" size={16} />
      </button>
      {open && pos && portalTarget
        ? createPortal(
            <div
              ref={menuRef}
              className="row-menu"
              role="menu"
              style={{ top: pos.top, right: pos.right }}
            >
              {actions.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  role="menuitem"
                  className={`row-menu-item${a.danger ? " danger" : ""}`}
                  disabled={a.disabled}
                  onClick={() => {
                    setOpen(false);
                    a.onClick();
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>,
            portalTarget,
          )
        : null}
    </>
  );
}
