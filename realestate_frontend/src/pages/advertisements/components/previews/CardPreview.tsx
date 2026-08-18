import { memo, useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CardPreviewProps } from "../../types/preview";
import { getPreviewCtaText, getCtaPlacementClasses, getCtaSizeClasses, getCtaStyleClasses, getCtaButtonInlineStyles } from "./preview-utils";

/**
 * CardPreview Component
 * Fullscreen card ad inside the same phone mockup design as BannerPreview:
 * - "Live Preview" label above the phone
 * - Realistic thin-border phone frame
 * - White status bar with 9:41 time + icons
 * - Fullscreen image/content with overlay CTA
 * - Bottom navigation tabs (home active, bookmark, person)
 */
export const CardPreview = memo(function CardPreview({
  images = [],
  imageUrl,
  ctaText,
  ctaTextColor,
  ctaBackgroundColor,
  ctaButtonStyle,
  ctaButtonSize,
  ctaButtonPlacement,
  format,
  htmlContent,
  youtubeUrl,
  isLoading = false,
}: CardPreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const displayCta = getPreviewCtaText(ctaText, "card");
  const placementClasses = getCtaPlacementClasses(ctaButtonPlacement);
  const sizeClasses = getCtaSizeClasses(ctaButtonSize);
  const styleClasses = getCtaStyleClasses(ctaButtonStyle);
  const buttonStyles = getCtaButtonInlineStyles(ctaButtonStyle, ctaTextColor, ctaBackgroundColor);

  // Normalize images: use imageUrl if provided, otherwise use images array
  const slides = images.length > 0 ? images : imageUrl ? [imageUrl] : [];
  const slideCount = slides.length;

  const extractYoutubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,  // ← added
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
};

  const youtubeVideoId = youtubeUrl ? extractYoutubeVideoId(youtubeUrl) : null;

  useEffect(() => {
    setCurrentSlide(0);
  }, [slideCount]);

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev + 1) % slideCount);
  };

  const goToPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev - 1 + slideCount) % slideCount);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* "Live Preview" label — shown above the phone */}
      <p className="text-base font-semibold text-gray-900 self-start">Live Preview</p>

      {/* Phone Mockup Frame — thin light border, realistic look */}
      <div
        className="w-[270px] overflow-hidden rounded-[2.5rem] bg-white shadow-xl"
        style={{
          border: "1.5px solid #d1d5db",
          boxShadow: "0 4px 32px 0 rgba(60,60,100,0.13), 0 1px 4px 0 rgba(0,0,0,0.07)",
        }}
      >
        {/* Status Bar */}
        <div className="flex items-center justify-between bg-white px-5 pt-3 pb-1.5">
          <span className="text-[11px] font-bold text-gray-900 leading-none">9:41</span>
          <div className="flex items-center gap-1">
            {/* Signal bars */}
            <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="5" width="2.5" height="5" rx="0.5" fill="#111827"/>
              <rect x="3.5" y="3" width="2.5" height="7" rx="0.5" fill="#111827"/>
              <rect x="7" y="1" width="2.5" height="9" rx="0.5" fill="#111827"/>
              <rect x="10.5" y="0" width="2.5" height="10" rx="0.5" fill="#111827"/>
            </svg>
            {/* Wifi */}
            <svg width="13" height="10" viewBox="0 0 13 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.5 7.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm0-3.2c1.2 0 2.3.5 3.1 1.3l1-1A6.1 6.1 0 0 0 6.5 3a6.1 6.1 0 0 0-4.1 1.6l1 1A4.3 4.3 0 0 1 6.5 4.3zm0-3.3C8.4 1 10.1 1.8 11.3 3l1-1A7.8 7.8 0 0 0 6.5 0 7.8 7.8 0 0 0 1.2 2l1 1A6.1 6.1 0 0 1 6.5 1z" fill="#111827"/>
            </svg>
            {/* Battery */}
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0.5" y="1" width="13" height="8" rx="1.5" stroke="#111827" strokeWidth="1"/>
              <rect x="2" y="2.5" width="9" height="5" rx="0.5" fill="#111827"/>
              <path d="M14 3.5v3" stroke="#111827" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Fullscreen Content Area */}
        <div className="relative bg-gray-900" style={{ height: "480px" }}>
          {/* Content */}
          <div className="h-full w-full">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : format === "html" && htmlContent ? (
              <div className="h-full w-full overflow-hidden bg-white">
                <iframe
                  srcDoc={`
                    <html>
                      <head>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                          body { margin: 0; padding: 0; overflow: hidden; }
                          .ad-container { width: 100%; height: 100%; }
                        </style>
                      </head>
                      <body>
                        <div class="ad-container overflow-hidden">
                          ${htmlContent}
                        </div>
                      </body>
                    </html>
                  `}
                  className="h-full w-full border-0"
                  sandbox="allow-same-origin allow-scripts"
                  title="HTML Preview"
                />
              </div>
            ) : format === "youtube" && youtubeVideoId ? (
              <div className="flex h-full w-full items-center justify-center bg-gray-900">
                <div className={youtubeUrl?.includes('/shorts/') ? "h-full w-full overflow-hidden" : "aspect-video w-full overflow-hidden"}>
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                    title="YouTube Preview"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="border-0"
                  />
                </div>
              </div>
            ) : slides.length > 0 ? (
              <div className="relative h-full w-full">
                <img
                  src={slides[currentSlide]}
                  alt="Advertisement"
                  className="h-full w-full object-cover"
                />

                {/* Carousel Navigation Arrows */}
                {slideCount > 1 && (
                  <>
                    <button
                      onClick={goToPrev}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/25 p-1.5 text-white backdrop-blur-sm transition-all hover:bg-black/40"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={goToNext}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/25 p-1.5 text-white backdrop-blur-sm transition-all hover:bg-black/40"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>

                    {/* Dots indicator */}
                    <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-1.5">
                      {slides.map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 rounded-full transition-all ${i === currentSlide ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* CTA Overlay */}
                {!isLoading && (
                  <div className={cn("absolute z-10", placementClasses)}>
                    <button
                      className={cn("font-bold transition-transform active:scale-95", sizeClasses, styleClasses)}
                      style={buttonStyles}
                    >
                      {displayCta}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center bg-gray-800 text-gray-500">
                <p className="text-xs font-medium uppercase tracking-wider text-white/40">Fullscreen Card Ad</p>
              </div>
            )}
          </div>

          {/* Bottom Navigation Tabs — overlaid on fullscreen content */}
          <div
            className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-around bg-white/95 pt-2 pb-3 backdrop-blur-md"
            style={{ borderTop: "1px solid #f3f4f6" }}
          >
            {/* Home — active: filled indigo/purple circle */}
            <div className="flex flex-col items-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4f46e5]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
              </div>
            </div>
            {/* Bookmark */}
            <div className="flex flex-col items-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            {/* Person */}
            <div className="flex flex-col items-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

CardPreview.displayName = "CardPreview";
