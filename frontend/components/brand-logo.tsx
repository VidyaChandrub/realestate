import React from "react";

export function BuildingLogoIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
      aria-hidden
    >
      <defs>
        <linearGradient id="bld-tower-1" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id="bld-tower-2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0052cc" />
          <stop offset="100%" stopColor="#0066f5" />
        </linearGradient>
        <linearGradient id="bld-tower-3" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#003d99" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      {/* Left Tower */}
      <path d="M7 17.5L15 11.5V35H7V17.5Z" fill="url(#bld-tower-1)" stroke="url(#bld-tower-1)" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Center Tower (Tallest) */}
      <path d="M16 8.5L25 2.5V35H16V8.5Z" fill="url(#bld-tower-2)" stroke="url(#bld-tower-2)" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Right Tower */}
      <path d="M26 14.5L34 8.5V35H26V14.5Z" fill="url(#bld-tower-3)" stroke="url(#bld-tower-3)" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Bottom ground line accent */}
      <rect x="6" y="34.5" width="29" height="2" rx="1" fill="#0066f5" fillOpacity="0.5" />
    </svg>
  );
}
