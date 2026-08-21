import type { CSSProperties } from "react";
import type {
  BackgroundSettings,
  BoxValue,
  Device,
  Responsive,
} from "./lp-types";
import { cssUrl } from "./media";

// Picks the device-specific value from a responsive object, falling back to
// desktop then the raw value.
export function pick<T>(device: Device, value: Responsive<T> | T): T | undefined {
  if (value === null || value === undefined || typeof value !== "object") {
    return value as T;
  }
  const candidate = value as Responsive<T>;
  if (!("desktop" in candidate) && !("tablet" in candidate) && !("mobile" in candidate)) {
    return value as T;
  }
  const v = candidate[device] ?? candidate.desktop;
  return v ?? (value as T);
}

export function boxCss(box?: BoxValue): CSSProperties {
  if (!box) return {};
  const style: CSSProperties = {};
  if (box.top !== undefined) style.paddingTop = box.top;
  if (box.right !== undefined) style.paddingRight = box.right;
  if (box.bottom !== undefined) style.paddingBottom = box.bottom;
  if (box.left !== undefined) style.paddingLeft = box.left;
  return style;
}

export function marginCss(box?: BoxValue): CSSProperties {
  if (!box) return {};
  const style: CSSProperties = {};
  if (box.top !== undefined) style.marginTop = box.top;
  if (box.right !== undefined) style.marginRight = box.right;
  if (box.bottom !== undefined) style.marginBottom = box.bottom;
  if (box.left !== undefined) style.marginLeft = box.left;
  return style;
}

export function backgroundCss(bg?: BackgroundSettings): CSSProperties {
  if (!bg) return {};
  const style: CSSProperties = {};
  if (bg.color) style.backgroundColor = bg.color;
  if (bg.gradient) style.backgroundImage = bg.gradient;
  else if (bg.image) style.backgroundImage = cssUrl(bg.image);
  if (bg.position) style.backgroundPosition = bg.position;
  if (bg.size) style.backgroundSize = bg.size;
  if (bg.overlayColor) {
    style.backgroundImage =
      `linear-gradient(${bg.overlayColor}, ${bg.overlayColor})` +
      (bg.image ? `, ${cssUrl(bg.image)}` : bg.gradient ? `, ${bg.gradient}` : "");
  }
  return style;
}

export function fontSizeValue(value: unknown): string | undefined {
  if (typeof value === "number") return `${value}px`;
  return value as string | undefined;
}

export function isResponsive(value: unknown): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    ("desktop" in (value as object) ||
      "tablet" in (value as object) ||
      "mobile" in (value as object))
  );
}