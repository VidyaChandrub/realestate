"use client";

import { useMemo, useState } from "react";
import { ImageIcon, X } from "lucide-react";
import type { BlockConfig } from "../types";

interface GalleryImage {
  src?: string;
  alt?: string;
  caption?: string;
  category?: string;
}

const defaultImages: GalleryImage[] = [
  { alt: "Image 1" },
  { alt: "Image 2" },
  { alt: "Image 3" },
  { alt: "Image 4" },
  { alt: "Image 5" },
  { alt: "Image 6" },
];

function ImageCard({ image, tall, onOpen }: { image: GalleryImage; tall?: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`rounded-xl overflow-hidden border border-border-default group text-left w-full ${tall ? "row-span-2" : ""}`}
    >
      {image.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.src} alt={image.alt || ""} className="w-full h-full min-h-[140px] object-cover group-hover:scale-[1.04] transition-transform duration-500" />
      ) : (
        <div className="w-full h-full min-h-[140px] bg-gradient-to-br from-bg-3 to-bg-4 flex items-center justify-center">
          <ImageIcon size={24} className="text-text-3" />
        </div>
      )}
      {image.caption ? <div className="px-3 py-2 bg-bg-2 text-[11px] text-text-2">{image.caption}</div> : null}
    </button>
  );
}

export function GalleryBlock({ block }: { block: BlockConfig }) {
  const { variant, props } = block;
  const title = props.title as string | undefined;
  const images = ((props.images as GalleryImage[]) || []).length > 0 ? (props.images as GalleryImage[]) : defaultImages;
  const categories = useMemo(() => {
    const cats = Array.from(new Set(images.map((i) => i.category).filter(Boolean))) as string[];
    return cats;
  }, [images]);
  const [filter, setFilter] = useState("All");
  const [open, setOpen] = useState<number | null>(null);
  const visible = filter === "All" ? images : images.filter((i) => i.category === filter);
  const openImage = open != null ? visible[open] : null;

  return (
    <section id="gallery" className="px-6 py-16 @lg:px-16 @lg:py-20">
      {title ? <h2 className="font-display text-3xl @md:text-4xl font-semibold mb-6 text-center">{title}</h2> : null}
      {categories.length ? (
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {["All", ...categories].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === c ? "bg-green text-black border-green" : "border-border-default text-text-2 hover:border-border-hover"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      ) : null}
      <div className={variant === "masonry" ? "grid grid-cols-2 @lg:grid-cols-3 auto-rows-[160px] gap-3" : "grid grid-cols-2 @lg:grid-cols-3 gap-3"}>
        {visible.map((img, i) => (
          <ImageCard key={`${img.src}-${i}`} image={img} tall={variant === "masonry" && i % 3 === 0} onOpen={() => setOpen(i)} />
        ))}
      </div>
      {openImage?.src ? (
        <div className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <button type="button" className="absolute top-4 right-4 text-white" aria-label="Close" onClick={() => setOpen(null)}>
            <X size={22} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={openImage.src} alt={openImage.alt || ""} className="max-h-[88vh] max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </section>
  );
}
