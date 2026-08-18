import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon, Code2, Youtube } from "lucide-react";
import type { BannerPreviewProps } from "../../types/preview";
import { DummyPost } from "./DummyPost";
import { getPreviewTitle } from "./preview-utils";

/**
 * BannerPreview Component
 * Matches the live preview design exactly as per provided image:
 * - "Live Preview" label at the top
 * - Realistic phone frame: thin light-gray border, rounded corners
 * - White status bar with time + icons
 * - Scrollable dummy job post content
 * - Advertisement banner strip just above the bottom nav
 * - Bottom nav: home (filled circle), bookmark, person
 */
export const BannerPreview = memo(function BannerPreview({
  title,
  imageUrl,
  format,
  htmlContent,
  youtubeUrl,
  isLoading = false,
}: BannerPreviewProps) {
  const displayTitle = getPreviewTitle(title);

  const extractYoutubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  };

  const youtubeVideoId = youtubeUrl ? extractYoutubeVideoId(youtubeUrl) : null;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* "Live Preview" label — shown above the phone */}
      <p className="text-base font-semibold text-gray-900 self-start">Live Preview</p>

      {/* Phone Mockup Frame — thin light border, realistic look */}
      <div
        className="w-[270px] bg-gradient-to-b from-[#D6D4E4] to-[#EBEAF2] overflow-hidden rounded-[.5rem] bg-white shadow-xl"
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
              <rect x="0" y="5" width="2.5" height="5" rx="0.5" fill="#111827" />
              <rect x="3.5" y="3" width="2.5" height="7" rx="0.5" fill="#111827" />
              <rect x="7" y="1" width="2.5" height="9" rx="0.5" fill="#111827" />
              <rect x="10.5" y="0" width="2.5" height="10" rx="0.5" fill="#111827" />
            </svg>
            {/* Wifi */}
            <svg width="13" height="10" viewBox="0 0 13 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.5 7.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm0-3.2c1.2 0 2.3.5 3.1 1.3l1-1A6.1 6.1 0 0 0 6.5 3a6.1 6.1 0 0 0-4.1 1.6l1 1A4.3 4.3 0 0 1 6.5 4.3zm0-3.3C8.4 1 10.1 1.8 11.3 3l1-1A7.8 7.8 0 0 0 6.5 0 7.8 7.8 0 0 0 1.2 2l1 1A6.1 6.1 0 0 1 6.5 1z" fill="#111827" />
            </svg>
            {/* Battery */}
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0.5" y="1" width="13" height="8" rx="1.5" stroke="#111827" strokeWidth="1" />
              <rect x="2" y="2.5" width="9" height="5" rx="0.5" fill="#111827" />
              <path d="M14 3.5v3" stroke="#111827" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="relative flex flex-col bg-white" style={{ height: "480px" }}>
          {/* Scrollable dummy post */}
          <div className="flex-1 overflow-y-auto">
            <DummyPost />
          </div>

          {/* Advertisement Banner — pinned above bottom nav */}
          <div className="border-t border-gray-100 bg-white px-2 py-1.5">
            <div className="relative overflow-hidden rounded-md bg-gray-50" style={{ aspectRatio: "16/5" }}>
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : format === "html" && htmlContent ? (
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
              ) : format === "youtube" && youtubeVideoId ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                  title="YouTube Preview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="border-0"
                />
              ) : format === "default" && imageUrl ? (
                <img
                  src={imageUrl}
                  alt={displayTitle}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center bg-gray-100 text-gray-400">
                  {format === "html" && <Code2 className="h-4 w-4 mb-1" />}
                  {format === "youtube" && <Youtube className="h-4 w-4 mb-1" />}
                  {format === "default" && <ImageIcon className="h-4 w-4 mb-1" />}
                  <span className="text-[9px] font-medium uppercase tracking-tight">Advertisement</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Navigation Tabs */}
          <div
            className="flex items-center justify-around bg-white pt-2 pb-3"
            style={{ borderTop: "1px solid #f3f4f6" }}
          >
            {/* Home — active: filled indigo/purple circle */}
            <div className="flex flex-col items-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4f46e5]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
              </div>
            </div>
            {/* Bookmark */}
            <div className="flex flex-col items-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            {/* Person */}
            <div className="flex flex-col items-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

BannerPreview.displayName = "BannerPreview";
