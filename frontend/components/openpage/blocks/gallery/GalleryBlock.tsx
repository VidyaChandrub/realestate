"use client";

import { useMemo, useState } from "react";
import { ImageIcon, X } from "lucide-react";
import type { BlockConfig } from "../types";

interface GalleryImage {
  src?: string;
  alt?: string;
  caption?: string;
  meta?: string;
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
    <section id={(typeof props.anchor === "string" && props.anchor) || "gallery"} className="px-6 py-16 @lg:px-16 @lg:py-20">
      {typeof props.label === "string" && props.label ? (
        <p className="text-[11px] uppercase tracking-[0.28em] text-text-2 font-medium mb-3 text-center @lg:text-left max-w-6xl mx-auto">
          {props.label}
        </p>
      ) : null}
      {title ? (
        <h2 className={`font-display text-3xl @md:text-4xl font-semibold mb-6 ${variant === "lifestyle" ? "text-left max-w-xl" : "text-center"}`}>
          {title}
        </h2>
      ) : null}
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
      {variant === "lifestyle" ? (
        <div className="grid grid-cols-1 @md:grid-cols-2 gap-6 @md:gap-8 max-w-6xl mx-auto">
          {visible.map((img, i) => (
            <button
              key={`${img.src}-${i}`}
              type="button"
              onClick={() => setOpen(i)}
              className={`text-left group ${i % 3 === 0 ? "@md:row-span-2" : ""}`}
            >
              <div className={`rounded-[24px] overflow-hidden bg-bg-2 ${i % 3 === 0 ? "aspect-[3/4]" : "aspect-[16/11]"}`}>
                {img.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.src} alt={img.alt || ""} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full min-h-[200px] bg-bg-3 flex items-center justify-center">
                    <ImageIcon size={24} className="text-text-3" />
                  </div>
                )}
              </div>
              <div className="flex items-baseline justify-between gap-3 mt-3 px-1">
                <span className="font-display text-lg text-text-0">{img.caption || img.alt || "Space"}</span>
                {img.meta ? (
                  <span className="text-[10px] uppercase tracking-[0.2em] text-text-3 shrink-0">{img.meta}</span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      ) : (
      <div
        className={
          variant === "strip"
            ? "flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
            : variant === "masonry"
              ? "grid grid-cols-2 @lg:grid-cols-3 auto-rows-[160px] gap-3"
              : "grid grid-cols-2 @lg:grid-cols-3 gap-3"
        }
      >
        {visible.map((img, i) =>
          variant === "strip" ? (
            <button
              key={`${img.src}-${i}`}
              type="button"
              onClick={() => setOpen(i)}
              className="snap-start shrink-0 w-[72%] @sm:w-[42%] @lg:w-[28%] rounded-xl overflow-hidden border border-border-default group text-left"
            >
              {img.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img.src} alt={img.alt || ""} className="w-full h-52 object-cover group-hover:scale-[1.04] transition-transform duration-500" />
              ) : (
                <div className="w-full h-52 bg-gradient-to-br from-bg-3 to-bg-4 flex items-center justify-center">
                  <ImageIcon size={24} className="text-text-3" />
                </div>
              )}
              {img.caption ? <div className="px-3 py-2 bg-bg-2 text-[11px] text-text-2">{img.caption}</div> : null}
            </button>
          ) : (
            <ImageCard key={`${img.src}-${i}`} image={img} tall={variant === "masonry" && i % 3 === 0} onOpen={() => setOpen(i)} />
          )
        )}
      </div>
      )}
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
