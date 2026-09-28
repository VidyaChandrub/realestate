"use client";

import { useRef, useEffect } from "react";
import type { BlockConfig } from "../types";
import { Code2 } from "lucide-react";

interface HtmlCodeProps {
  code?: string;
  clean?: boolean;
  title?: string;
}

export function HtmlCodeBlock({ block }: { block: BlockConfig }) {
  const p = block.props as HtmlCodeProps;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const container = ref.current;
    container.innerHTML = p.code || "";

    // In modern browsers, scripts inserted via innerHTML don't run.
    // Re-create script tags so embedded scripts work properly.
    const scripts = container.querySelectorAll("script");
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }, [p.code]);

  if (!p.code || !p.code.trim()) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-default/60 bg-bg-1/40 p-8 text-center backdrop-blur-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green/10 text-green">
            <Code2 className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-text-0">{p.title || "Custom HTML Block"}</p>
          <p className="mt-1 text-xs text-text-3">
            Select this block in the canvas to paste HTML, embed widgets, or edit code in the right panel.
          </p>
        </div>
      </div>
    );
  }

  // If clean is true or content appears to be a full-width section, render without artificial padding/prose
  const isSectionOrCustom =
    p.clean !== false &&
    (/<(section|header|footer|nav|main|div class=)/i.test(p.code) || p.clean === true);

  if (isSectionOrCustom) {
    return (
      <div className="relative w-full overflow-hidden">
        <div ref={ref} className="w-full" />
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      <div ref={ref} className="prose prose-sm max-w-none text-text-1" />
    </div>
  );
}

