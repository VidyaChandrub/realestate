import { validatePhoneForCountry } from "./phone";

// Email + mobile rules shared by the user create/edit pages (Platform Team
// and org Users), so both validate identically. UX only — the backend DTOs
// and duplicate checks are authoritative.

export const EMAIL_MAX = 254;
const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

// ITU E.164 ceiling. The per-country check is what actually rejects a
// too-long / too-short number for the selected country.
export const MOBILE_MAX_DIGITS = 15;

/** Error message, or null when the email is valid. */
export function validateEmail(raw: string): string | null {
  const email = raw.trim();
  if (!email) return "Email is required.";
  if (email.length > EMAIL_MAX || !EMAIL_REGEX.test(email)) return "Enter a valid email address.";
  return null;
}

/** Keeps digits only, capped at MOBILE_MAX_DIGITS — for the mobile input's onChange. */
export function sanitizeMobileDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, MOBILE_MAX_DIGITS);
}

/**
 * Validates a country + national-number pair. With `required: false`, an
 * empty number is accepted (legacy rows saved without one); anything entered
 * must still be valid for the selected country.
 */
export function validateMobile(
  country: string,
  nationalNumber: string,
  { required }: { required: boolean },
): { country?: string; phoneNumber?: string } {
  if (!required && !nationalNumber) return {};
  const errors: { country?: string; phoneNumber?: string } = {};
  if (!country) errors.country = "Select a country.";
  if (!nationalNumber) {
    errors.phoneNumber = "Mobile number is required.";
  } else if (!/^\d+$/.test(nationalNumber) || nationalNumber.length > MOBILE_MAX_DIGITS) {
    errors.phoneNumber = `Digits only, up to ${MOBILE_MAX_DIGITS}.`;
  } else if (country) {
    const phoneError = validatePhoneForCountry(nationalNumber, country);
    if (phoneError) errors.phoneNumber = phoneError;
  }
  return errors;
}

/** Routes a server error (e.g. a duplicate email / mobile 409) onto its form field. */
export function contactFieldForServerError(message: string): "email" | "phoneNumber" | null {
  const m = message.toLowerCase();
  if (m.includes("mobile") || m.includes("phone")) return "phoneNumber";
  if (m.includes("email")) return "email";
  return null;
}
