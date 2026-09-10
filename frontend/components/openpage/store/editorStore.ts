"use client";

import { create } from "zustand";
import type { BlockStyle } from "@/components/openpage/blocks/types";

export type Viewport = 'desktop' | 'tablet' | 'mobile'

export type RightSidebarTab = 'properties' | 'style' | 'typography' | 'advanced'

interface EditorState {
  selectedBlockId: string | null
  selectedBlockIds: string[]
  viewport: Viewport
  jsonDrawerOpen: boolean
  historyOpen: boolean
  shortcutsModalOpen: boolean
  previewMode: boolean
  activeProjectId: string | null
  rightSidebarTab: RightSidebarTab
  clipboardStyle: Partial<BlockStyle> | null
  clipboardProps: Record<string, unknown> | null
  navigatorExpanded: Record<string, boolean>
  insertIndex: number | null
  isDragging: boolean
  templatesOpen: boolean
  globalsOpen: boolean
  formBuilderOpen: boolean
  isGenerating: boolean
  generationPrompt: string | null
  generationError: string | null
  selectBlock: (id: string | null) => void
  toggleBlockSelection: (id: string) => void
  selectMultipleBlocks: (ids: string[]) => void
  clearSelection: () => void
  setViewport: (vp: Viewport) => void
  toggleJsonDrawer: () => void
  toggleHistory: () => void
  toggleShortcutsModal: () => void
  togglePreview: () => void
  setActiveProject: (id: string | null) => void
  setRightSidebarTab: (tab: RightSidebarTab) => void
  setClipboardStyle: (style: Partial<BlockStyle> | null) => void
  setClipboardProps: (props: Record<string, unknown> | null) => void
  toggleNavigatorExpand: (id: string) => void
  setInsertIndex: (index: number | null) => void
  setIsDragging: (dragging: boolean) => void
  toggleTemplates: () => void
  toggleGlobals: () => void
  toggleFormBuilder: () => void
  setGenerating: (prompt: string | null) => void
  setGenerationError: (err: string | null) => void
  clearGeneration: () => void
}

export const useEditorStore = create<EditorState>()((set) => ({
  selectedBlockId: null,
  selectedBlockIds: [],
  viewport: 'desktop',
  jsonDrawerOpen: false,
  historyOpen: false,
  shortcutsModalOpen: false,
  previewMode: false,
  activeProjectId: null,
  rightSidebarTab: 'properties',
  clipboardStyle: null,
  clipboardProps: null,
  navigatorExpanded: {},
  insertIndex: null,
  isDragging: false,
  templatesOpen: false,
  globalsOpen: false,
  formBuilderOpen: false,
  isGenerating: false,
  generationPrompt: null,
  generationError: null,
  selectBlock: (id) => set({ selectedBlockId: id, selectedBlockIds: id ? [id] : [] }),
  toggleBlockSelection: (id) => set((s) => {
    const ids = s.selectedBlockIds.includes(id)
      ? s.selectedBlockIds.filter((i) => i !== id)
      : [...s.selectedBlockIds, id]
    return { selectedBlockIds: ids, selectedBlockId: ids.length === 1 ? ids[0] : ids.length === 0 ? null : s.selectedBlockId }
  }),
  selectMultipleBlocks: (ids) => set({ selectedBlockIds: ids, selectedBlockId: ids.length === 1 ? ids[0] : null }),
  clearSelection: () => set({ selectedBlockId: null, selectedBlockIds: [] }),
  setViewport: (vp) => set({ viewport: vp }),
  toggleJsonDrawer: () => set((s) => ({ jsonDrawerOpen: !s.jsonDrawerOpen })),
  toggleHistory: () => set((s) => ({ historyOpen: !s.historyOpen })),
  toggleShortcutsModal: () => set((s) => ({ shortcutsModalOpen: !s.shortcutsModalOpen })),
  togglePreview: () => set((s) => ({ previewMode: !s.previewMode, ...(!s.previewMode ? { selectedBlockId: null, selectedBlockIds: [] } : {}) })),
  setActiveProject: (id) => set({ activeProjectId: id }),
  setRightSidebarTab: (tab) => set({ rightSidebarTab: tab }),
  setClipboardStyle: (style) => set({ clipboardStyle: style }),
  setClipboardProps: (props) => set({ clipboardProps: props }),
  toggleNavigatorExpand: (id) => set((s) => ({
    navigatorExpanded: { ...s.navigatorExpanded, [id]: !s.navigatorExpanded[id] },
  })),
  setInsertIndex: (index) => set({ insertIndex: index }),
  setIsDragging: (dragging) => set({ isDragging: dragging }),
  toggleTemplates: () => set((s) => ({ templatesOpen: !s.templatesOpen })),
  toggleGlobals: () => set((s) => ({ globalsOpen: !s.globalsOpen })),
  toggleFormBuilder: () => set((s) => ({ formBuilderOpen: !s.formBuilderOpen })),
  setGenerating: (prompt) => set({ isGenerating: !!prompt, generationPrompt: prompt, generationError: null }),
  setGenerationError: (err) => set({ generationError: err }),
  clearGeneration: () => set({ isGenerating: false, generationPrompt: null }),
}))
