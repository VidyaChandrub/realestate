"use client";

import { useState } from "react";
import { Copy, Clipboard } from "lucide-react";
import { toast } from "sonner";
import type { BlockConfig, BlockTypography } from "@/components/openpage/blocks/types";
import { useConfigStore } from "@/components/openpage/store/configStore";
import { useEditorStore } from "@/components/openpage/store/editorStore";
import { googleFontOptions } from "@/lib/openpage/theme-presets";
import { Section } from "./shared-components";

function SelectField({ label, value, options, onChange }: { label: string; value?: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="mb-2">
      <label className="block text-[10px] text-text-3 mb-1">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 rounded border border-border-default bg-bg-2 text-text-0 text-[11px] outline-none focus:border-green cursor-pointer"
      >
        <option value="">Inherit</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

function InputField({ label, value, onChange, placeholder, unit }: { label: string; value?: string; onChange: (v: string) => void; placeholder?: string; unit?: string }) {
  return (
    <div className="mb-2">
      <label className="block text-[10px] text-text-3 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Inherit'}
          className="w-full px-2 py-1.5 rounded border border-border-default bg-bg-2 text-text-0 text-[11px] outline-none focus:border-green font-mono"
        />
        {unit && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-text-3">{unit}</span>}
      </div>
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <label className="text-[10px] text-text-3 w-12 shrink-0">{label}</label>
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
        placeholder="theme"
        className="flex-1 px-1.5 py-1 rounded border border-border-default bg-bg-2 text-text-0 text-[10px] font-mono outline-none focus:border-green"
      />
    </div>
  )
}

function AlignField({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const options = ['left', 'center', 'right', 'justify']
  return (
    <div className="mb-2">
      <label className="block text-[10px] text-text-3 mb-1">Text Align</label>
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
            {opt.charAt(0).toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}

const fontWeightOptions = [
  { value: '100', label: 'Thin (100)' },
  { value: '200', label: 'Extra Light (200)' },
  { value: '300', label: 'Light (300)' },
  { value: '400', label: 'Regular (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semi Bold (600)' },
  { value: '700', label: 'Bold (700)' },
  { value: '800', label: 'Extra Bold (800)' },
  { value: '900', label: 'Black (900)' },
]

const textTransformOptions = [
  { value: 'none', label: 'None' },
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'lowercase', label: 'lowercase' },
  { value: 'capitalize', label: 'Capitalize' },
]

const textDecorationOptions = [
  { value: 'none', label: 'None' },
  { value: 'underline', label: 'Underline' },
  { value: 'line-through', label: 'Strikethrough' },
  { value: 'overline', label: 'Overline' },
]

export function TypographyPanel({ block }: { block: BlockConfig }) {
  const updateBlockStyle = useConfigStore((s) => s.updateBlockStyle)
  const typography = block.style?.typography || {}

  const setTypo = (partial: Partial<BlockTypography>) => {
    updateBlockStyle(block.id, {
      typography: { ...typography, ...partial },
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3.5 py-2.5 border-b border-border-default flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-2">Typography</span>
        <div className="flex gap-1">
          <button
            onClick={() => {
              const typography = useEditorStore.getState().clipboardStyle?.typography
              if (typography) {
                setTypo(typography)
                toast('Typography pasted')
              } else {
                toast('No typography in clipboard')
              }
            }}
            className="p-1 rounded hover:bg-bg-3 text-text-3 hover:text-text-1 transition-colors"
            title="Paste typography"
          >
            <Clipboard size={12} />
          </button>
          <button
            onClick={() => {
              useEditorStore.getState().setClipboardStyle({ typography })
              toast('Typography copied')
            }}
            className="p-1 rounded hover:bg-bg-3 text-text-3 hover:text-text-1 transition-colors"
            title="Copy typography"
          >
            <Copy size={12} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Section title="Font">
          <div>
            <label className="block text-[10px] text-text-3 mb-1">Font Family</label>
            <select
              value={typography.fontFamily || ''}
              onChange={(e) => setTypo({ fontFamily: e.target.value })}
              className="w-full px-2 py-1.5 rounded border border-border-default bg-bg-2 text-text-0 text-[11px] outline-none focus:border-green cursor-pointer"
            >
              <option value="">Inherit from theme</option>
              {googleFontOptions.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </Section>

        <Section title="Size & Weight">
          <div className="grid grid-cols-2 gap-2">
            <InputField label="Font Size" value={typography.fontSize} onChange={(v) => setTypo({ fontSize: v })} placeholder="16px" unit="px" />
            <SelectField label="Font Weight" value={typography.fontWeight} options={fontWeightOptions} onChange={(v) => setTypo({ fontWeight: v })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <InputField label="Line Height" value={typography.lineHeight} onChange={(v) => setTypo({ lineHeight: v })} placeholder="1.5" />
            <InputField label="Letter Spacing" value={typography.letterSpacing} onChange={(v) => setTypo({ letterSpacing: v })} placeholder="0px" unit="px" />
          </div>
        </Section>

        <Section title="Transform & Decoration">
          <SelectField label="Text Transform" value={typography.textTransform} options={textTransformOptions} onChange={(v) => setTypo({ textTransform: v })} />
          <SelectField label="Text Decoration" value={typography.textDecoration} options={textDecorationOptions} onChange={(v) => setTypo({ textDecoration: v })} />
        </Section>

        <Section title="Color & Alignment">
          <ColorField label="Color" value={typography.color} onChange={(v) => setTypo({ color: v })} />
          <AlignField value={typography.textAlign} onChange={(v) => setTypo({ textAlign: v })} />
        </Section>
      </div>
    </div>
  )
}
