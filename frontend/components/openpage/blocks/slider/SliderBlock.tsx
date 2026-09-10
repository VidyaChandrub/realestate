"use client";

import { useState, useEffect, useCallback } from "react";
import type { BlockConfig } from "../types";

interface SliderProps {
  images?: Array<{ src: string; alt?: string; caption?: string }>;
  autoPlay?: boolean;
  interval?: number;
  showDots?: boolean;
  showArrows?: boolean;
  height?: string;
}

export function SliderBlock({ block }: { block: BlockConfig }) {
  const p = block.props as SliderProps
  const images = p.images ?? [
    { src: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200', alt: 'Property 1' },
    { src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200', alt: 'Property 2' },
    { src: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200', alt: 'Property 3' },
  ]
  const [current, setCurrent] = useState(0)
  const autoPlay = p.autoPlay !== false
  const interval = p.interval ?? 5000

  const next = useCallback(() => setCurrent((c) => (c + 1) % images.length), [images.length])
  const prev = useCallback(() => setCurrent((c) => (c - 1 + images.length) % images.length), [images.length])

  useEffect(() => {
    if (!autoPlay) return
    const timer = setInterval(next, interval)
    return () => clearInterval(timer)
  }, [autoPlay, interval, next])

  return (
    <div className="relative w-full overflow-hidden" style={{ height: p.height || '400px' }}>
      {images.map((img, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <img src={img.src} alt={img.alt || ''} className="w-full h-full object-cover" />
          {img.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-4 text-center">
              {img.caption}
            </div>
          )}
        </div>
      ))}

      {p.showArrows !== false && (
        <>
          <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors backdrop-blur-sm">
            ‹
          </button>
          <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors backdrop-blur-sm">
            ›
          </button>
        </>
      )}

      {p.showDots !== false && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === current ? 'bg-white scale-110' : 'bg-white/40 hover:bg-white/60'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
