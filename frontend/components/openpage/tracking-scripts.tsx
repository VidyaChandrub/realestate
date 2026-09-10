"use client";

import { useEffect, useState } from "react";
import type { SiteConfig } from "@/lib/openpage/types";

const CONSENT_KEY = "prestate-consent";

function injectTextTag(id: string, text: string) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const el = document.createElement("script");
  el.id = id;
  el.text = text;
  document.head.appendChild(el);
}

function injectHtmlTag(container: HTMLElement, id: string, html: string) {
  container.querySelector(`#${id}`)?.remove();
  if (!html.trim()) return;
  const host = document.createElement("div");
  host.id = id;
  host.style.display = "none";
  host.innerHTML = html;
  host.querySelectorAll("script").forEach((old) => {
    const fresh = document.createElement("script");
    for (const attr of Array.from(old.attributes)) fresh.setAttribute(attr.name, attr.value);
    fresh.text = old.textContent ?? "";
    old.replaceWith(fresh);
  });
  container.appendChild(host);
}

export function OpenPageTrackingScripts({ tracking }: { tracking: SiteConfig["tracking"] }) {
  const needsConsent = !!tracking.cookieConsent;
  const [granted, setGranted] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    if (!needsConsent) return true;
    return window.localStorage.getItem(CONSENT_KEY) === "granted";
  });
  const [bannerAccepted, setBannerAccepted] = useState(false);

  useEffect(() => {
    if (needsConsent && granted !== true) {
      if (bannerAccepted) return;
      const banner = document.createElement("div");
      banner.id = "ps-consent-banner";
      banner.setAttribute("role", "dialog");
      banner.setAttribute("aria-label", "Cookie consent");
      Object.assign(banner.style, {
        position: "fixed",
        bottom: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: "2147483000",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        maxWidth: "min(560px, calc(100vw - 32px))",
        padding: "14px 16px",
        background: "#111827",
        color: "#f9fafb",
        borderRadius: "12px",
        boxShadow: "0 12px 32px rgba(0,0,0,0.28)",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: "14px",
        lineHeight: 1.5,
      } as React.CSSProperties);
      const text = document.createElement("p");
      text.style.margin = "0";
      text.textContent =
        tracking.consentText?.trim() ||
        "We use cookies and similar technologies to improve your experience and analyze site traffic.";
      const accept = document.createElement("button");
      accept.textContent = "Accept";
      Object.assign(accept.style, {
        flexShrink: "0",
        padding: "8px 16px",
        background: "#6D5DFC",
        color: "#ffffff",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: 600,
      } as React.CSSProperties);
      accept.onclick = () => {
        window.localStorage.setItem(CONSENT_KEY, "granted");
        setGranted(true);
        setBannerAccepted(true);
        banner.remove();
      };
      banner.append(text, accept);
      document.body.appendChild(banner);
      return () => banner.remove();
    }

    if (tracking.gtmId.trim()) {
      const id = tracking.gtmId.trim();
      injectTextTag(
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
      injectTextTag(
        "ps-ga4",
        `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`,
      );
    }
    if (tracking.metaPixel.trim()) {
      const id = tracking.metaPixel.trim();
      injectTextTag(
        "ps-meta-pixel",
        `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');`,
      );
    }
    if (tracking.customScripts.trim()) {
      injectTextTag("ps-custom-scripts", tracking.customScripts);
    }
    injectHtmlTag(document.head, "ps-header-scripts", tracking.headerScripts ?? "");
    injectHtmlTag(document.body, "ps-body-scripts", tracking.bodyScripts ?? "");

    const onLead = () => {
      const gtagFn = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
      gtagFn?.("event", "generate_lead");
      const fbqFn = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
      fbqFn?.("track", "Lead");
    };
    window.addEventListener("prestate:lead", onLead);
    return () => window.removeEventListener("prestate:lead", onLead);
  }, [
    tracking.gaId,
    tracking.gtmId,
    tracking.metaPixel,
    tracking.customScripts,
    tracking.headerScripts,
    tracking.bodyScripts,
    tracking.cookieConsent,
    tracking.consentText,
    needsConsent,
    granted,
    bannerAccepted,
  ]);

  return null;
}

export function fireTrackingLead() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("prestate:lead"));
}