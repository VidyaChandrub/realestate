import type { CSSProperties } from "react";
import type {
  Device,
  LpDocument,
  LpPage as LpPageType,
  RowNode,
} from "@/lib/lp-types";
import { backgroundCss, boxCss } from "@/lib/lp-styles";
import { LpElement } from "./elements";
import { Icon } from "@/lib/lp-icon";

function hideCss(device: Device, value?: { desktop?: boolean; tablet?: boolean; mobile?: boolean }): CSSProperties {
  if (value?.[device]) return { display: "none" };
  return {};
}

function googleFontsHref(fonts?: { body?: string; heading?: string; mono?: string }): string {
  const names = [...new Set([fonts?.body, fonts?.heading, fonts?.mono].filter(Boolean))] as string[];
  if (names.length === 0) return "";
  const families = names
    .map((n) => n.replace(/ /g, "+"))
    .map((n) => `${n}:wght@300;400;500;600;700;800`)
    .join("&family=");
  return `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
}

export function FontLinks({ fonts }: { fonts?: { body?: string; heading?: string; mono?: string } }) {
  const href = googleFontsHref(fonts);
  if (!href) return null;
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={href} />
    </>
  );
}

export function LpHeader({
  header,
  document,
  device = "desktop",
}: {
  header?: LpDocument["header"];
  document?: LpDocument;
  device?: Device;
}) {
  if (!header?.enabled) return null;
  const fonts = document?.settings?.fonts;
  const headingFont = fonts?.heading;
  const bodyFont = fonts?.body;

  const bg = header.transparent ? "transparent" : header.background ?? "#ffffff";
  const color = header.textColor ?? "#1a2744";

  return (
    <header
      className="lp-header"
      style={{
        position: header.sticky ? "sticky" : "relative",
        top: 0,
        zIndex: 100,
        background: bg,
        color,
        boxShadow: header.sticky ? "0 2px 14px rgba(14,21,37,.08)" : "none",
      }}
    >
      <div
        className="lp-header-inner"
        style={{
          maxWidth: document?.settings?.containerWidth ?? 1200,
          margin: "0 auto",
          padding: "0 20px",
          height: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
        }}
      >
        <a href="#top" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color }}>
          {header.logo?.type === "image" && header.logo.image ? (
            <img src={header.logo.image} alt="logo" style={{ height: header.logo.height ?? 40 }} />
          ) : (
            <span
              style={{
                fontWeight: 800,
                fontSize: 22,
                letterSpacing: -0.5,
                fontFamily: headingFont ? `${headingFont}, serif` : undefined,
              }}
            >
              {header.logo?.text ?? "Brand"}
            </span>
          )}
        </a>

        <nav className="lp-menu" style={{ display: device === "mobile" ? "none" : "flex", alignItems: "center", gap: 24 }}>
          {(header.menu ?? []).map((item, i) => (
            <a
              key={i}
              href={item.href}
              style={{
                color,
                textDecoration: "none",
                fontSize: 14.5,
                fontWeight: 500,
                opacity: 0.85,
                fontFamily: bodyFont ? `${bodyFont}, sans-serif` : undefined,
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="lp-header-actions" style={{ display: "flex", alignItems: "center", gap: device === "mobile" ? 8 : 12 }}>
          {header.phone?.enabled && header.phone.number ? (
            <a
              href={`tel:${header.phone.number.replace(/\s/g, "")}`}
              style={{
                color,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: bodyFont ? `${bodyFont}, sans-serif` : undefined,
              }}
            >
              <Icon name="phone" size={16} />
              {header.phone.number}
            </a>
          ) : null}
          {header.whatsapp?.enabled && header.whatsapp.number ? (
            <a
              href={`https://wa.me/${header.whatsapp.number}?text=${encodeURIComponent(header.whatsapp.message ?? "Hello")}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "#25D366",
                color: "#fff",
                textDecoration: "none",
                fontSize: 13.5,
                fontWeight: 700,
                padding: "9px 16px",
                borderRadius: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                fontFamily: bodyFont ? `${bodyFont}, sans-serif` : undefined,
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
          ) : null}
          {header.cta?.label ? (
            <a
              href={header.cta.href ?? "#contact"}
              style={{
                background: document?.settings?.colors?.secondary ?? "#1a2744",
                color: "#fff",
                textDecoration: "none",
                fontSize: 13.5,
                fontWeight: 700,
                padding: "11px 20px",
                borderRadius: 8,
                fontFamily: bodyFont ? `${bodyFont}, sans-serif` : undefined,
              }}
            >
              {header.cta.label}
            </a>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function LpRow({
  row,
  device = "desktop",
  page,
  index,
  containerWidth = 1200,
}: {
  row: RowNode;
  device?: Device;
  page?: LpPageType;
  index: number;
  containerWidth?: number;
}) {
  const s = row.settings ?? {};

  // Respect the enabled flag
  if (s.enabled === false) return null;

  const boxed = s.layout !== "full_width";
  const fullContent = s.contentWidth === "full";
  const background = backgroundCss(s.background);
  const pad = boxCss(s.padding);

  const columnCount = row.columns.length || 1;
  const defaultWidth = 100 / columnCount;

  // Responsive column widths: mobile always 100%, tablet stacks if 3+ columns
  function colWidth(declared?: number): string {
    const base = declared ?? defaultWidth;
    if (device === "mobile") return "100%";
    if (device === "tablet" && columnCount >= 3) return base >= 33 ? "100%" : `${base}%`;
    return `${base}%`;
  }

  const content = (
    <div
      className="lp-row-inner"
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: s.gap ?? 0,
        margin: "0 auto",
        width: "100%",
        maxWidth: fullContent ? "100%" : containerWidth,
        ...(boxed ? pad : {}),
        alignItems:
          row.columns.some((c) => c.settings?.verticalAlign === "middle")
            ? "center"
            : row.columns.some((c) => c.settings?.verticalAlign === "bottom")
              ? "flex-end"
              : "stretch",
      }}
    >
      {row.columns.map((column) => {
        const width = colWidth(column.settings?.width);
        const align = column.settings?.align ?? "left";
        return (
          <div
            key={column.id}
            className="lp-column"
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent:
                column.settings?.verticalAlign === "middle"
                  ? "center"
                  : column.settings?.verticalAlign === "bottom"
                    ? "flex-end"
                    : "flex-start",
              alignItems:
                align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
              gap: 16,
              width,
              boxSizing: "border-box",
              ...boxCss(column.settings?.padding),
              ...hideCss(device, column.settings?.hidden),
            }}
          >
            {column.elements.map((element) => (
              <div key={element.id} style={{ width: "100%", display: "flex", flexDirection: "column" }}>
                <LpElement element={element} device={device} page={page} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );

  return (
    <section
      className="lp-row"
      data-row-index={index}
      style={{
        ...background,
        ...hideCss(device, s.hidden),
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minHeight: s.minHeight,
        ...(boxed ? {} : pad),
        borderRadius: s.border?.radius,
        boxShadow: s.shadow,
      }}
    >
      {content}
    </section>
  );
}

export function LpFooter({
  footer,
  document,
}: {
  footer?: LpDocument["footer"];
  document?: LpDocument;
}) {
  if (!footer?.enabled) return null;
  const bg = footer.background ?? "#0f1424";
  const color = footer.textColor ?? "#cfd6e4";

  return (
    <footer
      className="lp-footer"
      style={{ background: bg, color, padding: "56px 20px 28px" }}
    >
      <div
        style={{
          maxWidth: document?.settings?.containerWidth ?? 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(2, (footer.columns ?? []).length || 2)}, 1fr)`,
          gap: 36,
        }}
      >
        {(footer.columns ?? []).map((col, i) => (
          <div key={i}>
            {col.title ? (
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
                {col.title}
              </div>
            ) : null}
            {col.text ? (
              <p style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.7, margin: 0 }}>{col.text}</p>
            ) : null}
            {col.links ? (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {col.links.map((link, li) => (
                  <li key={li} style={{ marginBottom: 8 }}>
                    <a href={link.href} style={{ color, opacity: 0.85, textDecoration: "none", fontSize: 14 }}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>

      {footer.contact ? (
        <div
          style={{
            maxWidth: document?.settings?.containerWidth ?? 1200,
            margin: "36px auto 0",
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            fontSize: 14,
            opacity: 0.85,
          }}
        >
          {footer.contact.phone ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="phone" size={14} /> {footer.contact.phone}</span> : null}
          {footer.contact.email ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="mail" size={14} /> {footer.contact.email}</span> : null}
          {footer.contact.address ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="map-pin" size={14} /> {footer.contact.address}</span> : null}
        </div>
      ) : null}

      {footer.social && footer.social.length > 0 ? (
        <div
          style={{
            maxWidth: document?.settings?.containerWidth ?? 1200,
            margin: "24px auto 0",
            display: "flex",
            gap: 12,
          }}
        >
          {footer.social.map((social, i) => (
            <a
              key={i}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "rgba(255,255,255,.08)",
                color: "#fff",
                textDecoration: "none",
                fontSize: 15,
              }}
            >
              {social.platform === "facebook" ? "f" : social.platform === "instagram" ? <Icon name="camera" size={16} /> : social.platform === "linkedin" ? "in" : social.platform === "youtube" ? <Icon name="play" size={16} /> : "•"}
            </a>
          ))}
        </div>
      ) : null}

      {footer.disclaimer ? (
        <p
          style={{
            maxWidth: document?.settings?.containerWidth ?? 1200,
            margin: "28px auto 0",
            fontSize: 12,
            opacity: 0.55,
            lineHeight: 1.7,
          }}
        >
          {footer.disclaimer}
        </p>
      ) : null}

      {footer.copyright ? (
        <div
          style={{
            maxWidth: document?.settings?.containerWidth ?? 1200,
            margin: "20px auto 0",
            paddingTop: 18,
            borderTop: "1px solid rgba(255,255,255,.1)",
            fontSize: 13,
            opacity: 0.7,
            textAlign: "center",
          }}
        >
          {footer.copyright}
        </div>
      ) : null}
    </footer>
  );
}

export function LpPageRenderer({
  document,
  device = "desktop",
  page,
}: {
  document: LpDocument;
  device?: Device;
  page?: LpPageType;
}) {
  const fonts = document?.settings?.fonts;
  return (
    <div
      className="lp-page"
      style={{
        background: document?.settings?.pageBackground ?? "#ffffff",
        color: document?.settings?.contentColor ?? "#1c1c1c",
        fontFamily: fonts?.body ? `${fonts.body}, sans-serif` : "inherit",
        minHeight: "100vh",
      }}
      id="top"
    >
      <LpHeader header={document?.header} document={document} device={device} />
      <main>
        {(document?.rows ?? []).map((row, i) => (
          <LpRow
            key={row.id}
            row={row}
            device={device}
            page={page}
            index={i}
            containerWidth={document?.settings?.containerWidth ?? 1200}
          />
        ))}
      </main>
      <LpFooter footer={document?.footer} document={document} />
    </div>
  );
}