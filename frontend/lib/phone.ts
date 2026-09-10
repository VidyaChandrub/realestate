import { getCountryCallingCode, isValidPhoneNumber, type CountryCode } from "libphonenumber-js";
import { COUNTRY_META } from "./countries";

// Country selection now lives in Step 1 (see registration wizard), right
// next to Mobile — these two helpers derive the dial-code prefix and
// validate the number against whichever country is selected, both backed
// by libphonenumber-js (real per-country validation, not just a length
// check) using the `iso` code already on COUNTRY_META. See countries.ts's
// header comment for why this doesn't also pull in country-codes-list.

export function callingCodeForCountry(countryName: string): string | null {
  const iso = COUNTRY_META[countryName]?.iso;
  if (!iso) return null;
  try {
    return `+${getCountryCallingCode(iso as CountryCode)}`;
  } catch {
    return null;
  }
}

// `phoneNumber` is the national-format number only (no dial code prefix —
// that's shown/handled separately in the UI). Returns null when valid,
// or a user-facing message when not. If no country is selected yet,
// validation is skipped (returns null) — Country is required to Continue
// from Step 1 regardless, so that's caught separately.
// ---------------------------------------------------------------------------
// Loose, country-agnostic phone check for CRM / lead contact fields where an
// agent types or pastes a number with its original formatting and there is no
// country selector to parse against. Mirrors the backend
// OPTIONAL_LOOSE_PHONE_NUMBER_REGEX in phone.util.ts — keep the two in sync.
//
// Rule: an optional single leading '+', then digits with spaces, hyphens,
// parentheses and dots as separators; 7–15 digits once separators are stripped
// (15 = E.164 ceiling; 7 = safe floor for India / Gulf / US / international).
// This is UX only — the server is authoritative.
export const LOOSE_PHONE_MIN_DIGITS = 7;
export const LOOSE_PHONE_MAX_DIGITS = 15;
export const LOOSE_PHONE_MESSAGE =
  "Enter a valid phone number: 7–15 digits, optionally starting with + and using spaces or hyphens to format.";

/** true when `raw` is a plausible phone number by the loose rule above. */
export function isValidLoosePhone(raw: string): boolean {
  const value = raw.trim();
  if (!/^\+?[\d()\s.-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return (
    digits.length >= LOOSE_PHONE_MIN_DIGITS &&
    digits.length <= LOOSE_PHONE_MAX_DIGITS
  );
}

export function validatePhoneForCountry(
  phoneNumber: string,
  countryName: string,
): string | null {
  const iso = COUNTRY_META[countryName]?.iso;
  if (!iso) return null;
  const digits = phoneNumber.trim();
  if (!digits) return null;
  try {
    if (!isValidPhoneNumber(digits, iso as CountryCode)) {
      return `That doesn't look like a valid ${countryName} mobile number.`;
    }
  } catch {
    return `That doesn't look like a valid ${countryName} mobile number.`;
  }
  return null;
}
