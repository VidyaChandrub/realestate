import type { CSSProperties } from "react";
import type { BlockConfig, BlockStyle } from "@/components/openpage/blocks/types";

/** Convert persisted BlockStyle into CSS for editor canvas and live pages. */
export function applyBlockStyle(style?: BlockStyle): CSSProperties {
  if (!style) return {};
  const s: CSSProperties = {};

  if (style.marginTop) s.marginTop = style.marginTop;
  if (style.marginBottom) s.marginBottom = style.marginBottom;
  if (style.marginLeft) s.marginLeft = style.marginLeft;
  if (style.marginRight) s.marginRight = style.marginRight;
  if (style.paddingTop) s.paddingTop = style.paddingTop;
  if (style.paddingBottom) s.paddingBottom = style.paddingBottom;
  if (style.paddingLeft) s.paddingLeft = style.paddingLeft;
  if (style.paddingRight) s.paddingRight = style.paddingRight;
  if (style.width) s.width = style.width;
  if (style.maxWidth) s.maxWidth = style.maxWidth;
  if (style.minHeight) s.minHeight = style.minHeight;
  if (style.alignment) s.textAlign = style.alignment as CSSProperties["textAlign"];
  if (style.backgroundColor) s.backgroundColor = style.backgroundColor;
  if (style.backgroundImage) {
    s.backgroundImage = style.backgroundImage.startsWith("url(")
      ? style.backgroundImage
      : `url(${style.backgroundImage})`;
  }
  if (style.backgroundSize) s.backgroundSize = style.backgroundSize;
  if (style.backgroundPosition) s.backgroundPosition = style.backgroundPosition;
  if (style.backgroundRepeat) s.backgroundRepeat = style.backgroundRepeat as CSSProperties["backgroundRepeat"];
  if (style.borderWidth) s.borderWidth = style.borderWidth;
  if (style.borderStyle) s.borderStyle = style.borderStyle as CSSProperties["borderStyle"];
  if (style.borderColor) s.borderColor = style.borderColor;
  if (style.borderRadius) s.borderRadius = style.borderRadius;
  if (style.boxShadow) s.boxShadow = style.boxShadow;
  if (style.opacity) s.opacity = Number.parseFloat(style.opacity);
  if (style.overflow) s.overflow = style.overflow as CSSProperties["overflow"];
  if (style.zIndex) s.zIndex = Number.parseInt(style.zIndex, 10);

  if (style.sectionPadding) s.padding = style.sectionPadding;
  if (style.sectionMaxWidth) s.maxWidth = style.sectionMaxWidth;
  if (style.sectionAlignment) s.textAlign = style.sectionAlignment as CSSProperties["textAlign"];
  if (style.sectionBackground) s.background = style.sectionBackground;
  if (style.sectionBorderWidth) s.borderWidth = style.sectionBorderWidth;
  if (style.sectionBorderColor) s.borderColor = style.sectionBorderColor;
  if (style.sectionBorderRadius) s.borderRadius = style.sectionBorderRadius;

  const typo = style.typography;
  if (typo?.fontFamily) s.fontFamily = typo.fontFamily;
  if (typo?.fontSize) s.fontSize = typo.fontSize;
  if (typo?.fontWeight) s.fontWeight = typo.fontWeight as CSSProperties["fontWeight"];
  if (typo?.lineHeight) s.lineHeight = typo.lineHeight;
  if (typo?.letterSpacing) s.letterSpacing = typo.letterSpacing;
  if (typo?.textTransform) s.textTransform = typo.textTransform as CSSProperties["textTransform"];
  if (typo?.textDecoration) s.textDecoration = typo.textDecoration as CSSProperties["textDecoration"];
  if (typo?.color) s.color = typo.color;
  if (typo?.textAlign) s.textAlign = typo.textAlign as CSSProperties["textAlign"];

  return s;
}

const DURATION_MS: Record<string, string> = {
  fast: "200ms",
  normal: "400ms",
  slow: "600ms",
  slower: "800ms",
  slowest: "1200ms",
};

export function blockAnimationClass(block: BlockConfig): string {
  if (!block.animation) return "";
  return `op-block-anim op-block-anim--${block.animation}`;
}

export function blockAnimationStyle(block: BlockConfig): CSSProperties {
  if (!block.animation) return {};
  const duration = DURATION_MS[block.animationDuration || "normal"] || block.animationDuration || "400ms";
  const delay = block.animationDelay ? `${block.animationDelay}ms` : undefined;
  return {
    animationDuration: duration,
    animationDelay: delay,
    animationFillMode: "both",
  };
}

export function blockResponsiveHideClass(style?: BlockStyle): string {
  if (!style) return "";
  const parts: string[] = [];
  if (style.hideOnDesktop) parts.push("op-hide-desktop");
  if (style.hideOnTablet) parts.push("op-hide-tablet");
  if (style.hideOnMobile) parts.push("op-hide-mobile");
  return parts.join(" ");
}

export function isHiddenOnViewport(
  style: BlockStyle | undefined,
  viewport: "desktop" | "tablet" | "mobile",
): boolean {
  if (!style) return false;
  if (viewport === "desktop" && style.hideOnDesktop) return true;
  if (viewport === "tablet" && style.hideOnTablet) return true;
  if (viewport === "mobile" && style.hideOnMobile) return true;
  return false;
}

/** Deep-replace {{var}} tokens in any JSON-like value. */
export function applyVarsDeep(value: unknown, vars: Record<string, string>): unknown {
  if (typeof value === "string") {
    return value.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_m, key: string) =>
      vars[key] != null && vars[key] !== "" ? vars[key] : `{{${key}}}`,
    );
  }
  if (Array.isArray(value)) return value.map((item) => applyVarsDeep(item, vars));
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      next[k] = applyVarsDeep(v, vars);
    }
    return next;
  }
  return value;
}
