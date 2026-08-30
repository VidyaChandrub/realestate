import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_SUBDOMAIN_BASE_DOMAIN || "localhost";

/**
 * A bare `<sub>.<base>` visit (e.g. `miraclecare.localhost`) should render the
 * organisation's published site at its real host, not the platform root. When
 * the request Host is a product subdomain we rewrite the root onto the fixed
 * host-site route (which reads the Host header), so no `/p/host/...` path ever
 * appears in the URL.
 */
function subdomainLabel(host: string, base: string): string | null {
  const h = host.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  const suffix = `.${base}`;
  if (!h.endsWith(suffix)) return null;
  const label = h.slice(0, -suffix.length);
  if (!label || label.includes(".") || label.includes("/")) return null;
  return label;
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const label = subdomainLabel(host, BASE_DOMAIN);
  if (!label) return NextResponse.next();
  // Only a bare root visit to a product subdomain is rewritten to the org's
  // published site. Any deeper path (e.g. /login, /register, /org) resolves
  // through normal app routing, so a subdomain can reach the org login too.
  if (request.nextUrl.pathname !== "/") return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/__site";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
