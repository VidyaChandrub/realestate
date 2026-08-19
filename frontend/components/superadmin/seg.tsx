"use client";

import { useState } from "react";

type SegProps = {
  options: string[];
  defaultIndex?: number;
};

export function Seg({ options, defaultIndex = 0 }: SegProps) {
  const [idx, setIdx] = useState(defaultIndex);
  return (
    <span className="seg">
      {options.map((opt, i) => (
        <span
          key={opt}
          className={i === idx ? "on" : ""}
          onClick={() => setIdx(i)}
        >
          {opt}
        </span>
      ))}
    </span>
  );
}