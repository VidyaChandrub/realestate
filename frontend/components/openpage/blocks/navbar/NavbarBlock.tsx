"use client";

import { useState } from "react";
import type { BlockConfig } from "../types";
import { Menu, X } from "lucide-react";

interface NavbarProps {
  logo: string;
  logoImage?: string;
  links: string[];
  ctaText: string;
}

function NavLinks({ links, onClick }: { links: string[]; onClick?: () => void }) {
  return (
    <>
      {links.map((link, i) => (
        <a
          key={i}
          href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}
          onClick={onClick}
          className="text-[13px] text-text-2 hover:text-text-0 transition-colors"
        >
          {link}
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

function NavbarDefault({ props, sticky }: { props: NavbarProps; sticky?: boolean }) {
  const { logo, logoImage, links = [], ctaText } = props;
  const [open, setOpen] = useState(false);

  return (
    <nav className={`${sticky ? "sticky top-0 z-40 backdrop-blur-md bg-bg-1/90 border-b border-border-subtle" : ""} px-6 @md:px-10 py-3.5`}>
      <div className="flex items-center justify-between gap-4">
        <Brand logo={logo} logoImage={logoImage} />
        <div className="hidden @2xl:flex items-center gap-7">
          <NavLinks links={links} />
        </div>
        <div className="flex items-center gap-3">
          <a
            href="#enquire"
            className="px-4 py-2 rounded-lg bg-green text-black text-[13px] font-semibold hover:bg-green-dim transition-all hover:accent-glow-md"
          >
            {ctaText}
          </a>
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
          <NavLinks links={links} onClick={() => setOpen(false)} />
        </div>
      ) : null}
    </nav>
  );
}

function NavbarCentered({ props }: { props: NavbarProps }) {
  const { logo, logoImage, links = [], ctaText } = props;
  const mid = Math.ceil(links.length / 2);
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 backdrop-blur-md bg-bg-1/90 border-b border-border-subtle px-6 @md:px-10 py-3.5">
      <div className="flex items-center justify-between">
        <div className="hidden @2xl:flex items-center gap-6 flex-1">
          <NavLinks links={links.slice(0, mid)} />
        </div>
        <Brand logo={logo} logoImage={logoImage} />
        <div className="hidden @2xl:flex items-center gap-6 flex-1 justify-end">
          <NavLinks links={links.slice(mid)} />
          <a href="#enquire" className="px-4 py-2 rounded-lg bg-green text-black text-[13px] font-semibold hover:bg-green-dim transition-colors ml-2">
            {ctaText}
          </a>
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
          <NavLinks links={links} onClick={() => setOpen(false)} />
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
