// Country → currency + timezone lookup, shared between the registration form
// and any admin screen that needs the same option lists (e.g. platform
// settings). Single source of truth so the two never drift.

export interface CountryMeta {
  currency: string; // ISO 4217 code
  currencyLabel: string; // e.g. "INR — Indian Rupee (₹)"
  timezone: string; // IANA tz id
}

export const COUNTRY_META: Record<string, CountryMeta> = {
  India: { currency: "INR", currencyLabel: "INR — Indian Rupee (₹)", timezone: "Asia/Kolkata" },
  "United Arab Emirates": { currency: "AED", currencyLabel: "AED — UAE Dirham (د.إ)", timezone: "Asia/Dubai" },
  "United States": { currency: "USD", currencyLabel: "USD — US Dollar ($)", timezone: "America/New_York" },
  "United Kingdom": { currency: "GBP", currencyLabel: "GBP — British Pound (£)", timezone: "Europe/London" },
  Australia: { currency: "AUD", currencyLabel: "AUD — Australian Dollar (A$)", timezone: "Australia/Sydney" },
  Canada: { currency: "CAD", currencyLabel: "CAD — Canadian Dollar (C$)", timezone: "America/Toronto" },
  Singapore: { currency: "SGD", currencyLabel: "SGD — Singapore Dollar (S$)", timezone: "Asia/Singapore" },
  "Saudi Arabia": { currency: "SAR", currencyLabel: "SAR — Saudi Riyal (﷼)", timezone: "Asia/Riyadh" },
  Qatar: { currency: "QAR", currencyLabel: "QAR — Qatari Riyal (﷼)", timezone: "Asia/Qatar" },
  Kuwait: { currency: "KWD", currencyLabel: "KWD — Kuwaiti Dinar (KD)", timezone: "Asia/Kuwait" },
  Bahrain: { currency: "BHD", currencyLabel: "BHD — Bahraini Dinar (BD)", timezone: "Asia/Bahrain" },
  Oman: { currency: "OMR", currencyLabel: "OMR — Omani Rial (﷼)", timezone: "Asia/Muscat" },
  Malaysia: { currency: "MYR", currencyLabel: "MYR — Malaysian Ringgit (RM)", timezone: "Asia/Kuala_Lumpur" },
  Germany: { currency: "EUR", currencyLabel: "EUR — Euro (€)", timezone: "Europe/Berlin" },
  France: { currency: "EUR", currencyLabel: "EUR — Euro (€)", timezone: "Europe/Paris" },
  Netherlands: { currency: "EUR", currencyLabel: "EUR — Euro (€)", timezone: "Europe/Amsterdam" },
  Spain: { currency: "EUR", currencyLabel: "EUR — Euro (€)", timezone: "Europe/Madrid" },
  Italy: { currency: "EUR", currencyLabel: "EUR — Euro (€)", timezone: "Europe/Rome" },
  Portugal: { currency: "EUR", currencyLabel: "EUR — Euro (€)", timezone: "Europe/Lisbon" },
  Switzerland: { currency: "CHF", currencyLabel: "CHF — Swiss Franc (Fr)", timezone: "Europe/Zurich" },
  "South Africa": { currency: "ZAR", currencyLabel: "ZAR — South African Rand (R)", timezone: "Africa/Johannesburg" },
  Nigeria: { currency: "NGN", currencyLabel: "NGN — Nigerian Naira (₦)", timezone: "Africa/Lagos" },
  Kenya: { currency: "KES", currencyLabel: "KES — Kenyan Shilling (KSh)", timezone: "Africa/Nairobi" },
  Egypt: { currency: "EGP", currencyLabel: "EGP — Egyptian Pound (£)", timezone: "Africa/Cairo" },
  Bangladesh: { currency: "BDT", currencyLabel: "BDT — Bangladeshi Taka (৳)", timezone: "Asia/Dhaka" },
  Pakistan: { currency: "PKR", currencyLabel: "PKR — Pakistani Rupee (₨)", timezone: "Asia/Karachi" },
  "Sri Lanka": { currency: "LKR", currencyLabel: "LKR — Sri Lankan Rupee (₨)", timezone: "Asia/Colombo" },
  Nepal: { currency: "NPR", currencyLabel: "NPR — Nepalese Rupee (₨)", timezone: "Asia/Kathmandu" },
  Japan: { currency: "JPY", currencyLabel: "JPY — Japanese Yen (¥)", timezone: "Asia/Tokyo" },
  China: { currency: "CNY", currencyLabel: "CNY — Chinese Yuan (¥)", timezone: "Asia/Shanghai" },
  "Hong Kong": { currency: "HKD", currencyLabel: "HKD — HK Dollar (HK$)", timezone: "Asia/Hong_Kong" },
  Indonesia: { currency: "IDR", currencyLabel: "IDR — Indonesian Rupiah (Rp)", timezone: "Asia/Jakarta" },
  Thailand: { currency: "THB", currencyLabel: "THB — Thai Baht (฿)", timezone: "Asia/Bangkok" },
  Vietnam: { currency: "VND", currencyLabel: "VND — Vietnamese Dong (₫)", timezone: "Asia/Ho_Chi_Minh" },
  Philippines: { currency: "PHP", currencyLabel: "PHP — Philippine Peso (₱)", timezone: "Asia/Manila" },
  "New Zealand": { currency: "NZD", currencyLabel: "NZD — NZ Dollar (NZ$)", timezone: "Pacific/Auckland" },
  Brazil: { currency: "BRL", currencyLabel: "BRL — Brazilian Real (R$)", timezone: "America/Sao_Paulo" },
  Mexico: { currency: "MXN", currencyLabel: "MXN — Mexican Peso ($)", timezone: "America/Mexico_City" },
  Turkey: { currency: "TRY", currencyLabel: "TRY — Turkish Lira (₺)", timezone: "Europe/Istanbul" },
  Russia: { currency: "RUB", currencyLabel: "RUB — Russian Ruble (₽)", timezone: "Europe/Moscow" },
};

export const COUNTRIES = Object.keys(COUNTRY_META).sort();

export interface SelectOption {
  value: string;
  label: string;
}

// Distinct currencies (deduped on code, label preserved), sorted by label.
export const CURRENCY_OPTIONS: SelectOption[] = (() => {
  const seen = new Map<string, string>();
  for (const m of Object.values(COUNTRY_META)) {
    if (!seen.has(m.currency)) seen.set(m.currency, m.currencyLabel);
  }
  return [...seen.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
})();

// Distinct IANA timezones (in registration order of first appearance), sorted.
export const TIMEZONE_OPTIONS: SelectOption[] = (() => {
  const seen = new Set<string>();
  const out: SelectOption[] = [];
  for (const m of Object.values(COUNTRY_META)) {
    if (!seen.has(m.timezone)) {
      seen.add(m.timezone);
      out.push({ value: m.timezone, label: m.timezone });
    }
  }
  return out.sort((a, b) => a.value.localeCompare(b.value));
})();
