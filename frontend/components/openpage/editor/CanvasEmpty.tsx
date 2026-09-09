"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useConfigStore } from "@/components/openpage/store/configStore";
import { buildRealEstateTemplate } from "@/lib/openpage/re-templates";

export function CanvasEmpty() {
  function handleLoadTemplate() {
    const name = useConfigStore.getState().config.name || "Meridian Residences";
    useConfigStore.getState().setConfig(buildRealEstateTemplate("premium", name));
    toast("Premium template loaded");
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-10 relative z-[1]">
      <h3 className="text-lg font-semibold text-text-1">Start with the premium template</h3>
      <p className="text-[13px] text-text-3 max-w-[360px] leading-relaxed">
        Load the real-estate landing page, then edit, hide, or reorder any section.
      </p>
      <button
        type="button"
        onClick={handleLoadTemplate}
        className="px-3.5 py-1.5 rounded-md bg-green text-black text-[12.5px] font-semibold border border-green hover:bg-green-dim transition-colors flex items-center gap-1.5"
      >
        <Plus size={14} />
        Load premium template
      </button>
    </div>
  );
}
