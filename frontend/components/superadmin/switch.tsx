"use client";

import { useState } from "react";

type SwitchProps = {
  defaultOn?: boolean;
};

export function Switch({ defaultOn = false }: SwitchProps) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div
      className={`switch${on ? " on" : ""}`}
      onClick={() => setOn((v) => !v)}
      role="switch"
      aria-checked={on}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOn((v) => !v);
        }
      }}
    />
  );
}