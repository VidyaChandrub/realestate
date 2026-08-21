"use client";

import { useState } from "react";
import { Building2, Check, Copy, MapPin, Plus, Save, Sparkles, Tag, Trash2, X } from "lucide-react";
import { PROPERTY, DYNAMIC_VARS } from "@/lib/prestate/data";
import { SceneImage } from "@/components/prestate/art";
import { ModuleHeader } from "./shared";
import { Btn, Chip, Collapse, FieldRow, TextField } from "@/components/prestate/ui";

const PROPERTY_LIST = [
  { id: "aurora", name: "Aurora Residences", type: "Luxury Apartments", location: "Sarjapur Road", price: "₹1.25 Cr", status: "Active", badge: "Used on 4 pages" },
  { id: "serene", name: "Serene Villas", type: "Villa Project", location: "Whitefield", price: "₹4.8 Cr", status: "Active", badge: "Used on 2 pages" },
  { id: "titan", name: "Titan Business Park", type: "Commercial", location: "Outer Ring Road", price: "₹90L / unit", status: "Active", badge: "Used on 1 page" },
  { id: "skylark", name: "Skyline Heights", type: "Rental", location: "Indiranagar", price: "₹45K / mo", status: "Draft", badge: "Not yet used" },
];

export function PropertiesModule({ onToast }: { onToast: (m: string) => void }) {
  const [active, setActive] = useState("aurora");
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [amenities, setAmenities] = useState<string[]>(PROPERTY.amenities);
  const [features, setFeatures] = useState<string[]>(PROPERTY.features);

  const list = PROPERTY_LIST.find((p) => p.id === active) ?? PROPERTY_LIST[0];

  const copy = (token: string) => {
    navigator.clipboard?.writeText(token).catch(() => {});
    setCopied(token);
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <ModuleHeader
        title="Properties"
        description="Central property data manager. Every field feeds dynamic variables ({{property_name}}, {{starting_price}}…) across all your landing pages, forms and templates."
        actions={
          <div style={{ display: "flex", gap: 9 }}>
            <Btn variant="outline" icon={<Plus size={14} />}>New property</Btn>
            <Btn variant="primary" icon={<Save size={14} />} onClick={() => { setSaving(true); setTimeout(() => { setSaving(false); onToast("Property saved — all pages updated automatically"); }, 700); }}>
              {saving ? "Saving…" : "Save property"}
            </Btn>
          </div>
        }
      />

      <div style={{ flex: 1, display: "flex", gap: 0, overflow: "hidden" }}>
        {/* LEFT — list */}
        <div style={{ width: 300, flexShrink: 0, borderRight: "1px solid var(--ps-line)", overflowY: "auto", background: "var(--ps-panel-raised)", padding: 14 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--ps-muted)", padding: "4px 6px 10px" }}>All properties · 24</div>
          {PROPERTY_LIST.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActive(p.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "11px 11px",
                borderRadius: 12,
                border: active === p.id ? "1.5px solid var(--ps-primary)" : "1px solid transparent",
                background: active === p.id ? "var(--ps-primary-mist)" : "#fff",
                cursor: "pointer",
                textAlign: "left",
                marginBottom: 4,
              }}
            >
              <span style={{ width: 38, height: 38, borderRadius: 11, background: active === p.id ? "var(--ps-primary)" : "#eef0f5", color: active === p.id ? "#fff" : "var(--ps-slate)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Building2 size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                <div style={{ fontSize: 10.5, color: "var(--ps-muted)", marginTop: 1 }}>{p.type} · {p.location}</div>
              </div>
            </button>
          ))}
          <button
            type="button"
            style={{ width: "100%", marginTop: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 10, border: "1px dashed var(--ps-primary)", background: "var(--ps-primary-mist)", color: "var(--ps-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            <Plus size={14} /> Add property
          </button>
        </div>

        {/* RIGHT — editor */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 48px" }}>
          {/* summary strip */}
          <div className="ps-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 16, marginBottom: 22, borderRadius: 14 }}>
            <span style={{ width: 48, height: 48, borderRadius: 14, background: "var(--ps-grad-primary)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Building2 size={22} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ps-ink)" }}>{list.name}</div>
              <div style={{ fontSize: 12, color: "var(--ps-muted)", marginTop: 2 }}>{list.type} · {list.location}</div>
            </div>
            <Chip tone="success">{list.badge}</Chip>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-primary)" }}>{list.price}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* LEFT COLUMN — fields */}
            <div>
              <div className="ps-card" style={{ padding: "6px 20px 18px", borderRadius: 14 }}>
                <FieldRow label="Property Name">
                  <TextField value={PROPERTY.name} onChange={() => {}} />
                </FieldRow>
                <FieldRow label="Builder Name">
                  <TextField value={PROPERTY.builder} onChange={() => {}} />
                </FieldRow>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <FieldRow label="Property Type">
                    <TextField value={PROPERTY.type} onChange={() => {}} />
                  </FieldRow>
                  <FieldRow label="Status">
                    <TextField value={PROPERTY.status} onChange={() => {}} />
                  </FieldRow>
                </div>
                <FieldRow label="Description">
                  <textarea className="ps-input" value={PROPERTY.description} style={{ minHeight: 90, resize: "vertical", lineHeight: 1.6 }} />
                </FieldRow>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <FieldRow label="Starting Price">
                    <TextField value={PROPERTY.startingPrice} onChange={() => {}} />
                  </FieldRow>
                  <FieldRow label="Carpet Area">
                    <TextField value={PROPERTY.carpetArea} onChange={() => {}} />
                  </FieldRow>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <FieldRow label="RERA Number">
                    <TextField value={PROPERTY.reraNumber} onChange={() => {}} />
                  </FieldRow>
                  <FieldRow label="Possession Date">
                    <TextField value={PROPERTY.possession} onChange={() => {}} />
                  </FieldRow>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <FieldRow label="Towers">
                    <TextField value={PROPERTY.towers} onChange={() => {}} />
                  </FieldRow>
                  <FieldRow label="Land Area">
                    <TextField value={PROPERTY.landArea} onChange={() => {}} />
                  </FieldRow>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <FieldRow label="Units">
                    <TextField value={PROPERTY.units} onChange={() => {}} />
                  </FieldRow>
                  <FieldRow label="Metro Distance">
                    <TextField value={PROPERTY.metro} onChange={() => {}} />
                  </FieldRow>
                </div>
                <FieldRow label="Location">
                  <TextField value={PROPERTY.location} onChange={() => {}} prefix={<MapPin size={15} style={{ color: "var(--ps-muted)", flexShrink: 0 }} />} />
                </FieldRow>
                <FieldRow label="Google Map URL">
                  <TextField value={PROPERTY.mapUrl} onChange={() => {}} />
                </FieldRow>
                <FieldRow label="Brochure PDF">
                  <TextField value={PROPERTY.brochureUrl} onChange={() => {}} />
                </FieldRow>
              </div>

              <div className="ps-card" style={{ padding: "6px 20px 18px", borderRadius: 14, marginTop: 16 }}>
                <Collapse title={`Amenities (${amenities.length})`} defaultOpen icon={<Tag size={14} />}>
                  <TagList items={amenities} onChange={setAmenities} addLabel="amenity" />
                </Collapse>
                <Collapse title={`Features (${features.length})`} defaultOpen icon={<Sparkles size={14} />}>
                  <TagList items={features} onChange={setFeatures} addLabel="feature" />
                </Collapse>
              </div>
            </div>

            {/* RIGHT COLUMN — media, floor plans, variables */}
            <div>
              <div className="ps-card" style={{ padding: "6px 20px 18px", borderRadius: 14 }}>
                <FieldRow label="Gallery Images">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {PROPERTY.gallery.map((g) => (
                      <div key={g} style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "4/3", border: "1px solid var(--ps-line)" }}>
                        <SceneThumb art={g} />
                        <button type="button" style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 6, background: "rgba(17,24,39,.7)", color: "#fff", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" style={{ width: "100%", marginTop: 10, padding: "8px", borderRadius: 10, border: "1px dashed var(--ps-primary)", background: "var(--ps-primary-mist)", color: "var(--ps-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    + Add images
                  </button>
                </FieldRow>

                <FieldRow label="Videos">
                  {PROPERTY.videos.map((v, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, border: "1px solid var(--ps-line)", borderRadius: 10, padding: "8px 10px", marginBottom: 7 }}>
                      <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--ps-bg)", color: "var(--ps-slate)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <PlayIcon />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-ink)" }}>{v.title}</div>
                        <div style={{ fontSize: 10.5, color: "var(--ps-muted)" }}>youtube.com/watch?v=…</div>
                      </div>
                      <button type="button" style={{ background: "none", border: "none", color: "var(--ps-muted)", cursor: "pointer" }}><Trash2 size={14} /></button>
                    </div>
                  ))}
                  <button type="button" style={{ width: "100%", padding: "8px", borderRadius: 10, border: "1px dashed var(--ps-primary)", background: "var(--ps-primary-mist)", color: "var(--ps-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    + Add video
                  </button>
                </FieldRow>

                <FieldRow label="Floor Plans">
                  {PROPERTY.floorPlans.map((fp, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, border: "1px solid var(--ps-line)", borderRadius: 10, padding: "8px 10px", marginBottom: 7 }}>
                      <span style={{ width: 40, height: 30, borderRadius: 7, overflow: "hidden", border: "1px solid var(--ps-line)", flexShrink: 0 }}>
                        <SceneThumb art="plan" />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ps-ink)" }}>{fp.name} · {fp.beds} BHK</div>
                        <div style={{ fontSize: 10.5, color: "var(--ps-muted)" }}>{fp.area} · {fp.price}</div>
                      </div>
                      <button type="button" style={{ background: "none", border: "none", color: "var(--ps-muted)", cursor: "pointer" }}><Trash2 size={14} /></button>
                    </div>
                  ))}
                  <button type="button" style={{ width: "100%", padding: "8px", borderRadius: 10, border: "1px dashed var(--ps-primary)", background: "var(--ps-primary-mist)", color: "var(--ps-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    + Add floor plan
                  </button>
                </FieldRow>
              </div>

              {/* Dynamic variables */}
              <div className="ps-card" style={{ borderRadius: 14, overflow: "hidden", marginTop: 16 }}>
                <div style={{ padding: "14px 18px", background: "linear-gradient(135deg, var(--ps-primary-mist), var(--ps-secondary-soft))", borderBottom: "1px solid var(--ps-line)" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ps-ink)" }}>Dynamic variables</div>
                  <div style={{ fontSize: 11.5, color: "var(--ps-muted)", marginTop: 2 }}>Use anywhere in the builder — updates propagate instantly.</div>
                </div>
                <div style={{ padding: 12 }}>
                  {DYNAMIC_VARS.map((v) => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() => copy(v.token)}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 9, border: "none", background: copied === v.token ? "var(--ps-success-soft)" : "#f8fafc", cursor: "pointer", textAlign: "left", marginBottom: 4 }}
                    >
                      <span style={{ fontSize: 11.5, fontWeight: 700, fontFamily: "monospace", color: "var(--ps-primary)", minWidth: 150 }}>{v.token}</span>
                      <span style={{ flex: 1, fontSize: 11.5, color: "var(--ps-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.value}</span>
                      {copied === v.token ? <Check size={14} style={{ color: "var(--ps-success)" }} /> : <Copy size={14} style={{ color: "var(--ps-muted)" }} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TagList({ items, onChange, addLabel }: { items: string[]; onChange: (v: string[]) => void; addLabel: string }) {
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {items.map((t, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--ps-primary-soft)", color: "var(--ps-primary)", fontSize: 11.5, fontWeight: 700, padding: "5px 10px", borderRadius: 999 }}>
            {t}
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "var(--ps-primary)", cursor: "pointer", padding: 0, display: "inline-flex" }}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <button type="button" style={{ width: "100%", padding: "7px", borderRadius: 9, border: "1px dashed var(--ps-primary)", background: "var(--ps-primary-mist)", color: "var(--ps-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
        + Add {addLabel}
      </button>
    </div>
  );
}

function SceneThumb({ art }: { art: string }) {
  return (
    <div style={{ width: "100%", height: "100%", minHeight: 46 }}>
      <SceneImage art={art} />
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}