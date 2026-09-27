import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PLATFORM_HOSTS = new Set(
  [
    "localhost",
    "127.0.0.1",
    "ipixxel.ae",
    "www.ipixxel.ae",
    process.env.NEXT_PUBLIC_APP_HOST,
    process.env.NEXT_PUBLIC_SUBDOMAIN_BASE_DOMAIN,
    process.env.SUBDOMAIN_BASE_DOMAIN,
  ]
    .filter((host): host is string => Boolean(host))
    .map((host) => host.toLowerCase()),
);

function hostname(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

function isCustomDomain(host: string): boolean {
  const h = hostname(host);
  if (!h || PLATFORM_HOSTS.has(h)) return false;
  return h.includes(".");
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (!isCustomDomain(host)) return NextResponse.next();

  const path = request.nextUrl.pathname;
  if (
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/org") ||
    path.startsWith("/admin") ||
    path.startsWith("/change-password") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/org-site") ||
    path.startsWith("/preview") ||
    path.startsWith("/p/") ||
    path.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  // On custom domains, rewrite root or landing page subpaths to /org-site
  url.pathname = "/org-site";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
