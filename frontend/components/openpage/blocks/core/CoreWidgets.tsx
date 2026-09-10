"use client";

import type { BlockConfig } from "./types";
import { isMediaSrc } from "@/lib/media";
import { ArrowRight, Calculator, Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";

function str(v: unknown, fallback = "") {
  return typeof v === "string" ? v : fallback;
}

export function HeadingBlock({ block }: { block: BlockConfig }) {
  const p = block.props;
  const Tag = (str(p.tag, "h2") || "h2") as "h1" | "h2" | "h3" | "h4";
  const href = str(p.url);
  const heading = <Tag className="font-display font-semibold tracking-tight text-3xl @md:text-4xl text-center">{str(p.text, "Heading")}</Tag>;
  return (
    <section className="px-6 @md:px-10 py-6">
      {href ? (
        <a href={href} className="block hover:opacity-90">
          {heading}
        </a>
      ) : (
        heading
      )}
    </section>
  );
}

export function TextBlock({ block }: { block: BlockConfig }) {
  return (
    <section className="px-6 @md:px-10 py-4">
      <p className="max-w-3xl mx-auto text-text-1 leading-relaxed text-center whitespace-pre-wrap">{str(block.props.body, "Write your copy here.")}</p>
    </section>
  );
}

export function ButtonBlock({ block }: { block: BlockConfig }) {
  const p = block.props;
  return (
    <section className="px-6 py-6 flex justify-center">
      <a
        href={str(p.url, "#enquire")}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-green text-black text-sm font-semibold hover:bg-green-dim"
      >
        {str(p.label, "Enquire Now")}
        <ArrowRight size={16} />
      </a>
    </section>
  );
}

export function IconBoxBlock({ block }: { block: BlockConfig }) {
  const p = block.props;
  const icon = str(p.icon);
  return (
    <section className="px-6 @md:px-10 py-8">
      <div className="max-w-sm mx-auto text-center rounded-2xl border border-border-default bg-bg-2 p-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-green/10 flex items-center justify-center overflow-hidden">
          {isMediaSrc(icon) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={icon} alt="" className="w-7 h-7 object-contain" />
          ) : (
            <span className="text-xl">{icon || "◆"}</span>
          )}
        </div>
        <h3 className="font-semibold mb-1">{str(p.title, "Icon box")}</h3>
        <p className="text-text-2 text-sm">{str(p.description, "Short supporting text.")}</p>
      </div>
    </section>
  );
}

export function ImageBoxBlock({ block }: { block: BlockConfig }) {
  const p = block.props;
  return (
    <section className="px-6 @md:px-10 py-8">
      <div className="max-w-sm mx-auto rounded-2xl border border-border-default bg-bg-1 overflow-hidden">
        <div className="aspect-[16/10] bg-bg-3">
          {str(p.image) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={str(p.image)} alt={str(p.title)} className="w-full h-full object-cover" />
          ) : null}
        </div>
        <div className="p-5">
          <h3 className="font-semibold mb-1">{str(p.title, "Image box")}</h3>
          <p className="text-text-2 text-sm">{str(p.description)}</p>
        </div>
      </div>
    </section>
  );
}

export function PropertySearchBlock({ block }: { block: BlockConfig }) {
  return (
    <section className="px-6 @md:px-10 py-10">
      <div className="max-w-3xl mx-auto rounded-2xl border border-border-default bg-bg-2 p-4 @md:p-5 flex flex-col @md:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 px-3 rounded-lg bg-bg-1 border border-border-default">
          <Search size={16} className="text-text-3" />
          <input className="flex-1 bg-transparent py-2.5 text-sm outline-none" placeholder={str(block.props.placeholder, "Search by location, project or configuration")} readOnly />
        </div>
        <button type="button" className="px-5 py-2.5 rounded-lg bg-green text-black text-sm font-semibold">{str(block.props.buttonText, "Search")}</button>
      </div>
    </section>
  );
}

export function PropertyFiltersBlock({ block }: { block: BlockConfig }) {
  const items = Array.isArray(block.props.items) ? (block.props.items as { label: string }[]) : [{ label: "2 BHK" }, { label: "3 BHK" }, { label: "Ready" }, { label: "Under construction" }];
  return (
    <section className="px-6 @md:px-10 py-6">
      <div className="flex flex-wrap justify-center gap-2">
        <span className="inline-flex items-center gap-1 text-text-3 text-xs uppercase tracking-wider mr-2"><Filter size={12} /> {str(block.props.title, "Filters")}</span>
        {items.map((it, i) => (
          <button key={i} type="button" className="px-3 py-1.5 rounded-full border border-border-default text-sm text-text-2 hover:border-green hover:text-text-0">
            {it.label || String(it)}
          </button>
        ))}
      </div>
    </section>
  );
}

export function EmiCalculatorBlock({ block }: { block: BlockConfig }) {
  const [principal, setPrincipal] = useState(Number(block.props.principal) || 14200000);
  const [rate, setRate] = useState(Number(block.props.rate) || 8.4);
  const [years, setYears] = useState(Number(block.props.years) || 20);
  const emi = useMemo(() => {
    const n = years * 12;
    const r = rate / 12 / 100;
    if (!n || !r) return 0;
    return Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  }, [principal, rate, years]);

  return (
    <section className="px-6 @md:px-10 py-16">
      <div className="max-w-xl mx-auto rounded-2xl border border-border-default bg-bg-2 p-6 @md:p-8">
        <div className="flex items-center gap-2 mb-5">
          <Calculator className="text-green" size={20} />
          <h2 className="font-display text-2xl font-semibold">{str(block.props.title, "EMI calculator")}</h2>
        </div>
        <label className="block text-xs text-text-3 mb-1">Loan amount (₹)</label>
        <input type="number" value={principal} onChange={(e) => setPrincipal(Number(e.target.value))} className="w-full mb-3 px-3 py-2 rounded-lg border border-border-default bg-bg-1 text-sm" />
        <label className="block text-xs text-text-3 mb-1">Interest rate (% p.a.)</label>
        <input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-full mb-3 px-3 py-2 rounded-lg border border-border-default bg-bg-1 text-sm" />
        <label className="block text-xs text-text-3 mb-1">Tenure (years)</label>
        <input type="number" value={years} onChange={(e) => setYears(Number(e.target.value))} className="w-full mb-5 px-3 py-2 rounded-lg border border-border-default bg-bg-1 text-sm" />
        <div className="text-center rounded-xl bg-green/10 py-4">
          <div className="text-xs text-text-3 uppercase tracking-wider">Estimated EMI</div>
          <div className="font-display text-3xl font-semibold text-green">₹ {emi.toLocaleString("en-IN")}</div>
        </div>
      </div>
    </section>
  );
}

export function PaymentPlanBlock({ block }: { block: BlockConfig }) {
  const items = Array.isArray(block.props.items)
    ? (block.props.items as { title: string; description: string }[])
    : [
        { title: "10%", description: "On booking" },
        { title: "40%", description: "On agreement" },
        { title: "50%", description: "On possession" },
      ];
  return (
    <section className="px-6 @md:px-10 py-16">
      <h2 className="font-display text-3xl font-semibold text-center mb-8">{str(block.props.title, "Payment plan")}</h2>
      <div className="grid @md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {items.map((it, i) => (
          <div key={i} className="rounded-2xl border border-border-default bg-bg-1 p-5 text-center">
            <div className="font-display text-2xl font-semibold text-green mb-1">{it.title}</div>
            <p className="text-text-2 text-sm">{it.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
