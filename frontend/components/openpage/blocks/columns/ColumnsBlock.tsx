"use client";

import { useCallback, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BlockConfig } from "../types";
import { RenderBlock } from "../registry";
import { useConfigStore } from "@/components/openpage/store/configStore";
import { useEditorStore } from "@/components/openpage/store/editorStore";
import { Plus } from "lucide-react";

interface ColumnsProps {
  columns?: Array<{ width: number; blocks: BlockConfig[] }>;
  gap?: string;
}

function ColumnBlock({ block, columnId }: { block: BlockConfig; columnId: string }) {
  const { selectedBlockId, selectBlock } = useEditorStore()
  const { removeBlockFromColumn, duplicateBlockInColumn } = useConfigStore()
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: block.id, data: { columnId } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  const isSelected = selectedBlockId === block.id

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => { e.stopPropagation(); selectBlock(block.id) }}
      className={`relative group/myblock ${
        isSelected ? "outline outline-1 outline-dashed outline-blue-400" : "hover:outline hover:outline-1 hover:outline-dashed hover:outline-blue-400/50"
      }`}
    >
      <div
        className={`absolute -top-6 right-0 z-20 flex items-center rounded overflow-hidden text-[9px] bg-blue-500 shadow-sm ${
          isSelected ? "opacity-100" : "opacity-0 group-hover/myblock:opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="px-1 py-0.5 text-white/90 hover:bg-blue-600 cursor-grab active:cursor-grabbing"
          title="Drag"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20"/></svg>
        </button>
        <button
          type="button"
          onClick={() => duplicateBlockInColumn(columnId, 0, block.id)}
          className="px-1 py-0.5 text-white/90 hover:bg-blue-600"
          title="Duplicate"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
        </button>
        <button
          type="button"
          onClick={() => removeBlockFromColumn(columnId, 0, block.id)}
          className="px-1 py-0.5 text-white/90 hover:bg-red-500"
          title="Remove"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <RenderBlock block={block} />
    </div>
  )
}

function DroppableColumn({
  sectionBlockId,
  colIndex,
  col,
  gap,
}: {
  sectionBlockId: string;
  colIndex: number;
  col: { width: number; blocks: BlockConfig[] };
  gap: string;
}) {
  const { addBlockToColumn } = useConfigStore()
  const [isOver, setIsOver] = useState(false)

  const { setNodeRef, isOver: dndIsOver } = useDroppable({
    id: `column-${sectionBlockId}-${colIndex}`,
    data: { type: 'column', sectionBlockId, colIndex },
  })

  const combinedRef = useCallback(
    (el: HTMLDivElement | null) => {
      setNodeRef(el)
    },
    [setNodeRef],
  )

  const showHighlight = isOver || dndIsOver

  return (
    <div
      ref={combinedRef}
      className="min-w-0 relative"
      style={{ flex: `0 0 calc(${col.width}% - ${gap})` }}
      onDragOver={() => setIsOver(true)}
      onDragLeave={() => setIsOver(false)}
      onDrop={() => setIsOver(false)}
    >
      {col.blocks.length === 0 && (
        <div
          className={`flex flex-col items-center justify-center py-8 px-4 rounded-lg border-2 border-dashed transition-all ${
            showHighlight
              ? "border-blue-400 bg-blue-500/10"
              : "border-gray-300 bg-gray-50/50"
          }`}
        >
          <div className="text-[11px] text-gray-400 text-center mb-2">
            Drop widgets here
          </div>
          <button
            type="button"
            onClick={() => {
              const block: BlockConfig = {
                id: `block-${Date.now()}`,
                type: 'heading',
                variant: 'default',
                props: { text: 'New Heading', tag: 'h2' },
              }
              addBlockToColumn(sectionBlockId, colIndex, block)
            }}
            className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-600 transition-colors"
          >
            <Plus size={12} /> Add widget
          </button>
        </div>
      )}
      <SortableContext items={col.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        {col.blocks.map((childBlock) => (
          <ColumnBlock key={childBlock.id} block={childBlock} columnId={sectionBlockId} />
        ))}
      </SortableContext>
      {col.blocks.length > 0 && (
        <button
          type="button"
          onClick={() => {
            const block: BlockConfig = {
              id: `block-${Date.now()}`,
              type: 'heading',
              variant: 'default',
              props: { text: 'New Heading', tag: 'h2' },
            }
            addBlockToColumn(sectionBlockId, colIndex, block)
          }}
          className="w-full mt-2 py-1.5 rounded border border-dashed border-gray-200 text-[10px] text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-500/5 transition-all flex items-center justify-center gap-1"
        >
          <Plus size={10} /> Add widget
        </button>
      )}
    </div>
  )
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
          <DroppableColumn
            key={i}
            sectionBlockId={block.id}
            colIndex={i}
            col={col}
            gap={gap}
          />
        ))}
      </div>
    </div>
  )
}
