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
