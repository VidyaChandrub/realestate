"use client";

import type { BlockConfig } from "../types";

interface SpacerProps {
  height?: string;
  backgroundColor?: string;
}

export function SpacerBlock({ block }: { block: BlockConfig }) {
  const p = block.props as SpacerProps
  return (
    <div
      style={{
        height: p.height || '60px',
        backgroundColor: p.backgroundColor || 'transparent',
      }}
      aria-hidden="true"
    />
  )
}
