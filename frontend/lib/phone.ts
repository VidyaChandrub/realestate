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
