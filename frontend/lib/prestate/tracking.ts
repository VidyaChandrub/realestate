import type { LandingPageData, SiteConfig } from "./types";
import { localPreviewPath } from "./paths";

const EVENTS_KEY = "prestate.tracking.events.v1";

export type TrackingCounts = {
  view: number;
  form: number;
  whatsapp: number;
  call: number;
  brochure: number;
};

const EMPTY: TrackingCounts = { view: 0, form: 0, whatsapp: 0, call: 0, brochure: 0 };

function allEvents(): Record<string, TrackingCounts> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, TrackingCounts>) : {};
  } catch {
    return {};
  }
}

export function loadTrackingCounts(pageId: string): TrackingCounts {
  return { ...EMPTY, ...allEvents()[pageId] };
}

export function bumpTracking(pageId: string, key: keyof TrackingCounts) {
  if (typeof window === "undefined" || !pageId) return;
  const all = allEvents();
  const cur = { ...EMPTY, ...all[pageId] };
  cur[key] += 1;
  all[pageId] = cur;
  try {
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(all));
  } catch {
    /* quota */
  }
  window.dispatchEvent(new CustomEvent("prestate:track", { detail: { pageId, key } }));
}

export function buildTrackingSnippet(t: SiteConfig["tracking"]): string {
  const lines: string[] = [];
  if (t.gtmId.trim()) {
    lines.push(`<!-- Google Tag Manager -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${t.gtmId.trim()}');</script>`);
  }
  if (t.gaId.trim()) {
    lines.push(`<!-- Google Analytics 4 -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=${t.gaId.trim()}"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${t.gaId.trim()}');</script>`);
  }
  if (t.metaPixel.trim()) {
    lines.push(`<!-- Meta Pixel -->\n<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${t.metaPixel.trim()}');fbq('track','PageView');</script>`);
  }
  if (t.customScripts.trim()) lines.push(t.customScripts.trim());
  return lines.join("\n\n") || "<!-- Add a GA4, GTM or Meta Pixel ID for this template -->";
}

export function buildUtmUrl(page: LandingPageData, t: SiteConfig["tracking"]): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isLandingPage = page.kind === "custom" || (page.pageType === "landing" && page.id.includes("-"));
  const path = isLandingPage && page.id ? `/preview/${encodeURIComponent(page.id)}` : localPreviewPath(page);
  const url = new URL(`${origin}${path}`);
  if (t.utmSource.trim()) url.searchParams.set("utm_source", t.utmSource.trim());
  if (t.utmMedium.trim()) url.searchParams.set("utm_medium", t.utmMedium.trim());
  if (t.utmCampaign.trim()) url.searchParams.set("utm_campaign", t.utmCampaign.trim());
  return url.toString();
}

export function idStatus(kind: "ga" | "gtm" | "pixel", value: string): "ok" | "warn" | "empty" {
  const v = value.trim();
  if (!v) return "empty";
  if (kind === "ga") return /^G-[A-Z0-9]+$/i.test(v) ? "ok" : "warn";
  if (kind === "gtm") return /^GTM-[A-Z0-9]+$/i.test(v) ? "ok" : "warn";
  return /^\d{5,20}$/.test(v) ? "ok" : "warn";
}
