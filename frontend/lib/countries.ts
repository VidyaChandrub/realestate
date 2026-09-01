// Country → currency + timezone + ISO-3166 alpha-2 lookup, shared between
// the registration form and any admin screen that needs the same option
// lists (e.g. platform settings). Single source of truth so these never
// drift apart.
//
// `iso` is what bridges this hand-maintained list to libphonenumber-js
// (used for the Step 1 phone country-code prefix + validation) — deliberately
// not pulled from a second country-name-keyed package, since packages like
// country-codes-list use different English names for the same country
// (e.g. "United States of America" vs the "United States" already
// persisted as Organisation.country here) and would need a fragile alias
// table to bridge; a plain, exact ISO code per entry avoids that entirely.

export interface CountryMeta {
  currency: string; // ISO 4217 code
  currencyLabel: string; // e.g. "INR — Indian Rupee (₹)"
  timezone: string; // IANA tz id
  iso: string; // ISO 3166-1 alpha-2, for libphonenumber-js
}

export const COUNTRY_META: Record<string, CountryMeta> = {
  India: { currency: "INR", currencyLabel: "INR — Indian Rupee (₹)", timezone: "Asia/Kolkata", iso: "IN" },
  "United Arab Emirates": { currency: "AED", currencyLabel: "AED — UAE Dirham (د.إ)", timezone: "Asia/Dubai", iso: "AE" },
  "United States": { currency: "USD", currencyLabel: "USD — US Dollar ($)", timezone: "America/New_York", iso: "US" },
  "United Kingdom": { currency: "GBP", currencyLabel: "GBP — British Pound (£)", timezone: "Europe/London", iso: "GB" },
  Australia: { currency: "AUD", currencyLabel: "AUD — Australian Dollar (A$)", timezone: "Australia/Sydney", iso: "AU" },
  Canada: { currency: "CAD", currencyLabel: "CAD — Canadian Dollar (C$)", timezone: "America/Toronto", iso: "CA" },
  Singapore: { currency: "SGD", currencyLabel: "SGD — Singapore Dollar (S$)", timezone: "Asia/Singapore", iso: "SG" },
  "Saudi Arabia": { currency: "SAR", currencyLabel: "SAR — Saudi Riyal (﷼)", timezone: "Asia/Riyadh", iso: "SA" },
  Qatar: { currency: "QAR", currencyLabel: "QAR — Qatari Riyal (﷼)", timezone: "Asia/Qatar", iso: "QA" },
  Kuwait: { currency: "KWD", currencyLabel: "KWD — Kuwaiti Dinar (KD)", timezone: "Asia/Kuwait", iso: "KW" },
  Bahrain: { currency: "BHD", currencyLabel: "BHD — Bahraini Dinar (BD)", timezone: "Asia/Bahrain", iso: "BH" },
  Oman: { currency: "OMR", currencyLabel: "OMR — Omani Rial (﷼)", timezone: "Asia/Muscat", iso: "OM" },
  Malaysia: { currency: "MYR", currencyLabel: "MYR — Malaysian Ringgit (RM)", timezone: "Asia/Kuala_Lumpur", iso: "MY" },
  Germany: { currency: "EUR", currencyLabel: "EUR — Euro (€)", timezone: "Europe/Berlin", iso: "DE" },
  France: { currency: "EUR", currencyLabel: "EUR — Euro (€)", timezone: "Europe/Paris", iso: "FR" },
  Netherlands: { currency: "EUR", currencyLabel: "EUR — Euro (€)", timezone: "Europe/Amsterdam", iso: "NL" },
  Spain: { currency: "EUR", currencyLabel: "EUR — Euro (€)", timezone: "Europe/Madrid", iso: "ES" },
  Italy: { currency: "EUR", currencyLabel: "EUR — Euro (€)", timezone: "Europe/Rome", iso: "IT" },
  Portugal: { currency: "EUR", currencyLabel: "EUR — Euro (€)", timezone: "Europe/Lisbon", iso: "PT" },
  Switzerland: { currency: "CHF", currencyLabel: "CHF — Swiss Franc (Fr)", timezone: "Europe/Zurich", iso: "CH" },
  "South Africa": { currency: "ZAR", currencyLabel: "ZAR — South African Rand (R)", timezone: "Africa/Johannesburg", iso: "ZA" },
  Nigeria: { currency: "NGN", currencyLabel: "NGN — Nigerian Naira (₦)", timezone: "Africa/Lagos", iso: "NG" },
  Kenya: { currency: "KES", currencyLabel: "KES — Kenyan Shilling (KSh)", timezone: "Africa/Nairobi", iso: "KE" },
  Egypt: { currency: "EGP", currencyLabel: "EGP — Egyptian Pound (£)", timezone: "Africa/Cairo", iso: "EG" },
  Bangladesh: { currency: "BDT", currencyLabel: "BDT — Bangladeshi Taka (৳)", timezone: "Asia/Dhaka", iso: "BD" },
  Pakistan: { currency: "PKR", currencyLabel: "PKR — Pakistani Rupee (₨)", timezone: "Asia/Karachi", iso: "PK" },
  "Sri Lanka": { currency: "LKR", currencyLabel: "LKR — Sri Lankan Rupee (₨)", timezone: "Asia/Colombo", iso: "LK" },
  Nepal: { currency: "NPR", currencyLabel: "NPR — Nepalese Rupee (₨)", timezone: "Asia/Kathmandu", iso: "NP" },
  Japan: { currency: "JPY", currencyLabel: "JPY — Japanese Yen (¥)", timezone: "Asia/Tokyo", iso: "JP" },
  China: { currency: "CNY", currencyLabel: "CNY — Chinese Yuan (¥)", timezone: "Asia/Shanghai", iso: "CN" },
  "Hong Kong": { currency: "HKD", currencyLabel: "HKD — HK Dollar (HK$)", timezone: "Asia/Hong_Kong", iso: "HK" },
  Indonesia: { currency: "IDR", currencyLabel: "IDR — Indonesian Rupiah (Rp)", timezone: "Asia/Jakarta", iso: "ID" },
  Thailand: { currency: "THB", currencyLabel: "THB — Thai Baht (฿)", timezone: "Asia/Bangkok", iso: "TH" },
  Vietnam: { currency: "VND", currencyLabel: "VND — Vietnamese Dong (₫)", timezone: "Asia/Ho_Chi_Minh", iso: "VN" },
  Philippines: { currency: "PHP", currencyLabel: "PHP — Philippine Peso (₱)", timezone: "Asia/Manila", iso: "PH" },
  "New Zealand": { currency: "NZD", currencyLabel: "NZD — NZ Dollar (NZ$)", timezone: "Pacific/Auckland", iso: "NZ" },
  Brazil: { currency: "BRL", currencyLabel: "BRL — Brazilian Real (R$)", timezone: "America/Sao_Paulo", iso: "BR" },
  Mexico: { currency: "MXN", currencyLabel: "MXN — Mexican Peso ($)", timezone: "America/Mexico_City", iso: "MX" },
  Turkey: { currency: "TRY", currencyLabel: "TRY — Turkish Lira (₺)", timezone: "Europe/Istanbul", iso: "TR" },
  Russia: { currency: "RUB", currencyLabel: "RUB — Russian Ruble (₽)", timezone: "Europe/Moscow", iso: "RU" },
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
