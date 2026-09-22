"use client";

import type { BlockConfig } from "../types";
import { ArrowRight } from "lucide-react";
import { useOpenPageRuntime } from "@/components/openpage/runtime/OpenPageRuntime";

interface CtaProps {
  headline: string;
  subheadline?: string;
  buttonText: string;
  buttonUrl?: string;
  popupId?: string;
  image?: string;
  secondaryButtonText?: string;
  secondaryButtonUrl?: string;
}

function useCtaClick(props: CtaProps) {
  const runtime = useOpenPageRuntime();
  return () => {
    if (props.popupId) {
      runtime.openPopup(props.popupId);
      return;
    }
    if (props.buttonUrl) {
      if (props.buttonUrl.startsWith("#")) {
        document.getElementById(props.buttonUrl.slice(1))?.scrollIntoView({ behavior: "smooth" });
        return;
      }
      window.location.href = props.buttonUrl;
      return;
    }
    document.getElementById("enquire")?.scrollIntoView({ behavior: "smooth" });
  };
}

function CtaSimple({ props }: { props: CtaProps }) {
  const onClick = useCtaClick(props);
  return (
    <section className="px-6 @md:px-10 py-16 @md:py-20 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-green/6 via-green/3 to-transparent pointer-events-none" />
      <div className="relative z-10">
        <h2 className="font-display reveal-fade-up reveal-d1 text-3xl @md:text-4xl font-semibold tracking-tight mb-3">
          {props.headline}
        </h2>
        {props.subheadline && (
          <p className="reveal-fade-up reveal-d2 text-text-2 text-sm mb-6 max-w-md mx-auto">
            {props.subheadline}
          </p>
        )}
        <div className="reveal-fade-up reveal-d3">
          <button type="button" onClick={onClick} className="px-8 py-3 rounded-lg bg-green text-black text-sm font-semibold hover:bg-green-dim transition-all hover:accent-glow-xl inline-flex items-center gap-2">
            {props.buttonText}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

function CtaBooking({ props }: { props: CtaProps }) {
  const onClick = useCtaClick(props);
  const onSecondary = () => {
    const url = props.secondaryButtonUrl || "#listings";
    if (url.startsWith("#")) {
      document.getElementById(url.slice(1))?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    window.location.href = url;
  };
  return (
    <section className="px-4 @md:px-8 py-10 @md:py-14 bg-bg-0">
      <div className="max-w-6xl mx-auto rounded-[28px] @md:rounded-[32px] overflow-hidden bg-[#141414] grid @lg:grid-cols-2 min-h-[320px]">
        <div className="relative min-h-[220px] @lg:min-h-full">
          {props.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={props.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-bg-4 to-bg-5" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#141414]/80 @lg:block hidden" />
        </div>
        <div className="flex flex-col justify-center px-8 @md:px-12 py-10 @md:py-14 text-white">
          <h2 className="font-display text-3xl @md:text-4xl font-medium mb-3">{props.headline}</h2>
          {props.subheadline ? <p className="text-white/75 text-sm @md:text-base mb-8 max-w-md">{props.subheadline}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onClick}
              className="px-6 py-3 rounded-full bg-white text-text-0 text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              {props.buttonText}
            </button>
            {props.secondaryButtonText ? (
              <button
                type="button"
                onClick={onSecondary}
                className="px-6 py-3 rounded-full border border-white/35 text-white text-sm font-semibold hover:bg-white/10 transition-colors"
              >
                {props.secondaryButtonText}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaSplit({ props }: { props: CtaProps }) {
  const onClick = useCtaClick(props);
  return (
    <section className="px-6 @md:px-10 py-12 @md:py-16">
      <div className="reveal-scale reveal-d1 flex flex-col @lg:flex-row items-center justify-between gap-6 p-8 rounded-2xl bg-bg-2 border border-border-default relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h2 className="font-display text-xl @md:text-2xl font-semibold tracking-tight mb-1">
            {props.headline}
          </h2>
          {props.subheadline && (
            <p className="text-text-2 text-sm">{props.subheadline}</p>
          )}
        </div>
        <button type="button" onClick={onClick} className="relative z-10 px-6 py-3 rounded-lg bg-green text-black text-sm font-semibold hover:bg-green-dim transition-all shrink-0 flex items-center gap-2">
          {props.buttonText}
          <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}

export function CtaBlock({ block }: { block: BlockConfig }) {
  const props = block.props as unknown as CtaProps

  switch (block.variant) {
    case 'split':
      return <CtaSplit props={props} />
    case 'booking':
      return <CtaBooking props={props} />
    default:
      return <CtaSimple props={props} />
  }
}
