"use client";

import type { BlockConfig } from "../types";
import { RenderBlock } from "../registry";

interface ColumnsProps {
  columns?: Array<{ width: number; blocks: BlockConfig[] }>;
  gap?: string;
}

export function ColumnsBlock({ block }: { block: BlockConfig }) {
  const p = block.props as ColumnsProps
  const gap = p.gap || '24px'

  const columns = p.columns ?? [
    { width: 50, blocks: [{ id: 'col1-placeholder', type: 'content' as const, variant: 'prose', props: { body: '**Column 1**\n\nAdd your content here.' } }] },
    { width: 50, blocks: [{ id: 'col2-placeholder', type: 'content' as const, variant: 'prose', props: { body: '**Column 2**\n\nAdd your content here.' } }] },
  ]

  return (
    <div className="px-6 py-8">
      <div className="max-w-6xl mx-auto flex flex-wrap" style={{ gap }}>
        {columns.map((col, i) => (
          <div
            key={i}
            className="min-w-0"
            style={{ flex: `0 0 calc(${col.width}% - ${gap})` }}
          >
            {col.blocks.map((childBlock) => (
              <RenderBlock key={childBlock.id} block={childBlock} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
