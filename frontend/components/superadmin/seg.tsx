"use client";

import { useState } from "react";

type SegProps = {
  options: string[];
  defaultIndex?: number;
  value?: number;
  onChange?: (index: number) => void;
  disabledOptions?: string[];
  titleFor?: (option: string) => string | undefined;
};

export function Seg({
  options,
  defaultIndex = 0,
  value,
  onChange,
  disabledOptions,
  titleFor,
}: SegProps) {
  const [uncontrolledIdx, setUncontrolledIdx] = useState(defaultIndex);
  const isControlled = value !== undefined;
  const idx = isControlled ? value : uncontrolledIdx;

  function select(i: number, opt: string) {
    if (disabledOptions?.includes(opt)) return;
    if (!isControlled) setUncontrolledIdx(i);
    onChange?.(i);
  }

  return (
    <span className="seg">
      {options.map((opt, i) => {
        const disabled = disabledOptions?.includes(opt);
        return (
          <span
            key={opt}
            className={[i === idx ? "on" : "", disabled ? "disabled" : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => select(i, opt)}
            title={titleFor?.(opt)}
          >
            {opt}
          </span>
        );
      })}
    </span>
  );
}