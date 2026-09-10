"use client";

import { LayoutTemplate } from "lucide-react";

export function CanvasEmpty() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-10 relative z-[1]">
      <LayoutTemplate size={28} className="text-text-3" />
      <h3 className="text-lg font-semibold text-text-1">Blank canvas</h3>
      <p className="text-[13px] text-text-3 max-w-[360px] leading-relaxed">
        Add sections from the Templates library in the left panel, or drop blocks from Blocks.
      </p>
    </div>
  );
}
