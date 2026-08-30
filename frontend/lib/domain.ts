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
