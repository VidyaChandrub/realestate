"use client";

import { useState } from "react";
import { Copy, Clipboard, Trash2, Monitor, Tablet, Smartphone, Palette } from "lucide-react";
import { toast } from "sonner";
import type { BlockConfig, BlockStyle } from "@/components/openpage/blocks/types";
import { useConfigStore } from "@/components/openpage/store/configStore";
import { useEditorStore } from "@/components/openpage/store/editorStore";
import { resolveBlockStyleForDevice } from "@/lib/openpage/block-style";
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
        className="flex-1 px-1.5 py-1 rounded-md border border-border-default bg-bg-2/60 text-text-0 text-[11px] font-mono outline-none transition-[border,box-shadow] hover:border-border-hover focus:border-green focus:shadow-[0_0_0_3px_rgba(34,197,94,0.12)]"
      />
    </div>
  )
}

function ColorInput({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <label className="text-[10px] text-text-3 w-16 shrink-0">{label}</label>
      <span className="relative shrink-0">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded-md border border-border-default bg-bg-2 cursor-pointer p-1 opacity-0 absolute inset-0 z-10"
          title="Pick color"
        />
        <span
          className="w-7 h-7 rounded-md border border-border-default flex items-center justify-center"
          style={{ background: value || 'transparent' }}
        >
          <span className="w-3 h-3 rounded-full border border-black/30" style={{ background: value || 'transparent' }} />
        </span>
      </span>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="transparent"
        className="flex-1 px-1.5 py-1 rounded-md border border-border-default bg-bg-2/60 text-text-0 text-[10px] font-mono outline-none transition-[border,box-shadow] hover:border-border-hover focus:border-green focus:shadow-[0_0_0_3px_rgba(34,197,94,0.12)]"
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

function ResponsiveToggle({
  block,
  onChange,
}: {
  block: BlockConfig;
  onChange: (partial: Partial<BlockStyle>) => void;
}) {
  const style = block.style || {}
  const hideFor = (key: "hideOnDesktop" | "hideOnTablet" | "hideOnMobile") => {
    if (key === "hideOnDesktop") return Boolean(style.hideOnDesktop)
    if (key === "hideOnTablet") return Boolean(style.hideOnTablet || style.responsive?.tablet?.hideOnTablet)
    return Boolean(style.hideOnMobile || style.responsive?.mobile?.hideOnMobile)
  }
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
            checked={hideFor(key)}
            onChange={(e) => onChange({ [key]: e.target.checked })}
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
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const style = block.style || {}
  const effectiveStyle = resolveBlockStyleForDevice(style, device) || {}

  // Desktop writes the base style, tablet/mobile write per-device overrides.
  const set = (partial: Partial<BlockStyle>) => {
    if (device === "desktop") {
      updateBlockStyle(block.id, partial)
      return
    }
    const responsive = { ...(style.responsive || {}) }
    const overrides = { ...(responsive[device] || {}) }
    Object.assign(overrides, partial)
    responsive[device] = overrides
    updateBlockStyle(block.id, { responsive })
  }

  const devices = [
    { value: 'desktop' as const, icon: <Monitor size={12} />, label: 'Desktop' },
    { value: 'tablet' as const, icon: <Tablet size={12} />, label: 'Tablet' },
    { value: 'mobile' as const, icon: <Smartphone size={12} />, label: 'Mobile' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Driver bar: title + actions + device segmented control */}
      <div className="px-3 pt-2.5 pb-2 border-b border-border-default shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-text-0">
            <Palette size={13} style={{ color: "#e879f9" }} />
            Style
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { useEditorStore.getState().setClipboardStyle(style); toast('Style copied') }}
              className="w-7 h-7 rounded-md border border-border-default bg-bg-2 flex items-center justify-center text-text-3 hover:text-text-1 hover:border-border-hover transition-colors"
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
              className="w-7 h-7 rounded-md border border-border-default bg-bg-2 flex items-center justify-center text-text-3 hover:text-text-1 hover:border-border-hover transition-colors"
              title="Paste style"
            >
              <Clipboard size={12} />
            </button>
            <button
              onClick={() => { updateBlockStyle(block.id, {}); toast('Style reset') }}
              className="w-7 h-7 rounded-md border border-border-default bg-bg-2 flex items-center justify-center text-text-3 hover:text-status-red hover:border-status-red/40 transition-colors"
              title="Reset style"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg border border-border-subtle bg-bg-2">
          {devices.map(({ value, icon, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setDevice(value)}
              title={`Edit ${label} styles`}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-semibold transition-all border ${
                device === value
                  ? 'bg-green/12 border-green text-green'
                  : 'border-transparent text-text-3 hover:text-text-1 hover:bg-bg-3'
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
        {/* Layout */}
        <Section title="Layout">
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] text-text-3 mb-1">Alignment</label>
              <AlignButtons value={effectiveStyle.alignment} onChange={(v) => set({ alignment: v })} />
            </div>
            <SpacingInput label="Width" value={effectiveStyle.width} onChange={(v) => set({ width: v })} />
            <SpacingInput label="Max W" value={effectiveStyle.maxWidth} onChange={(v) => set({ maxWidth: v })} />
            <SpacingInput label="Min H" value={effectiveStyle.minHeight} onChange={(v) => set({ minHeight: v })} />
          </div>
        </Section>

        {/* Spacing */}
        <Section title="Spacing">
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] text-text-3 mb-1">Margin</label>
              <div className="grid grid-cols-4 gap-1">
                <SpacingInput label="T" value={effectiveStyle.marginTop} onChange={(v) => set({ marginTop: v })} />
                <SpacingInput label="R" value={effectiveStyle.marginRight} onChange={(v) => set({ marginRight: v })} />
                <SpacingInput label="B" value={effectiveStyle.marginBottom} onChange={(v) => set({ marginBottom: v })} />
                <SpacingInput label="L" value={effectiveStyle.marginLeft} onChange={(v) => set({ marginLeft: v })} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-text-3 mb-1">Padding</label>
              <div className="grid grid-cols-4 gap-1">
                <SpacingInput label="T" value={effectiveStyle.paddingTop} onChange={(v) => set({ paddingTop: v })} />
                <SpacingInput label="R" value={effectiveStyle.paddingRight} onChange={(v) => set({ paddingRight: v })} />
                <SpacingInput label="B" value={effectiveStyle.paddingBottom} onChange={(v) => set({ paddingBottom: v })} />
                <SpacingInput label="L" value={effectiveStyle.paddingLeft} onChange={(v) => set({ paddingLeft: v })} />
              </div>
            </div>
          </div>
        </Section>

        {/* Background */}
        <Section title="Background">
          <div className="space-y-1.5">
            <ColorInput label="Color" value={effectiveStyle.backgroundColor} onChange={(v) => set({ backgroundColor: v })} />
            <SpacingInput label="Image" value={effectiveStyle.backgroundImage} onChange={(v) => set({ backgroundImage: v })} />
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="block text-[9px] text-text-3 mb-0.5">Size</label>
                <select
                  value={effectiveStyle.backgroundSize || ''}
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
                  value={effectiveStyle.backgroundRepeat || ''}
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
              <SpacingInput label="W" value={effectiveStyle.borderWidth} onChange={(v) => set({ borderWidth: v })} />
              <div>
                <label className="block text-[9px] text-text-3 mb-0.5">Style</label>
                <select
                  value={effectiveStyle.borderStyle || ''}
                  onChange={(e) => set({ borderStyle: e.target.value })}
                  className="w-full px-1.5 py-1 rounded border border-border-default bg-bg-2 text-text-0 text-[10px] outline-none focus:border-green"
                >
                  <option value="">none</option>
                  <option value="solid">solid</option>
                  <option value="dashed">dashed</option>
                  <option value="dotted">dotted</option>
                </select>
              </div>
              <SpacingInput label="R" value={effectiveStyle.borderRadius} onChange={(v) => set({ borderRadius: v })} />
            </div>
            <ColorInput label="Color" value={effectiveStyle.borderColor} onChange={(v) => set({ borderColor: v })} />
            <SpacingInput label="Shadow" value={effectiveStyle.boxShadow} onChange={(v) => set({ boxShadow: v })} />
          </div>
        </Section>

        {/* Effects */}
        <Section title="Effects" defaultOpen={false}>
          <div className="space-y-2">
            <SpacingInput label="Opacity" value={effectiveStyle.opacity} onChange={(v) => set({ opacity: v })} />
            <div>
              <label className="block text-[10px] text-text-3 mb-1">Overflow</label>
              <select
                value={effectiveStyle.overflow || ''}
                onChange={(e) => set({ overflow: e.target.value })}
                className="w-full px-2 py-1.5 rounded border border-border-default bg-bg-2 text-text-0 text-[11px] outline-none focus:border-green"
              >
                <option value="">visible</option>
                <option value="hidden">hidden</option>
                <option value="scroll">scroll</option>
                <option value="auto">auto</option>
              </select>
            </div>
            <SpacingInput label="Z-Index" value={effectiveStyle.zIndex} onChange={(v) => set({ zIndex: v })} />
          </div>
        </Section>

        {/* Responsive */}
        <Section title="Responsive" defaultOpen={false}>
          <ResponsiveToggle block={block} onChange={set} />
        </Section>

        {/* Custom CSS */}
        <Section title="Custom CSS" defaultOpen={false}>
          <textarea
            value={effectiveStyle.customCss || ''}
            onChange={(e) => set({ customCss: e.target.value })}
            rows={5}
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
