// Shared frontend helpers for the organisation subdomain / custom-domain UI.
// The base domain is dynamic (configurable via env), so nothing here is
// hardcoded to a single platform domain. This mirrors the backend's
// domain.util for the parts the browser needs (display text).

const BASE_DOMAIN =
  process.env.NEXT_PUBLIC_SUBDOMAIN_BASE_DOMAIN ?? "ipixxel.in";

// In local dev, subdomains render as "<sub>.localhost" (and the note explains
// that they resolve to the local machine instead of the real wildcard).
const LOCALHOST_MODE =
  process.env.NEXT_PUBLIC_SUBDOMAIN_MODE === "localhost";

export function subdomainPreviewHost(subdomain?: string | null): string | null {
  if (!subdomain) return null;
  const label = subdomain.trim().toLowerCase().replace(/[.\s]+$/, "");
  if (!label) return null;
  if (LOCALHOST_MODE) return `${label}.localhost`;
  const base = BASE_DOMAIN.replace(/^\.+/, "");
  return `${label}.${base}`;
}

// Proactive suggestions derived straight from the company name, shown
// before the user has typed a subdomain (or hit a real conflict) — same
// style as backend/src/common/utils/domain.util.ts's
// generateSubdomainSuggestions (used once a *typed* subdomain is actually
// taken), just computed client-side with no availability check, since
// nothing's been typed into the subdomain field yet to check against.
export function suggestSubdomainsFromName(name: string, max = 4): string[] {
  const label = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 40);
  if (!label) return [];
  const raw = [
    `${label}1`,
    `${label}2`,
    label.endsWith("realty") ? label.replace(/realty$/, "homes") : `${label}realty`,
    label.endsWith("homes") ? label.replace(/homes$/, "realty") : `${label}homes`,
    `${label}estate`,
    `${label}group`,
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of raw) {
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
    if (out.length >= max) break;
  }
  return out;
}
