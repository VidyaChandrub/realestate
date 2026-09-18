// Numeric parsing for form inputs — one shared module instead of the
// bespoke `Number()` helper that used to be copy-pasted across the project
// pages and silently dropped values like "₹ 62,00,000" or "5.2 acres".
// Each function returns `undefined` for blank/unparseable input so callers
// can send `undefined` (leave the field unset) rather than a bad number.

/** Plain non-negative integer. "12" → 12; "-1" / "1.5" / "" → undefined. */
export function parseCount(value: string): number | undefined {
  const t = value.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}

/** Signed integer — basement floors etc. "-2" → -2; "3" → 3; "1.5" → undefined. */
export function parseInteger(value: string): number | undefined {
  const t = value.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isInteger(n) ? n : undefined;
}

/**
 * Integer amount. Strips a currency sign, spaces, thousands separators and
 * any trailing unit text, and — unlike a plain digit-strip — actually parses
 * a decimal point rather than dropping it, then rounds to the nearest whole
 * unit (every amount column is an `Int`, there's no cents/paise storage):
 * "₹ 62,00,000" → 6200000, "6,400 / sqft" → 6400, "2086.44" → 2086, "" →
 * undefined. Before this, the decimal point was stripped along with every
 * other non-digit character, so "2086.44" silently became 208644 — the
 * whole and fractional parts concatenated into a number roughly 100x too
 * large, with no error or warning.
 */
export function parseAmount(value: string): number | undefined {
  const cleaned = value.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  const normalised =
    parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("")}` : parts[0];
  if (!normalised || normalised === ".") return undefined;
  const n = Number(normalised);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

/**
 * Non-negative decimal, keeping the first dot only.
 * "5.2 acres" → 5.2, "1,250.75" → 1250.75, "" → undefined.
 */
export function parseDecimal(value: string): number | undefined {
  const cleaned = value.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  const normalised =
    parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("")}` : parts[0];
  if (!normalised || normalised === ".") return undefined;
  const n = Number(normalised);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Signed decimal for map coordinates. "23.0301" → 23.0301, "-72.51" → -72.51,
 * "72.5100 E" → undefined (no stray characters allowed for a coordinate).
 */
export function parseCoord(value: string): number | undefined {
  const t = value.trim().replace(/\s/g, "");
  if (!t) return undefined;
  if (!/^-?\d*\.?\d+$/.test(t)) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}
