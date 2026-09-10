"use client";

import { useEffect, useRef } from "react";
import type { BlockConfig } from "../types";

interface AnchorProps {
  anchorId?: string;
}

export function AnchorBlock({ block }: { block: BlockConfig }) {
  const p = block.props as AnchorProps
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current && p.anchorId) {
      ref.current.id = p.anchorId
    }
  }, [p.anchorId])

  return (
    <div
      ref={ref}
      id={p.anchorId || block.id}
      style={{ height: 0, overflow: 'hidden' }}
      aria-hidden="true"
    />
  )
}
