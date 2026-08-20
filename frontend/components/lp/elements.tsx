import type { CSSProperties, ReactNode } from "react";
import type {
  Device,
  ElementNode,
  LpPage,
} from "@/lib/lp-types";
import {
  backgroundCss,
  boxCss,
  fontSizeValue,
  marginCss,
  pick,
} from "@/lib/lp-styles";
import { LeadForm } from "./lead-form";
import { LpCountdown } from "./lp-countdown";
import { Icon } from "@/lib/lp-icon";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

type ElementSettings = Record<string, unknown>;

function MetaItem({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <Icon name={icon} size={14} />
      {children}
    </span>
  );
}

function num(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function alignCss(align: unknown): CSSProperties {
  if (align === "center") return { textAlign: "center", alignItems: "center" };
  if (align === "right") return { textAlign: "right", alignItems: "flex-end" };
  return { textAlign: "left", alignItems: "flex-start" };
}

function buttonSize(size: unknown): CSSProperties {
  if (size === "sm") return { padding: "8px 16px", fontSize: 13 };
  if (size === "lg") return { padding: "16px 32px", fontSize: 16 };
  return { padding: "12px 24px", fontSize: 14 };
}

function buttonStyle(
  style: unknown,
  bgColor?: string,
  textColor?: string,
): CSSProperties {
  if (style === "outline") {
    return {
      background: "transparent",
      border: `2px solid ${bgColor ?? "#1a2744"}`,
      color: bgColor ?? "#1a2744",
    };
  }
  if (style === "ghost") {
    return {
      background: "transparent",
      border: "none",
      color: textColor ?? bgColor ?? "#1a2744",
      paddingLeft: 0,
      paddingRight: 0,
    };
  }
  return {
    background: bgColor ?? "#1a2744",
    border: "none",
    color: textColor ?? "#ffffff",
  };
}

function radiusOf(settings: ElementSettings, key = "radius"): CSSProperties {
  const r = num(settings[key]);
  return r !== undefined ? { borderRadius: r } : {};
}

function shadowOf(settings: ElementSettings, key = "shadow"): CSSProperties {
  const s = str(settings[key]);
  return s ? { boxShadow: s } : {};
}

// ---------------------------------------------------------------------------
// Element renderer — public + builder share this.
// ---------------------------------------------------------------------------

export function LpElement({
  element,
  device,
  page,
}: {
  element: ElementNode;
  device: Device;
  page?: LpPage;
}) {
  const s = element.settings ?? {};
  const align = alignCss(s.align);
  const margins = marginCss(
    {
      top: num(s.marginTop),
      right: num(s.marginRight),
      bottom: num(s.marginBottom),
      left: num(s.marginLeft),
    },
  );

  let content: ReactNode = null;

  switch (element.type) {
    case "heading": {
      const tag = (str(s.tag) ?? "h2").toLowerCase() as
        | "h1"
        | "h2"
        | "h3"
        | "h4"
        | "h5"
        | "h6";
      const sizeByTag: Record<string, number> = {
        h1: 36,
        h2: 30,
        h3: 24,
        h4: 20,
        h5: 18,
        h6: 16,
      };
      const computedSize =
        fontSizeValue(pick(device, s.size as never)) ??
        (s.tag ? undefined : `${sizeByTag[tag] ?? 24}px`);
      const Heading = (
        {
          h1: "h1",
          h2: "h2",
          h3: "h3",
          h4: "h4",
          h5: "h5",
          h6: "h6",
        } as const
      )[tag];
      content = (
        <Heading
          style={{
            ...margins,
            ...align,
            color: str(s.color) ?? undefined,
            fontSize: computedSize,
            fontWeight: num(s.weight) ?? 700,
            lineHeight: num(s.lineHeight) ?? 1.2,
            letterSpacing: num(s.letterSpacing),
            textTransform: str(s.textTransform) as never,
            margin: 0,
          }}
        >
          {str(s.text)?.split("\n").map((line, i) => (
            <span key={i}>
              {i > 0 && <br />}
              {line}
            </span>
          ))}
        </Heading>
      );
      break;
    }
    case "text": {
      content = (
        <div
          style={{
            ...margins,
            ...align,
            color: str(s.color) ?? undefined,
            fontSize: fontSizeValue(pick(device, s.size as never)),
            fontWeight: num(s.weight),
            lineHeight: num(s.lineHeight) ?? 1.6,
            letterSpacing: num(s.letterSpacing),
            textTransform: str(s.textTransform) as never,
            wordBreak: "break-word",
          }}
          dangerouslySetInnerHTML={{ __html: str(s.text) ?? "" }}
        />
      );
      break;
    }
    case "image": {
      const width = pick(device, s.width as never);
      const w = num(width) ?? 100;
      const image = (
        <img
          src={str(s.src) ?? "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2ViIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM5YWEzYjIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZTwvdGV4dD48L3N2Zz4="}
          alt={str(s.alt) ?? ""}
          style={{
            width: `${w}%`,
            maxWidth: "100%",
            height: "auto",
            borderRadius: num(s.radius),
            ...shadowOf(s),
            display: "block",
          }}
        />
      );
      const wrapped = str(s.link) ? (
        <a href={str(s.link)} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
          {image}
        </a>
      ) : (
        image
      );
      content = (
        <div style={{ ...margins, ...align, display: "flex", flexDirection: "column", width: "100%" }}>
          {wrapped}
          {s.caption ? (
            <span style={{ marginTop: 8, fontSize: 13, color: "#7a8298" }}>{str(s.caption)}</span>
          ) : null}
        </div>
      );
      break;
    }
    case "button": {
      content = (
        <div style={{ ...margins, ...align, display: "flex", width: "100%" }}>
          <a
            href={str(s.link) ?? "#"}
            style={{
              ...buttonSize(s.size),
              ...buttonStyle(s.style, str(s.bgColor), str(s.textColor)),
              ...radiusOf(s),
              ...shadowOf(s),
              borderRadius: num(s.radius),
              fontWeight: num(s.fontWeight) ?? 600,
              cursor: "pointer",
              display: "inline-block",
              textDecoration: "none",
              textAlign: "center",
              width: s.fullWidth ? "100%" : "auto",
            }}
          >
            {str(s.text) ?? "Button"}
          </a>
        </div>
      );
      break;
    }
    case "icon": {
      content = (
        <div style={{ ...margins, ...align, display: "flex", width: "100%" }}>
          <Icon
            name={s.icon}
            size={fontSizeValue(pick(device, s.size as never)) ?? 32}
            color={str(s.color) ?? undefined}
          />
        </div>
      );
      break;
    }
    case "icon-box": {
      content = (
        <div
          style={{
            ...margins,
            ...backgroundCss(s.background as never),
            ...boxCss({ top: num(s.paddingY), bottom: num(s.paddingY), left: num(s.paddingX), right: num(s.paddingX) }),
            ...radiusOf(s),
            ...shadowOf(s),
            ...align,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            textAlign: align.textAlign as never,
          }}
        >
          <Icon name={s.icon} size={num(s.iconSize) ?? 40} color={str(s.iconColor) ?? undefined} />
          <div style={{ fontWeight: 700, fontSize: num(s.titleSize) ?? 18, color: str(s.titleColor) ?? undefined, marginTop: 12 }}>
            {str(s.title)}
          </div>
          {s.description ? (
            <div style={{ fontSize: num(s.descriptionSize) ?? 14.5, color: str(s.textColor) ?? undefined, marginTop: 6, lineHeight: 1.6 }}>
              {str(s.description)}
            </div>
          ) : null}
        </div>
      );
      break;
    }
    case "image-text": {
      const flip = s.layout === "image-right";
      const media = (
        <div style={{ flex: "0 0 46%", minWidth: 0 }}>
          <img
            src={str(s.image) ?? ""}
            alt={str(s.title) ?? ""}
            style={{ width: "100%", height: "auto", borderRadius: num(s.radius), ...shadowOf(s) }}
          />
        </div>
      );
      const copy = (
        <div style={{ flex: "1 1 54%", minWidth: 0 }}>
          {s.kicker ? (
            <div style={{ color: str(s.kickerColor) ?? undefined, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>
              {str(s.kicker)}
            </div>
          ) : null}
          <div style={{ fontSize: num(s.titleSize) ?? 26, fontWeight: 700, color: str(s.titleColor) ?? undefined, marginTop: 6 }}>
            {str(s.title)}
          </div>
          <div style={{ fontSize: num(s.textSize) ?? 15.5, color: str(s.textColor) ?? undefined, marginTop: 10, lineHeight: 1.7 }}>
            {str(s.text)}
          </div>
          {s.buttonText ? (
            <a
              href={str(s.buttonLink) ?? "#"}
              style={{
                ...buttonSize("md"),
                ...buttonStyle("solid", str(s.buttonBg) ?? "#1a2744", "#ffffff"),
                ...radiusOf(s, "buttonRadius"),
                display: "inline-block",
                marginTop: 18,
                textDecoration: "none",
              }}
            >
              {str(s.buttonText)}
            </a>
          ) : null}
        </div>
      );
      content = (
        <div
          style={{
            ...margins,
            ...align,
            display: "flex",
            flexDirection: flip ? "row-reverse" : "row",
            gap: num(s.gap) ?? 32,
            flexWrap: "wrap",
            width: "100%",
          }}
        >
          {media}
          {copy}
        </div>
      );
      break;
    }
    case "property-card": {
      content = (
        <div
          style={{
            ...margins,
            ...backgroundCss({ color: "#ffffff" }),
            ...radiusOf(s),
            ...shadowOf(s),
            overflow: "hidden",
            border: "1px solid #e8ebf1",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <img
            src={str(s.image) ?? ""}
            alt={str(s.title) ?? ""}
            style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }}
          />
          <div style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#161c2c" }}>{str(s.title)}</div>
            <div style={{ fontSize: 13.5, color: "#7a8298", marginTop: 4 }}>{str(s.location)}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1a2744", marginTop: 10 }}>{str(s.price)}</div>
            <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 13, color: "#5b6478" }}>
              {s.beds ? <MetaItem icon="bed">{str(s.beds)}</MetaItem> : null}
              {s.baths ? <MetaItem icon="bath">{str(s.baths)}</MetaItem> : null}
              {s.area ? <MetaItem icon="ruler">{str(s.area)}</MetaItem> : null}
            </div>
            <a
              href={str(s.ctaLink) ?? "#"}
              style={{
                marginTop: 16,
                ...buttonSize("md"),
                ...buttonStyle("solid", str(s.ctaBg) ?? "#1a2744", "#ffffff"),
                ...radiusOf(s, "ctaRadius"),
                display: "block",
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              {str(s.cta) ?? "Enquire Now"}
            </a>
          </div>
        </div>
      );
      break;
    }
    case "amenity-card": {
      content = (
        <div
          style={{
            ...margins,
            ...backgroundCss(s.background as never),
            ...boxCss({ top: num(s.paddingY) ?? 22, bottom: num(s.paddingY) ?? 22, left: num(s.paddingX) ?? 22, right: num(s.paddingX) ?? 22 }),
            ...radiusOf(s),
            ...shadowOf(s),
            ...align,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            textAlign: align.textAlign as never,
          }}
        >
          <Icon name={s.icon} size={num(s.iconSize) ?? 36} />
          <div style={{ fontWeight: 700, fontSize: 17, color: str(s.titleColor) ?? undefined, marginTop: 12 }}>
            {str(s.title)}
          </div>
          {s.description ? (
            <div style={{ fontSize: 14, color: str(s.textColor) ?? undefined, marginTop: 6, lineHeight: 1.6 }}>
              {str(s.description)}
            </div>
          ) : null}
        </div>
      );
      break;
    }
    case "gallery": {
      const images = Array.isArray(s.images) ? (s.images as string[]) : [];
      const cols = num(s.columns) ?? 3;
      content = (
        <div style={{ ...margins, width: "100%" }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: num(s.gap) ?? 12 }}>
            {images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Gallery ${i + 1}`}
                style={{ width: "100%", height: num(s.height) ?? 220, objectFit: "cover", borderRadius: num(s.radius) }}
              />
            ))}
          </div>
        </div>
      );
      break;
    }
    case "floor-plan": {
      content = (
        <div
          style={{
            ...margins,
            ...backgroundCss({ color: "#ffffff" }),
            ...radiusOf(s),
            ...shadowOf(s),
            border: "1px solid #e8ebf1",
            overflow: "hidden",
            display: "flex",
            flexDirection: s.layout === "stack" ? "column" : "row",
            flexWrap: "wrap",
          }}
        >
          <img
            src={str(s.image) ?? ""}
            alt={str(s.title) ?? ""}
            style={{ width: s.layout === "stack" ? "100%" : "55%", height: s.layout === "stack" ? "auto" : 260, objectFit: "cover" }}
          />
          <div style={{ padding: 20, flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#b8860b", letterSpacing: 2, textTransform: "uppercase" }}>
              Floor Plan
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#161c2c", marginTop: 4 }}>{str(s.title)}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14, fontSize: 14, color: "#5b6478" }}>
              <MetaItem icon="home">Area: {str(s.area)}</MetaItem>
              <MetaItem icon="bed">Beds: {str(s.beds)}</MetaItem>
              <MetaItem icon="bath">Baths: {str(s.baths)}</MetaItem>
              <MetaItem icon="wallet">{str(s.price)}</MetaItem>
            </div>
          </div>
        </div>
      );
      break;
    }
    case "pricing": {
      const highlighted = !!s.highlighted;
      content = (
        <div
          style={{
            ...margins,
            ...backgroundCss({ color: highlighted ? "#1a2744" : "#ffffff" }),
            ...boxCss({ top: 30, bottom: 30, left: 26, right: 26 }),
            ...radiusOf(s),
            ...shadowOf(s),
            border: highlighted ? "none" : "1px solid #e8ebf1",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            position: "relative",
            color: highlighted ? "#ffffff" : "#161c2c",
          }}
        >
          {highlighted ? (
            <div style={{ position: "absolute", top: 0, right: 0, background: "#c9a227", color: "#fff", fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: "0 0 0 10px" }}>
              MOST POPULAR
            </div>
          ) : null}
          <div style={{ fontSize: 15, fontWeight: 600, opacity: 0.85 }}>{str(s.name)}</div>
          <div style={{ fontSize: 30, fontWeight: 800, marginTop: 8 }}>{str(s.price)}</div>
          <div style={{ fontSize: 13, opacity: 0.75, marginTop: 2 }}>{str(s.area)}</div>
          <ul style={{ margin: "18px 0 0", padding: 0, listStyle: "none", fontSize: 14, opacity: 0.9 }}>
            {Array.isArray(s.features)
              ? (s.features as string[]).map((f, i) => (
                  <li key={i} style={{ padding: "6px 0", borderBottom: "1px solid rgba(128,128,128,.18)" }}>
                    <MetaItem icon="check">{f}</MetaItem>
                  </li>
                ))
              : null}
          </ul>
          <a
            href={str(s.ctaLink) ?? "#contact"}
            style={{
              marginTop: 20,
              ...buttonSize("md"),
              ...buttonStyle("solid", highlighted ? "#c9a227" : (str(s.ctaBg) ?? "#1a2744"), "#ffffff"),
              ...radiusOf(s, "ctaRadius"),
              display: "block",
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            {str(s.cta) ?? "Enquire Now"}
          </a>
        </div>
      );
      break;
    }
    case "map": {
      const src = str(s.embedUrl);
      content = (
        <div style={{ ...margins, width: "100%", ...radiusOf(s), overflow: "hidden", ...shadowOf(s) }}>
          <iframe
            src={src ?? "https://maps.google.com/maps?q=Bengaluru&t=&z=12&ie=UTF8&iwloc=&output=embed"}
            style={{ width: "100%", height: num(s.height) ?? 420, border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      );
      break;
    }
    case "testimonial": {
      const items = Array.isArray(s.items) ? (s.items as Record<string, string | number>[]) : [];
      content = (
        <div style={{ ...margins, width: "100%" }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${num(s.columns) ?? 3}, 1fr)`, gap: num(s.gap) ?? 20 }}>
            {items.map((item, i) => (
              <div
                key={i}
                style={{
                  ...backgroundCss({ color: "#ffffff" }),
                  ...boxCss({ top: 26, bottom: 26, left: 24, right: 24 }),
                  ...radiusOf(s),
                  ...shadowOf(s),
                  border: "1px solid #e8ebf1",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ color: "#d9a411", fontSize: 16, letterSpacing: 2, display: "flex", gap: 2 }}>
                  {Array.from({ length: Math.min(5, Number(item.rating) || 5) }).map((_, s) => (
                    <Icon key={s} name="star" size={16} />
                  ))}
                </div>
                <div style={{ fontSize: 15, color: "#3d4657", lineHeight: 1.7, marginTop: 10, fontStyle: "italic" }}>
                  &ldquo;{item.quote}&rdquo;
                </div>
                <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#1a2744", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                    {String(item.name ?? "?")[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#161c2c" }}>{item.name}</div>
                    <div style={{ fontSize: 12.5, color: "#7a8298" }}>{item.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      break;
    }
    case "faq": {
      const items = Array.isArray(s.items) ? (s.items as Record<string, string>[]) : [];
      content = (
        <div style={{ ...margins, width: "100%" }} className="lp-faq">
          {items.map((item, i) => (
            <details
              key={i}
              style={{
                ...backgroundCss({ color: "#ffffff" }),
                border: "1px solid #e8ebf1",
                borderRadius: num(s.radius) ?? 10,
                marginBottom: 10,
                overflow: "hidden",
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  padding: "16px 18px",
                  fontWeight: 600,
                  fontSize: 15.5,
                  color: "#161c2c",
                  listStyle: "none",
                }}
              >
                <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {item.question}
                  <span style={{ opacity: 0.6 }}>+</span>
                </span>
              </summary>
              <div style={{ padding: "0 18px 16px", fontSize: 14.5, color: "#5b6478", lineHeight: 1.7 }}>
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      );
      break;
    }
    case "contact-info": {
      content = (
        <div style={{ ...margins, ...align, display: "flex", flexDirection: "column", gap: 14, width: "100%" }}>
          {s.phone ? <div style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}><Icon name="phone" size={16} /> {str(s.phone)}</div> : null}
          {s.email ? <div style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}><Icon name="mail" size={16} /> {str(s.email)}</div> : null}
          {s.address ? <div style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}><Icon name="map-pin" size={16} /> {str(s.address)}</div> : null}
          {s.hours ? <div style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}><Icon name="clock" size={16} /> {str(s.hours)}</div> : null}
        </div>
      );
      break;
    }
    case "lead-form": {
      content = <LeadForm settings={s} pageSlug={page?.slug} />;
      break;
    }
    case "whatsapp": {
      const number = str(s.number) ?? "";
      const message = encodeURIComponent(str(s.message) ?? "Hello");
      content = (
        <div style={{ ...margins, ...align, display: "flex", width: "100%" }}>
          <a
            href={`https://wa.me/${number}?text=${message}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...buttonSize(s.size),
              ...buttonStyle("solid", "#25D366", "#ffffff"),
              ...radiusOf(s),
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            {str(s.text) ?? "Chat on WhatsApp"}
          </a>
        </div>
      );
      break;
    }
    case "call": {
      content = (
        <div style={{ ...margins, ...align, display: "flex", width: "100%" }}>
          <a
            href={`tel:${String(s.number ?? "").replace(/\s/g, "")}`}
            style={{
              ...buttonSize(s.size),
              ...buttonStyle(s.style, str(s.bgColor) ?? "#1a2744", str(s.textColor) ?? "#ffffff"),
              ...radiusOf(s),
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
            }}
          >
            <Icon name="phone" size={18} /> {str(s.text) ?? str(s.number) ?? "Call Now"}
          </a>
        </div>
      );
      break;
    }
    case "brochure": {
      content = (
        <div style={{ ...margins, ...align, display: "flex", width: "100%" }}>
          <a
            href={str(s.link) ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...buttonSize(s.size),
              ...buttonStyle(s.style, str(s.bgColor) ?? "#1a2744", str(s.textColor) ?? "#ffffff"),
              ...radiusOf(s),
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
            }}
          >
            <Icon name="download" size={18} /> {str(s.text) ?? "Download Brochure"}
          </a>
        </div>
      );
      break;
    }
    case "site-visit": {
      content = (
        <div style={{ ...margins, ...align, display: "flex", flexDirection: "column", width: "100%" }}>
          {s.title ? <div style={{ fontSize: 16, fontWeight: 700, color: str(s.titleColor) ?? undefined, marginBottom: 8 }}>{str(s.title)}</div> : null}
          <a
            href={str(s.link) ?? "#contact"}
            style={{
              ...buttonSize(s.size),
              ...buttonStyle("solid", str(s.bgColor) ?? "#1a2744", "#ffffff"),
              ...radiusOf(s),
              fontWeight: 600,
              display: "inline-block",
              textDecoration: "none",
              textAlign: "center",
            }}
          >
            <Icon name="calendar" size={18} /> {str(s.text) ?? "Schedule a Site Visit"}
          </a>
        </div>
      );
      break;
    }
    case "countdown": {
      const target = str(s.targetDate) ?? "";
      const title = str(s.title);
      content = (
        <div style={{ ...margins, ...align, width: "100%" }}>
          {title ? <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>{title}</div> : null}
          <LpCountdown targetDate={target} colors={s} />
        </div>
      );
      break;
    }
    case "divider": {
      content = (
        <div style={{ ...margins, width: "100%" }}>
          <div
            style={{
              borderTop: `${num(s.height) ?? 1}px ${str(s.style) ?? "solid"} ${str(s.color) ?? "#e2e6ee"}`,
              width: `${num(s.width) ?? 100}%`,
              margin: "0 auto",
            }}
          />
        </div>
      );
      break;
    }
    case "spacer": {
      const h = pick(device, s.height as never);
      content = <div style={{ ...margins, height: num(h) ?? 40 }} />;
      break;
    }
    case "html": {
      content = (
        <div
          style={{ ...margins, width: "100%" }}
          dangerouslySetInnerHTML={{ __html: str(s.content) ?? "" }}
        />
      );
      break;
    }
    case "video": {
      const src = str(s.src) ?? "";
      const embed = src.includes("youtube") || src.includes("youtu.be")
        ? src.replace(/watch\?v=/, "embed/").replace("youtu.be/", "youtube.com/embed/")
        : src;
      content = (
        <div style={{ ...margins, width: "100%", ...radiusOf(s), overflow: "hidden" }}>
          <iframe
            src={embed}
            style={{ width: "100%", height: num(s.height) ?? 400, border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
      break;
    }
    case "row": {
      // Flex container — used for CTA clusters, inline badges, etc.
      const children = element.elements ?? [];
      content = (
        <div
          style={{
            ...margins,
            ...align,
            display: "flex",
            flexWrap: s.wrap === false ? "nowrap" : "wrap",
            gap: num(s.gap) ?? 12,
            width: "100%",
            alignItems: "center",
          }}
        >
          {children.map((child) => (
            <LpElement key={child.id} element={child} device={device} page={page} />
          ))}
        </div>
      );
      break;
    }
    case "grid": {
      // CSS grid container for cards/features/pricing.
      const children = element.elements ?? [];
      content = (
        <div
          style={{
            ...margins,
            display: "grid",
            gridTemplateColumns: `repeat(${num(s.columns) ?? 3}, minmax(0, 1fr))`,
            gap: num(s.gap) ?? 20,
            width: "100%",
          }}
        >
          {children.map((child) => (
            <div key={child.id} style={{ display: "flex", minWidth: 0 }}>
              <LpElement element={child} device={device} page={page} />
            </div>
          ))}
        </div>
      );
      break;
    }
    default: {
      content = null;
      break;
    }
  }

  return <>{content}</>;
}