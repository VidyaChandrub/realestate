import type { CSSProperties } from "react";
import type { BlockConfig, BlockStyle } from "@/components/openpage/blocks/types";
import type { Device } from "@/lib/openpage/types";

/** Merge the device-specific value overrides over the desktop style. */
export function resolveBlockStyleForDevice(
  style: BlockStyle | undefined,
  device: Device,
): BlockStyle | undefined {
  if (!style || device === "desktop") return style;
  const overrides = style.responsive?.[device];
  if (!overrides) return style;
  const resolved: BlockStyle = { ...style };
  delete resolved.responsive;
  Object.assign(resolved, overrides);
  resolved.responsive = style.responsive;
  return resolved;
}

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

/** Full device-aware render: resolved values + visibility for the active device. */
export function applyBlockStyleForDevice(
  style: BlockStyle | undefined,
  device: Device,
): CSSProperties {
  const resolved = resolveBlockStyleForDevice(style, device);
  const css = applyBlockStyle(resolved);
  if (isHiddenOnViewport(resolved, device)) {
    css.display = "none";
  }
  return css;
}

const BLOCK_TEXT_SELECTOR = "h1,h2,h3,h4,h5,h6,p,span,li,label,small,strong,em,figcaption,blockquote";

/**
 * Scoped `!important` stylesheet so user styles actually beat the block's own
 * utility classes. Without this, `font-size`/`color` on the section wrapper are
 * only inherited and get overridden by inner classes (e.g. `text-3xl`), and a
 * `background-color` is hidden whenever the block root paints its own surface.
 * Rules:
 *   - `> *`  = the block's root element receives the user background.
 *   - text element selector receives the user typography.
 */
export function blockStyleTag(blockId: string, style?: BlockStyle): string {
  if (!style) return "";
  const rootRules: string[] = [];
  const textRules: string[] = [];

  if (style.backgroundColor) rootRules.push(`background-color:${style.backgroundColor} !important`);
  if (style.backgroundImage) {
    rootRules.push(
      `background-image:${style.backgroundImage.startsWith("url(") ? style.backgroundImage : `url(${style.backgroundImage})`} !important`,
    );
  }
  if (style.backgroundSize) rootRules.push(`background-size:${style.backgroundSize} !important`);
  if (style.backgroundPosition) rootRules.push(`background-position:${style.backgroundPosition} !important`);
  if (style.backgroundRepeat) rootRules.push(`background-repeat:${style.backgroundRepeat} !important`);
  if (style.borderColor) rootRules.push(`border-color:${style.borderColor} !important`);
  if (style.borderWidth) rootRules.push(`border-width:${style.borderWidth} !important`);
  if (style.borderStyle) rootRules.push(`border-style:${style.borderStyle} !important`);
  if (style.borderRadius) rootRules.push(`border-radius:${style.borderRadius} !important`);
  if (style.boxShadow) rootRules.push(`box-shadow:${style.boxShadow} !important`);
  if (style.opacity) rootRules.push(`opacity:${style.opacity} !important`);

  const t = style.typography;
  if (t?.color) textRules.push(`color:${t.color} !important`);
  if (t?.fontSize && t.fontSize.trim()) textRules.push(`font-size:${t.fontSize} !important`);
  if (t?.fontFamily) textRules.push(`font-family:${t.fontFamily} !important`);
  if (t?.fontWeight) textRules.push(`font-weight:${t.fontWeight} !important`);
  if (t?.lineHeight) textRules.push(`line-height:${t.lineHeight} !important`);
  if (t?.letterSpacing) textRules.push(`letter-spacing:${t.letterSpacing} !important`);
  if (t?.textTransform) textRules.push(`text-transform:${t.textTransform} !important`);
  if (t?.textDecoration) textRules.push(`text-decoration:${t.textDecoration} !important`);
  if (t?.textAlign) textRules.push(`text-align:${t.textAlign} !important`);

  const parts: string[] = [];
  if (rootRules.length) parts.push(`[data-block-id="${blockId}"] > *{${rootRules.join(";")}}`);
  if (textRules.length) parts.push(`[data-block-id="${blockId}"] :where(${BLOCK_TEXT_SELECTOR}){${textRules.join(";")}}`);
  return parts.join("\n");
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
