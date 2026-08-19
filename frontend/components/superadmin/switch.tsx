"use client";

import { useState } from "react";

type SwitchProps = {
  defaultOn?: boolean;
  checked?: boolean;
  onChange?: (on: boolean) => void;
};

export function Switch({ defaultOn = false, checked, onChange }: SwitchProps) {
  const [uncontrolledOn, setUncontrolledOn] = useState(defaultOn);
  const isControlled = checked !== undefined;
  const on = isControlled ? checked : uncontrolledOn;

  function toggle() {
    const next = !on;
    if (!isControlled) setUncontrolledOn(next);
    onChange?.(next);
  }

  return (
    <div
      className={`switch${on ? " on" : ""}`}
      onClick={toggle}
      role="switch"
      aria-checked={on}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
    />
  );
}