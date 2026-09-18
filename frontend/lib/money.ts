// Currency-aware price formatting for projects. The number is assumed to
// already be in `currency` — there is NO FX conversion here (deliberately
// deferred). INR keeps the Indian lakh/crore short forms the app already
// used; every other currency uses plain international thousands grouping.
//
// The currency LIST a project can pick from is not this file's concern —
// it's `lib/countries.ts`'s `CURRENCY_OPTIONS` (same list Settings →
// Localization uses), so the two never drift apart. This file only knows how
// to print an amount once a currency code has been chosen.

// Only currencies with a short, unambiguous, Latin symbol get one. Everything
// else (AED, SAR, QAR, OMR, ...) shows its ISO code instead — several Gulf
// currencies otherwise share the same generic "﷼" glyph, and a plain code
// reads better in a business dashboard than a right-to-left glyph anyway.
const SYMBOL: Record<string, string> = { INR: "₹", USD: "$" };

function prefix(currency: string): string {
  return SYMBOL[currency] ?? `${currency} `;
}

/** The display prefix for a currency ("₹", "$", "AED ", "GBP "). */
export function currencyPrefix(currency: string): string {
  return prefix(currency);
}

/**
 * Compact price. INR: "₹62 L" / "₹1.2 Cr". Everything else: "AED 620,000" /
 * "$62,000". `decimals` defaults to 0 — every real price field is a whole-unit
 * `Int` column, so there's nothing to show past the decimal point there. Pass
 * a higher value only for a derived figure that isn't itself stored, like a
 * per-sqft price, where rounding to a whole unit would hide a real
 * difference (2.50 vs. 2.72/sqft is real money at project scale).
 */
export function formatMoney(
  value: number | null | undefined,
  currency: string,
  decimals = 0,
): string {
  if (value == null) return "—";
  const p = prefix(currency);
  const opts = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  if (currency === "INR") {
    if (value >= 1e7)
      return `${p}${(value / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr`;
    if (value >= 1e5)
      return `${p}${(value / 1e5).toFixed(2).replace(/\.?0+$/, "")} L`;
    return `${p}${value.toLocaleString("en-IN", opts)}`;
  }
  return `${p}${value.toLocaleString("en-US", opts)}`;
}

/** "lo – hi", or a single value when only one bound is set, or "—". */
export function formatMoneyRange(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string,
): string {
  const lo = min != null ? formatMoney(min, currency) : null;
  const hi = max != null ? formatMoney(max, currency) : null;
  if (lo && hi) return lo === hi ? lo : `${lo} – ${hi}`;
  return lo ?? hi ?? "—";
}
