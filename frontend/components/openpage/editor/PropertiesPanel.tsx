"use client";

import { useMemo, useState } from "react";
import { Code } from "lucide-react";
import type { BlockConfig, BlockType } from "@/components/openpage/blocks/types";
import { useConfigStore } from "@/components/openpage/store/configStore";
import { Section } from "./shared-components";
import { MediaPicker } from "@/components/media-picker";
import { loadFormLibrary, type FormDefinition } from "@/lib/openpage/forms-store";
import { mergeFormLibraries } from "@/lib/openpage/resolve-form";

interface FieldDef {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'array-strings' | 'array-items' | 'image' | 'icon' | 'form-select' | 'toggle' | 'nav-menu'
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
          { key: 'ctaId', label: 'CTA section ID', type: 'text' },
          { key: 'menuItems', label: 'Menu items', type: 'nav-menu' },
        ],
      },
      {
        title: 'Style',
        fields: [
          { key: 'variant', label: 'Variant', type: 'select', options: ['default', 'centered', 'static'] },
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
          { key: 'variant', label: 'Variant', type: 'select', options: ['cards', 'carousel', 'spotlight', 'band'] },
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
          { key: 'formId', label: 'Form (Form Builder)', type: 'form-select' },
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
          { key: 'formId', label: 'Form (Form Builder)', type: 'form-select' },
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
          { key: 'anchor', label: 'Section ID (menu scroll)', type: 'text' },
        ],
      },
      {
        title: 'Style',
        fields: [
          { key: 'variant', label: 'Variant', type: 'select', options: ['grid', 'masonry', 'strip'] },
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
      { title: 'Layout', fields: [
        { key: 'variant', label: 'Template', type: 'select', options: ['split-form', 'overlay', 'centered', 'stats'] },
      ]},
      { title: 'Content', fields: [
        { key: 'badge', label: 'Badge', type: 'text' },
        { key: 'headline', label: 'Headline', type: 'text' },
        { key: 'location', label: 'Location', type: 'text' },
        { key: 'price', label: 'Price', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'image', label: 'Cover image', type: 'image' },
          { key: 'primaryCta', label: 'Primary CTA', type: 'text' },
          { key: 'secondaryCta', label: 'Secondary CTA', type: 'text' },
          { key: 'stats', label: 'Stats (stats layout)', type: 'array-items' },
          { key: 'formId', label: 'Form (Form Builder)', type: 'form-select' },
          { key: 'popupId', label: 'Brochure popup ID', type: 'text' },
          { key: 'pdfUrl', label: 'Brochure PDF URL', type: 'text' },
          { key: 'anchor', label: 'Section ID (menu scroll)', type: 'text' },
      ]},
    ],
  },
  'project-overview': {
    sections: [{ title: 'Layout', fields: [
      { key: 'variant', label: 'Template', type: 'select', options: ['split', 'centered', 'cards', 'timeline'] },
    ]}, { title: 'Content', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'body', label: 'Body', type: 'textarea' },
      { key: 'image', label: 'Image', type: 'image' },
      { key: 'highlights', label: 'Highlights', type: 'array-items' },
      { key: 'ctaText', label: 'CTA text', type: 'text' },
      { key: 'anchor', label: 'Section ID (menu scroll)', type: 'text' },
    ]}],
  },
  'property-details': {
    sections: [{ title: 'Layout', fields: [
      { key: 'variant', label: 'Template', type: 'select', options: ['grid', 'table', 'two-column', 'checklist'] },
    ]}, { title: 'Content', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'items', label: 'Highlights', type: 'array-items' },
      { key: 'type', label: 'Type', type: 'text' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'possession', label: 'Possession', type: 'text' },
      { key: 'rera', label: 'RERA', type: 'text' },
      { key: 'anchor', label: 'Section ID (menu scroll)', type: 'text' },
    ]}],
  },
  amenities: {
    sections: [{ title: 'Layout', fields: [
      { key: 'variant', label: 'Template', type: 'select', options: ['grid', 'chips', 'icon-grid', 'featured'] },
    ]}, { title: 'Content', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'items', label: 'Amenities', type: 'array-items' },
      { key: 'anchor', label: 'Section ID (menu scroll)', type: 'text' },
    ]}],
  },
  'floor-plans': {
    sections: [
      { title: 'Layout', fields: [
        { key: 'variant', label: 'Template', type: 'select', options: ['cards', 'list', 'showcase'] },
      ]},
      { title: 'Plans', fields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'subtitle', label: 'Subtitle', type: 'text' },
        { key: 'items', label: 'Floor plans', type: 'array-items' },
        { key: 'anchor', label: 'Section ID (menu scroll)', type: 'text' },
      ]},
      { title: 'Form gate', fields: [
        { key: 'gateEnabled', label: 'Require form to unlock', type: 'toggle' },
        { key: 'formId', label: 'Unlock form (Form Builder)', type: 'form-select' },
        { key: 'popupId', label: 'Popup ID (optional)', type: 'text' },
      ]},
    ],
  },
  'unit-config': {
    sections: [{ title: 'Units', fields: [
      { key: 'variant', label: 'Template', type: 'select', options: ['cards', 'table'] },
      { key: 'items', label: 'Configurations', type: 'array-items' },
    ] }],
  },
  're-pricing': {
    sections: [{ title: 'Layout', fields: [
      { key: 'variant', label: 'Template', type: 'select', options: ['cards', 'simple', 'comparison', 'banner'] },
    ]}, { title: 'Content', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'startingPrice', label: 'Starting price', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'items', label: 'Price cards', type: 'array-items' },
      { key: 'disclaimer', label: 'Disclaimer', type: 'text' },
      { key: 'ctaText', label: 'CTA text', type: 'text' },
      { key: 'anchor', label: 'Section ID (menu scroll)', type: 'text' },
    ]}],
  },
  offers: {
    sections: [{ title: 'Offers', fields: [
      { key: 'items', label: 'Offers', type: 'array-items' },
      { key: 'anchor', label: 'Section ID (menu scroll)', type: 'text' },
    ]}],
  },
  location: {
    sections: [{ title: 'Layout', fields: [
      { key: 'variant', label: 'Template', type: 'select', options: ['split-map', 'list', 'map-only', 'cards'] },
    ]}, { title: 'Content', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'address', label: 'Address', type: 'text' },
      { key: 'embedUrl', label: 'Map embed URL', type: 'text' },
      { key: 'items', label: 'Nearby', type: 'array-items' },
      { key: 'anchor', label: 'Section ID (menu scroll)', type: 'text' },
    ]}],
  },
  'google-maps': {
    sections: [{ title: 'Map', fields: [
      { key: 'embedUrl', label: 'Embed URL', type: 'text' },
      { key: 'anchor', label: 'Section ID (menu scroll)', type: 'text' },
    ]}],
  },
  developer: {
    sections: [{ title: 'Layout', fields: [
      { key: 'variant', label: 'Template', type: 'select', options: ['default', 'split', 'stats', 'band'] },
    ]}, { title: 'Content', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'name', label: 'Developer name', type: 'text' },
      { key: 'body', label: 'About', type: 'textarea' },
      { key: 'image', label: 'Image', type: 'image' },
      { key: 'logo', label: 'Logo', type: 'image' },
      { key: 'stats', label: 'Stats', type: 'array-items' },
      { key: 'anchor', label: 'Section ID (menu scroll)', type: 'text' },
    ]}],
  },
  'lead-form': {
    sections: [{ title: 'Layout', fields: [
      { key: 'variant', label: 'Template', type: 'select', options: ['card', 'split', 'inline', 'default'] },
    ]}, { title: 'Form', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'image', label: 'Side image (split)', type: 'image' },
      { key: 'benefits', label: 'Benefits (split)', type: 'array-items' },
      { key: 'formId', label: 'Form (Form Builder)', type: 'form-select' },
      { key: 'anchor', label: 'Section ID (menu scroll)', type: 'text' },
    ]}],
  },
  'download-brochure': {
    sections: [{ title: 'Layout', fields: [
      { key: 'variant', label: 'Template', type: 'select', options: ['split', 'card', 'banner', 'minimal'] },
    ]}, { title: 'Brochure', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'buttonText', label: 'Button text', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'image', label: 'Preview image', type: 'image' },
      { key: 'pdfUrl', label: 'PDF URL', type: 'text' },
      { key: 'formId', label: 'Unlock form (Form Builder)', type: 'form-select' },
      { key: 'popupId', label: 'Popup ID (optional)', type: 'text' },
      { key: 'anchor', label: 'Section ID (menu scroll)', type: 'text' },
    ]}],
  },
  'site-visit': {
    sections: [{ title: 'Form', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'formId', label: 'Form (Form Builder)', type: 'form-select' },
      { key: 'anchor', label: 'Section ID (menu scroll)', type: 'text' },
    ]}],
  },
  contact: {
    sections: [{ title: 'Form', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'formId', label: 'Form (Form Builder)', type: 'form-select' },
      { key: 'anchor', label: 'Section ID (menu scroll)', type: 'text' },
    ]}],
  },
  newsletter: {
    sections: [{ title: 'Form', fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'formId', label: 'Form (Form Builder)', type: 'form-select' },
      { key: 'anchor', label: 'Section ID (menu scroll)', type: 'text' },
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
  const patchSite = useConfigStore((s) => s.patchSite)
  const forms = useConfigStore((s) => s.config.forms ?? [])
  const pageBlocks = useConfigStore((s) => {
    const pages = s.config.pages
    if (!pages || pages.length === 0) return s.config.blocks
    const page = pages.find((p) => p.id === s.activePageId) ?? pages[0]
    return page.blocks
  })
  const selectableForms = useMemo(() => {
    const library = typeof window !== "undefined" ? loadFormLibrary() : []
    return mergeFormLibraries(forms, library)
  }, [forms])

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

  function ensureFormOnPage(formId: string) {
    if (!formId) {
      onChange(formId)
      return
    }
    const already = forms.some((f) => f.id === formId)
    if (already) {
      onChange(formId)
      return
    }
    const fromLib = selectableForms.find((f) => f.id === formId)
    if (fromLib) {
      const copy: FormDefinition = JSON.parse(JSON.stringify(fromLib))
      patchSite({ forms: [...forms, copy] })
    }
    onChange(formId)
  }

  const sectionAnchors = (() => {
    const seen = new Set<string>()
    const out: Array<{ id: string; label: string }> = []
    for (const b of pageBlocks) {
      if (b.type === 'navbar') continue
      const props = b.props as Record<string, unknown>
      const anchor =
        (typeof props.anchor === 'string' && props.anchor) ||
        (typeof props.anchorId === 'string' && props.anchorId) ||
        ''
      const id = String(anchor || '').replace(/^#/, '').trim()
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push({ id, label: `${b.type} → #${id}` })
    }
    // Common defaults always available
    for (const id of ['overview', 'amenities', 'plans', 'gallery', 'pricing', 'location', 'brochure', 'enquire']) {
      if (seen.has(id)) continue
      seen.add(id)
      out.push({ id, label: `#${id}` })
    }
    return out
  })()

  switch (field.type) {
    case 'nav-menu': {
      // Prefer structured menuItems; migrate legacy string links on first edit.
      const rawItems = Array.isArray(value) ? value : []
      const legacyLinks = Array.isArray((block.props as { links?: unknown }).links)
        ? ((block.props as { links: unknown[] }).links)
        : []
      const items: Array<{ label: string; id: string }> =
        rawItems.length > 0
          ? rawItems.map((item) => {
              if (typeof item === 'string') {
                const label = item
                return { label, id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
              }
              const obj = item as { label?: string; id?: string; href?: string }
              const label = String(obj.label || '')
              const id = String(obj.id || obj.href || '').replace(/^#/, '')
              return { label, id }
            })
          : legacyLinks.map((item) => {
              const label = typeof item === 'string' ? item : String((item as { label?: string }).label || '')
              return {
                label,
                id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
              }
            })

      function commit(next: Array<{ label: string; id: string }>) {
        updateBlockProps(block.id, {
          menuItems: next,
          // Keep legacy string labels in sync for older templates
          links: next.map((n) => n.label),
        })
      }

      return (
        <div className="mb-2.5">
          <label className="block text-[11.5px] text-text-2 mb-1 font-medium">{field.label}</label>
          <p className="text-[10px] text-text-3 mb-2 leading-relaxed">
            Set a label and section ID. The menu scrolls to <code className="text-green">#id</code> on the page.
            Match the Section ID field on each section.
          </p>
          {items.map((item, i) => (
            <div key={i} className="bg-bg-2 border border-border-default rounded p-2 mb-1.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-3 font-medium">Item {i + 1}</span>
                <button
                  type="button"
                  onClick={() => commit(items.filter((_, idx) => idx !== i))}
                  className="text-[10px] text-text-3 hover:text-status-red transition-colors"
                >
                  Remove
                </button>
              </div>
              <div>
                <label className="block text-[10px] text-text-3 mb-0.5">Label</label>
                <input
                  type="text"
                  value={item.label}
                  placeholder="Amenities"
                  onChange={(e) => {
                    const updated = [...items]
                    updated[i] = { ...updated[i], label: e.target.value }
                    commit(updated)
                  }}
                  className="w-full px-1.5 py-1 rounded border border-border-subtle bg-bg-3 text-text-0 text-[11px] outline-none focus:border-green"
                />
              </div>
              <div>
                <label className="block text-[10px] text-text-3 mb-0.5">Section ID</label>
                <div className="flex gap-1">
                  <span className="px-1.5 py-1 text-[11px] text-text-3 bg-bg-3 border border-border-subtle rounded">#</span>
                  <input
                    type="text"
                    value={item.id}
                    placeholder="amenities"
                    list={`nav-anchors-${block.id}`}
                    onChange={(e) => {
                      const updated = [...items]
                      updated[i] = {
                        ...updated[i],
                        id: e.target.value.replace(/^#/, '').replace(/\s+/g, '-').toLowerCase(),
                      }
                      commit(updated)
                    }}
                    className="flex-1 px-1.5 py-1 rounded border border-border-subtle bg-bg-3 text-text-0 text-[11px] outline-none focus:border-green font-mono"
                  />
                </div>
              </div>
            </div>
          ))}
          <datalist id={`nav-anchors-${block.id}`}>
            {sectionAnchors.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </datalist>
          <button
            type="button"
            onClick={() => commit([...items, { label: '', id: '' }])}
            className="text-[10px] text-green hover:text-green-dim transition-colors mt-0.5"
          >
            + Add menu item
          </button>
        </div>
      )
    }

    case 'form-select':
      return (
        <div className="mb-2.5">
          <label className="block text-[11.5px] text-text-2 mb-1 font-medium">{field.label}</label>
          <select
            value={String(value || '')}
            onChange={(e) => ensureFormOnPage(e.target.value)}
            className="w-full px-2 py-1.5 rounded border border-border-default bg-bg-2 text-text-0 text-xs outline-none focus:border-green cursor-pointer"
          >
            <option value="">Default (first form)</option>
            {selectableForms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}{forms.some((p) => p.id === f.id) ? "" : " (library)"}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-text-3 mt-1">
            Selecting a library form copies it onto this page so leads save on publish/preview.
          </p>
        </div>
      )

    case 'toggle':
      return (
        <label className="mb-2.5 flex items-center justify-between gap-2 cursor-pointer">
          <span className="text-[11.5px] text-text-2 font-medium">{field.label}</span>
          <input
            type="checkbox"
            checked={value !== false}
            onChange={(e) => onChange(e.target.checked)}
            className="accent-[var(--color-green,#10b981)]"
          />
        </label>
      )

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
          team: { members: { name: '', role: '', avatar: '' } },
          features: { items: { icon: '', title: '', description: '' } },
          image: { images: { src: '', alt: '' } },
          gallery: { images: { src: '', alt: '', caption: '' } },
          'floor-plans': { items: { name: '', beds: '', area: '', price: '', image: '', downloadUrl: '' } },
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
