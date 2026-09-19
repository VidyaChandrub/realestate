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
    <div className="rounded-lg border border-border-subtle bg-bg-2/40 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-1 hover:text-text-0 bg-bg-2/50 hover:bg-bg-3 transition-colors"
      >
        <span className={`flex-1 text-left text-[10px] font-bold uppercase tracking-wider ${open ? 'text-text-1' : 'text-text-3'}`}>
          {title}
        </span>
        <span className={`w-3.5 h-3.5 flex items-center justify-center rounded border ${open ? 'border-green/40 text-green' : 'border-border-default text-text-3'} transition-colors`}>
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </span>
      </button>
      {open && <div className="px-3 py-3 border-t border-border-subtle space-y-1">{children}</div>}
    </div>
  );
}
