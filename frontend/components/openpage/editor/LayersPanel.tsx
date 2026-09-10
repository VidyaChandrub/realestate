"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Layout, Grid3X3, DollarSign, Megaphone, PanelBottom,
  MessageSquare, HelpCircle, Image,
  Copy, Trash2, GripVertical, Plus, Search, Minus, Flag,
  ImageIcon, Play, GalleryHorizontalEnd, Eye, EyeOff,
  Building2, MapPin, Home, Trees, FileText, Download, Mail, Save, Layers,
  ChevronDown, ChevronRight, Type, Box, Code2,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useConfigStore } from "@/components/openpage/store/configStore";
import { useEditorStore } from "@/components/openpage/store/editorStore";
import { blockMetadata } from "@/lib/openpage/block-metadata";
import {
  SECTION_PRESET_CATEGORIES,
  SECTION_PRESETS,
  createBlockFromPreset,
  type SectionPresetCategory,
} from "@/lib/openpage/section-presets";
import type { BlockType, BlockConfig } from "@/components/openpage/blocks/types";
import { EMPTY_GLOBAL_WIDGETS } from "./AdvancedPanel";

const blockIcons: Partial<Record<BlockType, typeof Layout>> = {
  navbar: Layout,
  footer: PanelBottom,
  "project-banner": Home,
  "property-details": Grid3X3,
  "project-overview": FileText,
  "unit-config": Building2,
  amenities: Trees,
  gallery: GalleryHorizontalEnd,
  location: MapPin,
  "floor-plans": Image,
  "re-pricing": DollarSign,
  features: Grid3X3,
  testimonials: MessageSquare,
  faq: HelpCircle,
  "lead-form": Mail,
  "download-brochure": Download,
  "site-visit": Home,
  contact: Mail,
  newsletter: Mail,
  cta: Megaphone,
  image: ImageIcon,
  video: Play,
  banner: Flag,
  divider: Minus,
  developer: Building2,
  offers: Flag,
  "custom-section": FileText,
  heading: Type,
  text: Type,
  button: Megaphone,
  icon: Flag,
  "icon-box": Grid3X3,
  "image-box": ImageIcon,
  columns: Box,
  spacer: Minus,
  "html-code": Code2,
  "property-search": Search,
  "property-filters": Grid3X3,
  "emi-calculator": DollarSign,
  "payment-plan": DollarSign,
  team: Building2,
}

const PICKER_GROUPS: { id: string; title: string; defaultOpen: boolean; types: BlockType[] }[] = [
  {
    id: "core",
    title: "Core",
    defaultOpen: true,
    types: ["columns", "heading", "text", "image", "video", "button", "icon", "icon-box", "divider", "spacer", "location", "html-code"],
  },
  {
    id: "re",
    title: "Real Estate",
    defaultOpen: true,
    types: ["project-banner", "project-overview", "property-details", "unit-config", "amenities", "floor-plans", "gallery", "location", "re-pricing", "developer", "testimonials", "lead-form", "download-brochure", "site-visit", "contact", "newsletter", "cta"],
  },
  {
    id: "layout",
    title: "Layout",
    defaultOpen: false,
    types: ["columns", "spacer", "divider", "banner"],
  },
  {
    id: "content",
    title: "Content",
    defaultOpen: false,
    types: ["heading", "text", "features", "faq", "cta", "custom-section"],
  },
  {
    id: "media",
    title: "Media",
    defaultOpen: false,
    types: ["image", "video", "gallery", "image-box"],
  },
  {
    id: "forms",
    title: "Lead & Forms",
    defaultOpen: true,
    types: ["lead-form", "site-visit", "contact", "newsletter", "download-brochure", "cta", "button"],
  },
  {
    id: "chrome",
    title: "Header / Footer",
    defaultOpen: false,
    types: ["navbar", "footer"],
  },
]

const GRID_LABELS: Partial<Record<BlockType, string>> = {
  columns: "Container",
  heading: "Heading",
  text: "Text Editor",
  image: "Image",
  video: "Video",
  button: "Button",
  icon: "Icon",
  "icon-box": "Icon Box",
  divider: "Divider",
  spacer: "Spacer",
  location: "Google Maps",
  "html-code": "HTML",
  "project-banner": "Hero / Banner",
  "unit-config": "Property Listing",
  "image-box": "Property Card",
  "property-search": "Search Form",
  amenities: "Amenities",
  "floor-plans": "Floor Plan",
  gallery: "Gallery",
  testimonials: "Testimonial",
  "lead-form": "Contact Form",
}

const blockLabels: Partial<Record<BlockType, string>> = {
  navbar: 'Header',
  footer: 'Footer',
  'project-banner': 'Hero',
  'property-details': 'Highlights',
  'project-overview': 'About',
  'unit-config': 'Unit types',
  amenities: 'Amenities',
  gallery: 'Gallery',
  location: 'Location',
  'floor-plans': 'Floor plans',
  're-pricing': 'Pricing',
  features: 'Why choose us',
  testimonials: 'Testimonials',
  faq: 'FAQ',
  'lead-form': 'Enquiry form',
  'download-brochure': 'Brochure',
  cta: 'Final CTA',
  image: 'Image',
  video: 'Video',
  banner: 'Announcement',
  divider: 'Divider',
  developer: 'Developer',
  offers: 'Offers',
  'custom-section': 'Custom',
  heading: 'Heading',
  text: 'Text',
  button: 'Button',
  icon: 'Icon',
  'icon-box': 'Icon box',
  'image-box': 'Image box',
  columns: 'Columns',
  spacer: 'Spacer',
  'html-code': 'HTML',
  'property-search': 'Search',
  'property-filters': 'Filters',
  'emi-calculator': 'EMI calculator',
  'payment-plan': 'Payment plan',
  team: 'Sales team',
}

function SortableLayer({ block, isSelected, onSelect, onDuplicate, onRemove, onHide, isHidden }: {
  block: BlockConfig
  isSelected: boolean
  onSelect: () => void
  onDuplicate: () => void
  onRemove: () => void
  onHide: () => void
  isHidden: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const Icon = blockIcons[block.type] || Layout
  const layerLabel = blockLabels[block.type] || block.type

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group px-2 py-1.5 rounded-md text-[12px] flex items-center gap-1.5 transition-all cursor-pointer select-none relative ${
        isSelected ? 'bg-green-glow text-green' : 'text-text-1 hover:bg-bg-3 hover:text-text-0'
      } ${isHidden ? 'opacity-50' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-text-3 cursor-grab active:cursor-grabbing shrink-0"
        aria-label={`Drag to reorder ${layerLabel}`}
      >
        <GripVertical size={11} />
      </div>

      <div className={`w-[22px] h-[22px] rounded flex items-center justify-center text-[10px] shrink-0 border ${
        isSelected ? 'border-green/30 bg-green-glow' : 'border-border-default bg-bg-3'
      }`}>
        <Icon size={11} />
      </div>

      <span className="font-medium flex-1 truncate">{layerLabel}</span>

      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onHide() }}
          className="w-[20px] h-[20px] rounded flex items-center justify-center text-text-3 hover:bg-bg-4 hover:text-text-0 transition-all"
          title={isHidden ? 'Show' : 'Hide'}
        >
          {isHidden ? <EyeOff size={10} /> : <Eye size={10} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate() }}
          className="w-[20px] h-[20px] rounded flex items-center justify-center text-text-3 hover:bg-bg-4 hover:text-text-0 transition-all"
          title="Duplicate"
        >
          <Copy size={10} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="w-[20px] h-[20px] rounded flex items-center justify-center text-text-3 hover:bg-status-red/10 hover:text-status-red transition-all"
          title="Delete"
        >
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  )
}

function widgetLabel(type: BlockType) {
  const meta = blockMetadata.find((b) => b.type === type)
  return GRID_LABELS[type] || meta?.label || type
}

function WidgetTile({
  type,
  onAdd,
  compact,
}: {
  type: BlockType
  onAdd: (type: BlockType) => void
  compact?: boolean
}) {
  const meta = blockMetadata.find((b) => b.type === type)
  if (!meta) return null
  const Icon = blockIcons[type] || Layout
  return (
    <button
      type="button"
      onClick={() => onAdd(type)}
      title={widgetLabel(type)}
      className="flex flex-col items-center gap-1.5 p-2 rounded-md text-text-2 hover:text-text-0 hover:bg-bg-3 transition-colors"
    >
      <div className={`rounded-md border border-border-default bg-bg-2 flex items-center justify-center ${compact ? "w-8 h-8" : "w-10 h-10"}`}>
        <Icon size={compact ? 14 : 18} />
      </div>
      <span className="text-[9px] leading-tight text-center line-clamp-2 w-full">{widgetLabel(type)}</span>
    </button>
  )
}

function BlockPicker({
  onAdd,
  compact = false,
  autoFocus = false,
  onKeyDown,
}: {
  onAdd: (type: BlockType) => void
  compact?: boolean
  autoFocus?: boolean
  onKeyDown?: (e: React.KeyboardEvent) => void
}) {
  const [search, setSearch] = useState("")
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PICKER_GROUPS.map((g) => [g.id, g.defaultOpen])),
  )
  const q = search.trim().toLowerCase()

  function typeMatches(type: BlockType) {
    const meta = blockMetadata.find((b) => b.type === type)
    if (!meta) return false
    if (!q) return true
    return (
      widgetLabel(type).toLowerCase().includes(q) ||
      meta.label.toLowerCase().includes(q) ||
      meta.category.toLowerCase().includes(q)
    )
  }

  const searchTypes = [...new Set(PICKER_GROUPS.flatMap((g) => g.types))].filter(typeMatches)

  return (
    <>
      <input
        autoFocus={autoFocus}
        type="text"
        placeholder="Search components..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={onKeyDown}
        className="w-full px-2 py-1.5 rounded border border-border-default bg-bg-3 text-text-0 text-[11px] outline-none focus:border-green mb-1 shrink-0"
      />
      <div className={compact ? "" : "flex-1 min-h-0 overflow-y-auto overscroll-contain"}>
        {q ? (
          searchTypes.length === 0 ? (
            <div className="px-2 py-3 text-center text-[11px] text-text-3 flex items-center justify-center gap-1.5">
              <Search size={12} />
              No components match
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 pt-1">
              {searchTypes.map((type) => (
                <WidgetTile key={type} type={type} onAdd={onAdd} compact={compact} />
              ))}
            </div>
          )
        ) : (
          PICKER_GROUPS.map((group) => {
            const types = group.types.filter((type) => blockMetadata.some((b) => b.type === type))
            if (types.length === 0) return null
            const isOpen = openGroups[group.id] !== false
            return (
              <div key={group.id} className="border-b border-border-subtle last:border-0">
                <button
                  type="button"
                  onClick={() => setOpenGroups((prev) => ({ ...prev, [group.id]: !isOpen }))}
                  className="w-full flex items-center justify-between px-1.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-text-3 hover:text-text-1"
                >
                  {group.title}
                  {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                {isOpen && (
                  <div className="grid grid-cols-3 gap-1 pb-2">
                    {types.map((type) => (
                      <WidgetTile key={`${group.id}-${type}`} type={type} onAdd={onAdd} compact={compact} />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </>
  )
}

function AddComponentPopover({ onAdd, onClose }: { onAdd: (type: BlockType) => void; onClose: () => void }) {
  return (
    <div className="absolute bottom-[52px] left-2 right-2 bg-bg-2 border border-border-default rounded-lg p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-10 max-h-[320px] overflow-y-auto">
      <BlockPicker
        autoFocus
        compact
        onAdd={(type) => { onAdd(type); onClose() }}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      />
    </div>
  )
}

function GlobalWidgetsPanel() {
  const globalWidgets = useConfigStore((s) => s.config.globalWidgets ?? EMPTY_GLOBAL_WIDGETS)
  const insertGlobalWidget = useConfigStore((s) => s.insertGlobalWidget)
  const selectBlock = useEditorStore((s) => s.selectBlock)

  if (globalWidgets.length === 0) {
    return (
      <div className="px-3 py-8 text-center">
        <Save size={20} className="text-text-3 mx-auto mb-2" />
        <p className="text-[11px] text-text-3">No global widgets yet</p>
        <p className="text-[10px] text-text-3 mt-1">Save a block as a global widget from the Advanced tab</p>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 pb-2">
      {globalWidgets.map((gw) => (
        <button
          key={gw.id}
          onClick={() => {
            insertGlobalWidget(gw.id)
            toast(`Inserted "${gw.name}"`)
          }}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[11px] text-text-1 hover:bg-bg-3 hover:text-text-0 transition-colors text-left group"
        >
          <div className="w-[22px] h-[22px] rounded border border-border-default bg-bg-3 flex items-center justify-center text-[10px] shrink-0">
            <Layers size={11} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{gw.name}</div>
            <div className="text-[9px] text-text-3">{gw.block.type}</div>
          </div>
          <Plus size={11} className="text-text-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      ))}
    </div>
  )
}

type Tab = 'layers' | 'components' | 'templates' | 'globals'

export function LayersPanel() {
  const blocks = useConfigStore((s) => {
    const pages = s.config.pages
    if (!pages || pages.length === 0) return s.config.blocks
    const page = pages.find((p) => p.id === s.activePageId) ?? pages[0]
    return page.blocks
  })
  const { duplicateBlock, removeBlock, moveBlock, addBlock, updateBlockStyle } = useConfigStore()
  const { selectedBlockId, selectBlock } = useEditorStore()
  const [showPopover, setShowPopover] = useState(false)
  const [tab, setTab] = useState<Tab>('components')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = blocks.findIndex((b) => b.id === active.id)
    const newIndex = blocks.findIndex((b) => b.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      moveBlock(oldIndex, newIndex)
    }
  }

  function handleAddBlock(type: BlockType) {
    const meta = blockMetadata.find((b) => b.type === type)
    if (!meta) return
    const block: BlockConfig = {
      id: `block-${Date.now()}`,
      type,
      variant: meta.variants[0],
      props: { ...meta.defaultProps },
    }
    addBlock(block)
    selectBlock(block.id)
    toast(`${meta.label} added`)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden relative">
      {/* Tab bar */}
      <div className="flex border-b border-border-default shrink-0">
        {([
          { id: 'templates' as Tab, label: 'Templates' },
          { id: 'components' as Tab, label: 'Blocks' },
          { id: 'globals' as Tab, label: 'Globals' },
          { id: 'layers' as Tab, label: 'Layers', count: blocks.length },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-[10px] font-medium transition-colors ${
              tab === t.id
                ? 'text-text-0 border-b border-green'
                : 'text-text-3 hover:text-text-1'
            }`}
          >
            {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {tab === 'layers' ? (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 pb-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                {blocks.map((block) => (
                  <SortableLayer
                    key={block.id}
                    block={block}
                    isSelected={selectedBlockId === block.id}
                    onSelect={() => selectBlock(block.id)}
                    onDuplicate={() => { duplicateBlock(block.id); toast('Block duplicated') }}
                    onRemove={() => {
                      if (selectedBlockId === block.id) selectBlock(null)
                      removeBlock(block.id)
                      toast('Block removed', {
                        action: {
                          label: 'Undo',
                          onClick: () => {
                            useConfigStore.getState().undo()
                            toast('Block restored')
                          },
                        },
                        duration: 3000,
                      })
                    }}
                    onHide={() => {
                      const key = `hideOn${viewportKey()}`
                      updateBlockStyle(block.id, { [key]: !(block.style?.[key as keyof typeof block.style]) })
                    }}
                    isHidden={!!block.style?.hideOnDesktop || !!block.style?.hideOnTablet || !!block.style?.hideOnMobile}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <div className="p-2 border-t border-border-subtle relative">
            <button
              onClick={() => setShowPopover(!showPopover)}
              className="w-full py-2 rounded-md border border-dashed border-border-default text-text-2 text-xs flex items-center justify-center gap-1.5 transition-all hover:border-green hover:text-green hover:bg-green-glow2"
            >
              <Plus size={13} />
              Add Component
            </button>
            {showPopover && (
              <AddComponentPopover onAdd={handleAddBlock} onClose={() => setShowPopover(false)} />
            )}
          </div>
        </>
      ) : tab === 'components' ? (
        <ComponentsPanel />
      ) : tab === 'templates' ? (
        <SectionTemplatesPanel />
      ) : (
        <GlobalWidgetsPanel />
      )}
    </div>
  )
}

function viewportKey() {
  const vp = useEditorStore.getState().viewport
  return vp.charAt(0).toUpperCase() + vp.slice(1) as 'Desktop' | 'Tablet' | 'Mobile'
}

function ComponentsPanel() {
  const addBlock = useConfigStore((s) => s.addBlock)
  const selectBlock = useEditorStore((s) => s.selectBlock)

  function handleAdd(type: BlockType) {
    const meta = blockMetadata.find((b) => b.type === type)
    if (!meta) return
    const block: BlockConfig = {
      id: `block-${Date.now()}`,
      type,
      variant: meta.variants[0],
      props: { ...meta.defaultProps },
    }
    addBlock(block)
    selectBlock(block.id)
    toast(`${meta.label} added`)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden px-2 pb-2 pt-1">
      <BlockPicker onAdd={handleAdd} />
    </div>
  )
}

function SectionTemplatesPanel() {
  const addBlock = useConfigStore((s) => s.addBlock)
  const selectBlock = useEditorStore((s) => s.selectBlock)
  const [openCat, setOpenCat] = useState<SectionPresetCategory | null>('Lead Forms')
  const [query, setQuery] = useState('')

  function handleAdd(presetId: string) {
    const preset = SECTION_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    const block = createBlockFromPreset(preset)
    addBlock(block)
    selectBlock(block.id)
    toast(`${preset.name} added`)
  }

  const q = query.trim().toLowerCase()

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="px-2 pt-2 pb-1 shrink-0">
        <p className="text-[10px] text-text-3 mb-2 px-0.5">
          Ready-to-use real estate sections. Edit content, images, forms and shortcodes in Properties.
        </p>
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates…"
            className="w-full pl-7 pr-2 py-1.5 rounded-md border border-border-default bg-bg-2 text-[11px] text-text-0 placeholder:text-text-3"
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 pb-3 space-y-1">
        {SECTION_PRESET_CATEGORIES.map((cat) => {
          const presets = SECTION_PRESETS.filter(
            (p) =>
              p.category === cat &&
              (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || cat.toLowerCase().includes(q))
          )
          if (!presets.length) return null
          const isOpen = q ? true : openCat === cat
          return (
            <div key={cat} className="rounded-md border border-border-subtle overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenCat(isOpen && !q ? null : cat)}
                className="w-full flex items-center justify-between px-2.5 py-2 bg-bg-2 text-[11px] font-semibold text-text-1 hover:bg-bg-3"
              >
                <span>{cat}</span>
                <span className="flex items-center gap-1.5 text-text-3 font-normal">
                  {presets.length}
                  {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </span>
              </button>
              {isOpen ? (
                <div className="p-1.5 space-y-1 bg-bg-1">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleAdd(preset.id)}
                      className="w-full text-left rounded-md border border-border-default px-2.5 py-2 hover:border-green hover:bg-green-glow2 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[11.5px] font-medium text-text-0 group-hover:text-green">{preset.name}</div>
                          <div className="text-[10px] text-text-3 mt-0.5 leading-snug">{preset.description}</div>
                        </div>
                        <Plus size={12} className="shrink-0 mt-0.5 text-text-3 group-hover:text-green" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
