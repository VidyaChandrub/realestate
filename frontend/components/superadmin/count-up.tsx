"use client";

import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  value: number;
  pre?: string;
  suf?: string;
  dec?: number;
};

export function CountUp({ value, pre = "", suf = "", dec = 0 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const [inView, setInView] = useState(false);
  // Where the last animation landed — the next one (triggered by a `value`
  // change, e.g. an async fetch resolving after the tile already animated
  // once) starts from here instead of always assuming 0.
  const animatedFrom = useRef(0);

  // Trigger once the tile scrolls into view. Deliberately separate from the
  // animation effect below: this only decides *when* animating may start,
  // not *what* it animates to — that's driven by `value` and can change.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            setInView(true);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Animates to the current `value` once in view, and re-animates whenever
  // `value` changes afterward (e.g. a stat computed from data that finishes
  // loading after the tile already animated to its initial 0/placeholder).
  // Without this, a tile can freeze on a value from before its data arrived.
  useEffect(() => {
    if (!inView) return;
    const start = animatedFrom.current;
    const target = value;
    if (start === target) return;
    let t0: number | null = null;
    const dur = 900;
    let raf: number;
    function step(ts: number) {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(start + (target - start) * e);
      if (p < 1) {
        raf = requestAnimationFrame(step);
      } else {
        animatedFrom.current = target;
      }
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return (
    <span ref={ref}>
      {pre}
      {display.toLocaleString("en-IN", {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
      })}
      {suf}
    </span>
  );
}