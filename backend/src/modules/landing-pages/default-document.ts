// Default Elementor-style builder document for a new landing page.
// Shape: { settings, header, footer, rows } where a row contains columns
// and a column contains elements. Matches the front-end builder/renderer.

export function defaultDocument(): Record<string, unknown> {
  return {
    settings: {
      pageBackground: '#ffffff',
      containerWidth: 1200,
      contentColor: '#1c1c1c',
      fonts: {
        body: 'Inter',
        heading: 'Playfair Display',
        mono: 'JetBrains Mono',
      },
      colors: {
        primary: '#1a2744',
        secondary: '#c9a227',
        accent: '#b8860b',
        text: '#1c1c1c',
        background: '#ffffff',
      },
      buttons: {
        radius: 8,
        paddingX: 28,
        paddingY: 14,
        fontWeight: 600,
      },
      sectionSpacing: 80,
    },
    header: {
      enabled: true,
      sticky: true,
      transparent: false,
      background: '#ffffff',
      textColor: '#1a2744',
      logo: { type: 'text', text: 'BigEstate', image: '' },
      menu: [
        { label: 'Overview', href: '#overview' },
        { label: 'Amenities', href: '#amenities' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'Contact', href: '#contact' },
      ],
      cta: { label: 'Book a Site Visit', href: '#contact' },
      phone: { number: '+91 98765 43210', enabled: true },
      whatsapp: {
        number: '919876543210',
        message: 'Hello, I am interested in this project.',
        enabled: true,
      },
    },
    footer: {
      enabled: true,
      background: '#0f1424',
      textColor: '#cfd6e4',
      columns: [
        {
          title: 'BigEstate',
          text: 'Premium real estate projects across India and the Gulf.',
        },
        {
          title: 'Quick Links',
          links: [
            { label: 'Home', href: '#top' },
            { label: 'Floor Plans', href: '#floor-plans' },
            { label: 'Gallery', href: '#gallery' },
            { label: 'Contact', href: '#contact' },
          ],
        },
        {
          title: 'Legal',
          links: [
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms & Conditions', href: '/terms' },
            { label: 'Disclaimer', href: '/disclaimer' },
          ],
        },
      ],
      contact: {
        phone: '+91 98765 43210',
        email: 'sales@bigestate.io',
        address: 'Bandra West, Mumbai, India',
      },
      social: [
        { platform: 'facebook', url: 'https://facebook.com' },
        { platform: 'instagram', url: 'https://instagram.com' },
        { platform: 'linkedin', url: 'https://linkedin.com' },
        { platform: 'youtube', url: 'https://youtube.com' },
      ],
      disclaimer:
        'This website is for information purposes only. Images are for representational purposes and may not be an accurate representation of the property. RERA registration number: PRM/KA/RERA/1251/446/PR/210624/004062.',
      copyright: '© 2026 BigEstate. All rights reserved.',
    },
    rows: [
      {
        id: 'row-hero',
        type: 'hero',
        settings: {
          layout: 'full_width',
          contentWidth: 'boxed',
          background: {
            color: '#1a2744',
            image: '',
            gradient:
              'linear-gradient(135deg, #0f1424 0%, #1a2744 55%, #3b2f80 100%)',
            overlayColor: 'rgba(10, 14, 26, 0.45)',
            position: 'center',
            size: 'cover',
          },
          padding: { top: 140, right: 20, bottom: 140, left: 20 },
          align: 'left',
          minHeight: 520,
        },
        columns: [
          {
            id: 'col-hero-1',
            settings: { verticalAlign: 'middle' },
            elements: [
              {
                id: 'el-hero-kicker',
                type: 'text',
                settings: {
                  text: 'PREMIUM RESIDENTIAL LUXURY',
                  color: '#c9a227',
                  size: 13,
                  weight: 700,
                  letterSpacing: 3,
                  align: 'left',
                },
              },
              {
                id: 'el-hero-title',
                type: 'heading',
                settings: {
                  text: 'Luxury 3 & 4 BHK Apartments\nin Whitefield, Bengaluru',
                  tag: 'h1',
                  size: 52,
                  weight: 700,
                  color: '#ffffff',
                  lineHeight: 1.15,
                  align: 'left',
                },
              },
              {
                id: 'el-hero-subtitle',
                type: 'text',
                settings: {
                  text: 'Spacious homes surrounded by 2 acres of landscaped gardens, clubhouse and world-class amenities. Starting at ₹1.25 Cr*.',
                  color: '#d7dcea',
                  size: 18,
                  align: 'left',
                  marginBottom: 32,
                },
              },
              {
                id: 'el-hero-cta-row',
                type: 'row',
                settings: { align: 'left', gap: 16 },
                elements: [
                  {
                    id: 'el-hero-cta-1',
                    type: 'button',
                    settings: {
                      text: 'Book a Site Visit',
                      link: '#contact',
                      style: 'solid',
                      bgColor: '#c9a227',
                      textColor: '#ffffff',
                      radius: 8,
                      size: 'md',
                    },
                  },
                  {
                    id: 'el-hero-cta-2',
                    type: 'whatsapp',
                    settings: {
                      number: '919876543210',
                      message:
                        'Hello, I am interested in the Whitefield project.',
                      text: 'Chat on WhatsApp',
                      size: 'md',
                      style: 'outline',
                    },
                  },
                ],
              },
              {
                id: 'el-hero-trust',
                type: 'text',
                settings: {
                  text: 'RERA Registered · 2,400+ happy families · Possession 2027',
                  color: '#9aa3bd',
                  size: 13,
                  align: 'left',
                  marginTop: 24,
                },
              },
            ],
          },
        ],
      },
      {
        id: 'row-overview',
        type: 'section',
        settings: {
          layout: 'full_width',
          contentWidth: 'boxed',
          padding: { top: 90, right: 20, bottom: 90, left: 20 },
          background: { color: '#ffffff' },
        },
        columns: [
          {
            id: 'col-overview-1',
            settings: { width: 50, verticalAlign: 'middle' },
            elements: [
              {
                id: 'el-overview-img',
                type: 'image',
                settings: {
                  src: '',
                  alt: 'Project overview',
                  width: 100,
                  radius: 16,
                },
              },
            ],
          },
          {
            id: 'col-overview-2',
            settings: {
              width: 50,
              verticalAlign: 'middle',
              padding: { left: 48 },
            },
            elements: [
              {
                id: 'el-overview-kicker',
                type: 'text',
                settings: {
                  text: 'PROJECT OVERVIEW',
                  color: '#b8860b',
                  size: 13,
                  weight: 700,
                  letterSpacing: 3,
                },
              },
              {
                id: 'el-overview-title',
                type: 'heading',
                settings: {
                  text: 'A 6-acre address for a better way of living',
                  tag: 'h2',
                  size: 36,
                  weight: 700,
                  color: '#1a2744',
                },
              },
              {
                id: 'el-overview-text',
                type: 'text',
                settings: {
                  text: 'Nestled in the heart of Whitefield, this residential enclave offers 2 & 3 BHK homes designed for modern families. Enjoy seamless connectivity, landscaped open spaces and a host of wellness amenities.',
                  size: 16,
                  color: '#5b6478',
                },
              },
            ],
          },
        ],
      },
      {
        id: 'row-features',
        type: 'section',
        settings: {
          layout: 'full_width',
          contentWidth: 'boxed',
          padding: { top: 90, right: 20, bottom: 90, left: 20 },
          background: { color: '#f6f8fb' },
        },
        columns: [
          {
            id: 'col-features',
            settings: { width: 100 },
            elements: [
              {
                id: 'el-features-title',
                type: 'heading',
                settings: {
                  text: 'Key Features',
                  tag: 'h2',
                  size: 36,
                  weight: 700,
                  color: '#1a2744',
                  align: 'center',
                  marginBottom: 48,
                },
              },
              {
                id: 'el-features-grid',
                type: 'grid',
                settings: { columns: 4, gap: 24 },
                elements: [
                  {
                    id: 'el-feature-1',
                    type: 'icon-box',
                    settings: {
                      icon: '🏊',
                      title: 'Infinity Pool',
                      description:
                        'Temperature-controlled lap pool with cabanas.',
                    },
                  },
                  {
                    id: 'el-feature-2',
                    type: 'icon-box',
                    settings: {
                      icon: '🌳',
                      title: '2 Acre Gardens',
                      description:
                        "Landscaped parks, jogging track and kids' play area.",
                    },
                  },
                  {
                    id: 'el-feature-3',
                    type: 'icon-box',
                    settings: {
                      icon: '🏋️',
                      title: 'Fitness Centre',
                      description:
                        'Fully equipped gym, yoga deck and sports court.',
                    },
                  },
                  {
                    id: 'el-feature-4',
                    type: 'icon-box',
                    settings: {
                      icon: '🛡️',
                      title: '24×7 Security',
                      description: 'Gated community with CCTV and concierge.',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'row-pricing',
        type: 'section',
        settings: {
          layout: 'full_width',
          contentWidth: 'boxed',
          padding: { top: 90, right: 20, bottom: 90, left: 20 },
          background: { color: '#ffffff' },
        },
        columns: [
          {
            id: 'col-pricing',
            settings: { width: 100 },
            elements: [
              {
                id: 'el-pricing-title',
                type: 'heading',
                settings: {
                  text: 'Pricing & Payment Plans',
                  tag: 'h2',
                  size: 36,
                  weight: 700,
                  color: '#1a2744',
                  align: 'center',
                  marginBottom: 48,
                },
              },
              {
                id: 'el-pricing-plans',
                type: 'grid',
                settings: { columns: 3, gap: 24 },
                elements: [
                  {
                    id: 'el-plan-1',
                    type: 'pricing',
                    settings: {
                      name: '2 BHK',
                      price: '₹1.25 Cr',
                      area: '1,150 sq.ft',
                      features: [
                        'East facing',
                        '2 parking slots',
                        'Clubhouse access',
                      ],
                      highlighted: false,
                      cta: 'Enquire Now',
                    },
                  },
                  {
                    id: 'el-plan-2',
                    type: 'pricing',
                    settings: {
                      name: '3 BHK',
                      price: '₹1.85 Cr',
                      area: '1,650 sq.ft',
                      features: [
                        'Corner unit',
                        '3 parking slots',
                        'Clubhouse access',
                        'Rooftop deck',
                      ],
                      highlighted: true,
                      cta: 'Book a Site Visit',
                    },
                  },
                  {
                    id: 'el-plan-3',
                    type: 'pricing',
                    settings: {
                      name: '4 BHK',
                      price: '₹2.65 Cr',
                      area: '2,400 sq.ft',
                      features: [
                        'Private garden',
                        '4 parking slots',
                        'Concierge',
                      ],
                      highlighted: false,
                      cta: 'Enquire Now',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'row-lead-form',
        type: 'section',
        settings: {
          layout: 'full_width',
          contentWidth: 'boxed',
          padding: { top: 90, right: 20, bottom: 90, left: 20 },
          background: {
            color: '#1a2744',
            gradient: 'linear-gradient(135deg, #0f1424 0%, #1a2744 100%)',
          },
        },
        columns: [
          {
            id: 'col-lead-1',
            settings: { width: 50, verticalAlign: 'middle' },
            elements: [
              {
                id: 'el-lead-title',
                type: 'heading',
                settings: {
                  text: 'Book Your Site Visit Today',
                  tag: 'h2',
                  size: 38,
                  weight: 700,
                  color: '#ffffff',
                },
              },
              {
                id: 'el-lead-text',
                type: 'text',
                settings: {
                  text: 'Get exclusive offers, detailed brochures and a guided tour of the property. Our sales team responds within 30 minutes.',
                  color: '#d7dcea',
                  size: 17,
                },
              },
              {
                id: 'el-lead-phone',
                type: 'call',
                settings: {
                  number: '+91 98765 43210',
                  text: 'Call Now',
                  size: 'md',
                },
              },
            ],
          },
          {
            id: 'col-lead-2',
            settings: { width: 50, verticalAlign: 'middle' },
            elements: [
              {
                id: 'el-lead-form',
                type: 'lead-form',
                settings: {
                  title: 'Get a Free Brochure',
                  subtitle: 'Fill in your details and our team will reach out.',
                  buttonText: 'Request Brochure',
                  successMessage:
                    'Thank you! Our team will contact you shortly.',
                  fields: [
                    'name',
                    'phone',
                    'email',
                    'city',
                    'budget',
                    'propertyType',
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  };
}
