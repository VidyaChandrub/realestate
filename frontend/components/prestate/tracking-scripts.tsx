"use client";

import { useEffect } from "react";
import type { SiteConfig } from "@/lib/prestate/types";

export function PrestateTrackingScripts({ tracking }: { tracking: SiteConfig["tracking"] }) {
  useEffect(() => {
    const inject = (id: string, text: string) => {
      const existing = document.getElementById(id);
      if (existing) existing.remove();
      const el = document.createElement("script");
      el.id = id;
      el.text = text;
      document.head.appendChild(el);
    };

    if (tracking.gtmId.trim()) {
      const id = tracking.gtmId.trim();
      inject(
        "ps-gtm",
        `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`,
      );
    }
    if (tracking.gaId.trim()) {
      const id = tracking.gaId.trim();
      if (!document.getElementById("ps-ga4-src")) {
        const src = document.createElement("script");
        src.id = "ps-ga4-src";
        src.async = true;
        src.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
        document.head.appendChild(src);
      }
      inject(
        "ps-ga4",
        `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`,
      );
    }
    if (tracking.metaPixel.trim()) {
      const id = tracking.metaPixel.trim();
      inject(
        "ps-meta-pixel",
        `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');`,
      );
    }
    if (tracking.customScripts.trim()) {
      inject("ps-custom-scripts", tracking.customScripts);
    }

    const onLead = () => {
      const gtagFn = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
      gtagFn?.("event", "generate_lead");
      const fbqFn = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
      fbqFn?.("track", "Lead");
    };
    window.addEventListener("prestate:lead", onLead);
    return () => window.removeEventListener("prestate:lead", onLead);
  }, [tracking.gaId, tracking.gtmId, tracking.metaPixel, tracking.customScripts]);

  return null;
}

export function firePrestateLead() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("prestate:lead"));
}
