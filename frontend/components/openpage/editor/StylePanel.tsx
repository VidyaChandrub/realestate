"use client";

import { useState } from "react";
import { Copy, Clipboard, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { BlockConfig, BlockStyle } from "@/components/openpage/blocks/types";
import { useConfigStore } from "@/components/openpage/store/configStore";
import { useEditorStore } from "@/components/openpage/store/editorStore";
import { Section } from "./shared-components";

function SpacingInput({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-[10px] text-text-3 w-8 shrink-0">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="auto"
        className="flex-1 px-1.5 py-1 rounded border border-border-default bg-bg-2 text-text-0 text-[11px] outline-none focus:border-green font-mono"
      />
    </div>
  )
}

function ColorInput({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <label className="text-[10px] text-text-3 w-16 shrink-0">{label}</label>
      <input
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded border border-border-default bg-bg-2 cursor-pointer p-0.5 shrink-0"
      />
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="transparent"
        className="flex-1 px-1.5 py-1 rounded border border-border-default bg-bg-2 text-text-0 text-[10px] font-mono outline-none focus:border-green"
      />
    </div>
  )
}

function AlignButtons({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const options = ['left', 'center', 'right', 'justify']
  return (
    <div className="flex gap-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`flex-1 py-1.5 rounded text-[10px] font-medium border transition-all ${
            value === opt
              ? 'bg-green-glow border-green text-green'
              : 'border-border-default bg-bg-2 text-text-3 hover:text-text-1 hover:bg-bg-3'
          }`}
          title={opt}
        >
          {opt === 'left' && '⫷'}
          {opt === 'center' && '☰'}
          {opt === 'right' && '⫸'}
          {opt === 'justify' && '☰'}
        </button>
      ))}
    </div>
  )
}

function ResponsiveToggle({ block }: { block: BlockConfig }) {
  const updateBlockStyle = useConfigStore((s) => s.updateBlockStyle)
  const style = block.style || {}
  return (
    <div className="space-y-1.5">
      {([
        { key: 'hideOnDesktop' as const, label: 'Desktop' },
        { key: 'hideOnTablet' as const, label: 'Tablet' },
        { key: 'hideOnMobile' as const, label: 'Mobile' },
      ]).map(({ key, label }) => (
        <label key={key} className="flex items-center gap-2 text-[11px] text-text-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!style[key]}
            onChange={(e) => updateBlockStyle(block.id, { [key]: e.target.checked })}
            className="w-3.5 h-3.5 rounded border-border-default bg-bg-2 accent-green cursor-pointer"
          />
          Hide on {label}
        </label>
      ))}
    </div>
  )
}

export function StylePanel({ block }: { block: BlockConfig }) {
  const updateBlockStyle = useConfigStore((s) => s.updateBlockStyle)
  const clipboardStyle = useEditorStore((s) => s.clipboardStyle)
  const style = block.style || {}

  const set = (partial: Partial<BlockStyle>) => updateBlockStyle(block.id, partial)

  return (
    <div className="flex flex-col h-full">
      {/* Header with copy/paste */}
      <div className="px-3.5 py-2.5 border-b border-border-default flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-2">Style</span>
        <div className="flex gap-1">
          <button
            onClick={() => { useEditorStore.getState().setClipboardStyle(style); toast('Style copied') }}
            className="p-1 rounded hover:bg-bg-3 text-text-3 hover:text-text-1 transition-colors"
            title="Copy style"
          >
            <Copy size={12} />
          </button>
          <button
            onClick={() => {
              const pasted = useEditorStore.getState().clipboardStyle
              if (pasted) { set(pasted); toast('Style pasted') }
              else toast('No style in clipboard')
            }}
            className="p-1 rounded hover:bg-bg-3 text-text-3 hover:text-text-1 transition-colors"
            title="Paste style"
          >
            <Clipboard size={12} />
          </button>
          <button
            onClick={() => { updateBlockStyle(block.id, {}); toast('Style reset') }}
            className="p-1 rounded hover:bg-status-red/10 text-text-3 hover:text-status-red transition-colors"
            title="Reset style"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Layout */}
        <Section title="Layout">
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] text-text-3 mb-1">Alignment</label>
              <AlignButtons value={style.alignment} onChange={(v) => set({ alignment: v })} />
            </div>
            <SpacingInput label="Width" value={style.width} onChange={(v) => set({ width: v })} />
            <SpacingInput label="Max W" value={style.maxWidth} onChange={(v) => set({ maxWidth: v })} />
            <SpacingInput label="Min H" value={style.minHeight} onChange={(v) => set({ minHeight: v })} />
          </div>
        </Section>

        {/* Spacing */}
        <Section title="Spacing">
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] text-text-3 mb-1">Margin</label>
              <div className="grid grid-cols-4 gap-1">
                <SpacingInput label="T" value={style.marginTop} onChange={(v) => set({ marginTop: v })} />
                <SpacingInput label="R" value={style.marginRight} onChange={(v) => set({ marginRight: v })} />
                <SpacingInput label="B" value={style.marginBottom} onChange={(v) => set({ marginBottom: v })} />
                <SpacingInput label="L" value={style.marginLeft} onChange={(v) => set({ marginLeft: v })} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-text-3 mb-1">Padding</label>
              <div className="grid grid-cols-4 gap-1">
                <SpacingInput label="T" value={style.paddingTop} onChange={(v) => set({ paddingTop: v })} />
                <SpacingInput label="R" value={style.paddingRight} onChange={(v) => set({ paddingRight: v })} />
                <SpacingInput label="B" value={style.paddingBottom} onChange={(v) => set({ paddingBottom: v })} />
                <SpacingInput label="L" value={style.paddingLeft} onChange={(v) => set({ paddingLeft: v })} />
              </div>
            </div>
          </div>
        </Section>

        {/* Background */}
        <Section title="Background">
          <div className="space-y-1.5">
            <ColorInput label="Color" value={style.backgroundColor} onChange={(v) => set({ backgroundColor: v })} />
            <SpacingInput label="Image" value={style.backgroundImage} onChange={(v) => set({ backgroundImage: v })} />
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="block text-[9px] text-text-3 mb-0.5">Size</label>
                <select
                  value={style.backgroundSize || ''}
                  onChange={(e) => set({ backgroundSize: e.target.value })}
                  className="w-full px-1.5 py-1 rounded border border-border-default bg-bg-2 text-text-0 text-[10px] outline-none focus:border-green"
                >
                  <option value="">auto</option>
                  <option value="cover">cover</option>
                  <option value="contain">contain</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] text-text-3 mb-0.5">Repeat</label>
                <select
                  value={style.backgroundRepeat || ''}
                  onChange={(e) => set({ backgroundRepeat: e.target.value })}
                  className="w-full px-1.5 py-1 rounded border border-border-default bg-bg-2 text-text-0 text-[10px] outline-none focus:border-green"
                >
                  <option value="">repeat</option>
                  <option value="no-repeat">no-repeat</option>
                  <option value="repeat-x">repeat-x</option>
                  <option value="repeat-y">repeat-y</option>
                </select>
              </div>
            </div>
          </div>
        </Section>

        {/* Border */}
        <Section title="Border" defaultOpen={false}>
          <div className="space-y-1.5">
            <div className="grid grid-cols-3 gap-1.5">
              <SpacingInput label="W" value={style.borderWidth} onChange={(v) => set({ borderWidth: v })} />
              <div>
                <label className="block text-[9px] text-text-3 mb-0.5">Style</label>
                <select
                  value={style.borderStyle || ''}
                  onChange={(e) => set({ borderStyle: e.target.value })}
                  className="w-full px-1.5 py-1 rounded border border-border-default bg-bg-2 text-text-0 text-[10px] outline-none focus:border-green"
                >
                  <option value="">none</option>
                  <option value="solid">solid</option>
                  <option value="dashed">dashed</option>
                  <option value="dotted">dotted</option>
                </select>
              </div>
              <SpacingInput label="R" value={style.borderRadius} onChange={(v) => set({ borderRadius: v })} />
            </div>
            <ColorInput label="Color" value={style.borderColor} onChange={(v) => set({ borderColor: v })} />
            <SpacingInput label="Shadow" value={style.boxShadow} onChange={(v) => set({ boxShadow: v })} />
          </div>
        </Section>

        {/* Effects */}
        <Section title="Effects" defaultOpen={false}>
          <div className="space-y-2">
            <SpacingInput label="Opacity" value={style.opacity} onChange={(v) => set({ opacity: v })} />
            <div>
              <label className="block text-[10px] text-text-3 mb-1">Overflow</label>
              <select
                value={style.overflow || ''}
                onChange={(e) => set({ overflow: e.target.value })}
                className="w-full px-2 py-1.5 rounded border border-border-default bg-bg-2 text-text-0 text-[11px] outline-none focus:border-green"
              >
                <option value="">visible</option>
                <option value="hidden">hidden</option>
                <option value="scroll">scroll</option>
                <option value="auto">auto</option>
              </select>
            </div>
            <SpacingInput label="Z-Index" value={style.zIndex} onChange={(v) => set({ zIndex: v })} />
          </div>
        </Section>

        {/* Responsive */}
        <Section title="Responsive" defaultOpen={false}>
          <ResponsiveToggle block={block} />
        </Section>

        {/* Custom CSS */}
        <Section title="Custom CSS" defaultOpen={false}>
          <textarea
            value={style.customCss || ''}
            onChange={(e) => set({ customCss: e.target.value })}
            rows={6}
            placeholder=".my-class { color: red; }"
            className="w-full px-2 py-1.5 rounded border border-border-default bg-bg-2 text-text-0 text-[11px] font-mono outline-none focus:border-green resize-y"
          />
          {style.customCss && (
            <style dangerouslySetInnerHTML={{ __html: style.customCss }} />
          )}
        </Section>
      </div>
    </div>
  )
}
