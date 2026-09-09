"use client";

import { useMemo, useCallback, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useConfigStore } from "@/components/openpage/store/configStore";
import { useEditorStore } from "@/components/openpage/store/editorStore";
import { CanvasEmpty } from "./CanvasEmpty";
import { SortableBlock } from "./SortableBlock";
import { RenderBlock } from "@/components/openpage/blocks/registry";
import { resolveTheme, themeToCSS } from "@/lib/openpage/theme-presets";
import { useGoogleFonts } from "@/lib/openpage/useGoogleFonts";
import type { BlockConfig } from "@/components/openpage/blocks/types";

const VIEWPORT_WIDTHS = { desktop: 880, tablet: 768, mobile: 375 } as const

export function Canvas() {
  const blocks = useConfigStore((s) => {
    const pages = s.config.pages
    if (!pages || pages.length === 0) return s.config.blocks
    const page = pages.find((p) => p.id === s.activePageId) ?? pages[0]
    return page.blocks
  })
  const theme = useConfigStore((s) => s.config.theme)
  const moveBlock = useConfigStore((s) => s.moveBlock)
  const { selectedBlockId, selectBlock, viewport, isDragging, setIsDragging } = useEditorStore()

  const resolved = useMemo(() => resolveTheme(theme), [theme])
  const cssVars = useMemo(() => themeToCSS(resolved), [resolved])
  useGoogleFonts([resolved.fontSans, resolved.fontDisplay, resolved.fontMono])

  const pxWidth = VIEWPORT_WIDTHS[viewport]

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const [activeId, setActiveId] = useState<string | null>(null)
  const activeBlock = useMemo(() => blocks.find((b) => b.id === activeId), [blocks, activeId])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
    setIsDragging(true)
  }, [setIsDragging])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setIsDragging(false)
    if (!over || active.id === over.id) return
    const oldIndex = blocks.findIndex((b) => b.id === active.id)
    const newIndex = blocks.findIndex((b) => b.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      moveBlock(oldIndex, newIndex)
    }
  }, [blocks, moveBlock, setIsDragging])

  if (blocks.length === 0) {
    return <CanvasEmpty />
  }

  const canvasContent = (
    <div
      className="@container border rounded-xl min-h-[400px] relative z-[1] overflow-visible pt-8 transition-all duration-300"
      style={{
        width: `${pxWidth}px`,
        maxWidth: `${pxWidth}px`,
        ...cssVars,
        color: 'var(--color-text-0)',
        backgroundColor: 'var(--color-bg-1)',
        borderColor: 'var(--color-border-default)',
      } as React.CSSProperties}
      onClick={(e) => {
        if (e.target === e.currentTarget) selectBlock(null)
      }}
      role="region"
      aria-label={`Site preview, ${blocks.length} blocks, ${viewport} viewport`}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {blocks.map((block) => (
            <SortableBlock
              key={block.id}
              block={block}
              isSelected={selectedBlockId === block.id}
              onSelect={() => selectBlock(block.id)}
            >
              <RenderBlock block={block} />
            </SortableBlock>
          ))}
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {activeBlock ? (
            <div className="opacity-80 border-2 border-green rounded-lg pointer-events-none">
              <RenderBlock block={activeBlock} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="h-1 w-full hover:h-2 hover:bg-green/30 transition-all cursor-pointer" />
    </div>
  )

  return (
    <div className="flex-1 flex items-start justify-center p-6 overflow-auto relative">
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--color-bg-3) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {viewport === 'tablet' ? (
        <div className="relative z-[1]">
          <div
            className="border-[12px] border-bg-4 rounded-2xl bg-bg-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
            style={{ width: `${pxWidth + 24}px` }}
          >
            <div className="rounded-lg overflow-hidden">
              {canvasContent}
            </div>
          </div>
        </div>
      ) : viewport === 'mobile' ? (
        <div className="relative z-[1]">
          <div
            className="border-[10px] border-bg-4 rounded-[2rem] bg-bg-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
            style={{ width: `${pxWidth + 20}px` }}
          >
            <div className="flex justify-center -mt-[4px] mb-1">
              <div className="w-24 h-5 bg-bg-4 rounded-b-xl" />
            </div>
            <div className="rounded-xl overflow-hidden">
              {canvasContent}
            </div>
            <div className="flex justify-center mt-2 pb-1">
              <div className="w-28 h-1 bg-bg-5 rounded-full" />
            </div>
          </div>
        </div>
      ) : (
        canvasContent
      )}
    </div>
  )
}
