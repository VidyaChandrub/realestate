// Strips everything except digits (and a leading '+') so equivalent
// phone numbers typed/stored with different formatting — "+91 9825041200",
// "+919825041200", "+91 98250 41200" — all normalize to the same string.
// Used both when persisting a phone number and when checking for
// duplicates, so the two can never drift out of sync with each other.
export function normalizePhoneNumber(raw: string): string {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

// Accepted shape for a mobile number on our create/edit forms: digits only,
// an optional single leading '+', and at most 15 digits (E.164's ceiling).
// No spaces, hyphens or letters. Shared by every DTO that validates a phone
// so the rule can't drift between modules.
export const PHONE_NUMBER_REGEX = /^\+?\d{1,15}$/;

// Same rule, but also allows an empty string — for optional phone fields,
// where class-validator's `@IsOptional()` only skips `undefined`/`null`.
export const OPTIONAL_PHONE_NUMBER_REGEX = /^(\+?\d{1,15})?$/;

export const PHONE_NUMBER_MESSAGE =
  'Mobile number must contain digits only (optionally starting with +) and be at most 15 digits.';
