"use client";

import { useEffect } from "react";
import type { LpTracking } from "@/lib/lp-types";

// Injects a landing page's own tracking configuration (GTM, GA4, Ads, Meta
// Pixel, custom scripts) exactly once on the client. Each landing page has
// its own independent tracking setup.
export function TrackingScripts({ config }: { config: LpTracking | null }) {
  useEffect(() => {
    if (!config) return;

    const inject = (id: string, text: string) => {
      if (document.getElementById(id)) return;
      const el = document.createElement("script");
      el.id = id;
      el.innerHTML = text;
      document.head.appendChild(el);
    };

    // Google Tag Manager
    if (config.gtm) {
      const gtmId = config.gtm.trim();
      inject(
        "lp-gtm",
        `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`,
      );
    }

    // Google Analytics 4
    if (config.ga4) {
      const ga4Id = config.ga4.trim();
      inject(
        "lp-ga4",
        `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}');`,
      );
    }

    // Google Ads conversion tracking
    if (config.gadsConversion && config.gadsLabel) {
      const gadsId = config.gadsConversion.trim();
      const label = config.gadsLabel.trim();
      inject(
        "lp-gads",
        `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gadsId}');`,
      );
      // Fire the conversion on lead-submit events pushed by the lead form.
      window.addEventListener("lp:lead", () => {
        const gtagFn = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
        gtagFn?.("event", "conversion", { send_to: `${gadsId}/${label}` });
      });
    }

    // Meta Pixel
    if (config.metaPixel) {
      const pixelId = config.metaPixel.trim();
      inject(
        "lp-meta-pixel",
        `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`,
      );
      window.addEventListener("lp:lead", () => {
        const fbqFn = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
        fbqFn?.("track", "Lead");
      });
    }

    // Custom scripts
    if (config.customScripts) {
      inject("lp-custom-scripts", config.customScripts);
    }
  }, [config]);

  return null;
}

// Helper used by the lead form to notify tracking scripts of a conversion.
export function trackLead() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("lp:lead"));
}