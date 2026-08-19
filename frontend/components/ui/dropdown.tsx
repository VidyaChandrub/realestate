"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/lib/utils";

interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

export function Dropdown({
  trigger,
  children,
  align = "right",
  className,
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div className="relative" ref={ref}>
        <div onClick={() => setOpen(!open)}>{trigger}</div>
        {open ? (
          <div
            className={cn(
              "absolute z-40 mt-2 min-w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900",
              align === "right" ? "right-0" : "left-0",
              className,
            )}
          >
            {children}
          </div>
        ) : null}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownItem({
  icon,
  children,
  onClick,
  danger,
}: {
  icon?: IconName;
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  const context = useContext(DropdownContext);
  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        context?.setOpen(false);
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
        danger
          ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
      )}
    >
      {icon ? <Icon name={icon} size={16} className="text-slate-400" /> : null}
      {children}
    </button>
  );
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </div>
  );
}

export function DropdownDivider() {
  return <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />;
}