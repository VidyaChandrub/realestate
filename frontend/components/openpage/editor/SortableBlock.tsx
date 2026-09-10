"use client";

import { type ReactNode, useRef, useEffect, useMemo } from "react";
import { GripVertical, Copy, Trash2, Plus, Pencil, EyeOff, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useConfigStore } from "@/components/openpage/store/configStore";
import { useEditorStore } from "@/components/openpage/store/editorStore";
import type { BlockConfig } from "../blocks/types";
import { blockMetadata } from "@/lib/openpage/block-metadata";
import { isHiddenOnViewport } from "@/lib/openpage/block-style";

const blockLabels: Record<string, string> = {
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
  features: 'Highlights',
  testimonials: 'Testimonials',
  faq: 'FAQ',
  'lead-form': 'Enquiry form',
  'download-brochure': 'Brochure',
  cta: 'CTA',
  image: 'Image',
  video: 'Video',
  banner: 'Banner',
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
  'emi-calculator': 'EMI calc',
  'payment-plan': 'Payment plan',
  team: 'Sales team',
  'social-icons': 'Social icons',
  tabs: 'Tabs',
  countdown: 'Countdown',
  logocloud: 'Logos',
  newsletter: 'Newsletter',
  contact: 'Contact',
  'construction-status': 'Construction',
  'project-highlights': 'Highlights',
  stats: 'Stats',
}

interface Props {
  block: BlockConfig
  isSelected: boolean
  onSelect: () => void
  children: ReactNode
}

export function SortableBlock({ block, isSelected, onSelect, children }: Props) {
  const blocks = useConfigStore((s) => {
    const pages = s.config.pages
    if (!pages || pages.length === 0) return s.config.blocks
    const page = pages.find((p) => p.id === s.activePageId) ?? pages[0]
    return page.blocks
  })
  const { duplicateBlock, removeBlock, moveBlock, updateBlockStyle, addBlock } = useConfigStore()
  const { selectedBlockId, selectBlock, setRightSidebarTab, viewport, isDragging } = useEditorStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  }

  const index = blocks.findIndex((b) => b.id === block.id)
  const isFirst = index === 0
  const isLast = index === blocks.length - 1
  const hideKey = viewport === "tablet" ? "hideOnTablet" : viewport === "mobile" ? "hideOnMobile" : "hideOnDesktop"

  const toolbarBtn = "w-8 h-8 flex items-center justify-center text-white/90 hover:bg-black/20 transition-colors"

  useEffect(() => {
    if (isSelected && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isSelected])

  const isHidden = useMemo(
    () => isHiddenOnViewport(block.style, viewport),
    [block.style, viewport],
  )

  if (isHidden) {
    return (
      <div
        ref={(el) => {
          setNodeRef(el)
          ;(scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el
        }}
        style={style}
        onClick={(e) => { e.stopPropagation(); onSelect() }}
        className="relative border border-dashed border-yellow-500/50 bg-yellow-500/5 p-2 group cursor-pointer"
      >
        <span className="absolute top-1 left-1 text-[9px] font-semibold uppercase tracking-wider text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
          <EyeOff size={10} />
          Hidden on {viewport}
        </span>
        <div className="opacity-30 pointer-events-none">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={(el) => {
        setNodeRef(el)
        ;(scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el
      }}
      style={style}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      className={`relative cursor-pointer border-b border-border-subtle group transition-[opacity,transform] duration-300 ${
        isSelected
          ? "outline outline-2 outline-dashed outline-[#5b9cff] -outline-offset-1"
          : "hover:outline hover:outline-1 hover:outline-dashed hover:outline-[#5b9cff]/50 hover:-outline-offset-1"
      } ${isSortableDragging ? "z-50" : ""}`}
      role="button"
      aria-label={`${block.type} block${isSelected ? ', selected' : ''}`}
      aria-selected={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      {/* Section label + Elementor-style toolbar */}
      <span
        className={`absolute top-0 left-0 z-10 text-[9px] font-semibold uppercase tracking-wider text-white bg-[#5b9cff] px-1.5 py-0.5 ${
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        {blockLabels[block.type] || block.type}
      </span>

      <div
        className={`absolute -top-8 right-0 z-20 flex items-center rounded-md overflow-hidden shadow-lg bg-[#6d5dfc] ${
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          className={`${toolbarBtn} cursor-grab active:cursor-grabbing`}
          title="Drag"
        >
          <GripVertical size={13} />
        </button>
        <button
          type="button"
          onClick={() => {
            onSelect()
            setRightSidebarTab("properties")
          }}
          className={toolbarBtn}
          title="Edit"
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          onClick={() => {
            const meta = blockMetadata.find((b) => b.type === "columns")
            if (!meta) return
            addBlock(
              {
                id: `block-${Date.now()}`,
                type: "columns",
                variant: meta.variants[0],
                props: { ...meta.defaultProps },
              },
              index + 1,
            )
          }}
          className={toolbarBtn}
          title="Add section"
        >
          <Plus size={13} />
        </button>
        <button
          type="button"
          onClick={() => duplicateBlock(block.id)}
          className={toolbarBtn}
          title="Duplicate"
        >
          <Copy size={13} />
        </button>
        <button
          type="button"
          onClick={() => updateBlockStyle(block.id, { [hideKey]: true })}
          className={toolbarBtn}
          title="Hide"
        >
          <EyeOff size={13} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (selectedBlockId === block.id) selectBlock(null)
            removeBlock(block.id)
            toast("Block removed", {
              action: {
                label: "Undo",
                onClick: () => {
                  useConfigStore.getState().undo()
                  toast("Block restored")
                },
              },
              duration: 3000,
            })
          }}
          className={toolbarBtn}
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (isFirst && isLast) return
            if (!isFirst) moveBlock(index, index - 1)
            else if (!isLast) moveBlock(index, index + 1)
          }}
          className={toolbarBtn}
          title={!isFirst ? "Move up" : "Move down"}
        >
          <MoreHorizontal size={13} />
        </button>
      </div>

      <div>
        {children}
      </div>
    </div>
  )
}
