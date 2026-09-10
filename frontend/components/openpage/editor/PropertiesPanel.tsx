"use client";

import { useState } from "react";
import { Code } from "lucide-react";
import type { BlockConfig, BlockType } from "@/components/openpage/blocks/types";
import { useConfigStore } from "@/components/openpage/store/configStore";
import { Section } from "./shared-components";
import { MediaPicker } from "@/components/media-picker";

interface FieldDef {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'array-strings' | 'array-items' | 'image' | 'icon'
  options?: string[]
}

function mediaKindForKey(key: string): 'image' | 'icon' | null {
  const k = key.toLowerCase()
  if (k === 'icon' || k === 'iconimage') return 'icon'
  if (
    k === 'src' ||
    k === 'image' ||
    k === 'logoimage' ||
    k === 'heroimage' ||
    k === 'avatar' ||
    k.endsWith('image')
  ) return 'image'
  return null
}

const blockFields: Partial<Record<BlockType, { sections: { title: string; fields: FieldDef[] }[] }>> = {
  navbar: {
    sections: [
      {
        title: 'Content',
        fields: [
          { key: 'logo', label: 'Logo Text', type: 'text' },
          { key: 'logoImage', label: 'Logo', type: 'image' },
          { key: 'ctaText', label: 'CTA Button', type: 'text' },
          { key: 'links', label: 'Nav Links', type: 'array-strings' },
        ],
      },
      {
        title: 'Style',
        fields: [
          { key: 'variant', label: 'Variant', type: 'select', options: ['default', 'centered'] },
        ],
      },
    ],
  },
  hero: {
    sections: [
      {
        title: 'Content',
        fields: [
          { key: 'badge', label: 'Badge', type: 'text' },
          { key: 'headline', label: 'Headline', type: 'text' },
          { key: 'subheadline', label: 'Subheadline', type: 'textarea' },
          { key: 'primaryCta', label: 'Primary CTA', type: 'text' },
          { key: 'primaryCtaUrl', label: 'Primary CTA URL', type: 'text' },
          { key: 'secondaryCta', label: 'Secondary CTA', type: 'text' },
          { key: 'secondaryCtaUrl', label: 'Secondary CTA URL', type: 'text' },
          { key: 'heroImage', label: 'Hero image', type: 'image' },
        ],
      },
      {
        title: 'Style',
        fields: [
          { key: 'variant', label: 'Variant', type: 'select', options: ['centered', 'split', 'gradient', 'minimal'] },
        ],
      },
    ],
  },
  features: {
    sections: [
      {
        title: 'Content',
        fields: [
          { key: 'label', label: 'Section Label', type: 'text' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'subtitle', label: 'Subtitle', type: 'text' },
        ],
      },
      {
        title: 'Items',
        fields: [
          { key: 'items', label: 'Feature Cards', type: 'array-items' },
        ],
      },
      {
        title: 'Style',
        fields: [
          { key: 'variant', label: 'Variant', type: 'select', options: ['grid', 'list', 'alternating'] },
        ],
      },
    ],
  },
  pricing: {
    sections: [
      {
        title: 'Content',
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'subtitle', label: 'Subtitle', type: 'text' },
        ],
      },
      {
        title: 'Style',
        fields: [
          { key: 'variant', label: 'Variant', type: 'select', options: ['simple', 'comparison'] },
        ],
      },
    ],
  },
  cta: {
    sections: [
      {
        title: 'Content',
        fields: [
          { key: 'headline', label: 'Headline', type: 'text' },
          { key: 'subheadline', label: 'Subheadline', type: 'text' },
          { key: 'buttonText', label: 'Button Text', type: 'text' },
          { key: 'buttonUrl', label: 'Button URL', type: 'text' },
          { key: 'popupId', label: 'Popup ID', type: 'text' },
        ],
      },
      {
        title: 'Style',
        fields: [
          { key: 'variant', label: 'Variant', type: 'select', options: ['simple', 'split'] },
        ],
      },
    ],
  },
  footer: {
    sections: [
      {
        title: 'Content',
        fields: [
          { key: 'logo', label: 'Logo Text', type: 'text' },
          { key: 'logoImage', label: 'Logo', type: 'image' },
          { key: 'copyright', label: 'Copyright', type: 'text' },
          { key: 'tagline', label: 'Tagline', type: 'textarea' },
          { key: 'address', label: 'Address', type: 'text' },
          { key: 'phone', label: 'Phone', type: 'text' },
          { key: 'email', label: 'Email', type: 'text' },
          { key: 'links', label: 'Links', type: 'array-strings' },
          { key: 'socials', label: 'Social links', type: 'array-strings' },
        ],
      },
      {
        title: 'Style',
        fields: [
          { key: 'variant', label: 'Variant', type: 'select', options: ['simple', 'multi-column', 'minimal'] },
        ],
      },
    ],
  },
  testimonials: {
    sections: [
      {
        title: 'Content',
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'subtitle', label: 'Subtitle', type: 'text' },
          { key: 'items', label: 'Testimonials', type: 'array-items' },
        ],
      },
      {
        title: 'Style',
        fields: [
          { key: 'variant', label: 'Variant', type: 'select', options: ['cards', 'carousel', 'spotlight'] },
        ],
      },
    ],
  },
  stats: {
    sections: [
      {
        title: 'Content',
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'items', label: 'Stats', type: 'array-items' },
        ],
      },
      {
        title: 'Style',
        fields: [
          { key: 'variant', label: 'Variant', type: 'select', options: ['grid', 'bar', 'counter'] },
        ],
      },
    ],
  },
  faq: {
    sections: [
      {
        title: 'Content',
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'subtitle', label: 'Subtitle', type: 'text' },
          { key: 'items', label: 'Questions', type: 'array-items' },
        ],
      },
    ],
  },
  team: {
    sections: [
      {
        title: 'Content',
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'subtitle', label: 'Subtitle', type: 'text' },
          { key: 'members', label: 'Members', type: 'array-items' },
        ],
      },
    ],
  },
  contact: {
    sections: [
      {
        title: 'Content',
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'subtitle', label: 'Subtitle', type: 'text' },
        ],
      },
    ],
  },
  newsletter: {
    sections: [
      {
        title: 'Content',
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'subtitle', label: 'Subtitle', type: 'text' },
          { key: 'buttonText', label: 'Button Text', type: 'text' },
          { key: 'socialProof', label: 'Social Proof', type: 'text' },
        ],
      },
    ],
  },
  logocloud: {
    sections: [
      {
        title: 'Content',
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'logos', label: 'Logos', type: 'array-strings' },
        ],
      },
    ],
  },
  content: {
    sections: [
      {
        title: 'Content',
        fields: [
          { key: 'body', label: 'Body', type: 'textarea' },
        ],
      },
      {
        title: 'Style',
        fields: [
          { key: 'variant', label: 'Variant', type: 'select', options: ['prose', 'columns', 'highlight'] },
        ],
      },
    ],
  },
  image: {
    sections: [
      {
        title: 'Content',
        fields: [
          { key: 'src', label: 'Image', type: 'image' },
          { key: 'alt', label: 'Alt Text', type: 'text' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'subtitle', label: 'Subtitle', type: 'text' },
          { key: 'imageSide', label: 'Image Side', type: 'select', options: ['left', 'right'] },
        ],
      },
      {
        title: 'Grid Images',
        fields: [
          { key: 'images', label: 'Images', type: 'array-items' },
        ],
      },
      {
        title: 'Style',
        fields: [
          { key: 'variant', label: 'Variant', type: 'select', options: ['hero-image', 'side-by-side', 'grid'] },
        ],
      },
    ],
  },
  video: {
    sections: [
      {
        title: 'Content',
        fields: [
          { key: 'url', label: 'Video URL', type: 'text' },
          { key: 'title', label: 'Title', type: 'text' },
        ],
      },
      {
        title: 'Style',
        fields: [
          { key: 'variant', label: 'Platform', type: 'select', options: ['youtube', 'vimeo'] },
        ],
      },
    ],
  },
  gallery: {
    sections: [
      {
        title: 'Content',
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'images', label: 'Images', type: 'array-items' },
        ],
      },
      {
        title: 'Style',
        fields: [
          { key: 'variant', label: 'Variant', type: 'select', options: ['grid', 'masonry'] },
        ],
      },
    ],
  },
  divider: {
    sections: [
      {
        title: 'Style',
        fields: [
          { key: 'variant', label: 'Variant', type: 'select', options: ['line', 'space', 'dots'] },
          { key: 'width', label: 'Width', type: 'select', options: ['full', 'centered', 'narrow'] },
          { key: 'height', label: 'Height (px)', type: 'text' },
        ],
      },
    ],
  },
  banner: {
    sections: [
      {
        title: 'Content',
        fields: [
          { key: 'text', label: 'Text', type: 'text' },
          { key: 'linkText', label: 'Link Text', type: 'text' },
          { key: 'linkUrl', label: 'Link URL', type: 'text' },
        ],
      },
      {
        title: 'Style',
        fields: [
          { key: 'variant', label: 'Variant', type: 'select', options: ['ribbon', 'bar'] },
        ],
      },
    ],
  },
  'project-banner': {
    sections: [
      { title: 'Content', fields: [
        { key: 'badge', label: 'Badge', type: 'text' },
        { key: 'headline', label: 'Headline', type: 'text' },
        { key: 'location', label: 'Location', type: 'text' },
        { key: 'price', label: 'Price', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'image', label: 'Cover image', type: 'image' },
          { key: 'primaryCta', label: 'Primary CTA', type: 'text' },
          { key: 'secondaryCta', label: 'Secondary CTA', type: 'text' },
          { key: 'formId', label: 'Form ID', type: 'text' },
          { key: 'popupId', label: 'Brochure popup ID', type: 'text' },
          { key: 'pdfUrl', label: 'Brochure PDF URL', type: 'text' },
      ]},
    ],
  },
  'project-overview': {
    sections: [{ title: 'Content', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'body', label: 'Body', type: 'textarea' },
      { key: 'image', label: 'Image', type: 'image' },
      { key: 'ctaText', label: 'CTA text', type: 'text' },
    ]}],
  },
  'property-details': {
    sections: [{ title: 'Content', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'items', label: 'Highlights', type: 'array-items' },
      { key: 'type', label: 'Type', type: 'text' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'possession', label: 'Possession', type: 'text' },
      { key: 'rera', label: 'RERA', type: 'text' },
    ]}],
  },
  amenities: {
    sections: [{ title: 'Content', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'items', label: 'Amenities', type: 'array-items' },
    ]}],
  },
  'floor-plans': {
    sections: [{ title: 'Plans', fields: [{ key: 'items', label: 'Floor plans', type: 'array-items' }] }],
  },
  'unit-config': {
    sections: [{ title: 'Units', fields: [{ key: 'items', label: 'Configurations', type: 'array-items' }] }],
  },
  're-pricing': {
    sections: [{ title: 'Content', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'startingPrice', label: 'Starting price', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
    ]}],
  },
  offers: {
    sections: [{ title: 'Offers', fields: [{ key: 'items', label: 'Offers', type: 'array-items' }] }],
  },
  location: {
    sections: [{ title: 'Content', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'address', label: 'Address', type: 'text' },
      { key: 'embedUrl', label: 'Map embed URL', type: 'text' },
      { key: 'items', label: 'Nearby', type: 'array-items' },
    ]}],
  },
  'google-maps': {
    sections: [{ title: 'Map', fields: [{ key: 'embedUrl', label: 'Embed URL', type: 'text' }] }],
  },
  developer: {
    sections: [{ title: 'Content', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'name', label: 'Developer name', type: 'text' },
      { key: 'body', label: 'About', type: 'textarea' },
    ]}],
  },
  'lead-form': {
    sections: [{ title: 'Form', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'formId', label: 'Form ID', type: 'text' },
    ]}],
  },
  'download-brochure': {
    sections: [{ title: 'Brochure', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'buttonText', label: 'Button text', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'image', label: 'Preview image', type: 'image' },
      { key: 'pdfUrl', label: 'PDF URL', type: 'text' },
      { key: 'popupId', label: 'Popup ID', type: 'text' },
    ]}],
  },
  'site-visit': {
    sections: [{ title: 'Form', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'formId', label: 'Form ID', type: 'text' },
    ]}],
  },
  'custom-section': {
    sections: [{ title: 'Content', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'body', label: 'Body', type: 'textarea' },
    ]}],
  },
  slider: {
    sections: [
      { title: 'Content', fields: [
        { key: 'images', label: 'Images', type: 'array-items' },
      ]},
      { title: 'Settings', fields: [
        { key: 'height', label: 'Height', type: 'text' },
        { key: 'autoPlay', label: 'Auto-play', type: 'select', options: ['true', 'false'] },
        { key: 'interval', label: 'Interval (ms)', type: 'text' },
        { key: 'showDots', label: 'Show Dots', type: 'select', options: ['true', 'false'] },
        { key: 'showArrows', label: 'Show Arrows', type: 'select', options: ['true', 'false'] },
      ]},
    ],
  },
  tabs: {
    sections: [
      { title: 'Content', fields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'items', label: 'Tab Items', type: 'array-items' },
      ]},
    ],
  },
  countdown: {
    sections: [
      { title: 'Content', fields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'targetDate', label: 'Target Date (ISO)', type: 'text' },
        { key: 'deadline', label: 'Deadline (ISO)', type: 'text' },
        { key: 'expiredText', label: 'Expired Text', type: 'text' },
      ]},
      { title: 'Display', fields: [
        { key: 'showDays', label: 'Show Days', type: 'select', options: ['true', 'false'] },
        { key: 'showHours', label: 'Show Hours', type: 'select', options: ['true', 'false'] },
        { key: 'showMinutes', label: 'Show Minutes', type: 'select', options: ['true', 'false'] },
        { key: 'showSeconds', label: 'Show Seconds', type: 'select', options: ['true', 'false'] },
      ]},
    ],
  },
  'social-icons': {
    sections: [
      { title: 'Content', fields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'icons', label: 'Icons', type: 'array-items' },
      ]},
      { title: 'Style', fields: [
        { key: 'style', label: 'Shape', type: 'select', options: ['rounded', 'circle', 'square'] },
        { key: 'size', label: 'Size', type: 'select', options: ['sm', 'md', 'lg'] },
      ]},
    ],
  },
  icon: {
    sections: [
      { title: 'Content', fields: [
        { key: 'icon', label: 'Icon', type: 'icon' },
        { key: 'label', label: 'Label', type: 'text' },
        { key: 'link', label: 'Link URL', type: 'text' },
      ]},
      { title: 'Style', fields: [
        { key: 'size', label: 'Size', type: 'text' },
        { key: 'color', label: 'Color', type: 'text' },
      ]},
    ],
  },
  spacer: {
    sections: [
      { title: 'Settings', fields: [
        { key: 'height', label: 'Height', type: 'text' },
        { key: 'backgroundColor', label: 'Background Color', type: 'text' },
      ]},
    ],
  },
  'html-code': {
    sections: [
      { title: 'Content', fields: [
        { key: 'code', label: 'HTML Code', type: 'textarea' },
      ]},
    ],
  },
  anchor: {
    sections: [
      { title: 'Settings', fields: [
        { key: 'anchorId', label: 'Anchor ID', type: 'text' },
      ]},
    ],
  },
  columns: {
    sections: [
      { title: 'Layout', fields: [
        { key: 'gap', label: 'Gap', type: 'text' },
      ]},
    ],
  },
  'construction-status': {
    sections: [
      { title: 'Content', fields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'items', label: 'Milestones', type: 'array-items' },
      ]},
    ],
  },
  'project-highlights': {
    sections: [
      { title: 'Content', fields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'subtitle', label: 'Subtitle', type: 'text' },
        { key: 'items', label: 'Highlights', type: 'array-items' },
      ]},
    ],
  },
  heading: {
    sections: [{ title: 'Content', fields: [
      { key: 'text', label: 'Heading', type: 'text' },
      { key: 'tag', label: 'HTML Tag', type: 'select', options: ['h1', 'h2', 'h3', 'h4'] },
      { key: 'url', label: 'Link', type: 'text' },
    ]}],
  },
  text: {
    sections: [{ title: 'Content', fields: [
      { key: 'body', label: 'Text', type: 'textarea' },
    ]}],
  },
  button: {
    sections: [{ title: 'Content', fields: [
      { key: 'label', label: 'Button text', type: 'text' },
      { key: 'url', label: 'Link', type: 'text' },
    ]}],
  },
  'icon-box': {
    sections: [{ title: 'Content', fields: [
      { key: 'icon', label: 'Icon', type: 'icon' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ]}],
  },
  'image-box': {
    sections: [{ title: 'Content', fields: [
      { key: 'image', label: 'Image', type: 'image' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ]}],
  },
  'property-search': {
    sections: [{ title: 'Content', fields: [
      { key: 'placeholder', label: 'Placeholder', type: 'text' },
      { key: 'buttonText', label: 'Button', type: 'text' },
    ]}],
  },
  'property-filters': {
    sections: [{ title: 'Content', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'items', label: 'Filters', type: 'array-items' },
    ]}],
  },
  'emi-calculator': {
    sections: [{ title: 'Defaults', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'principal', label: 'Loan amount', type: 'text' },
      { key: 'rate', label: 'Interest rate', type: 'text' },
      { key: 'years', label: 'Tenure (years)', type: 'text' },
    ]}],
  },
  'payment-plan': {
    sections: [{ title: 'Content', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'items', label: 'Milestones', type: 'array-items' },
    ]}],
  },
}

function PropertyField({ field, block }: { field: FieldDef; block: BlockConfig }) {
  const updateBlockProps = useConfigStore((s) => s.updateBlockProps)
  const updateBlock = useConfigStore((s) => s.updateBlock)

  // For variant field, it's on the block itself
  const value = field.key === 'variant'
    ? block.variant
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : (block.props as any)[field.key]

  const onChange = (newValue: unknown) => {
    if (field.key === 'variant') {
      updateBlock(block.id, { variant: newValue as string })
    } else {
      updateBlockProps(block.id, { [field.key]: newValue })
    }
  }

  switch (field.type) {
    case 'text':
      return (
        <div className="mb-2.5">
          <label className="block text-[11.5px] text-text-2 mb-1 font-medium">{field.label}</label>
          <input
            type="text"
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-2 py-1.5 rounded border border-border-default bg-bg-2 text-text-0 text-xs outline-none focus:border-green"
          />
        </div>
      )

    case 'textarea':
      return (
        <div className="mb-2.5">
          <label className="block text-[11.5px] text-text-2 mb-1 font-medium">{field.label}</label>
          <textarea
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="w-full px-2 py-1.5 rounded border border-border-default bg-bg-2 text-text-0 text-xs outline-none focus:border-green resize-y"
          />
        </div>
      )

    case 'select':
      return (
        <div className="mb-2.5">
          <label className="block text-[11.5px] text-text-2 mb-1 font-medium">{field.label}</label>
          <select
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-2 py-1.5 rounded border border-border-default bg-bg-2 text-text-0 text-xs outline-none focus:border-green cursor-pointer"
          >
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )

    case 'image':
    case 'icon':
      return (
        <div className="mb-3">
          <MediaPicker
            kind={field.type}
            label={field.label}
            value={String(value || '')}
            compact
            onChange={(v) => onChange(v)}
          />
        </div>
      )

    case 'array-strings': {
      const items = (Array.isArray(value) ? value : []) as string[]
      return (
        <div className="mb-2.5">
          <label className="block text-[11.5px] text-text-2 mb-1 font-medium">{field.label}</label>
          {items.map((item, i) => (
            <div key={i} className="flex gap-1 mb-1">
              <input
                type="text"
                value={item}
                onChange={(e) => {
                  const updated = [...items]
                  updated[i] = e.target.value
                  onChange(updated)
                }}
                className="flex-1 px-2 py-1 rounded border border-border-default bg-bg-2 text-text-0 text-xs outline-none focus:border-green"
              />
              <button
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="px-1.5 text-text-3 hover:text-status-red text-xs transition-colors"
              >
                x
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange([...items, ''])}
            className="text-[10px] text-green hover:text-green-dim transition-colors mt-0.5"
          >
            + Add item
          </button>
        </div>
      )
    }

    case 'array-items': {
      const items = (Array.isArray(value) ? value : []) as Array<Record<string, string>>

      // Infer new item shape from existing items, or use sensible defaults per field key
      function createEmptyItem(): Record<string, string> {
        if (items.length > 0) {
          const template: Record<string, string> = {}
          for (const key of Object.keys(items[0])) template[key] = ''
          return template
        }
        // Fallback templates by block type + field key
        const blockTemplates: Partial<Record<string, Record<string, Record<string, string>>>> = {
          testimonials: { items: { name: '', role: '', quote: '' } },
          stats: { items: { value: '', label: '' } },
          faq: { items: { question: '', answer: '' } },
          team: { members: { name: '', role: '' } },
          features: { items: { icon: '', title: '', description: '' } },
          team: { members: { name: '', role: '', avatar: '' } },
          image: { images: { src: '', alt: '' } },
          gallery: { images: { src: '', alt: '', caption: '' } },
        }
        return blockTemplates[block.type]?.[field.key] || { title: '', description: '' }
      }

      return (
        <div className="mb-2.5">
          <label className="block text-[11.5px] text-text-2 mb-1 font-medium">{field.label}</label>
          {items.map((item, i) => (
            <div key={i} className="bg-bg-2 border border-border-default rounded p-2 mb-1.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-text-3 font-medium">Item {i + 1}</span>
                <button
                  onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                  className="text-[10px] text-text-3 hover:text-status-red transition-colors"
                >
                  Remove
                </button>
              </div>
              {Object.entries(item).map(([key, val]) => {
                const kind = mediaKindForKey(key)
                return (
                <div key={key} className="mb-1">
                  {kind ? (
                    <MediaPicker
                      kind={kind}
                      label={key}
                      value={String(val ?? '')}
                      compact
                      onChange={(v) => {
                        const updated = [...items]
                        updated[i] = { ...updated[i], [key]: v }
                        onChange(updated)
                      }}
                    />
                  ) : (
                    <>
                      <label className="block text-[10px] text-text-3 mb-0.5">{key}</label>
                      <input
                        type="text"
                        value={String(val)}
                        onChange={(e) => {
                          const updated = [...items]
                          updated[i] = { ...updated[i], [key]: e.target.value }
                          onChange(updated)
                        }}
                        className="w-full px-1.5 py-1 rounded border border-border-subtle bg-bg-3 text-text-0 text-[11px] outline-none focus:border-green"
                      />
                    </>
                  )}
                </div>
                )
              })}
            </div>
          ))}
          <button
            onClick={() => onChange([...items, createEmptyItem()])}
            className="text-[10px] text-green hover:text-green-dim transition-colors"
          >
            + Add item
          </button>
        </div>
      )
    }

    default:
      return null
  }
}

export function PropertiesPanel({ block }: { block: BlockConfig }) {
  const [showJson, setShowJson] = useState(false)
  const schema = blockFields[block.type]
  const updateColumnWidth = useConfigStore((s) => s.updateColumnWidth)
  const addColumn = useConfigStore((s) => s.addColumn)
  const removeColumn = useConfigStore((s) => s.removeColumn)

  const columns = block.type === 'columns'
    ? ((block.props.columns as Array<{ width: number; blocks: BlockConfig[] }>) ?? [])
    : []

  return (
    <>
      {/* Header */}
      <div className="px-3.5 py-3 border-b border-border-default flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-2">
          Content
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-glow text-green font-semibold">
          {block.type}
        </span>
      </div>

      {/* Property sections */}
      {schema?.sections.map((section) => (
        <Section key={section.title} title={section.title}>
          {section.fields.map((field) => (
            <PropertyField key={field.key} field={field} block={block} />
          ))}
        </Section>
      )) || (
        <div className="p-3.5 text-[11px] text-text-3">
          No editable properties defined for this block type.
        </div>
      )}

      {/* Column Width Editor */}
      {block.type === 'columns' && (
        <Section title="Columns">
          <div className="space-y-2">
            {columns.map((col, i) => (
              <div key={i} className="bg-bg-2 border border-border-default rounded p-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-text-3 font-medium">Column {i + 1}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-text-3 font-mono">{col.width}%</span>
                    {columns.length > 1 && (
                      <button
                        onClick={() => removeColumn(block.id, i)}
                        className="text-[10px] text-text-3 hover:text-status-red transition-colors"
                        title="Remove column"
                      >
                        x
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={col.width}
                  onChange={(e) => updateColumnWidth(block.id, i, Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none bg-bg-4 cursor-pointer accent-green"
                />
                <div className="text-[9px] text-text-3 mt-0.5">{col.blocks.length} widget(s) in this column</div>
              </div>
            ))}
            {columns.length < 6 && (
              <button
                onClick={() => addColumn(block.id)}
                className="w-full py-1.5 rounded border border-dashed border-border-default text-[10px] text-text-3 hover:border-green hover:text-green transition-colors"
              >
                + Add Column
              </button>
            )}
          </div>
        </Section>
      )}

      {/* View JSON toggle */}
      <div className="border-t border-border-subtle">
        <button
          onClick={() => setShowJson(!showJson)}
          className="w-full px-3.5 py-2 flex items-center gap-1.5 text-[10px] text-text-3 hover:text-text-2 transition-colors"
        >
          <Code size={11} />
          {showJson ? 'Hide' : 'View'} Block JSON
        </button>
        {showJson && (
          <pre className="px-3.5 pb-3 text-[10px] font-mono text-text-2 leading-relaxed overflow-x-auto max-h-48 overflow-y-auto">
            {JSON.stringify({ id: block.id, type: block.type, variant: block.variant, props: block.props }, null, 2)}
          </pre>
        )}
      </div>
    </>
  )
}
