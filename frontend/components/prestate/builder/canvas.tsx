"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Eye,
  EyeOff,
  Globe,
  GripVertical,
  Lock,
  LockOpen,
  MessageCircle,
  Phone,
  Play,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Wallet,
  CalendarClock,
  Navigation,
  ArrowRight,
  Quote,
  PhoneCall,
  SquareStack,
} from "lucide-react";
import type { Device, SectionInstance } from "@/lib/prestate/types";
import { PROPERTY, SLUG_ICONS, resolveVars, WIDGETS } from "@/lib/prestate/data";
import { SceneImage } from "@/components/prestate/art";
import { readWidgetId } from "./widgets-panel";

// ---------------------------------------------------------------------------
// section style → css
// ---------------------------------------------------------------------------

function sectionStyle(s: SectionInstance, device: Device = "desktop"): CSSProperties {
  const st = s.style;
  const pad = st.spacing?.padding ?? { top: 72, right: 24, bottom: 72, left: 24 };
  const shrink = device === "mobile" ? 0.55 : device === "tablet" ? 0.78 : 1;
  const bg = st.colors?.bg ?? "#ffffff";
  const gradient = st.colors?.gradient;
  const img = (s.settings.image as string) && typeof s.settings.image === "string" && s.settings.image.startsWith("http") ? (s.settings.image as string) : undefined;

  const width =
    st.layout?.width === "boxed"
      ? "1200px"
      : st.layout?.width === "custom"
        ? `${st.layout.customWidth ?? 900}px`
        : "100%";
  const height =
    st.layout?.height === "vh" ? (device === "mobile" ? "auto" : "100vh") : st.layout?.height === "fixed" ? `${st.layout.fixedHeight ?? 400}px` : "auto";

  return {
    background: gradient ? undefined : bg,
    backgroundImage: gradient ?? (img ? `url(${img})` : undefined),
    backgroundSize: img || gradient ? "cover" : undefined,
    backgroundPosition: "center",
    position: "relative",
    color: st.colors?.text ?? "#111827",
    padding: `${Math.round(pad.top * shrink)}px ${Math.max(16, Math.round(pad.right * shrink))}px ${Math.round(pad.bottom * shrink)}px ${Math.max(16, Math.round(pad.left * shrink))}px`,
    width,
    maxWidth: "100%",
    minHeight: height !== "auto" ? height : undefined,
    boxSizing: "border-box",
    borderRadius: st.border?.radius ? st.border.radius : undefined,
    overflow: st.border?.radius ? "hidden" : undefined,
    boxShadow: st.effects?.shadow || undefined,
    ...(st.effects?.glass ? { backdropFilter: "blur(14px) saturate(1.3)", WebkitBackdropFilter: "blur(14px) saturate(1.3)" } : {}),
  };
}

function Overlay({ section }: { section: SectionInstance }) {
  const overlay = section.style.colors?.overlay;
  if (!overlay) return null;
  return <div style={{ position: "absolute", inset: 0, background: overlay, pointerEvents: "none" }} />;
}

function Inner({ section, children, max = 1200, align }: { section: SectionInstance; children: ReactNode; max?: number; align?: "left" | "center" | "right" }) {
  const a = align ?? section.style.layout?.align ?? "center";
  return (
    <div
      style={{
        position: "relative",
        zIndex: 2,
        maxWidth: section.style.layout?.width === "boxed" ? undefined : max,
        margin: a === "center" ? "0 auto" : a === "right" ? "0 0 0 auto" : "0 auto 0 0",
        textAlign: a === "center" ? "center" : a === "right" ? "right" : "left",
        display: "flex",
        flexDirection: section.style.layout?.direction === "column" ? "column" : undefined,
        alignItems:
          a === "center" ? "center" : a === "right" ? "flex-end" : "flex-start",
        width: "100%",
      }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children, gold }: { children: ReactNode; gold?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: 1.6,
        textTransform: "uppercase",
        color: gold ? "var(--ps-gold)" : "var(--ps-primary)",
        background: gold ? "rgba(201,165,106,.12)" : "rgba(109,93,252,.14)",
        padding: "5px 12px",
        borderRadius: 999,
        border: gold ? "1px solid rgba(201,165,106,.35)" : "1px solid rgba(109,93,252,.25)",
      }}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Header + Footer chrome
// ---------------------------------------------------------------------------

function PageHeader({ device }: { device: Device }) {
  const menu = ["Overview", "Amenities", "Floor Plans", "Gallery", "Location", "Contact"];
  return (
    <div style={{ position: "sticky", top: 0, height: 0, zIndex: 50 }}>
      <div style={{ position: "absolute", inset: 0, border: "2px solid var(--ps-primary)", pointerEvents: "none", opacity: 0, zIndex: 5 }} />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          gap: 8,
          zIndex: 5,
          padding: "10px 14px",
          opacity: 0,
          transition: "opacity .15s",
          background: "linear-gradient(90deg, var(--ps-primary), #4a3ec9)",
          color: "#fff",
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: 0.8,
        }}
      >
        HEADER
      </div>
      <style>{`.ps-sec-holder:hover .ps-header-label { opacity: 1 !important; }`}</style>
      <div className="ps-header-label" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 6, display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", opacity: 0, transition: "opacity .15s" }}>
        <span style={{ background: "var(--ps-primary)", color: "#fff", fontSize: 9.5, fontWeight: 800, letterSpacing: 0.8, padding: "2px 8px", borderRadius: 5 }}>HEADER</span>
        <span style={{ fontSize: 11, color: "#fff", fontWeight: 600, textShadow: "0 1px 4px rgba(0,0,0,.4)" }}>Global Header · Sticky · Transparent over hero</span>
      </div>
      <header
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: device === "mobile" ? "12px 16px" : device === "tablet" ? "14px 22px" : "16px 44px",
          background: "linear-gradient(180deg, rgba(8,10,20,.92), rgba(8,10,20,.78))",
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#c9a56a,#a8844a)", color: "#0a0c10", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
            A
          </span>
          <div style={{ lineHeight: 1.1, color: "#fff" }}>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2.2 }}>AURORA</div>
            <div style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: 2.8, color: "#c9a56a" }}>RESIDENCES</div>
          </div>
        </div>
        {device === "desktop" ? (
          <nav style={{ display: "flex", gap: 22, color: "rgba(255,255,255,.85)", fontSize: 12.5, fontWeight: 600 }}>
            {menu.map((m) => (
              <span key={m} style={{ cursor: "pointer", transition: "color .15s" }}>
                {m}
              </span>
            ))}
          </nav>
        ) : device === "tablet" ? (
          <nav style={{ display: "flex", gap: 14, color: "rgba(255,255,255,.85)", fontSize: 11.5, fontWeight: 600 }}>
            {menu.slice(0, 4).map((m) => (
              <span key={m} style={{ cursor: "pointer" }}>{m}</span>
            ))}
          </nav>
        ) : (
          <span style={{ color: "#fff", fontSize: 18, lineHeight: 1, cursor: "pointer", padding: "4px 8px" }} aria-label="Menu">☰</span>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: device === "mobile" ? 8 : 14 }}>
          {device !== "mobile" ? (
            <span style={{ display: "flex", alignItems: "center", gap: 7, color: "#fff", fontSize: 12, fontWeight: 700 }}>
              <Phone size={13} /> +91 90000 12345
            </span>
          ) : null}
          <span style={{ background: "linear-gradient(135deg,#cda45e,#b08a3e)", color: "#fff", fontSize: device === "mobile" ? 11 : 12, fontWeight: 700, padding: device === "mobile" ? "8px 10px" : "9px 16px", borderRadius: 9, cursor: "pointer", boxShadow: "0 6px 18px rgba(205,164,94,.4)", whiteSpace: "nowrap" }}>
            Book Visit
          </span>
        </div>
      </header>
    </div>
  );
}

function PageFooter({ device }: { device: Device }) {
  return (
    <div style={{ position: "relative" }}>
      <div className="ps-header-label" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 6, display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", opacity: 0, transition: "opacity .15s" }}>
        <span style={{ background: "var(--ps-primary)", color: "#fff", fontSize: 9.5, fontWeight: 800, letterSpacing: 0.8, padding: "2px 8px", borderRadius: 5 }}>FOOTER</span>
        <span style={{ fontSize: 11, color: "#fff", fontWeight: 600, textShadow: "0 1px 4px rgba(0,0,0,.4)" }}>Global Footer · Contact, socials, legal</span>
      </div>
      <footer style={{ background: "#0d1220", color: "#a9b0c2", padding: device === "mobile" ? "40px 22px 24px" : "56px 44px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : device === "tablet" ? "1fr 1fr" : "2fr 1fr 1fr 1fr", gap: 32 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#cda45e,#b08a3e)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>
                A
              </span>
              <div style={{ lineHeight: 1.1, color: "#fff" }}>
                <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1.4 }}>AURORA</div>
                <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: 2.2, color: "#cda45e" }}>RESIDENCES</div>
              </div>
            </div>
            <p style={{ fontSize: 12.5, lineHeight: 1.7, maxWidth: 320 }}>Two sculpted towers over a 2.5-acre campus on Sarjapur Road. RERA-approved 3 & 4 BHK residences from ₹1.25 Cr.</p>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              {["f", "x", "in", "yt"].map((s) => (
                <span key={s} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,.14)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", cursor: "pointer" }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
          {[
            { title: "Project", links: ["Overview", "Amenities", "Floor Plans", "Gallery", "Pricing"] },
            { title: "Company", links: ["About Prestige Estates", "Careers", "Press", "Contact"] },
            { title: "Legal", links: ["Privacy Policy", "Terms", "RERA", "Sitemap"] },
          ].map((col) => (
            <div key={col.title}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", marginBottom: 12, letterSpacing: 0.5 }}>{col.title.toUpperCase()}</div>
              {col.links.map((l) => (
                <div key={l} style={{ fontSize: 12.5, marginBottom: 9, cursor: "pointer" }}>
                  {l}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 1200, margin: "32px auto 0", borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 16, fontSize: 11, lineHeight: 1.6, color: "#6b7280" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span>© 2026 Prestige Estates Group. All rights reserved.</span>
            <span>RERA: PRM/KA/RERA/1251/446/PR/210812/004231</span>
          </div>
          <div style={{ marginTop: 10, maxWidth: 900 }}>
            Disclaimer: The content is for information purposes only and does not constitute an offer to allot. Images are for representational purposes only. Please verify all details with the sales team.
          </div>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section renderer — actual landing page content
// ---------------------------------------------------------------------------

function iconFor(slug: string | undefined, size = 20, fallback = Sparkles) {
  const Icon = (slug && SLUG_ICONS[slug]) || fallback;
  return <Icon size={size} />;
}

function HeroSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  return (
    <div style={{ position: "relative", minHeight: device === "mobile" ? 560 : device === "tablet" ? 680 : 780, display: "flex", alignItems: "center" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <SceneImage art={String(st.heroArt ?? st.image ?? "hero")} />
      </div>
      <Overlay section={s} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(8,10,20,.78) 0%, rgba(8,10,20,.35) 55%, transparent 100%)", zIndex: 1 }} />
      <Inner section={s} align="left" max={1200}>
        <div style={{ maxWidth: device === "mobile" ? "100%" : 640 }}>
          <Eyebrow gold>★ {String(resolveVars(st.eyebrow))}</Eyebrow>
          <h1 className="ps-canvas-serif" style={{ fontSize: device === "mobile" ? 32 : device === "tablet" ? 42 : 56, lineHeight: 1.08, fontWeight: 700, color: "#fff", letterSpacing: -0.5, margin: "16px 0 10px" }}>{String(resolveVars(st.heading))}</h1>
          <p style={{ fontSize: device === "mobile" ? 16 : device === "tablet" ? 18 : 21, color: "#c9a56a", fontWeight: 600, letterSpacing: 0.3, marginBottom: 20 }}>{String(st.subheading)}</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase", color: "rgba(255,255,255,.55)" }}>{String(st.priceLabel ?? "STARTING FROM")}</span>
          </div>
          <div className="ps-canvas-serif" style={{ fontSize: device === "mobile" ? 28 : 36, fontWeight: 700, color: "#fff" }}>{String(resolveVars(st.price)).replace(/^Starting From\s*/i, "")}</div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.6)", margin: "4px 0 26px" }}>{String(st.priceNote)}</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <span style={{ background: String(st.accent || "#cda45e"), color: "#0a0c10", fontWeight: 700, fontSize: 13.5, padding: "13px 24px", borderRadius: 11, cursor: "pointer", boxShadow: "0 10px 28px rgba(0,0,0,.25)", display: "inline-flex", alignItems: "center", gap: 8 }}>
              {String(st.ctaPrimary)} <ArrowRight size={15} />
            </span>
            <span style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.35)", color: "#fff", fontWeight: 700, fontSize: 13.5, padding: "13px 24px", borderRadius: 11, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, backdropFilter: "blur(8px)" }}>
              <Download size={15} /> {String(st.ctaSecondary)}
            </span>
          </div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 28 }}>
            {(st.highlights as string[]).map((h) => (
              <span key={h} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.18)", color: "#fff", fontSize: 11.5, fontWeight: 600, padding: "7px 13px", borderRadius: 999, backdropFilter: "blur(8px)" }}>
                <CheckCircle2 size={13} style={{ color: "#cda45e" }} /> {h}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: device === "desktop" ? "repeat(4,1fr)" : "1fr 1fr", gap: 12, width: "100%", marginTop: 44 }}>
          {(st.heroStats as { value: string; label: string }[]).map((x) => (
            <div key={x.label} style={{ background: "rgba(255,255,255,.09)", border: "1px solid rgba(255,255,255,.16)", borderRadius: 14, padding: "16px 18px", backdropFilter: "blur(12px)" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{x.value}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.65)", marginTop: 2, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}>{x.label}</div>
            </div>
          ))}
        </div>
      </Inner>
    </div>
  );
}

function HighlightsSection({ s, device }: { s: SectionInstance; device: Device }) {
  const items = (s.settings.items ?? []) as { icon?: string; value: string; label: string }[];
  const cols = device === "mobile" ? 1 : device === "tablet" ? 2 : Math.min(items.length || 1, 5);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 0 }}>
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            padding: "20px 16px",
            borderRight: device === "mobile" || (device === "tablet" && i % 2 === 1) || i === items.length - 1 ? "none" : "1px solid var(--ps-line)",
            borderBottom: device !== "desktop" && i < items.length - 1 ? "1px solid var(--ps-line)" : "none",
          }}
        >
          <span style={{ width: 42, height: 42, borderRadius: 12, background: "var(--ps-primary-soft)", color: "var(--ps-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {iconFor(it.icon, 20)}
          </span>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "var(--ps-ink)" }}>{it.value}</div>
            <div style={{ fontSize: 11, color: "var(--ps-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{it.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function OverviewSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  return (
    <div style={{ display: "grid", gridTemplateColumns: device === "desktop" ? "1.05fr 1fr" : "1fr", gap: device === "mobile" ? 28 : 40, alignItems: "center" }}>
      <div style={{ position: "relative" }}>
        <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 24px 60px rgba(17,24,39,.16)" }}>
          <SceneImage art={String(st.image)} />
        </div>
        <div style={{ position: "absolute", bottom: -22, right: 28, background: "#fff", border: "1px solid var(--ps-line)", borderRadius: 16, padding: "14px 18px", boxShadow: "var(--ps-shadow-md)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 11, background: "var(--ps-grad-primary)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={20} />
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)" }}>RERA Approved</div>
            <div style={{ fontSize: 11, color: "var(--ps-muted)" }}>{PROPERTY.reraNumber}</div>
          </div>
        </div>
      </div>
      <div>
        <Eyebrow>{String(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 34, fontWeight: 800, letterSpacing: -0.5, margin: "14px 0 14px", lineHeight: 1.15 }}>{String(st.heading)}</h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.75, color: "var(--ps-slate)", marginBottom: 18 }}>{String(st.text)}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 26 }}>
          {(st.bullets as string[]).map((b) => (
            <div key={b} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 20, height: 20, borderRadius: 7, background: "var(--ps-primary-soft)", color: "var(--ps-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Check size={12} strokeWidth={3} />
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ps-slate)" }}>{b}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : "repeat(3,1fr)", gap: 12 }}>
          {(st.stats as { value: string; label: string }[]).map((x) => (
            <div key={x.label} style={{ background: "#f8fafc", border: "1px solid var(--ps-line)", borderRadius: 13, padding: "14px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ps-primary)" }}>{x.value}</div>
              <div style={{ fontSize: 10.5, color: "var(--ps-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>{x.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AmenitiesSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const items = (st.items ?? []) as { icon?: string; title: string; desc: string }[];
  const cols = device === "mobile" ? 1 : device === "tablet" ? 2 : 4;
  return (
    <>
      <Inner section={s}>
        <Eyebrow>{String(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 34, fontWeight: 800, letterSpacing: -0.5, margin: "14px 0 8px" }}>{String(st.heading)}</h2>
        <p style={{ fontSize: 14, color: "var(--ps-slate)", maxWidth: 560, lineHeight: 1.65 }}>{String(st.text)}</p>
      </Inner>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 16, marginTop: 34, maxWidth: 1200, width: "100%", margin: "34px auto 0" }}>
        {items.map((it, i) => (
          <div key={i} className="ps-card" style={{ padding: "22px 18px", borderRadius: 15, transition: "all .2s", cursor: "default" }}>
            <span style={{ width: 44, height: 44, borderRadius: 12, background: "var(--ps-grad-primary)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14, boxShadow: "0 8px 20px rgba(109,93,252,.28)" }}>
              {iconFor(it.icon, 21)}
            </span>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--ps-ink)" }}>{it.title}</div>
            <div style={{ fontSize: 12.5, color: "var(--ps-slate)", marginTop: 5, lineHeight: 1.6 }}>{it.desc}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function FloorPlansSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const plans = (st.plans ?? []) as { name: string; beds: string; area: string; price: string }[];
  const [active, setActive] = useState(0);
  const plan = plans[active];
  return (
    <>
      <Inner section={s}>
        <Eyebrow>{String(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 34, fontWeight: 800, letterSpacing: -0.5, margin: "14px 0 8px" }}>{String(st.heading)}</h2>
        <p style={{ fontSize: 14, color: "var(--ps-slate)", maxWidth: 600, lineHeight: 1.65 }}>{String(st.text)}</p>
      </Inner>
      <div style={{ maxWidth: 1200, margin: "30px auto 0", width: "100%" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 26 }}>
          {plans.map((p, i) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setActive(i)}
              style={{
                padding: "9px 18px",
                borderRadius: 999,
                border: active === i ? "1.5px solid var(--ps-primary)" : "1px solid var(--ps-line-strong)",
                background: active === i ? "var(--ps-primary-soft)" : "#fff",
                color: active === i ? "var(--ps-primary)" : "var(--ps-slate)",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
        {plan ? (
          <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : "1.4fr 1fr", gap: 28, alignItems: "center" }}>
            <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid var(--ps-line)", boxShadow: "var(--ps-shadow-md)" }}>
              <SceneImage art="plan" beds={plan.beds} />
            </div>
            <div style={{ padding: device === "mobile" ? 0 : 10 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ps-ink)" }}>{plan.name}</div>
              <div style={{ fontSize: 13, color: "var(--ps-muted)", marginTop: 4 }}>Vastu-compliant · Corner & regular units available</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "20px 0" }}>
                {[
                  { label: "Carpet Area", value: plan.area },
                  { label: "Bedrooms", value: `${plan.beds} BHK` },
                  { label: "Price", value: plan.price },
                  { label: "Possession", value: "Dec 2027" },
                ].map((f) => (
                  <div key={f.label} style={{ background: "#f8fafc", border: "1px solid var(--ps-line)", borderRadius: 11, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10.5, color: "var(--ps-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{f.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "var(--ps-ink)", marginTop: 3 }}>{f.value}</div>
                  </div>
                ))}
              </div>
              <span style={{ background: "var(--ps-grad-primary)", color: "#fff", fontSize: 13, fontWeight: 700, padding: "12px 22px", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", boxShadow: "0 8px 22px rgba(109,93,252,.3)" }}>
                Request {plan.name} Details <ArrowRight size={14} />
              </span>
            </div>
          </div>
        ) : null}
        <div style={{ textAlign: "center", fontSize: 12.5, color: "var(--ps-muted)", marginTop: 26 }}>{String(st.note)}</div>
      </div>
    </>
  );
}

const GALLERY_ART = ["skyline", "lobby", "pool", "tower", "garden", "interior"];

function GallerySection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const cols = device === "mobile" ? 1 : device === "tablet" ? 2 : 3;
  return (
    <>
      <Inner section={s}>
        <Eyebrow>{String(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 34, fontWeight: 800, letterSpacing: -0.5, margin: "14px 0 8px" }}>{String(st.heading)}</h2>
        <p style={{ fontSize: 14, color: "var(--ps-slate)", maxWidth: 520, lineHeight: 1.65 }}>{String(st.text)}</p>
      </Inner>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 14, maxWidth: 1200, margin: "30px auto 0", width: "100%" }}>
        {(st.images as string[]).slice(0, 6).map((img, i) => (
          <div key={i} style={{ borderRadius: 16, overflow: "hidden", position: "relative", aspectRatio: "4/3", cursor: "pointer", boxShadow: "var(--ps-shadow-sm)" }}>
            <SceneImage art={GALLERY_ART[i % GALLERY_ART.length]} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 55%, rgba(8,10,20,.55))", opacity: 0, transition: "opacity .2s" }} className="ps-gal-overlay" />
            <style>{`.ps-sec-holder:hover .ps-gal-overlay { opacity: 1 }`}</style>
          </div>
        ))}
      </div>
    </>
  );
}

function VirtualTourSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  return (
    <>
      <Inner section={s}>
        <Eyebrow gold>★ {String(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 34, fontWeight: 800, letterSpacing: -0.5, margin: "14px 0 8px", color: "#fff" }}>{String(st.heading)}</h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.7)", maxWidth: 520, lineHeight: 1.65 }}>{String(st.text)}</p>
      </Inner>
      <div style={{ maxWidth: 1000, margin: "30px auto 0", width: "100%" }}>
        <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,.5)", aspectRatio: "16/9", cursor: "pointer" }}>
          <SceneImage art="tour" />
          <Overlay section={s} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
            <span style={{ width: 74, height: 74, borderRadius: "50%", background: "rgba(255,255,255,.16)", border: "1.5px solid rgba(255,255,255,.4)", display: "inline-flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", transition: "transform .2s" }}>
              <Play size={30} style={{ color: "#fff", marginLeft: 3 }} />
            </span>
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 700, background: "rgba(8,10,20,.55)", padding: "6px 14px", borderRadius: 999, backdropFilter: "blur(8px)" }}>
              {String(st.videoTitle)} · {String(st.duration)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

function LocationSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const items = (st.items ?? []) as { icon?: string; title: string; meta: string }[];
  return (
    <div style={{ display: "grid", gridTemplateColumns: device === "desktop" ? "1fr 1.05fr" : "1fr", gap: 32, alignItems: "stretch" }}>
      <div>
        <Eyebrow>{String(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 32, fontWeight: 800, letterSpacing: -0.5, margin: "14px 0 10px", lineHeight: 1.2 }}>{String(st.heading)}</h2>
        <p style={{ fontSize: 14, color: "var(--ps-slate)", lineHeight: 1.7, marginBottom: 24 }}>{String(st.text)}</p>
        <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : "1fr 1fr", gap: 12 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "#f8fafc", border: "1px solid var(--ps-line)", borderRadius: 12, padding: "13px 14px" }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: "var(--ps-primary-soft)", color: "var(--ps-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {iconFor(it.icon, 17)}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</div>
                <div style={{ fontSize: 11, color: "var(--ps-muted)", marginTop: 1 }}>{it.meta}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20, fontSize: 13, fontWeight: 600, color: "var(--ps-primary)" }}>
          <Navigation size={15} /> Get Directions to {PROPERTY.location}
        </div>
      </div>
      <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid var(--ps-line)", boxShadow: "var(--ps-shadow-md)", minHeight: 360 }}>
        <SceneImage art="map" />
      </div>
    </div>
  );
}

function PricingSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const plans = (st.plans ?? []) as { name: string; area: string; price: string; per: string; features: string[]; cta: string; featured?: boolean }[];
  return (
    <>
      <Inner section={s}>
        <Eyebrow>{String(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 34, fontWeight: 800, letterSpacing: -0.5, margin: "14px 0 8px" }}>{String(st.heading)}</h2>
        <p style={{ fontSize: 14, color: "var(--ps-slate)", maxWidth: 560, lineHeight: 1.65 }}>{String(st.text)}</p>
      </Inner>
      <div style={{ display: "grid", gridTemplateColumns: device === "desktop" ? "repeat(3,1fr)" : device === "tablet" ? "1fr 1fr" : "1fr", gap: 18, maxWidth: 1200, margin: "34px auto 0", width: "100%", alignItems: "stretch" }}>
        {plans.map((p) => (
          <div
            key={p.name}
            style={{
              borderRadius: 18,
              border: p.featured ? "1.5px solid var(--ps-primary)" : "1px solid var(--ps-line)",
              background: p.featured ? "linear-gradient(180deg, var(--ps-primary-mist), #fff 42%)" : "#fff",
              boxShadow: p.featured ? "0 22px 50px rgba(109,93,252,.18)" : "var(--ps-shadow-sm)",
              padding: 26,
              position: "relative",
            }}
          >
            {p.featured ? (
              <span style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "var(--ps-grad-primary)", color: "#fff", fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, padding: "5px 14px", borderRadius: 999, textTransform: "uppercase" }}>
                Most Popular
              </span>
            ) : null}
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ps-primary)", textTransform: "uppercase", letterSpacing: 0.8 }}>{p.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--ps-muted)", margin: "4px 0 14px" }}>{p.area}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: "var(--ps-ink)", letterSpacing: -0.5 }}>
              {p.price}
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ps-muted)" }}> {p.per}</span>
            </div>
            <div style={{ height: 1, background: "var(--ps-line)", margin: "18px 0" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 150 }}>
              {p.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <CheckCircle2 size={15} style={{ color: p.featured ? "var(--ps-primary)" : "#94a3b8", flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, color: "var(--ps-slate)" }}>{f}</span>
                </div>
              ))}
            </div>
            <span
              style={{
                display: "block",
                textAlign: "center",
                marginTop: 18,
                padding: "12px",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                background: p.featured ? "var(--ps-grad-primary)" : "#f1f4f9",
                color: p.featured ? "#fff" : "var(--ps-ink)",
                boxShadow: p.featured ? "0 8px 22px rgba(109,93,252,.3)" : "none",
              }}
            >
              {p.cta}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function TestimonialsSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const items = (st.items ?? []) as { name: string; role: string; quote: string; rating: number }[];
  return (
    <>
      <Inner section={s}>
        <Eyebrow>{String(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 34, fontWeight: 800, letterSpacing: -0.5, margin: "14px 0 8px" }}>{String(st.heading)}</h2>
      </Inner>
      <div style={{ display: "grid", gridTemplateColumns: device === "desktop" ? "repeat(3,1fr)" : device === "tablet" ? "1fr 1fr" : "1fr", gap: 18, maxWidth: 1200, margin: "30px auto 0", width: "100%" }}>
        {items.map((t, i) => (
          <div key={i} className="ps-card" style={{ padding: 26, borderRadius: 16, display: "flex", flexDirection: "column", position: "relative" }}>
            <Quote size={30} style={{ color: "var(--ps-secondary)", opacity: 0.6, marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 3, marginBottom: 12 }}>
              {Array.from({ length: 5 }).map((_, j) => (
                <Star key={j} size={14} fill={j < t.rating ? "#cda45e" : "none"} color="#cda45e" />
              ))}
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--ps-slate)", flex: 1 }}>“{t.quote}”</p>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 18 }}>
              <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--ps-grad-brand)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                {t.name
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)" }}>{t.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--ps-muted)" }}>{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function FaqSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const items = (st.items ?? []) as { q: string; a: string }[];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <>
      <Inner section={s}>
        <Eyebrow>{String(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 34, fontWeight: 800, letterSpacing: -0.5, margin: "14px 0 8px" }}>{String(st.heading)}</h2>
      </Inner>
      <div style={{ maxWidth: 820, margin: "30px auto 0", width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((it, i) => (
          <div key={i} style={{ border: open === i ? "1.5px solid var(--ps-primary)" : "1px solid var(--ps-line)", borderRadius: 14, background: "#fff", overflow: "hidden", boxShadow: open === i ? "0 10px 30px rgba(109,93,252,.1)" : "none", transition: "all .18s" }}>
            <button type="button" onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "17px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
              <span style={{ width: 24, height: 24, borderRadius: 8, background: open === i ? "var(--ps-primary-soft)" : "#f1f4f9", color: open === i ? "var(--ps-primary)" : "var(--ps-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ChevronDown size={14} style={{ transform: open === i ? "rotate(180deg)" : "none", transition: "transform .18s" }} />
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ps-ink)", flex: 1 }}>{it.q}</span>
            </button>
            {open === i ? <div style={{ padding: "0 20px 18px 56px", fontSize: 13, lineHeight: 1.7, color: "var(--ps-slate)" }}>{it.a}</div> : null}
          </div>
        ))}
      </div>
    </>
  );
}

function LeadFormSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const [step, setStep] = useState(0);
  const steps = (st.steps as string[]) ?? ["Your Details", "Preferences", "Confirm"];
  const fields = (st.fields ?? []) as { type: string; label: string; placeholder?: string; options?: string[] }[];
  return (
    <div style={{ display: "grid", gridTemplateColumns: device === "desktop" ? "1fr 1.1fr" : "1fr", gap: 32, alignItems: "center" }}>
      <div>
        <Eyebrow gold>★ {String(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 32, fontWeight: 800, letterSpacing: -0.5, margin: "14px 0 10px" }}>{String(st.heading)}</h2>
        <p style={{ fontSize: 14, color: "var(--ps-slate)", lineHeight: 1.7, marginBottom: 26 }}>{String(st.sub)}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { icon: <CalendarClock size={17} />, title: "Private guided tour", text: "Personalised walkthrough of the model & amenity deck" },
            { icon: <MessageCircle size={17} />, title: "WhatsApp confirmation", text: "Instant booking confirmation on WhatsApp" },
            { icon: <Wallet size={17} />, title: "Transparent pricing", text: "All-inclusive price & EMI options shared upfront" },
          ].map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 13 }}>
              <span style={{ width: 38, height: 38, borderRadius: 11, background: "var(--ps-secondary-soft)", color: "var(--ps-secondary-dark)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {f.icon}
              </span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ps-ink)" }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "var(--ps-muted)", marginTop: 2 }}>{f.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="ps-card" style={{ borderRadius: 20, padding: 28, boxShadow: "var(--ps-shadow-md)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)" }}>Step {step + 1} of {steps.length}</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ps-primary)", background: "var(--ps-primary-soft)", padding: "3px 10px", borderRadius: 999 }}>{steps[step]}</span>
        </div>
        <div style={{ display: "flex", gap: 5, marginBottom: 22 }}>
          {steps.map((_, i) => (
            <span key={i} style={{ flex: 1, height: 5, borderRadius: 999, background: i <= step ? "var(--ps-grad-primary)" : "#e8eaf1" }} />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {fields.slice(0, 3).map((f) => (
            <div key={f.label}>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ps-slate)", marginBottom: 5, display: "block" }}>{f.label}</label>
              {f.type === "select" ? (
                <div style={{ position: "relative" }}>
                  <select className="ps-input" style={{ appearance: "none", paddingRight: 30, cursor: "pointer", padding: "11px 12px" }}>
                    {f.options?.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", color: "var(--ps-muted)", pointerEvents: "none" }} />
                </div>
              ) : (
                <input className="ps-input" placeholder={f.placeholder} style={{ padding: "11px 12px" }} />
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          {step > 0 ? (
            <button type="button" onClick={() => setStep((v) => Math.max(0, v - 1))} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid var(--ps-line-strong)", background: "#fff", color: "var(--ps-slate)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              Back
            </button>
          ) : null}
          <button type="button" onClick={() => setStep((v) => Math.min(steps.length - 1, v + 1))} style={{ flex: 2, padding: "12px", borderRadius: 10, border: "none", background: "var(--ps-grad-primary)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 8px 22px rgba(109,93,252,.3)" }}>
            {step === steps.length - 1 ? String(st.button) : "Continue"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 16, fontSize: 11.5, color: "var(--ps-muted)" }}>
          <ShieldCheck size={13} style={{ color: "var(--ps-success)" }} /> Your details are safe & shared only with the sales team.
        </div>
      </div>
    </div>
  );
}

function CtaBanner({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  return (
    <div style={{ position: "relative", textAlign: "center", padding: device === "mobile" ? "48px 22px" : "72px 24px" }}>
      <Overlay section={s} />
      <Inner section={s}>
        <Eyebrow gold>★ {String(st.eyebrow)}</Eyebrow>
        <h2 style={{ fontSize: device === "mobile" ? 26 : 38, fontWeight: 800, letterSpacing: -0.6, margin: "16px 0 12px", color: "#fff", maxWidth: 760, lineHeight: 1.2 }}>{String(st.heading)}</h2>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,.78)", maxWidth: 620, lineHeight: 1.7 }}>{String(st.sub)}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
          <span style={{ background: "linear-gradient(135deg,#cda45e,#b08a3e)", color: "#fff", fontWeight: 700, fontSize: 13.5, padding: "13px 26px", borderRadius: 11, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 10px 28px rgba(205,164,94,.4)" }}>
            {String(st.ctaPrimary)} <ArrowRight size={15} />
          </span>
          <span style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.35)", color: "#fff", fontWeight: 700, fontSize: 13.5, padding: "13px 26px", borderRadius: 11, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <PhoneCall size={15} /> {String(st.ctaSecondary)}
          </span>
        </div>
      </Inner>
    </div>
  );
}

function OfferBanner({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: device === "mobile" ? 18 : 22, fontWeight: 800, letterSpacing: -0.3 }}>{String(st.heading)}</div>
        <div style={{ fontSize: 13.5, opacity: 0.9, marginTop: 4, lineHeight: 1.55 }}>{String(st.text)}</div>
      </div>
      <span style={{ background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.35)", fontWeight: 700, fontSize: 13, padding: "11px 18px", borderRadius: 10, cursor: "pointer", whiteSpace: "nowrap" }}>{String(st.cta ?? "Learn more")}</span>
    </div>
  );
}

function CountdownSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const items = (st.items ?? []) as { title?: string; text?: string; value?: string; label?: string }[];
  return (
    <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto", width: "100%" }}>
      <div style={{ fontSize: device === "mobile" ? 16 : 18, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 18 }}>{String(st.heading)}</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(items.length || 4, 4)},1fr)`, gap: device === "mobile" ? 8 : 14 }}>
        {items.map((it, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.16)", borderRadius: 14, padding: device === "mobile" ? "12px 6px" : "16px 10px" }}>
            <div className="ps-canvas-serif" style={{ fontSize: device === "mobile" ? 26 : 36, fontWeight: 700 }}>{it.title ?? it.value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: 0.7, marginTop: 4 }}>{it.text ?? it.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StickyCta({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  return (
    <div style={{ position: "relative", height: 0 }}>
      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(720px, calc(100% - 24px))",
          background: "rgba(255,255,255,.94)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(17,24,39,.1)",
          borderRadius: 16,
          padding: device === "mobile" ? "12px 12px" : "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: device === "mobile" ? "wrap" : "nowrap",
          boxShadow: "0 18px 50px rgba(17,24,39,.22)",
          zIndex: 40,
        }}
      >
        <div style={{ flex: "1 1 160px", minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ps-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(resolveVars(st.text))}</div>
          <div style={{ fontSize: 11, color: "var(--ps-muted)", marginTop: 1 }}>{PROPERTY.location}</div>
        </div>
        {device !== "mobile" ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ps-slate)" }}>
            <Phone size={13} /> {String(st.phone)}
          </span>
        ) : null}
        <span style={{ background: "linear-gradient(135deg,#c9a56a,#a8844a)", color: "#0a0c10", fontSize: 12.5, fontWeight: 700, padding: "10px 16px", borderRadius: 10, cursor: "pointer", whiteSpace: "nowrap", flex: device === "mobile" ? "1 1 auto" : undefined, textAlign: "center" }}>{String(st.ctaLabel)}</span>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#25d366", background: "rgba(37,211,102,.1)", padding: "8px 12px", borderRadius: 9, cursor: "pointer", flex: device === "mobile" ? "1 1 auto" : undefined }}>
          <MessageCircle size={14} /> WhatsApp
        </span>
      </div>
    </div>
  );
}

// Generic renderers for widgets not in the default page
function GenericSection({ s, device }: { s: SectionInstance; device: Device }) {
  const st = s.settings;
  const heading = st.heading ?? st.title ?? null;
  const text = st.text ?? st.subheading ?? null;
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", width: "100%" }}>
      {heading ? <h2 style={{ fontSize: device === "mobile" ? 24 : 30, fontWeight: 800, letterSpacing: -0.4, color: "var(--ps-ink)", textAlign: "center" }}>{String(resolveVars(heading))}</h2> : null}
      {text ? <p style={{ fontSize: 14.5, color: "var(--ps-slate)", textAlign: "center", maxWidth: 620, margin: "10px auto 0", lineHeight: 1.7 }}>{String(resolveVars(text))}</p> : null}
      {st.items && Array.isArray(st.items) && (st.items as unknown[]).length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : device === "tablet" ? "1fr 1fr" : "repeat(3,1fr)", gap: 14, marginTop: 26 }}>
          {(st.items as { title?: string; name?: string; label?: string; text?: string; body?: string; value?: string }[]).map((it, i) => {
            const title = it.title ?? it.name ?? it.label ?? it.value ?? `Item ${i + 1}`;
            const body = it.text ?? it.body;
            return (
              <div key={i} className="ps-card" style={{ padding: 18, borderRadius: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ps-ink)" }}>{title}</div>
                {body ? <div style={{ fontSize: 12.5, color: "var(--ps-slate)", marginTop: 5, lineHeight: 1.6 }}>{body}</div> : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function AnnouncementBar({ s }: { s: SectionInstance }) {
  const text = String(s.settings.text ?? "");
  return (
    <div style={{ textAlign: "center", fontSize: 12, fontWeight: 600, letterSpacing: 0.3, color: s.style.colors?.text ?? "#f4f1ea", padding: "10px 16px" }}>
      {text}
    </div>
  );
}

function SectionBody({ s, device }: { s: SectionInstance; device: Device }) {
  switch (s.type) {
    case "announcement":
      return <AnnouncementBar s={s} />;
    case "hero":
      return <HeroSection s={s} device={device} />;
    case "highlights":
      return <HighlightsSection s={s} device={device} />;
    case "overview":
      return <OverviewSection s={s} device={device} />;
    case "amenities":
      return <AmenitiesSection s={s} device={device} />;
    case "floorplans":
      return <FloorPlansSection s={s} device={device} />;
    case "gallery":
      return <GallerySection s={s} device={device} />;
    case "virtual-tour":
    case "youtube":
      return <VirtualTourSection s={s} device={device} />;
    case "location-advantages":
    case "map":
      return <LocationSection s={s} device={device} />;
    case "pricing":
      return <PricingSection s={s} device={device} />;
    case "testimonials":
      return <TestimonialsSection s={s} device={device} />;
    case "faq":
    case "accordion":
      return <FaqSection s={s} device={device} />;
    case "multistep-form":
    case "lead-form":
    case "whatsapp-form":
      return <LeadFormSection s={s} device={device} />;
    case "cta-banner":
      return <CtaBanner s={s} device={device} />;
    case "countdown":
      return <CountdownSection s={s} device={device} />;
    case "offer-banner":
      return <OfferBanner s={s} device={device} />;
    case "sticky-cta":
      return <StickyCta s={s} device={device} />;
    default:
      return <GenericSection s={s} device={device} />;
  }
}

// ---------------------------------------------------------------------------
// Section wrapper with chrome
// ---------------------------------------------------------------------------

function SectionWrap({
  s,
  index,
  total,
  selected,
  device,
  readOnly,
  onSelect,
  onReorder,
  onWidgetDrop,
  onDuplicate,
  onDelete,
  onToggleHidden,
  onToggleLock,
  onSaveTemplate,
  onMakeGlobal,
}: {
  s: SectionInstance;
  index: number;
  total: number;
  selected: boolean;
  device: Device;
  readOnly?: boolean;
  onSelect: () => void;
  onReorder: (fromId: string, toId: string) => void;
  onWidgetDrop: (widgetId: string, afterId?: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleHidden: () => void;
  onToggleLock: () => void;
  onSaveTemplate: () => void;
  onMakeGlobal: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const hidden = s.hidden === true;
  const locked = s.locked === true;
  const sc = sectionStyle(s, device);
  const Icon = SLUG_ICONS[s.icon] ?? SquareStack;
  const resp = s.style.responsive ?? {};
  if ((device === "desktop" && resp.hideDesktop) || (device === "tablet" && resp.hideTablet) || (device === "mobile" && resp.hideMobile)) {
    return null;
  }

  return (
    <div
      className="ps-sec-holder"
      data-selected={selected && !readOnly ? "true" : "false"}
      draggable={!readOnly}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/x-prestate-section", s.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!readOnly) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        if (readOnly) return;
        const widgetId = readWidgetId(e);
        if (widgetId) {
          onWidgetDrop(widgetId, s.id);
          return;
        }
        const fromId = e.dataTransfer.getData("text/x-prestate-section");
        if (fromId && fromId !== s.id) onReorder(fromId, s.id);
      }}
      onClick={readOnly ? undefined : (e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{
        position: "relative",
        outline: dragOver && !readOnly ? "2px dashed var(--ps-primary)" : "none",
        outlineOffset: dragOver ? 2 : 0,
        transition: "outline-color .12s",
        margin: readOnly ? 0 : "18px 0",
        borderRadius: 14,
      }}
    >
      {!readOnly ? (
        <>
          {/* hover label */}
          <div style={{ position: "absolute", top: -16, left: 10, zIndex: 55, display: "flex", alignItems: "center", gap: 6, pointerEvents: "none", opacity: selected ? 1 : 0, transition: "opacity .15s" }} className="ps-sec-label">
            <span style={{ background: "var(--ps-primary)", color: "#fff", fontSize: 9.5, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", padding: "2px 9px", borderRadius: 5, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Icon size={10} /> {s.label}
            </span>
            {s.global ? <span style={{ background: "var(--ps-secondary)", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 5 }}>GLOBAL</span> : null}
            {hidden ? <span style={{ background: "#e5484d", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 5 }}>HIDDEN</span> : null}
          </div>

          {/* chrome toolbar */}
          <div
            className="ps-sec-toolbar"
            data-selected={selected ? "true" : "false"}
            style={{
              position: "absolute",
              top: -16,
              right: 10,
              zIndex: 60,
              display: "flex",
              alignItems: "center",
              gap: 1,
              borderRadius: 9,
              padding: 2,
              opacity: selected ? 1 : 0,
              transition: "opacity .15s",
            }}
          >
            <span style={{ color: selected ? "#fff" : "var(--ps-muted)", display: "inline-flex", cursor: "grab", padding: "3px 5px" }} title="Drag to reorder">
              <GripVertical size={13} />
            </span>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: selected ? "#fff" : "var(--ps-muted)", padding: "0 4px", letterSpacing: 0.4 }}>{index + 1}/{total}</span>
            <ChromeBtn selected={selected} title="Duplicate" onClick={onDuplicate}>
              <Copy size={13} />
            </ChromeBtn>
            <ChromeBtn selected={selected} title="Save as template" onClick={onSaveTemplate}>
              <Save size={13} />
            </ChromeBtn>
            <ChromeBtn selected={selected} title={s.global ? "Unglobal" : "Make global section"} onClick={onMakeGlobal}>
              <Globe size={13} />
            </ChromeBtn>
            <ChromeBtn selected={selected} title={hidden ? "Show" : "Hide"} onClick={onToggleHidden}>
              {hidden ? <Eye size={13} /> : <EyeOff size={13} />}
            </ChromeBtn>
            <ChromeBtn selected={selected} title={locked ? "Unlock" : "Lock"} onClick={onToggleLock}>
              {locked ? <Lock size={13} /> : <LockOpen size={13} />}
            </ChromeBtn>
            <ChromeBtn selected={selected} danger title="Delete" onClick={onDelete}>
              <Trash2 size={13} />
            </ChromeBtn>
          </div>
        </>
      ) : null}

      {/* body */}
      <div style={{ opacity: hidden ? 0.3 : 1, pointerEvents: hidden && !readOnly ? "none" : "auto" }}>
        <div style={sc}>
          <Overlay section={s} />
          <div style={{ position: "relative", zIndex: 2 }}>
            <SectionBody s={s} device={device} />
          </div>
        </div>
      </div>

      {/* hidden placeholder */}
      {hidden ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.55)", backdropFilter: "blur(2px)", borderRadius: 14, zIndex: 50, pointerEvents: "none" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid var(--ps-line)", borderRadius: 999, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: "var(--ps-slate)", boxShadow: "var(--ps-shadow-md)" }}>
            <EyeOff size={14} /> Hidden from visitors
          </span>
        </div>
      ) : null}
      {locked ? (
        <div style={{ position: "absolute", top: 2, left: 10, zIndex: 50, background: "rgba(17,24,39,.7)", color: "#fff", fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 5, display: "inline-flex", alignItems: "center", gap: 4, pointerEvents: "none" }}>
          <Lock size={9} /> LOCKED
        </div>
      ) : null}

      <style>{`.ps-sec-holder:hover .ps-sec-toolbar, .ps-sec-holder:hover .ps-sec-label { opacity: 1 !important; }`}</style>
    </div>
  );
}

function ChromeBtn({ children, onClick, danger, selected, title }: { children: ReactNode; onClick: () => void; danger?: boolean; selected: boolean; title: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        width: 24,
        height: 24,
        border: "none",
        borderRadius: 6,
        background: "transparent",
        color: selected ? "#fff" : "var(--ps-slate)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        ...(danger ? { color: selected ? "#ffd7d7" : "#e5484d" } : {}),
      }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

export function Canvas({
  sections,
  selectedId,
  device,
  readOnly,
  onSelect,
  onMutate,
  compact,
  live,
  theme,
}: {
  sections: SectionInstance[];
  selectedId: string | null;
  device: Device;
  readOnly?: boolean;
  onSelect: (id: string) => void;
  onMutate: (patch: (prev: SectionInstance[]) => SectionInstance[]) => void;
  compact?: boolean;
  live?: boolean;
  theme?: { primary: string; accent: string; font: string };
}) {
  const [dragOverBg, setDragOverBg] = useState(false);
  const width = live ? "100%" : device === "desktop" ? 1280 : device === "tablet" ? 768 : 390;

  const mutate = (patch: (prev: SectionInstance[]) => SectionInstance[]) => onMutate(patch);

  const handleReorder = (fromId: string, toId: string) =>
    mutate((prev) => {
      const next = [...prev];
      const from = next.findIndex((x) => x.id === fromId);
      const to = next.findIndex((x) => x.id === toId);
      if (from < 0 || to < 0) return prev;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });

  const handleWidgetDrop = (widgetId: string, afterId?: string) => {
    onMutate((prev) => {
      const widget = WIDGET_FROM_ID(widgetId);
      if (!widget) return prev;
      const copy = { ...widget, id: `sec_${Math.random().toString(36).slice(2, 9)}` };
      const next = [...prev];
      const idx = afterId ? prev.findIndex((x) => x.id === afterId) : -1;
      if (idx >= 0) next.splice(idx + 1, 0, copy);
      else next.push(copy);
      setTimeout(() => onSelect(copy.id), 30);
      return next;
    });
  };

  // Announcement bars are global chrome: render them above the sticky header.
  const announcements = sections.filter((s) => s.type === "announcement");
  const content = sections.filter((s) => s.type !== "announcement");

  const renderSection = (s: SectionInstance, i: number) => (
    <SectionWrap
      key={s.id}
      s={s}
      index={i}
      total={sections.length}
      selected={selectedId === s.id}
      device={device}
      readOnly={readOnly}
      onSelect={() => onSelect(s.id)}
      onReorder={handleReorder}
      onWidgetDrop={(wid, afterId) =>
        onMutate((prev) => {
          const idx = afterId ? prev.findIndex((x) => x.id === afterId) : -1;
          const widget = WIDGET_FROM_ID(wid);
          if (!widget) return prev;
          const copy = { ...widget, id: `sec_${Math.random().toString(36).slice(2, 9)}` };
          const next = [...prev];
          if (idx >= 0) next.splice(idx + 1, 0, copy);
          else next.push(copy);
          setTimeout(() => onSelect(copy.id), 30);
          return next;
        })
      }
      onDuplicate={() =>
        mutate((prev) => {
          const idx = prev.findIndex((x) => x.id === s.id);
          if (idx < 0) return prev;
          const copy = { ...deepCloneSection(s), id: `sec_${Math.random().toString(36).slice(2, 9)}` };
          const next = [...prev];
          next.splice(idx + 1, 0, copy);
          setTimeout(() => onSelect(copy.id), 30);
          return next;
        })
      }
      onDelete={() => mutate((prev) => prev.filter((x) => x.id !== s.id))}
      onToggleHidden={() => mutate((prev) => prev.map((x) => (x.id === s.id ? { ...x, hidden: !x.hidden } : x)))}
      onToggleLock={() => mutate((prev) => prev.map((x) => (x.id === s.id ? { ...x, locked: !x.locked } : x)))}
      onSaveTemplate={() => onSelect("__template_" + s.id)}
      onMakeGlobal={() => mutate((prev) => prev.map((x) => (x.id === s.id ? { ...x, global: !x.global } : x)))}
    />
  );

  return (
    <div
      className={live ? undefined : "ps-canvas-dots"}
      style={{
        flex: 1,
        overflow: live ? "visible" : "auto",
        position: "relative",
        background: live ? "#fff" : undefined,
        ["--ps-site-primary" as string]: theme?.primary ?? "#6D5DFC",
        ["--ps-site-accent" as string]: theme?.accent ?? "#CDA45E",
        fontFamily: theme?.font ? `${theme.font}, Inter, system-ui, sans-serif` : undefined,
      }}
      onDragOver={(e) => {
        e.preventDefault();
        const w = readWidgetId(e);
        if (w) setDragOverBg(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragOverBg(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOverBg(false);
        if (readOnly) return;
        const widgetId = readWidgetId(e);
        if (widgetId) handleWidgetDrop(widgetId);
      }}
    >
      <div style={{ padding: live ? 0 : compact ? "10px 8px 28px" : "34px 18px 90px" }}>
        <div
          style={{
            width,
            maxWidth: "100%",
            minWidth: live || compact ? 0 : width,
            margin: "0 auto",
            background: "#fff",
            borderRadius: live ? 0 : 18,
            overflow: "visible",
            boxShadow: live ? "none" : device === "desktop" ? "0 10px 50px rgba(17,24,39,.16)" : "0 30px 90px rgba(17,24,39,.4)",
            outline: dragOverBg && !readOnly ? "3px dashed var(--ps-primary)" : "none",
            outlineOffset: 4,
            position: "relative",
          }}
        >
          {!live ? (
            <div className="ps-artboard-chrome">
              <span className="ps-canvas-label">{device} preview</span>
              <span style={{ display: "flex", gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#f0a8a8" }} />
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#f2d3a2" }} />
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#a9d3ab" }} />
              </span>
            </div>
          ) : null}

          <div style={{ position: "relative" }}>
            {announcements.map(renderSection)}

            <PageHeader device={device} />

            {sections.length === 0 ? (
              <div style={{ padding: "80px 40px", textAlign: "center" }}>
                <div style={{ border: "2px dashed #c4c9d8", borderRadius: 18, padding: "70px 30px", color: "var(--ps-muted)" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <span style={{ width: 56, height: 56, borderRadius: 16, background: "var(--ps-primary-soft)", color: "var(--ps-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <SquareStack size={26} />
                    </span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ps-ink)", marginBottom: 6 }}>Start building your page</div>
                  <div style={{ fontSize: 13, maxWidth: 320, margin: "0 auto", lineHeight: 1.6 }}>Drag a widget from the left library onto this canvas, or click any widget to add it instantly.</div>
                </div>
              </div>
            ) : (
              content.map((s, i) => renderSection(s, announcements.length + i))
            )}

            <PageFooter device={device} />
          </div>
        </div>
      </div>
    </div>
  );
}

function WIDGET_FROM_ID(id: string): SectionInstance | null {
  const def = WIDGETS.find((w) => w.id === id);
  return def ? def.make() : null;
}

function deepCloneSection(s: SectionInstance): SectionInstance {
  return JSON.parse(JSON.stringify(s)) as SectionInstance;
}