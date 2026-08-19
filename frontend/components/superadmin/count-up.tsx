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
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting && !started) {
            setStarted(true);
            const target = value;
            let t0: number | null = null;
            const dur = 900;
            function step(ts: number) {
              if (!t0) t0 = ts;
              const p = Math.min((ts - t0) / dur, 1);
              const e = 1 - Math.pow(1 - p, 3);
              setDisplay(target * e);
              if (p < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [started, value]);

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