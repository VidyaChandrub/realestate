"use client";

import { useState } from "react";
import type { BlockConfig } from "../types";

interface TabsProps {
  title?: string;
  items?: Array<{ label: string; content: string }>;
}

export function TabsBlock({ block }: { block: BlockConfig }) {
  const p = block.props as TabsProps
  const items = p.items ?? [
    { label: 'Overview', content: 'This is the overview tab content. Add your property overview details here.' },
    { label: 'Specifications', content: 'Specifications and technical details about the property.' },
    { label: 'Amenities', content: 'List of amenities and facilities available.' },
  ]
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div className="px-6 py-12 max-w-4xl mx-auto">
      {p.title && (
        <h2 className="text-2xl font-bold text-[var(--color-text-0)] mb-6">{p.title}</h2>
      )}
      <div className="border-b border-[var(--color-border-default)]">
        <div className="flex gap-0">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                i === activeTab
                  ? 'text-[var(--color-accent)] border-[var(--color-accent)]'
                  : 'text-[var(--color-text-2)] border-transparent hover:text-[var(--color-text-0)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="py-6 text-[var(--color-text-1)] text-sm leading-relaxed">
        {items[activeTab]?.content}
      </div>
    </div>
  )
}
