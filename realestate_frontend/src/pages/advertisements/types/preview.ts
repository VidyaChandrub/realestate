import type { AdvertisementAdType, AdvertisementContentFormat } from "./ad-form";
import type { AdCtaButtonStyle, AdCtaButtonSize, AdCtaButtonPlacement } from "@/types";

export interface CtaCustomization {
  ctaTextColor?: string | null;
  ctaBackgroundColor?: string | null;
  ctaButtonStyle?: AdCtaButtonStyle | null;
  ctaButtonSize?: AdCtaButtonSize | null;
  ctaButtonPlacement?: AdCtaButtonPlacement | null;
}

export interface BasePreviewProps {
  adType: AdvertisementAdType;
  title: string;
  ctaText: string;
  redirectUrl: string;
  format: AdvertisementContentFormat;
  isLoading?: boolean;
  htmlContent?: string;
  youtubeUrl?: string;
  ctaTextColor?: string | null;
  ctaBackgroundColor?: string | null;
  ctaButtonStyle?: AdCtaButtonStyle | null;
  ctaButtonSize?: AdCtaButtonSize | null;
  ctaButtonPlacement?: AdCtaButtonPlacement | null;
}

export interface BannerPreviewProps extends BasePreviewProps {
  adType: "banner";
  imageUrl?: string;
}

export interface CardPreviewProps extends BasePreviewProps {
  adType: "card";
  imageUrl?: string;
  images?: string[];
}

export type AdvertisementPreviewProps =
  | BannerPreviewProps
  | CardPreviewProps;
