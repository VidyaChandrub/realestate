import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MODE = process.env.NEXT_PUBLIC_SUBDOMAIN_MODE || "";
const BASE_DOMAIN =
  process.env.NEXT_PUBLIC_SUBDOMAIN_BASE_DOMAIN ||
  (MODE === "localhost" ? "localhost" : "ipixxel.in");

const PLATFORM_HOSTS = new Set(
  [
    "localhost",
    "127.0.0.1",
    BASE_DOMAIN,
    `www.${BASE_DOMAIN}`,
    process.env.NEXT_PUBLIC_APP_HOST,
  ]
    .filter((host): host is string => Boolean(host))
    .map((host) => host.toLowerCase()),
);

function hostname(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

function subdomainLabel(host: string, base: string): string | null {
  const h = hostname(host);
  const suffix = `.${base}`;
  if (!h.endsWith(suffix)) return null;
  const label = h.slice(0, -suffix.length);
  if (!label || label.includes(".") || label.includes("/")) return null;
  return label;
}

function isPlatformSubdomain(host: string): boolean {
  if (subdomainLabel(host, BASE_DOMAIN)) return true;
  if (MODE === "localhost" && subdomainLabel(host, "localhost")) return true;
  return false;
}

function isOrgSiteHost(host: string): boolean {
  const h = hostname(host);
  if (!h || PLATFORM_HOSTS.has(h)) return false;
  if (isPlatformSubdomain(host)) return true;
  return h.includes(".");
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (!isOrgSiteHost(host)) return NextResponse.next();

  const path = request.nextUrl.pathname;
  if (
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/org") ||
    path.startsWith("/admin") ||
    path.startsWith("/change-password") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/org-site")
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  // Platform subdomain is the org login portal. Public template site lives at /site.
  if (isPlatformSubdomain(host) && (path === "/" || path === "")) {
    url.pathname = "/login";
    return NextResponse.rewrite(url);
  }
  if (path === "/site" || (!isPlatformSubdomain(host) && path === "/")) {
    url.pathname = "/org-site";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
