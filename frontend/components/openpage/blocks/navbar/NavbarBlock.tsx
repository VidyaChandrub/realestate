"use client";

import { useState, type MouseEvent } from "react";
import type { BlockConfig } from "../types";
import { Menu, X } from "lucide-react";

export type NavMenuItem = {
  label: string;
  /** Section id without # — e.g. "amenities", "plans", "enquire" */
  id?: string;
  href?: string;
};

interface NavbarProps {
  logo: string;
  logoImage?: string;
  /** Legacy string labels or structured { label, id } menu items. */
  links?: Array<string | NavMenuItem>;
  menuItems?: NavMenuItem[];
  ctaText: string;
  ctaId?: string;
  ctaHref?: string;
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Normalize any stored navbar links into label + hash target. */
export function normalizeNavLinks(
  links?: Array<string | NavMenuItem>,
  menuItems?: NavMenuItem[],
): Array<{ label: string; href: string }> {
  const source = (menuItems && menuItems.length ? menuItems : links) ?? [];
  return source
    .map((item) => {
      if (typeof item === "string") {
        const label = item.trim();
        if (!label) return null;
        return { label, href: `#${slugify(label)}` };
      }
      const label = String(item.label || "").trim();
      if (!label) return null;
      const raw = String(item.href || item.id || "").trim();
      const id = raw.replace(/^#/, "") || slugify(label);
      return { label, href: `#${id}` };
    })
    .filter(Boolean) as Array<{ label: string; href: string }>;
}

function scrollToHash(href: string) {
  if (typeof document === "undefined") return;
  const id = href.replace(/^#/, "");
  if (!id) return;
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}`);
    }
  }
}

function handleNavClick(e: MouseEvent<HTMLAnchorElement>, href: string, onClick?: () => void) {
  if (!href.startsWith("#")) {
    onClick?.();
    return;
  }
  e.preventDefault();
  scrollToHash(href);
  onClick?.();
}

function NavLinks({
  items,
  onClick,
}: {
  items: Array<{ label: string; href: string }>;
  onClick?: () => void;
}) {
  return (
    <>
      {items.map((item, i) => (
        <a
          key={`${item.href}-${i}`}
          href={item.href}
          onClick={(e) => handleNavClick(e, item.href, onClick)}
          className="text-[13px] text-text-2 hover:text-text-0 transition-colors"
        >
          {item.label}
        </a>
      ))}
    </>
  );
}

function Brand({ logo, logoImage }: { logo: string; logoImage?: string }) {
  return (
    <div className="flex items-center gap-2">
      {logoImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoImage} alt={logo} className="h-8 w-auto object-contain" />
      ) : (
        <div className="w-8 h-8 rounded-lg bg-green/10 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-green" />
        </div>
      )}
      <span className="font-semibold text-[15px] text-text-0 tracking-tight font-display">{logo}</span>
    </div>
  );
}

function CtaButton({
  text,
  href,
  onClick,
}: {
  text: string;
  href: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      onClick={(e) => handleNavClick(e, href, onClick)}
      className="px-4 py-2 rounded-lg bg-green text-black text-[13px] font-semibold hover:bg-green-dim transition-all hover:accent-glow-md"
    >
      {text}
    </a>
  );
}

function resolveCtaHref(props: NavbarProps): string {
  const raw = String(props.ctaHref || props.ctaId || "enquire").trim();
  if (!raw) return "#enquire";
  if (raw.startsWith("#") || raw.startsWith("http") || raw.startsWith("/")) return raw;
  return `#${raw}`;
}

function NavbarDefault({ props, sticky }: { props: NavbarProps; sticky?: boolean }) {
  const { logo, logoImage, ctaText } = props;
  const items = normalizeNavLinks(props.links, props.menuItems);
  const ctaHref = resolveCtaHref(props);
  const [open, setOpen] = useState(false);

  return (
    <nav className={`${sticky ? "sticky top-0 z-40 backdrop-blur-md bg-bg-1/90 border-b border-border-subtle" : ""} px-6 @md:px-10 py-3.5`}>
      <div className="flex items-center justify-between gap-4">
        <Brand logo={logo} logoImage={logoImage} />
        <div className="hidden @2xl:flex items-center gap-7">
          <NavLinks items={items} />
        </div>
        <div className="flex items-center gap-3">
          {ctaText ? <CtaButton text={ctaText} href={ctaHref} /> : null}
          <button
            type="button"
            className="@2xl:hidden w-9 h-9 rounded-lg border border-border-default flex items-center justify-center text-text-2 hover:text-text-0 hover:bg-bg-3 transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>
      {open ? (
        <div className="@2xl:hidden flex flex-col gap-3 pt-4 pb-2">
          <NavLinks items={items} onClick={() => setOpen(false)} />
        </div>
      ) : null}
    </nav>
  );
}

function NavbarCentered({ props }: { props: NavbarProps }) {
  const { logo, logoImage, ctaText } = props;
  const items = normalizeNavLinks(props.links, props.menuItems);
  const ctaHref = resolveCtaHref(props);
  const mid = Math.ceil(items.length / 2);
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 backdrop-blur-md bg-bg-1/90 border-b border-border-subtle px-6 @md:px-10 py-3.5">
      <div className="flex items-center justify-between">
        <div className="hidden @2xl:flex items-center gap-6 flex-1">
          <NavLinks items={items.slice(0, mid)} />
        </div>
        <Brand logo={logo} logoImage={logoImage} />
        <div className="hidden @2xl:flex items-center gap-6 flex-1 justify-end">
          <NavLinks items={items.slice(mid)} />
          {ctaText ? <CtaButton text={ctaText} href={ctaHref} /> : null}
        </div>
        <button
          type="button"
          className="@2xl:hidden w-9 h-9 rounded-lg border border-border-default flex items-center justify-center"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>
      {open ? (
        <div className="@2xl:hidden flex flex-col gap-3 pt-4">
          <NavLinks items={items} onClick={() => setOpen(false)} />
          {ctaText ? <CtaButton text={ctaText} href={ctaHref} onClick={() => setOpen(false)} /> : null}
        </div>
      ) : null}
    </nav>
  );
}

export function NavbarBlock({ block }: { block: BlockConfig }) {
  const props = block.props as unknown as NavbarProps;
  switch (block.variant) {
    case "centered":
      return <NavbarCentered props={props} />;
    default:
      return <NavbarDefault props={props} sticky={block.variant !== "static"} />;
  }
}
