"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border-subtle">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3.5 py-2.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-text-3 hover:text-text-2 transition-colors"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {title}
      </button>
      {open && <div className="px-3.5 pb-3">{children}</div>}
    </div>
  );
}
