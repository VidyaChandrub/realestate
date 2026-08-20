"use client";

import { useEffect, useState } from "react";

type Parts = { d: string; h: string; m: string; s: string };

function compute(targetDate: string): Parts {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (!targetDate || diff <= 0) return { d: "00", h: "00", m: "00", s: "00" };
  const s = Math.floor(diff / 1000);
  return {
    d: String(Math.floor(s / 86400)).padStart(2, "0"),
    h: String(Math.floor((s % 86400) / 3600)).padStart(2, "0"),
    m: String(Math.floor((s % 3600) / 60)).padStart(2, "0"),
    s: String(s % 60).padStart(2, "0"),
  };
}

export function LpCountdown({
  targetDate,
  colors,
}: {
  targetDate: string;
  colors: Record<string, unknown>;
}) {
  const [parts, setParts] = useState<Parts>(() => compute(targetDate));

  useEffect(() => {
    const id = setInterval(() => setParts(compute(targetDate)), 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  const box = (value: string, label: string) => (
    <div
      style={{
        background: (colors.boxColor as string) ?? "#1a2744",
        color: (colors.boxTextColor as string) ?? "#ffffff",
        borderRadius: typeof colors.radius === "number" ? colors.radius : 10,
        minWidth: 64,
        padding: "10px 8px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
      {box(parts.d, "Days")}
      {box(parts.h, "Hours")}
      {box(parts.m, "Mins")}
      {box(parts.s, "Secs")}
    </div>
  );
}