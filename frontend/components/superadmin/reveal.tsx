"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  immediate?: boolean;
  className?: string;
};

export function Reveal({ children, delay, immediate, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(immediate ?? false);

  useEffect(() => {
    if (immediate) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            setInView(true);
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [immediate]);

  return (
    <div
      ref={ref}
      data-delay={delay}
      className={`reveal${inView ? " in" : ""}${className ? ` ${className}` : ""}`}
    >
      {children}
    </div>
  );
}