import { memo } from "react";
import type { AdvertisementAdType, AdvertisementContentFormat } from "../../types/ad-form";
import type { AdCtaButtonStyle, AdCtaButtonSize, AdCtaButtonPlacement } from "@/types";
import { BannerPreview } from "./BannerPreview";
import { CardPreview } from "./CardPreview";

interface AdvertisementPreviewDispatcherProps {
  adType: AdvertisementAdType;
  title: string;
  ctaText: string;
  redirectUrl: string;
  format: AdvertisementContentFormat;
  imageUrl?: string;
  images?: string[];
  htmlContent?: string;
  youtubeUrl?: string;
  isLoading?: boolean;
  ctaTextColor?: string | null;
  ctaBackgroundColor?: string | null;
  ctaButtonStyle?: AdCtaButtonStyle | null;
  ctaButtonSize?: AdCtaButtonSize | null;
  ctaButtonPlacement?: AdCtaButtonPlacement | null;
}

/**
 * AdvertisementPreview Dispatcher Component
 * Routes to the appropriate preview component based on ad type
 * Receives form state and displays real-time preview
 * Supports: Default (images), HTML, and YouTube formats
 */
export const AdvertisementPreview = memo(function AdvertisementPreview(
  props: AdvertisementPreviewDispatcherProps,
) {
  const {
    adType,
    title,
    ctaText,
    redirectUrl,
    format,
    imageUrl,
    images,
    htmlContent,
    youtubeUrl,
    isLoading,
    ctaTextColor,
    ctaBackgroundColor,
    ctaButtonStyle,
    ctaButtonSize,
    ctaButtonPlacement,
  } = props;

  // Banner Preview
  if (adType === "banner") {
    return (
      <BannerPreview
        adType="banner"
        title={title}
        ctaText={ctaText}
        redirectUrl={redirectUrl}
        format={format}
        imageUrl={imageUrl}
        htmlContent={htmlContent}
        youtubeUrl={youtubeUrl}
        isLoading={isLoading}
      />
    );
  }

  // Card Preview (Fullscreen)
  if (adType === "card") {
    return (
      <CardPreview
        adType="card"
        title={title}
        ctaText={ctaText}
        redirectUrl={redirectUrl}
        format={format}
        imageUrl={imageUrl}
        images={images}
        htmlContent={htmlContent}
        youtubeUrl={youtubeUrl}
        isLoading={isLoading}
        ctaTextColor={ctaTextColor}
        ctaBackgroundColor={ctaBackgroundColor}
        ctaButtonStyle={ctaButtonStyle}
        ctaButtonSize={ctaButtonSize}
        ctaButtonPlacement={ctaButtonPlacement}
      />
    );
  }

  // Fallback (should never reach here)
  return null;
});

AdvertisementPreview.displayName = "AdvertisementPreview";
