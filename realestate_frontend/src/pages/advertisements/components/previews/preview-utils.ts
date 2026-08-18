/**
 * Helper functions for advertisement preview components
 */

import type { CSSProperties } from "react";
import type { AdCtaButtonStyle, AdCtaButtonSize, AdCtaButtonPlacement } from "@/types";

export function getPreviewTitle(title: string): string {
  return title.trim() || "Untitled Ad";
}

export function getPreviewCtaText(ctaText: string, adType: string): string {
  if (ctaText.trim()) return ctaText;
  if (adType === "card") return "Learn More";
  return "View More";
}

export function getCtaPlacementClasses(placement?: AdCtaButtonPlacement | null): string {
  switch (placement) {
    case "BOTTOM_CENTER":
      return "bottom-16 left-1/2 -translate-x-1/2";
    case "BOTTOM_RIGHT":
      return "bottom-16 right-3";
    case "TOP_LEFT":
      return "top-12 left-3";
    case "TOP_CENTER":
      return "top-12 left-1/2 -translate-x-1/2";
    case "TOP_RIGHT":
      return "top-12 right-3";
    case "BOTTOM_LEFT":
    default:
      return "bottom-16 left-3";
  }
}

export function getCtaSizeClasses(size?: AdCtaButtonSize | null): string {
  switch (size) {
    case "SMALL":
      return "px-2 py-0.5 text-[10px]";
    case "LARGE":
      return "px-4 py-2 text-[12px]";
    case "MEDIUM":
    default:
      return "px-3 py-1 text-[11px]";
  }
}

export function getCtaStyleClasses(style?: AdCtaButtonStyle | null): string {
  switch (style) {
    case "OUTLINE":
      return "border-2 bg-transparent";
    case "GHOST":
      return "backdrop-blur-sm";
    case "TEXT":
      return "bg-transparent shadow-none px-0 py-0 underline";
    case "FILLED":
    default:
      return "rounded-lg shadow-lg";
  }
}

export function getCtaTextColor(color?: string | null): string {
  return color?.trim() || "#000000";
}

export function getCtaBackgroundColor(color?: string | null): string {
  return color?.trim() || "#f9c20a";
}

export function getCtaButtonInlineStyles(
  style?: AdCtaButtonStyle | null,
  textColor?: string | null,
  backgroundColor?: string | null,
): CSSProperties {
  const color = getCtaTextColor(textColor);
  const bg = getCtaBackgroundColor(backgroundColor);

  switch (style) {
    case "OUTLINE":
      return { color, borderColor: bg, backgroundColor: "transparent" };
    case "GHOST":
      return { color, backgroundColor: `${bg}33` };
    case "TEXT":
      return { color, backgroundColor: "transparent" };
    case "FILLED":
    default:
      return { color, backgroundColor: bg };
  }
}

export function getTruncatedText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

export const DUMMY_JOBS = [
  {
    id: "1",
    company: "Acme Corp",
    role: "Software Engineer",
    location: "San Francisco, CA",
    salary: "120K - 150K",
    experience: "3-5 years",
  },
  {
    id: "2",
    company: "Tech Startup Inc",
    role: "UX Designer",
    location: "New York, NY",
    salary: "90K - 120K",
    experience: "2-4 years",
  },
  {
    id: "3",
    company: "Global Industries",
    role: "Product Manager",
    location: "Austin, TX",
    salary: "110K - 140K",
    experience: "5+ years",
  },
];

export const DUMMY_POST = DUMMY_JOBS[0];
