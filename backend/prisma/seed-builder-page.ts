import type { Prisma } from '@prisma/client';

type SectionStyle = {
  colors: Record<string, string>;
  typography: Record<string, unknown>;
  spacing: {
    padding: { top: number; right: number; bottom: number; left: number };
    margin: { top: number; right: number; bottom: number; left: number };
    gap: number;
  };
  layout: Record<string, unknown>;
  responsive: Record<string, unknown>;
};

function defaultStyle(over?: Partial<SectionStyle>): SectionStyle {
  return {
    colors: { bg: 'transparent', overlay: '', gradient: '', text: '', ...(over?.colors ?? {}) },
    typography: over?.typography ?? {},
    spacing: over?.spacing ?? {
      padding: { top: 80, right: 24, bottom: 80, left: 24 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      gap: 24,
    },
    layout: {
      width: 'full',
      height: 'auto',
      align: 'center',
      direction: 'row',
      wrap: true,
      justify: 'center',
      alignItems: 'center',
      ...(over?.layout ?? {}),
    },
    responsive: over?.responsive ?? {},
  };
}

function sec(
  id: string,
  type: string,
  label: string,
  icon: string,
  settings: Record<string, unknown>,
  style?: Partial<SectionStyle>,
) {
  return { id, type, label, icon, settings, style: defaultStyle(style) };
}

/** Platform template content — tokens only; bind fills them from the project. */
export function builderTemplateContent(): {
  sections: unknown[];
  config: Record<string, unknown>;
} {
  const sections = [
    sec(
      'sec-hero',
      'hero',
      'Hero Banner',
      'LayoutPanelTop',
      {
        design: 'split-form',
        eyebrow: '{{rera_number}}',
        heading: '{{property_name}}',
        subheading: '{{description}}',
        price: '{{starting_price}}',
        priceLabel: 'STARTING FROM',
        priceNote: '{{possession_date}}',
        heroArt: 'hero',
        accent: '#cda45e',
        primaryAction: 'link',
        primaryLink: '#lead-form',
        ctaPrimary: 'Book Site Visit',
        secondaryAction: 'brochure',
        ctaSecondary: 'Download Brochure',
        highlights: ['{{location}}', '{{land_area}}', '{{towers}} towers'],
        heroStats: [
          { value: '{{land_area}}', label: 'Land' },
          { value: '{{towers}}', label: 'Towers' },
          { value: '{{carpet_area}}', label: 'Carpet' },
          { value: '{{possession_date}}', label: 'Possession' },
        ],
        formTitle: 'Book a site visit',
        formSubtitle: 'Share your details and our team will call you back.',
        formButton: 'Book Site Visit',
      },
      {
        colors: { bg: '#090d16', overlay: 'rgba(10,13,28,0.52)', text: '#ffffff' },
        layout: {
          width: 'full',
          height: 'vh',
          fixedHeight: 760,
          align: 'center',
          direction: 'column',
          justify: 'center',
          alignItems: 'center',
        },
        spacing: {
          padding: { top: 120, right: 24, bottom: 80, left: 24 },
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
          gap: 16,
        },
      },
    ),
    sec(
      'sec-overview',
      'overview',
      'Property Overview',
      'Building2',
      {
        design: 'classic',
        eyebrow: 'About the project',
        heading: '{{property_name}}',
        text: '{{description}}',
        bullets: ['{{location}}', '{{rera_number}}', '{{possession_date}}'],
        stats: [
          { value: '{{land_area}}', label: 'Campus' },
          { value: '{{towers}}', label: 'Towers' },
          { value: '{{units}}', label: 'Units' },
        ],
        image: 'overview',
      },
      { colors: { bg: '#ffffff', text: '#111827' }, layout: { width: 'boxed', height: 'auto', align: 'center' } },
    ),
    sec(
      'sec-details',
      'property-details',
      'Property Details',
      'Gauge',
      {
        design: 'grid',
        items: [
          { label: 'RERA', value: '{{rera_number}}' },
          { label: 'Possession', value: '{{possession_date}}' },
          { label: 'Carpet area', value: '{{carpet_area}}' },
          { label: 'Location', value: '{{location}}' },
        ],
      },
      { colors: { bg: '#f8fafc', text: '#111827' } },
    ),
    sec(
      'sec-amenities',
      'amenities',
      'Amenities',
      'Dumbbell',
      {
        design: 'grid',
        eyebrow: 'Lifestyle',
        heading: 'Amenities',
        items: [],
      },
    ),
    sec(
      'sec-features',
      'features',
      'Property Features',
      'BadgeCheck',
      {
        design: 'checklist',
        heading: 'Nearby & connectivity',
        items: [],
      },
    ),
    sec(
      'sec-location',
      'location-advantages',
      'Location & Map',
      'Navigation',
      {
        design: 'split',
        address: '',
        zoom: 14,
        eyebrow: 'Connectivity',
        heading: 'Location',
        text: '{{location}}',
        items: [],
      },
    ),
    sec(
      'sec-builder',
      'builder-profile',
      'Builder Profile',
      'Building2',
      {
        design: 'card',
        heading: 'About the builder',
        name: '{{builder_name}}',
        text: '{{tagline}}',
      },
    ),
    sec(
      'sec-project',
      'project',
      'Project',
      'Building2',
      {
        selectedProjectId: null,
        layout: 'grid',
        columns: 1,
        cardStyle: 'classic',
        design: 'grid',
        showFilters: false,
        enquiryFormHeading: 'Enquire about this project',
        enquiryFormText: 'Share your details and our team will get back to you.',
        enquiryButtonLabel: 'Submit enquiry',
      },
    ),
    sec(
      'sec-faq',
      'faq',
      'FAQ',
      'Tabs',
      {
        design: 'accordion',
        eyebrow: 'Help',
        heading: 'Frequently asked questions',
        items: [
          { q: 'Is the project RERA registered?', a: '{{rera_number}}' },
          { q: 'When is possession?', a: '{{possession_date}}' },
          { q: 'What is the starting price?', a: '{{starting_price}}' },
        ],
      },
    ),
    sec(
      'lead-form',
      'lead-form',
      'Form',
      'Send',
      { fields: ['name', 'phone'] },
      { colors: { bg: '#ffffff', text: '#111827' } },
    ),
  ];

  return {
    sections,
    config: {
      page: { language: 'en', password: '', favicon: '/favicon.ico' },
      seo: {
        metaTitle: '{{property_name}}',
        metaDescription: '{{description}}',
        keywords: 'real estate',
        canonical: '',
        index: true,
        sitemap: true,
        ogTitle: '{{property_name}}',
        ogDescription: '{{description}}',
        ogImage: '',
      },
      brand: {
        name: '{{property_name}}',
        tagline: '{{description}}',
        email: '',
        phone: '',
        primary: '#6D5DFC',
        accent: '#CDA45E',
        headingFont: 'Playfair Display',
        bodyFont: 'Inter',
        logo: '',
        facebook: '',
        instagram: '',
        twitter: '',
        youtube: '',
        linkedin: '',
        accentButtons: true,
      },
      header: {
        sticky: true,
        transparent: false,
        showTopbar: false,
        variant: 'light',
        cta: 'Book a Site Visit',
        ctaLink: '#lead-form',
        menu: ['Overview', 'Amenities', 'Location', 'Contact'],
        menuLinks: [
          { label: 'Overview', href: '#sec-overview' },
          { label: 'Amenities', href: '#sec-amenities' },
          { label: 'Location', href: '#sec-location' },
          { label: 'Contact', href: '#lead-form' },
        ],
      },
      footer: { rera: '{{rera_number}}', copyright: '' },
      form: {
        name: 'Project enquiry',
        description: 'Leads from the project landing page.',
        submitLabel: 'Submit',
        multiStep: false,
        saveToCrm: true,
        sendEmail: false,
        sendWhatsapp: false,
        successAction: 'message',
        successTitle: 'Thanks — our team will call you shortly.',
        errorMessage: 'Please fill in the required fields.',
        fields: [
          { id: 'f1', type: 'text', label: 'Full name', placeholder: 'Your name', required: true },
          { id: 'f2', type: 'phone', label: 'Phone number', placeholder: 'Phone', required: true },
          { id: 'f3', type: 'email', label: 'Email address', placeholder: 'you@email.com', required: false },
          {
            id: 'f4',
            type: 'select',
            label: 'Interested in',
            placeholder: 'Choose a configuration',
            required: false,
            options: [],
          },
        ],
      },
    },
  };
}

export function asTemplateJson(content: {
  sections: unknown;
  config: Record<string, unknown>;
}): Prisma.InputJsonValue {
  return content as Prisma.InputJsonValue;
}
