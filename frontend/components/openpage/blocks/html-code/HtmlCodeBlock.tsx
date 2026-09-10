"use client";

import { useRef, useEffect } from "react";
import type { BlockConfig } from "../types";

interface HtmlCodeProps {
  code?: string;
}

export function HtmlCodeBlock({ block }: { block: BlockConfig }) {
  const p = block.props as HtmlCodeProps
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current && p.code) {
      ref.current.innerHTML = p.code
    }
  }, [p.code])

  return (
    <div className="px-6 py-4">
      <div ref={ref} className="prose prose-sm max-w-none" />
    </div>
  )
}
