"use client";

import { useState, useEffect } from "react";
import { MousePointer2 } from "lucide-react";
import { useEditorStore, type RightSidebarTab } from "@/components/openpage/store/editorStore";
import { useConfigStore } from "@/components/openpage/store/configStore";
import { PropertiesPanel } from './PropertiesPanel'
import { StylePanel } from './StylePanel'
import { TypographyPanel } from './TypographyPanel'
import { AdvancedPanel } from './AdvancedPanel'

const tabs: { id: RightSidebarTab; label: string }[] = [
  { id: 'properties', label: 'Content' },
  { id: 'style', label: 'Style' },
  { id: 'typography', label: 'Typography' },
  { id: 'advanced', label: 'Advanced' },
]

export function RightSidebar() {
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId)
  const rightSidebarTab = useEditorStore((s) => s.rightSidebarTab)
  const setRightSidebarTab = useEditorStore((s) => s.setRightSidebarTab)
  const blocks = useConfigStore((s) => {
    const pages = s.config.pages
    if (!pages || pages.length === 0) return s.config.blocks
    const page = pages.find((p) => p.id === s.activePageId) ?? pages[0]
    return page.blocks
  })
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId)

  useEffect(() => {
    if (selectedBlock) setRightSidebarTab('properties')
  }, [selectedBlock?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="hidden md:flex w-[280px] h-full min-h-0 bg-bg-1 border-l border-border-default flex-col shrink-0 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-border-default shrink-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setRightSidebarTab(tab.id)}
            className={`flex-1 py-2 text-[10px] font-medium transition-colors whitespace-nowrap ${
              rightSidebarTab === tab.id
                ? 'text-text-0 border-b border-green'
                : 'text-text-3 hover:text-text-1'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {!selectedBlock ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16 gap-3">
            <div className="w-10 h-10 rounded-lg bg-bg-3 border border-border-default flex items-center justify-center">
              <MousePointer2 size={16} className="text-text-3" />
            </div>
            <div>
              <p className="text-text-1 text-[12px] font-medium">Click a block to edit</p>
              <p className="text-text-3 text-[11px] mt-1">Select any block on the canvas to edit its content here</p>
            </div>
          </div>
        ) : rightSidebarTab === 'style' ? (
          <StylePanel block={selectedBlock} />
        ) : rightSidebarTab === 'typography' ? (
          <TypographyPanel block={selectedBlock} />
        ) : rightSidebarTab === 'advanced' ? (
          <AdvancedPanel block={selectedBlock} />
        ) : (
          <>
            <PropertiesPanel block={selectedBlock} />
            <div className="mt-auto px-3.5 py-2.5 font-mono text-[10.5px] text-text-3 break-all border-t border-border-subtle">
              config.blocks[{blocks.indexOf(selectedBlock)}]
            </div>
          </>
        )}
      </div>
    </div>
  )
}
