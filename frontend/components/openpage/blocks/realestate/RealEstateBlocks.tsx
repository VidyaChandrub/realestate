"use client";

import type { BlockConfig } from "../types";
import { ArrowRight, Check, Download, MapPin, Play } from "lucide-react";
import { useOpenPageRuntime } from "@/components/openpage/runtime/OpenPageRuntime";
import { DynamicLeadForm } from "@/components/openpage/dynamic-lead-form";
import { findFormById } from "@/lib/openpage/forms-store";
import { isMediaSrc } from "@/lib/media";

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function items<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function scrollToAnchor(id: string) {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function SectionShell({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`px-6 @md:px-10 py-16 @md:py-20 ${className}`}>{children}</section>;
}

function Title({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <div className="mb-8 text-center max-w-2xl mx-auto">
      {title ? <h2 className="font-display text-3xl @md:text-4xl font-semibold tracking-tight mb-2">{title}</h2> : null}
      {subtitle ? <p className="text-text-2 text-sm leading-relaxed">{subtitle}</p> : null}
    </div>
  );
}

function HeroCopy({
  p,
  onPrimary,
  onSecondary,
  light,
}: {
  p: Record<string, unknown>;
  onPrimary: () => void;
  onSecondary: () => void;
  light?: boolean;
}) {
  const text = light ? "text-white" : "text-text-0";
  const muted = light ? "text-white/80" : "text-text-1";
  return (
    <div className={light ? "text-white" : ""}>
      {str(p.badge) ? (
        <div className="inline-flex px-3 py-1 rounded-full bg-green/20 text-green text-[11px] font-semibold tracking-wide uppercase mb-4">
          {str(p.badge)}
        </div>
      ) : null}
      <h1 className={`font-display text-4xl @md:text-6xl font-semibold tracking-tight mb-4 leading-[1.1] ${text}`}>
        {str(p.headline, "Project name")}
      </h1>
      {str(p.location) ? <p className={`flex items-center gap-2 text-sm mb-3 ${muted}`}><MapPin size={14} /> {str(p.location)}</p> : null}
      {str(p.description) ? <p className={`text-base @md:text-lg leading-relaxed max-w-xl mb-4 ${muted}`}>{str(p.description)}</p> : null}
      {str(p.price) ? <p className="text-xl font-semibold mb-7 text-green">{str(p.price)}</p> : null}
      <div className="flex flex-wrap gap-3">
        {str(p.primaryCta) ? (
          <button type="button" onClick={onPrimary} className="px-6 py-3 rounded-lg bg-green text-black text-sm font-semibold hover:bg-green-dim transition-all hover:accent-glow-md">
            {str(p.primaryCta)}
          </button>
        ) : null}
        {str(p.secondaryCta) ? (
          <button
            type="button"
            onClick={onSecondary}
            className={`px-6 py-3 rounded-lg border text-sm font-medium transition-all ${
              light ? "border-white/40 bg-white/10 hover:bg-white/20" : "border-border-default bg-bg-1 hover:bg-bg-2"
            }`}
          >
            {str(p.secondaryCta)}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ProjectBannerBlock({ block }: { block: BlockConfig }) {
  const runtime = useOpenPageRuntime();
  const p = block.props;
  const formId = str(p.formId);
  const form = formId ? findFormById(formId, runtime.forms) : runtime.forms[0];
  const onPrimary = () => {
    if (str(p.primaryCtaUrl)) {
      window.location.href = str(p.primaryCtaUrl);
      return;
    }
    scrollToAnchor(str(p.primaryAnchor, "enquire"));
  };
  const onSecondary = () => {
    if (str(p.secondaryCtaUrl) && !str(p.popupId)) {
      window.location.href = str(p.secondaryCtaUrl);
      return;
    }
    runtime.openPopup(str(p.popupId) || undefined, { brochureUrl: str(p.pdfUrl) });
  };

  if (block.variant === "split-form") {
    return (
      <section className="relative min-h-[640px] @lg:min-h-[720px] overflow-hidden">
        {str(p.image) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={str(p.image)} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-bg-3 to-bg-2" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/25" />
        <div className="relative z-10 grid @lg:grid-cols-[1.15fr_0.85fr] gap-8 items-center px-6 @md:px-12 py-16 @md:py-24 max-w-6xl mx-auto">
          <HeroCopy p={p} onPrimary={onPrimary} onSecondary={onSecondary} light />
          <div id="hero-enquire" className="rounded-2xl bg-bg-1/95 backdrop-blur-md border border-border-default p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <h3 className="text-lg font-semibold mb-1">{str(p.formTitle, "Enquire now")}</h3>
            <p className="text-text-2 text-sm mb-4">{str(p.formSubtitle, "A relationship manager will call you shortly.")}</p>
            {form ? (
              <DynamicLeadForm form={form} live={runtime.live} pageId={runtime.pageId} place="hero-form" projectName={runtime.projectName} />
            ) : (
              <p className="text-sm text-text-3">Select a form in Properties.</p>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-[560px] @md:min-h-[680px] flex items-center overflow-hidden">
      {str(p.image) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={str(p.image)} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-green/20 to-bg-2" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/20" />
      <div className="relative z-10 px-6 @md:px-12 py-24 max-w-3xl">
        <HeroCopy p={p} onPrimary={onPrimary} onSecondary={onSecondary} light />
      </div>
    </section>
  );
}

export function ProjectOverviewBlock({ block }: { block: BlockConfig }) {
  const p = block.props;
  const highlights = items<{ title: string; description?: string }>(p.highlights);
  const cta = str(p.ctaText);

  if (block.variant === "split" || str(p.image)) {
    return (
      <SectionShell id={str(p.anchor, "overview")}>
        <div className="grid @lg:grid-cols-2 gap-10 @lg:gap-16 items-center max-w-6xl mx-auto">
          <div className="rounded-2xl overflow-hidden border border-border-default aspect-[4/3] bg-bg-2">
            {str(p.image) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={str(p.image)} alt={str(p.title)} className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-700" />
            ) : (
              <div className="w-full h-full min-h-[280px] bg-bg-3" />
            )}
          </div>
          <div>
            {str(p.subtitle) ? <p className="text-[11px] uppercase tracking-[0.2em] text-green font-semibold mb-3">{str(p.subtitle)}</p> : null}
            <h2 className="font-display text-3xl @md:text-4xl font-semibold mb-4">{str(p.title, "About the Project")}</h2>
            <p className="text-text-1 leading-relaxed mb-6">{str(p.body)}</p>
            {highlights.length ? (
              <ul className="space-y-3 mb-7">
                {highlights.map((h, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-green/15 text-green flex items-center justify-center shrink-0"><Check size={12} /></span>
                    <span><strong className="text-text-0">{h.title}</strong>{h.description ? <span className="text-text-2"> — {h.description}</span> : null}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {cta ? (
              <a href={`#${str(p.ctaAnchor, "enquire")}`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green text-black text-sm font-semibold hover:bg-green-dim transition-all">
                {cta} <ArrowRight size={15} />
              </a>
            ) : null}
          </div>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell id={str(p.anchor, "overview")}>
      <Title title={str(p.title, "Project Overview")} subtitle={str(p.subtitle)} />
      <p className="max-w-3xl mx-auto text-text-1 leading-relaxed text-center">{str(p.body)}</p>
    </SectionShell>
  );
}

export function PropertyDetailsBlock({ block }: { block: BlockConfig }) {
  const rows = items<{ label: string; value: string }>(block.props.items);
  const fallback = [
    { label: "Type", value: str(block.props.type, "Residential") },
    { label: "Status", value: str(block.props.status, "Under Construction") },
    { label: "Possession", value: str(block.props.possession, "Dec 2027") },
    { label: "RERA", value: str(block.props.rera, "") },
  ].filter((r) => r.value);
  const data = rows.length ? rows : fallback;
  return (
    <SectionShell id={str(block.props.anchor, "highlights")} className="bg-bg-2">
      <Title title={str(block.props.title, "Project Highlights")} subtitle={str(block.props.subtitle)} />
      <div className="grid grid-cols-2 @md:grid-cols-3 @2xl:grid-cols-5 gap-4 max-w-6xl mx-auto">
        {data.map((row, i) => (
          <div key={i} className="rounded-2xl border border-border-default bg-bg-1 p-5 text-center hover:-translate-y-0.5 hover:border-border-hover transition-all">
            <div className="w-10 h-10 rounded-full bg-green/10 text-green flex items-center justify-center mx-auto mb-3">
              <Check size={14} />
            </div>
            <div className="font-display text-2xl font-semibold mb-1">{row.value}</div>
            <div className="text-[11px] uppercase tracking-wider text-text-3">{row.label}</div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function ProjectHighlightsBlock({ block }: { block: BlockConfig }) {
  const itemsList = items<{ title: string; description: string }>(block.props.items);
  return (
    <SectionShell>
      <Title title={str(block.props.title, "Highlights")} subtitle={str(block.props.subtitle)} />
      <div className="grid @md:grid-cols-3 gap-4">
        {itemsList.map((it, i) => (
          <div key={i} className="rounded-xl border border-border-default bg-bg-2 p-5">
            <div className="w-8 h-8 rounded-lg bg-green/15 text-green flex items-center justify-center mb-3">
              <Check size={14} />
            </div>
            <h3 className="font-semibold mb-1">{it.title}</h3>
            <p className="text-text-2 text-sm">{it.description}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function AmenitiesBlock({ block }: { block: BlockConfig }) {
  const raw = block.props.items;
    const amen = Array.isArray(raw)
    ? raw.map((a) => (typeof a === "string" ? { title: a, description: "", image: "", icon: "" } : { title: String((a as { title?: string }).title || ""), description: String((a as { description?: string }).description || ""), image: String((a as { image?: string }).image || ""), icon: String((a as { icon?: string }).icon || "") }))
    : [
        { title: "Clubhouse", description: "A 30,000 sq.ft clubhouse for gatherings and leisure.", image: "" },
        { title: "Pool", description: "Temperature-controlled infinity pool with deck.", image: "" },
        { title: "Gym", description: "Fully equipped fitness studio overlooking the greens.", image: "" },
      ];

  if (block.variant === "chips") {
    return (
      <SectionShell id={str(block.props.anchor, "amenities")}>
        <Title title={str(block.props.title, "Amenities")} subtitle={str(block.props.subtitle)} />
        <div className="flex flex-wrap justify-center gap-2">
          {amen.map((a) => (
            <span key={a.title} className="px-3 py-1.5 rounded-full border border-border-default bg-bg-2 text-sm">{a.title}</span>
          ))}
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell id={str(block.props.anchor, "amenities")}>
      <Title title={str(block.props.title, "Amenities")} subtitle={str(block.props.subtitle)} />
      <div className="grid grid-cols-1 @md:grid-cols-2 @2xl:grid-cols-3 gap-4 max-w-6xl mx-auto">
        {amen.map((a) => (
          <div key={a.title} className="group rounded-2xl border border-border-default bg-bg-2 overflow-hidden hover:-translate-y-0.5 hover:border-border-hover transition-all">
            {a.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.image} alt={a.title} className="h-40 w-full object-cover" />
            ) : null}
            <div className="p-5">
              <div className="w-9 h-9 rounded-lg bg-green/10 text-green flex items-center justify-center mb-3 overflow-hidden">
                {isMediaSrc(a.icon) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.icon} alt="" className="w-5 h-5 object-contain" />
                ) : (
                  <Check size={14} />
                )}
              </div>
              <h3 className="font-semibold mb-1">{a.title}</h3>
              {a.description ? <p className="text-text-2 text-sm leading-relaxed">{a.description}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function FloorPlansBlock({ block }: { block: BlockConfig }) {
  const plans = items<{ name: string; beds: string; area: string; price?: string; image?: string; downloadUrl?: string }>(block.props.items);
  return (
    <SectionShell id={str(block.props.anchor, "plans")} className="bg-bg-2">
      <Title title={str(block.props.title, "Floor Plans")} subtitle={str(block.props.subtitle)} />
      <div className="grid @md:grid-cols-2 @2xl:grid-cols-3 gap-5 max-w-6xl mx-auto">
        {plans.map((plan, i) => (
          <div key={i} className="rounded-2xl border border-border-default bg-bg-1 overflow-hidden hover:border-border-hover transition-all">
            <div className="aspect-[4/3] bg-bg-3 flex items-center justify-center text-text-3 text-sm">
              {plan.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={plan.image} alt={plan.name} className="w-full h-full object-cover" />
              ) : (
                plan.name
              )}
            </div>
            <div className="p-5">
              <div className="font-semibold text-lg">{plan.name}</div>
              <div className="text-text-2 text-sm mt-1">{plan.beds} · {plan.area}</div>
              {plan.price ? <div className="text-green text-sm font-semibold mt-2">{plan.price}</div> : null}
              <a
                href={plan.downloadUrl || plan.image || "#gallery"}
                target={plan.downloadUrl ? "_blank" : undefined}
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-green hover:underline"
              >
                {plan.downloadUrl ? "Download plan" : "View plan"} <ArrowRight size={14} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function UnitConfigBlock({ block }: { block: BlockConfig }) {
  const rows = items<{ config: string; type?: string; area: string; price: string; image?: string; cta?: string }>(block.props.items);

  if (block.variant === "table") {
    return (
      <SectionShell id={str(block.props.anchor, "units")}>
        <Title title={str(block.props.title, "Property Types")} subtitle={str(block.props.subtitle)} />
        <div className="overflow-x-auto max-w-3xl mx-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-3 border-b border-border-default">
                <th className="py-2 pr-4">Configuration</th>
                <th className="py-2 pr-4">Carpet area</th>
                <th className="py-2">Price</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border-subtle">
                  <td className="py-3 pr-4 font-medium">{r.config}</td>
                  <td className="py-3 pr-4 text-text-2">{r.area}</td>
                  <td className="py-3">{r.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell id={str(block.props.anchor, "units")}>
      <Title title={str(block.props.title, "Property Types")} subtitle={str(block.props.subtitle)} />
      <div className="grid @md:grid-cols-2 @2xl:grid-cols-3 gap-5 max-w-6xl mx-auto">
        {rows.map((r, i) => (
          <div key={i} className="rounded-2xl border border-border-default bg-bg-1 overflow-hidden hover:-translate-y-0.5 hover:border-border-hover transition-all">
            <div className="aspect-[16/10] bg-bg-3">
              {r.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.image} alt={r.config} className="w-full h-full object-cover" />
              ) : null}
            </div>
            <div className="p-5">
              {r.type ? <div className="text-[11px] uppercase tracking-wider text-green font-semibold mb-1">{r.type}</div> : null}
              <div className="font-semibold text-lg">{r.config}</div>
              <div className="text-text-2 text-sm mt-1">{r.area}</div>
              <div className="text-green font-semibold mt-2">{r.price}</div>
              <button
                type="button"
                className="mt-4 w-full px-4 py-2.5 rounded-lg bg-green text-black text-sm font-semibold hover:bg-green-dim"
                onClick={() => scrollToAnchor("enquire")}
              >
                {r.cta || str(block.props.ctaText, "Enquire")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function RePricingBlock({ block }: { block: BlockConfig }) {
  const cards = items<{ name: string; price: string; meta?: string; cta?: string }>(block.props.items);
  if (block.variant === "cards" || cards.length) {
    return (
      <SectionShell id={str(block.props.anchor, "pricing")}>
        <Title title={str(block.props.title, "Pricing")} subtitle={str(block.props.subtitle)} />
        <div className="grid @md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {(cards.length ? cards : [{ name: "Starting", price: str(block.props.startingPrice, "₹ 1.2 Cr*"), meta: str(block.props.disclaimer) }]).map((c, i) => (
            <div key={i} className="rounded-2xl border border-border-default bg-bg-2 p-6 text-center hover:border-green/40 transition-all">
              <div className="text-sm text-text-2 mb-2">{c.name}</div>
              <div className="font-display text-3xl font-semibold text-green mb-2">{c.price}</div>
              {c.meta ? <p className="text-text-3 text-xs mb-5">{c.meta}</p> : null}
              <a href="#enquire" className="inline-flex px-4 py-2 rounded-lg bg-green text-black text-sm font-semibold">{c.cta || str(block.props.ctaText, "Enquire")}</a>
            </div>
          ))}
        </div>
        {str(block.props.disclaimer) ? <p className="text-center text-text-3 text-xs mt-6">{str(block.props.disclaimer)}</p> : null}
      </SectionShell>
    );
  }
  return (
    <SectionShell id={str(block.props.anchor, "pricing")}>
      <Title title={str(block.props.title, "Pricing")} subtitle={str(block.props.subtitle)} />
      <div className="text-center">
        <div className="font-display text-4xl font-bold">{str(block.props.startingPrice, "₹ 1.2 Cr*")}</div>
        <p className="text-text-3 text-xs mt-2">{str(block.props.disclaimer, "*T&C apply. Price on request for selected units.")}</p>
      </div>
    </SectionShell>
  );
}

export function OffersBlock({ block }: { block: BlockConfig }) {
  const offers = items<{ title: string; description: string }>(block.props.items);
  return (
    <SectionShell className="bg-green/5">
      <Title title={str(block.props.title, "Limited Offers")} />
      <div className="grid @md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {offers.map((o, i) => (
          <div key={i} className="rounded-xl border border-green/30 bg-bg-1 p-5">
            <h3 className="font-semibold text-green mb-1">{o.title}</h3>
            <p className="text-sm text-text-2">{o.description}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function LocationBlock({ block }: { block: BlockConfig }) {
  const nearby = items<{ title: string; meta: string }>(block.props.items);
  const embed = str(block.props.embedUrl);
  return (
    <SectionShell id={str(block.props.anchor, "location")}>
      <Title title={str(block.props.title, "Location & Connectivity")} subtitle={str(block.props.address)} />
      <div className="grid @lg:grid-cols-2 gap-8 max-w-6xl mx-auto items-start">
        <div className="rounded-2xl overflow-hidden border border-border-default aspect-[4/3] bg-bg-2">
          {embed ? (
            <iframe title="Map" src={embed} className="w-full h-full border-0" loading="lazy" />
          ) : (
            <div className="w-full h-full min-h-[260px] flex items-center justify-center text-text-3 text-sm">Add a Google Maps embed URL</div>
          )}
        </div>
        <div>
          {str(block.props.address) ? (
            <p className="flex items-start gap-2 text-sm mb-5">
              <MapPin size={16} className="text-green mt-0.5" />
              <span>{str(block.props.address)}</span>
            </p>
          ) : null}
          <div className="space-y-3">
            {nearby.map((n, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-border-default bg-bg-2 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin size={14} className="text-green" />
                  {n.title}
                </div>
                <div className="text-text-3 text-sm">{n.meta}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

export function GoogleMapsBlock({ block }: { block: BlockConfig }) {
  const embed = str(block.props.embedUrl);
  return (
    <SectionShell className="pt-0">
      <div className="rounded-xl overflow-hidden border border-border-default aspect-[16/7] bg-bg-2">
        {embed ? (
          <iframe title="Map" src={embed} className="w-full h-full border-0" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-3 text-sm">Add a Google Maps embed URL</div>
        )}
      </div>
    </SectionShell>
  );
}

export function ConstructionStatusBlock({ block }: { block: BlockConfig }) {
  const stages = items<{ label: string; percent: string }>(block.props.items);
  return (
    <SectionShell>
      <Title title={str(block.props.title, "Construction Status")} />
      <div className="max-w-xl mx-auto space-y-4">
        {stages.map((s, i) => (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span>{s.label}</span>
              <span className="text-text-3">{s.percent}%</span>
            </div>
            <div className="h-2 rounded-full bg-bg-3 overflow-hidden">
              <div className="h-full bg-green" style={{ width: `${Number(s.percent) || 0}%` }} />
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function DeveloperBlock({ block }: { block: BlockConfig }) {
  const p = block.props;
  return (
    <SectionShell className="bg-bg-2">
      <Title title={str(p.title, "About the Developer")} />
      <div className="max-w-3xl mx-auto text-center">
        <h3 className="text-xl font-semibold mb-2">{str(p.name)}</h3>
        <p className="text-text-1 leading-relaxed">{str(p.body)}</p>
      </div>
    </SectionShell>
  );
}

export function LeadFormBlock({ block }: { block: BlockConfig }) {
  const runtime = useOpenPageRuntime();
  const formId = str(block.props.formId);
  const form = formId ? findFormById(formId, runtime.forms) : runtime.forms[0];
  return (
    <SectionShell id={str(block.props.anchor, "enquire")}>
      <Title title={str(block.props.title, "Enquire now")} subtitle={str(block.props.subtitle)} />
      <div className="max-w-lg mx-auto rounded-2xl border border-border-default bg-bg-2 p-6 @md:p-8">
        {form ? (
          <DynamicLeadForm
            form={form}
            live={runtime.live}
            pageId={runtime.pageId}
            place="lead-form-block"
            projectName={runtime.projectName}
          />
        ) : (
          <p className="text-sm text-text-3 text-center">Select a form in Properties, or create one in Form Builder.</p>
        )}
      </div>
    </SectionShell>
  );
}

export function DownloadBrochureBlock({ block }: { block: BlockConfig }) {
  const runtime = useOpenPageRuntime();
  const p = block.props;
  const preview = str(p.image);
  return (
    <SectionShell id={str(p.anchor, "brochure")}>
      <div className="max-w-5xl mx-auto grid @lg:grid-cols-2 gap-8 items-center rounded-3xl border border-border-default bg-bg-2 overflow-hidden">
        <div className="aspect-[4/5] @lg:aspect-auto @lg:min-h-[360px] bg-bg-3">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={str(p.title, "Brochure")} className="w-full h-full object-cover" />
          ) : (
            <div className="h-full min-h-[280px] flex items-center justify-center text-text-3">Brochure preview</div>
          )}
        </div>
        <div className="p-8 @md:p-12">
          <Download className="mb-4 text-green" size={28} />
          <h2 className="font-display text-3xl font-semibold mb-3">{str(p.title, "Download Brochure")}</h2>
          <p className="text-text-2 text-sm leading-relaxed mb-6">{str(p.subtitle, "Share your details to receive the project brochure.")}</p>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-green text-black text-sm font-semibold"
            onClick={() => runtime.openPopup(str(p.popupId) || undefined, { brochureUrl: str(p.pdfUrl) })}
          >
            {str(p.buttonText, "Download PDF")}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </SectionShell>
  );
}

export function SiteVisitBlock({ block }: { block: BlockConfig }) {
  const runtime = useOpenPageRuntime();
  const formId = str(block.props.formId);
  const form = formId ? findFormById(formId, runtime.forms) : runtime.forms[0];
  return (
    <SectionShell className="bg-bg-2">
      <Title title={str(block.props.title, "Book a site visit")} subtitle={str(block.props.subtitle)} />
      <div className="max-w-md mx-auto">
        {form ? (
          <DynamicLeadForm form={form} live={runtime.live} pageId={runtime.pageId} place="site-visit" projectName={runtime.projectName} />
        ) : (
          <p className="text-sm text-text-3 text-center">Attach a form to this section from Properties.</p>
        )}
      </div>
    </SectionShell>
  );
}

export function CustomSectionBlock({ block }: { block: BlockConfig }) {
  return (
    <SectionShell>
      <Title title={str(block.props.title, "Custom section")} subtitle={str(block.props.subtitle)} />
      <div className="max-w-3xl mx-auto text-text-1 leading-relaxed whitespace-pre-wrap">{str(block.props.body)}</div>
    </SectionShell>
  );
}

export function VideoEmbedBlock({ block }: { block: BlockConfig }) {
  const url = str(block.props.url);
  return (
    <SectionShell>
      <Title title={str(block.props.title, "Walkthrough")} />
      <div className="aspect-video rounded-xl overflow-hidden border border-border-default bg-bg-2 flex items-center justify-center">
        {url ? (
          <iframe title="Video" src={url} className="w-full h-full border-0" allow="autoplay; encrypted-media" allowFullScreen />
        ) : (
          <div className="text-text-3 text-sm flex items-center gap-2"><Play size={16} /> Add a YouTube/Vimeo embed URL</div>
        )}
      </div>
    </SectionShell>
  );
}
