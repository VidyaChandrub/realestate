// Currency-aware price formatting for projects. The number is assumed to
// already be in `currency` — there is NO FX conversion here (deliberately
// deferred). INR keeps the Indian lakh/crore short forms the app already
// used; AED/USD use plain international thousands grouping.

export const PROJECT_CURRENCIES = ["INR", "AED", "USD"] as const;
export type ProjectCurrency = (typeof PROJECT_CURRENCIES)[number];

export const CURRENCY_LABELS: Record<ProjectCurrency, string> = {
  INR: "INR — Indian Rupee (₹)",
  AED: "AED — UAE Dirham",
  USD: "USD — US Dollar ($)",
};

const PREFIX: Record<string, string> = { INR: "₹", AED: "AED ", USD: "$" };

function prefix(currency: string): string {
  return PREFIX[currency] ?? `${currency} `;
}

/** Compact price. INR: "₹62 L" / "₹1.2 Cr". AED/USD: "AED 620,000" / "$62,000". */
export function formatMoney(
  value: number | null | undefined,
  currency: string,
): string {
  if (value == null) return "—";
  const p = prefix(currency);
  if (currency === "INR") {
    if (value >= 1e7)
      return `${p}${(value / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr`;
    if (value >= 1e5)
      return `${p}${(value / 1e5).toFixed(2).replace(/\.?0+$/, "")} L`;
    return `${p}${value.toLocaleString("en-IN")}`;
  }
  return `${p}${value.toLocaleString("en-US")}`;
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
