import type { SectionInstance, SectionStyle, SiteConfig } from "./prestate/types";
import { defaultSiteConfig } from "./prestate/site-config";
import { buildTemplateSections } from "./prestate/page-templates";

export interface ProjectTemplateDefaultData {
  name: string;
  tagline: string;
  projectType: string;
  selectedConfigs: string[];
  towerCount: string;
  floorsDescription: string;
  landArea: string;
  carpetRange: string;
  highlights: string;
  priceMin: string;
  priceMax: string;
  baseRate: string;
  bookingAmount: string;
  priceIncludes: string[];
  paymentPlan: string;
  offers: string;
  amenities: string[];
  unitTypes: {
    key: number;
    name: string;
    carpetSqft: string;
    builtupSqft: string;
    price: string;
    totalUnits: string;
  }[];
  flooring: string;
  kitchen: string;
  doorsWindows: string;
  fittings: string;
  specNotes: string;
  coverImageUrl: string;
  galleryUrls: string[];
}

export interface ProjectTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  accent: string;
  thumbnail: string;
  badge?: string;
  defaultData: ProjectTemplateDefaultData;
}

export const PREDEFINED_PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "tpl-estatepro-luxury",
    name: "EstatePro Luxury Residences",
    category: "Luxury Apartments",
    description: "Prestige residential towers with panoramic skyline views, 25+ resort amenities, expansive balconies, and VIP booking form.",
    accent: "#6D5DFC",
    thumbnail: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
    badge: "Most Popular",
    defaultData: {
      name: "Emerald Sky Residences",
      tagline: "Ultra-Luxury 3 & 4 BHK Sky Residences with Panoramic Views",
      projectType: "Apartments",
      selectedConfigs: ["3 BHK", "4 BHK"],
      towerCount: "3",
      floorsDescription: "G+28 Floors",
      landArea: "4.5",
      carpetRange: "1,450 – 2,650",
      highlights: "Panoramic River & Skyline Views\nPrivate Elevators & Dual-Height Reception Lobby\n25+ Five-Star Resort Club Amenities\n80% Open Lush Landscaped Greens",
      priceMin: "12500000",
      priceMax: "28500000",
      baseRate: "7500",
      bookingAmount: "200000",
      priceIncludes: ["Floor rise", "1 covered parking", "Club membership"],
      paymentPlan: "Construction-linked",
      offers: "Inaugural Launch Benefit: Zero Floor Rise Charges & Modular Italian Kitchen",
      amenities: ["Swimming Pool", "Clubhouse", "Gymnasium", "Landscaped Gardens", "Kids Play Area", "24x7 Security", "Jogging Track", "Power Backup", "EV Charging Station"],
      unitTypes: [
        { key: 1, name: "3 BHK Premium", carpetSqft: "1450", builtupSqft: "1850", price: "12500000", totalUnits: "80" },
        { key: 2, name: "3 BHK Luxury", carpetSqft: "1850", builtupSqft: "2250", price: "17500000", totalUnits: "60" },
        { key: 3, name: "4 BHK Signature", carpetSqft: "2650", builtupSqft: "3250", price: "28500000", totalUnits: "30" },
      ],
      flooring: "Italian marble in living & dining, engineered wooden flooring in master suites",
      kitchen: "Modular German fittings with quartz countertop and piped gas connection",
      doorsWindows: "8-ft grand teakwood main door, acoustic double-glazed UPVC sliding French windows",
      fittings: "Kohler / Grohe premium sanitaryware and concealed thermostatic diverters",
      specNotes: "IGBC Gold Certified green building, seismic zone-III compliant RCC shear-wall structure",
      coverImageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=80",
      galleryUrls: [
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80",
      ],
    },
  },
  {
    id: "tpl-skyline-modern",
    name: "Skyline Modern High-Rise",
    category: "Urban Residential",
    description: "High-density contemporary apartments engineered for modern urban professionals and young families with smart home tech.",
    accent: "#2563eb",
    thumbnail: "https://images.unsplash.com/photo-1515263487990-61b07816b324?auto=format&fit=crop&w=1200&q=80",
    badge: "Smart Living",
    defaultData: {
      name: "Skyline Central Towers",
      tagline: "Smart 2 & 3 BHK Urban Residences next to Metro Station",
      projectType: "Apartments",
      selectedConfigs: ["2 BHK", "3 BHK"],
      towerCount: "4",
      floorsDescription: "G+22 Floors",
      landArea: "3.2",
      carpetRange: "780 – 1,350",
      highlights: "200m from Upcoming Metro Station\nSmart App-Controlled Home Automation\nCo-Working Lounge & High-Speed WiFi Commons\nZero Maintenance Charges for Year 1",
      priceMin: "6200000",
      priceMax: "11500000",
      baseRate: "5800",
      bookingAmount: "100000",
      priceIncludes: ["Floor rise", "1 covered parking"],
      paymentPlan: "Flexi (20:80)",
      offers: "Pre-Launch Offer: Save up to ₹3,50,000 on early bird token bookings",
      amenities: ["Clubhouse", "Gymnasium", "Swimming Pool", "Co-Working Space", "Indoor Games", "Kids Play Area", "24x7 Security", "EV Charging Station"],
      unitTypes: [
        { key: 1, name: "2 BHK Smart", carpetSqft: "780", builtupSqft: "1020", price: "6200000", totalUnits: "110" },
        { key: 2, name: "2 BHK Large", carpetSqft: "920", builtupSqft: "1210", price: "7400000", totalUnits: "90" },
        { key: 3, name: "3 BHK Executive", carpetSqft: "1350", builtupSqft: "1720", price: "11500000", totalUnits: "60" },
      ],
      flooring: "Vitrified tiles (800x800mm) across all living areas",
      kitchen: "Granite platform with stainless steel double bowl sink",
      doorsWindows: "Powder coated aluminum sliding windows with mosquito mesh",
      fittings: "Jaguar / Cera brass chrome-plated fixtures",
      specNotes: "Earthquake resistant structure with rainwater harvesting and solar lighting in common areas",
      coverImageUrl: "https://images.unsplash.com/photo-1515263487990-61b07816b324?auto=format&fit=crop&w=1600&q=80",
      galleryUrls: [
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
      ],
    },
  },
  {
    id: "tpl-green-acres",
    name: "Green Acres Eco Villas & Plots",
    category: "Villas & Plotted",
    description: "Expansive gated community featuring nature-crafted private villas and premium residential plots surrounded by serene greenery.",
    accent: "#059669",
    thumbnail: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80",
    badge: "Eco Luxury",
    defaultData: {
      name: "Green Acres Serenity Estates",
      tagline: "Signature 3 & 4 BHK Private Garden Villas & Premium Villa Plots",
      projectType: "Villas",
      selectedConfigs: ["3 BHK", "4 BHK", "Villa", "Plot"],
      towerCount: "1",
      floorsDescription: "G+1 Independent Villas",
      landArea: "18.5",
      carpetRange: "2,200 – 4,500",
      highlights: "100% Vastu-Compliant East-Facing Villa Plots\nPrivate Garden & Terrace Deck for Every Home\nOrganic Fruit Orchards & Nature Walking Trails\nGrand 20,000 sqft Country Club with Tennis & Squash",
      priceMin: "16000000",
      priceMax: "38000000",
      baseRate: "4200",
      bookingAmount: "250000",
      priceIncludes: ["Club membership", "Boundary wall", "Electricity & water line setup"],
      paymentPlan: "Down payment",
      offers: "Complimentary Private Splash Pool on 4 BHK Villa bookings this month",
      amenities: ["Clubhouse", "Tennis Court", "Swimming Pool", "Landscaped Gardens", "Jogging Track", "Organic Farm", "Kids Play Area", "24x7 Security"],
      unitTypes: [
        { key: 1, name: "Standard Villa Plot", carpetSqft: "1800", builtupSqft: "1800", price: "9000000", totalUnits: "45" },
        { key: 2, name: "3 BHK Garden Villa", carpetSqft: "2200", builtupSqft: "2850", price: "16000000", totalUnits: "35" },
        { key: 3, name: "4 BHK Grand Villa", carpetSqft: "3400", builtupSqft: "4200", price: "27500000", totalUnits: "20" },
      ],
      flooring: "Hardwood oak finish in bedrooms, rustic matte porcelain in verandas",
      kitchen: "Open American kitchen layout with island breakfast counter",
      doorsWindows: "Solid Burma teakwood entrance door with smart biometric lock",
      fittings: "TOTO sanitary fittings and freestanding soaking bathtubs",
      specNotes: "Eco-conscious construction with independent rooftop solar panels and greywater recycling",
      coverImageUrl: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=80",
      galleryUrls: [
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
      ],
    },
  },
  {
    id: "tpl-commercial-apex",
    name: "Commercial Apex Business Hub",
    category: "Commercial & Office",
    description: "Grade-A futuristic business towers featuring enterprise IT offices, executive boardrooms, retail promenade, and grand atrium.",
    accent: "#0891b2",
    thumbnail: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
    badge: "Commercial Grade-A",
    defaultData: {
      name: "Apex One Business District",
      tagline: "Grade-A Corporate Offices & High-Street Retail Spaces on Prime Express Corridor",
      projectType: "Commercial",
      selectedConfigs: ["Commercial", "Office", "Shop", "Retail"],
      towerCount: "2",
      floorsDescription: "2B+G+18 Floors",
      landArea: "6.0",
      carpetRange: "650 – 12,000",
      highlights: "LEED Platinum Pre-Certified Green Commercial Tower\nHigh-Speed Destination-Controlled Elevators\nGrand 4-Story Atrium with High-Street Retail & Food Court\nFlexible Warm Shell & Bare Shell Floor Plates",
      priceMin: "8000000",
      priceMax: "65000000",
      baseRate: "8500",
      bookingAmount: "300000",
      priceIncludes: ["Power backup", "Covered parking slot", "HVAC ducting"],
      paymentPlan: "Subvention",
      offers: "Assured 9% Rental Return with 3-Year Corporate Lease Guarantee",
      amenities: ["Power Backup", "EV Charging Station", "24x7 Security", "Co-Working Space", "Conference Rooms", "Food Court"],
      unitTypes: [
        { key: 1, name: "High-Street Retail Shop", carpetSqft: "650", builtupSqft: "950", price: "8000000", totalUnits: "30" },
        { key: 2, name: "Boutique Corporate Office", carpetSqft: "1250", builtupSqft: "1800", price: "14500000", totalUnits: "40" },
        { key: 3, name: "Full Floor Plate Office", carpetSqft: "6800", builtupSqft: "9500", price: "65000000", totalUnits: "10" },
      ],
      flooring: "Bare shell / raised flooring ready for tenant fitouts",
      kitchen: "Dedicated pantry provision with water inlet & drainage on every floor",
      doorsWindows: "Energy efficient double glazed low-E glass facade",
      fittings: "Centralized VRV / VRF HVAC air conditioning system",
      specNotes: "BMS (Building Management System) controlled security, automated boom barriers and RFID parking",
      coverImageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80",
      galleryUrls: [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
      ],
    },
  },
];

export interface ProjectCustomizationValues {
  name: string;
  tagline?: string;
  projectType?: string;
  reraId?: string;
  priceMin?: string;
  priceMax?: string;
  currency?: string;
  address?: string;
  city?: string;
  locality?: string;
  amenities?: string[];
  highlights?: string;
  coverImageUrl?: string | null;
  galleryUrls?: string[];
  unitTypes?: { name: string; carpetSqft: string; builtupSqft: string; price: string }[];
}

function formatPriceDisplay(amountStr?: string, currency = "INR"): string {
  if (!amountStr) return "";
  const n = Number(amountStr.replace(/,/g, ""));
  if (!n || isNaN(n)) return amountStr;
  if (currency === "INR") {
    if (n >= 10000000) return `₹ ${(n / 10000000).toFixed(2).replace(/\.00$/, "")} Cr*`;
    if (n >= 100000) return `₹ ${(n / 100000).toFixed(2).replace(/\.00$/, "")} Lakh*`;
    return `₹ ${n.toLocaleString("en-IN")}*`;
  }
  return `${currency} ${n.toLocaleString()}*`;
}

/**
 * Builds the complete section tree for a new Project Landing Page,
 * dynamically injecting the project's actual data into the template sections.
 */
export function buildCustomizedProjectSections(
  templateId: string,
  values: ProjectCustomizationValues,
): SectionInstance[] {
  // Start from standard template sections
  const baseSections = buildTemplateSections(templateId);
  const priceDisplay = formatPriceDisplay(values.priceMin, values.currency);
  const locationDisplay = [values.locality, values.city].filter(Boolean).join(", ") || values.address || "Prime Location";

  return baseSections.map((sec) => {
    const s = { ...sec, settings: { ...sec.settings } };

    if (s.type === "hero") {
      s.settings.heading = values.name || s.settings.heading;
      if (values.tagline) s.settings.subheading = values.tagline;
      if (values.reraId) s.settings.eyebrow = `RERA NO. ${values.reraId} • ${locationDisplay.toUpperCase()}`;
      else if (locationDisplay) s.settings.eyebrow = `PREMIUM DEVELOPMENT • ${locationDisplay.toUpperCase()}`;
      if (priceDisplay) s.settings.price = priceDisplay;
      if (values.coverImageUrl) {
        s.settings.heroImage = values.coverImageUrl;
        s.settings.bgImage = values.coverImageUrl;
      }
    } else if (s.type === "overview") {
      s.settings.heading = `Welcome to ${values.name || "Our Residences"}`;
      if (values.tagline) {
        s.settings.text = `${values.tagline}. Located in ${locationDisplay}, offering thoughtfully crafted spaces with modern luxury and lifestyle conveniences.`;
      }
      if (values.coverImageUrl) s.settings.image = values.coverImageUrl;
    } else if (s.type === "amenities" && values.amenities && values.amenities.length > 0) {
      s.settings.items = values.amenities.slice(0, 12).map((a) => ({
        icon: "CheckCircle",
        title: a,
        desc: `Modern ${a.toLowerCase()} thoughtfully designed for resident wellness and relaxation.`,
      }));
    } else if (s.type === "gallery" && values.galleryUrls && values.galleryUrls.length > 0) {
      s.settings.images = values.galleryUrls;
    } else if (s.type === "pricing" && values.unitTypes && values.unitTypes.length > 0) {
      s.settings.plans = values.unitTypes.map((u, i) => ({
        name: u.name,
        area: u.carpetSqft ? `${u.carpetSqft} sq.ft.` : `${u.builtupSqft || 1200} sq.ft.`,
        price: formatPriceDisplay(u.price, values.currency) || "Contact for Price",
        features: [
          u.carpetSqft ? `${u.carpetSqft} sq.ft. Carpet` : "Spacious Layout",
          u.builtupSqft ? `${u.builtupSqft} sq.ft. Super` : "Premium Finishes",
          "Vastu Compliant",
          "Balcony View",
        ],
        cta: "Express Interest",
        featured: i === 1,
      }));
    } else if (s.type === "floorplans" && values.unitTypes && values.unitTypes.length > 0) {
      s.settings.plans = values.unitTypes.map((u) => ({
        name: u.name,
        beds: u.name.split(" ")[0] || "2",
        area: u.carpetSqft ? `${u.carpetSqft} sq.ft.` : `${u.builtupSqft || 1200} sq.ft.`,
        price: formatPriceDisplay(u.price, values.currency) || "Price On Request",
      }));
    } else if (s.type === "location-advantages") {
      if (values.address) s.settings.address = values.address;
      s.settings.heading = `Prime Connectivity in ${values.city || "the City"}`;
    }

    return s;
  });
}
