"use client";

import { useEffect, useRef, useState } from "react";

type ProgressBarProps = {
  width: string;
};

export function ProgressBar({ width }: ProgressBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState("0%");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            requestAnimationFrame(() => {
              setW(width);
            });
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [width]);

  return (
    <div className="bar">
      <i ref={ref} style={{ width: w }} />
    </div>
  );
}