"use client";

import { useEffect, useMemo, useState } from "react";
import type * as React from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  FileText,
  Globe,
  Heading,
  Layers,
  Monitor,
  Palette,
  Plus,
  Save,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Type as TypeIcon,
  Upload,
} from "lucide-react";
import type { LandingPageData, SiteConfig } from "@/lib/prestate/types";
import type {
  FontDef,
  GlobalStyleSet,
  ResponsiveType,
  TemplateTypography,
  TypeKey,
  TypeToken,
} from "@/lib/prestate/design-system";
import {
  createGlobalSet,
  defaultTypography,
  deleteGlobalSet,
  effectiveTypography,
  ensureDesignSystem,
  fontOptions,
  loadFonts,
  loadGlobalSets,
  saveFonts,
  updateGlobalSet,
} from "@/lib/prestate/design-system";
import type { Resource } from "@/lib/prestate/store";
import { uid } from "@/lib/prestate/data";
import { ensureConfig, siteThemeStyle } from "@/lib/prestate/site-config";

const CURATED_PAIRINGS = [
  {
    name: "Luxury Editorial",
    heading: "Playfair Display",
    body: "Inter",
    desc: "Classic high-end serif paired with clean modern sans",
  },
  {
    name: "Modern Minimalist",
    heading: "Plus Jakarta Sans",
    body: "Inter",
    desc: "Sleek geometric tech & urban architecture",
  },
  {
    name: "Royal Prestige",
    heading: "Cinzel",
    body: "DM Sans",
    desc: "Sophisticated luxury estate aesthetic",
  },
  {
    name: "Bold Contemporary",
    heading: "Outfit",
    body: "Plus Jakarta Sans",
    desc: "Dynamic bold headlines with clean readable body",
  },
];

const TYPE_META: {
  key: TypeKey;
  label: string;
  tag: string;
  defaultSample: string;
}[] = [
  {
    key: "h1",
    label: "Heading 1 (H1)",
    tag: "Hero & Page Title",
    defaultSample: "Luxury 3 & 4 BHK Residences in Bangalore",
  },
  {
    key: "h2",
    label: "Heading 2 (H2)",
    tag: "Section Headings",
    defaultSample: "Architectural Excellence & World-Class Amenities",
  },
  {
    key: "h3",
    label: "Heading 3 (H3)",
    tag: "Sub-Headings",
    defaultSample: "Master Plan & Tower Specifications",
  },
  {
    key: "h4",
    label: "Heading 4 (H4)",
    tag: "Card Titles",
    defaultSample: "3 BHK Premium — 1,850 Sq.Ft.",
  },
  {
    key: "h5",
    label: "Heading 5 (H5)",
    tag: "Minor Titles",
    defaultSample: "Possession: December 2026",
  },
  {
    key: "h6",
    label: "Heading 6 (H6)",
    tag: "Eyebrow & Badges",
    defaultSample: "RERA APPROVED • SARJAPUR ROAD",
  },
  {
    key: "p",
    label: "Paragraph (Body)",
    tag: "Body Copy & Text",
    defaultSample:
      "Thoughtfully crafted luxury residences with 80% open landscaped greens, resort-style double-height clubhouses, and seamless connectivity to prime tech hubs.",
  },
];

const DEVICES: {
  key: "desktop" | "tablet" | "mobile";
  icon: typeof Monitor;
  label: string;
}[] = [
  { key: "desktop", icon: Monitor, label: "Desktop" },
  { key: "tablet", icon: Tablet, label: "Tablet" },
  { key: "mobile", icon: Smartphone, label: "Mobile" },
];

export function TypographyModule({
  site,
  onPatch,
  onToast,
  resource,
}: {
  site: LandingPageData;
  pages: LandingPageData[];
  onSelectSite: (id: string) => void;
  onPatch: (fn: (c: SiteConfig) => SiteConfig) => void;
  onToast: (m: string) => void;
  resource: Resource;
}) {
  const cfg = ensureConfig(site);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );
  const [selectedTag, setSelectedTag] = useState<TypeKey>("h1");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [fontsVersion, setFontsVersion] = useState(0);
  const fonts = useMemo(() => {
    void fontsVersion;
    return loadFonts();
  }, [fontsVersion]);

  const [globalSets, setGlobalSets] = useState<GlobalStyleSet[]>([]);
  const [globalSetsLoaded, setGlobalSetsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGlobalSets(resource)
      .then((sets) => {
        if (cancelled) return;
        setGlobalSets(sets);
        setGlobalSetsLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setGlobalSetsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [resource]);

  const eff = effectiveTypography(cfg, globalSets);
  const isGlobal = eff.isGlobal && !!eff.set;
  const isReadOnlySet =
    isGlobal && eff.set?.scope === "platform" && resource === "landing-page";

  const writeTypography = (next: TemplateTypography) => {
    if (isGlobal && eff.set) {
      if (isReadOnlySet) return;
      const setId = eff.set.id;
      setGlobalSets((prev) =>
        prev.map((s) => (s.id === setId ? { ...s, typography: next } : s)),
      );
      onPatch((c) => ({ ...c }));
      updateGlobalSet(resource, setId, { typography: next }).catch((err) =>
        onToast(
          err instanceof Error ? err.message : "Couldn't save shared set",
        ),
      );
      return;
    }
    onPatch((c) => ({
      ...c,
      designSystem: {
        ...ensureDesignSystem(c),
        scope: c.designSystem?.scope === "global" ? "global" : "template",
        globalSetId: c.designSystem?.globalSetId,
        typography: next,
      },
    }));
  };

  const currentTypo = eff.typography;
  const bp = device;
  const activeToken: TypeToken =
    currentTypo[selectedTag]?.[bp] ?? currentTypo[selectedTag]?.desktop ?? {};

  const patchToken = (patch: Partial<TypeToken>) => {
    const cur: ResponsiveType = currentTypo[selectedTag] ?? { desktop: {} };
    const merged: ResponsiveType = {
      ...cur,
      [bp]: { ...(cur[bp] ?? {}), ...patch },
    };
    writeTypography({ ...currentTypo, [selectedTag]: merged });
  };

  const applyPairing = (headingFont: string, bodyFont: string) => {
    const withFont = (key: TypeKey, family: string): ResponsiveType => {
      const base: ResponsiveType = currentTypo[key] ?? { desktop: {} };
      return {
        ...base,
        desktop: { ...(base.desktop ?? {}), fontFamily: family },
      };
    };
    const nextTypo: TemplateTypography = {
      ...currentTypo,
      h1: withFont("h1", headingFont),
      h2: withFont("h2", headingFont),
      h3: withFont("h3", headingFont),
      h4: withFont("h4", headingFont),
      h5: withFont("h5", headingFont),
      h6: withFont("h6", headingFont),
      p: withFont("p", bodyFont),
    };
    writeTypography(nextTypo);
    onToast(`Applied pairing: ${headingFont} + ${bodyFont}`);
  };

  const handleUploadFonts = async (list: FileList | null) => {
    for (const file of Array.from(list ?? [])) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const format: FontDef["format"] | null =
        ext === "woff2"
          ? "woff2"
          : ext === "woff"
            ? "woff"
            : ext === "ttf"
              ? "truetype"
              : ext === "otf"
                ? "opentype"
                : null;
      if (!format) {
        onToast(`${file.name} — please use WOFF2, TTF or OTF`);
        continue;
      }
      const src = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
      });
      if (!src) continue;
      const family =
        file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[-_]+/g, " ")
          .trim() || "Custom Font";
      const next = [
        ...loadFonts(),
        { id: uid("font"), family, src, format, weight: 400, enabled: true },
      ];
      saveFonts(next);
      setFontsVersion((v) => v + 1);
      onToast(`Uploaded font “${family}”`);
    }
  };

  const fontList = fontOptions(fonts);

  const handleSave = () => {
    setSavedSuccess(true);
    onToast(`Typography & font rules saved`);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--ps-bg)",
        color: "var(--ps-ink)",
        overflow: "hidden",
        ...siteThemeStyle(cfg.brand),
      }}
    >
      {/* Top Action Ribbon */}
      <div
        style={{
          background: "var(--ps-panel)",
          borderBottom: "1px solid var(--ps-line-strong)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontSize: 13.5,
              fontWeight: 800,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <TypeIcon size={16} style={{ color: "var(--ps-primary)" }} />{" "}
            Typography & Font System
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--ps-muted)",
              borderLeft: "1px solid var(--ps-line-strong)",
              paddingLeft: 12,
            }}
          >
            {isGlobal ? `Shared: ${eff.set?.name}` : `Scoped to ${site.name}`}
          </span>
        </div>

        {/* Center Device Switcher */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
            background: "rgba(0, 0, 0, 0.35)",
            borderRadius: 10,
            padding: 3,
            border: "1px solid var(--ps-line-strong)",
          }}
        >
          {DEVICES.map((dev) => (
            <button
              key={dev.key}
              type="button"
              title={dev.label}
              onClick={() => setDevice(dev.key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 7,
                border: "none",
                background:
                  device === dev.key ? "var(--ps-panel-raised)" : "transparent",
                color: device === dev.key ? "#fff" : "var(--ps-muted)",
                boxShadow:
                  device === dev.key ? "0 1px 3px rgba(0,0,0,.4)" : "none",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <dev.icon size={14} />
              <span>{dev.label}</span>
            </button>
          ))}
        </div>

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 18px",
            borderRadius: 9,
            border: "none",
            background: savedSuccess
              ? "var(--ps-success)"
              : "var(--ps-primary)",
            color: "#fff",
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(109,93,252,0.35)",
            transition: "background 0.2s",
          }}
        >
          {savedSuccess ? <Check size={15} /> : <Save size={15} />}
          <span>{savedSuccess ? "Saved!" : "Save Typography"}</span>
        </button>
      </div>

      {/* Main 2-Panel Layout */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Left Control Sidebar */}
        <div
          style={{
            width: 440,
            background: "var(--ps-panel)",
            borderRight: "1px solid var(--ps-line)",
            overflowY: "auto",
            padding: "20px 20px 60px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            flexShrink: 0,
          }}
        >
          {/* Section 1: Curated Font Pairings */}
          <div
            style={{
              background: "var(--ps-panel-raised)",
              border: "1px solid var(--ps-line-strong)",
              borderRadius: 14,
              padding: "16px 16px",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#fff",
                marginBottom: 4,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Sparkles size={16} style={{ color: "var(--ps-primary)" }} />{" "}
              1-Click Font Pairings
            </div>
            <p
              style={{
                fontSize: 11.5,
                color: "var(--ps-muted)",
                margin: "0 0 12px",
                lineHeight: 1.45,
              }}
            >
              Instantly apply harmonized typography scales designed for real
              estate conversion.
            </p>
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}
            >
              {CURATED_PAIRINGS.map((pair) => (
                <button
                  key={pair.name}
                  type="button"
                  onClick={() => applyPairing(pair.heading, pair.body)}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--ps-line)",
                    background: "var(--ps-bg)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "all 0.12s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "var(--ps-primary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "var(--ps-line)")
                  }
                >
                  <div>
                    <div
                      style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}
                    >
                      {pair.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--ps-muted)",
                        marginTop: 2,
                      }}
                    >
                      <span style={{ color: "#a5b4fc", fontWeight: 700 }}>
                        {pair.heading}
                      </span>{" "}
                      + {pair.body}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--ps-primary)",
                      background: "rgba(109,93,252,0.15)",
                      padding: "3px 8px",
                      borderRadius: 6,
                    }}
                  >
                    Apply
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Hierarchy Elements Selector */}
          <div
            style={{
              background: "var(--ps-panel-raised)",
              border: "1px solid var(--ps-line-strong)",
              borderRadius: 14,
              padding: "16px 16px",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#fff",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Heading size={16} style={{ color: "var(--ps-primary)" }} />{" "}
              Select Element to Customize
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 6,
                marginBottom: 14,
              }}
            >
              {TYPE_META.map((t) => {
                const active = selectedTag === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSelectedTag(t.key)}
                    style={{
                      padding: "8px 4px",
                      borderRadius: 8,
                      border: active
                        ? "2px solid var(--ps-primary)"
                        : "1px solid var(--ps-line)",
                      background: active
                        ? "rgba(109, 93, 252, 0.22)"
                        : "var(--ps-bg)",
                      color: active ? "#9690ff" : "#fff",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    {t.key.toUpperCase()}
                  </button>
                );
              })}
            </div>

            {/* Selected Tag Controls */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                background: "var(--ps-bg)",
                padding: 14,
                borderRadius: 10,
                border: "1px solid var(--ps-line)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#9690ff",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {TYPE_META.find((m) => m.key === selectedTag)?.label}
              </div>

              {/* Font Family */}
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--ps-muted)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Font Family
                </label>
                <select
                  value={activeToken.fontFamily || "Inter"}
                  onChange={(e) => patchToken({ fontFamily: e.target.value })}
                  style={{
                    width: "100%",
                    background: "var(--ps-panel-raised)",
                    border: "1px solid var(--ps-line-strong)",
                    color: "#fff",
                    padding: "8px 10px",
                    borderRadius: 8,
                    fontSize: 12.5,
                    outline: "none",
                  }}
                >
                  {fontList.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font Size & Weight Row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--ps-muted)",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Size:{" "}
                    {activeToken.fontSize ??
                      (selectedTag === "h1"
                        ? 44
                        : selectedTag === "h2"
                          ? 32
                          : 16)}
                    px
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    value={Number(
                      activeToken.fontSize ??
                        (selectedTag === "h1"
                          ? 44
                          : selectedTag === "h2"
                            ? 32
                            : 16),
                    )}
                    onChange={(e) =>
                      patchToken({ fontSize: Number(e.target.value) })
                    }
                    style={{
                      width: "100%",
                      cursor: "pointer",
                      accentColor: "var(--ps-primary)",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--ps-muted)",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Font Weight
                  </label>
                  <select
                    value={
                      activeToken.fontWeight ||
                      (selectedTag.startsWith("h") ? "800" : "400")
                    }
                    onChange={(e) => patchToken({ fontWeight: Number(e.target.value) })}
                    style={{
                      width: "100%",
                      background: "var(--ps-panel-raised)",
                      border: "1px solid var(--ps-line-strong)",
                      color: "#fff",
                      padding: "6px 8px",
                      borderRadius: 8,
                      fontSize: 12,
                      outline: "none",
                    }}
                  >
                    <option value="300">Light 300</option>
                    <option value="400">Regular 400</option>
                    <option value="500">Medium 500</option>
                    <option value="600">Semibold 600</option>
                    <option value="700">Bold 700</option>
                    <option value="800">Extra Bold 800</option>
                    <option value="900">Black 900</option>
                  </select>
                </div>
              </div>

              {/* Line Height & Letter Spacing */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--ps-muted)",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Line Height
                  </label>
                  <input
                    className="ps-input"
                    value={activeToken.lineHeight || "1.25"}
                    placeholder="1.25"
                    onChange={(e) => patchToken({ lineHeight: Number(e.target.value) })}
                    style={{
                      fontSize: 12,
                      background: "var(--ps-panel-raised)",
                      color: "#fff",
                      padding: "6px 8px",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--ps-muted)",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Letter Spacing
                  </label>
                  <input
                    className="ps-input"
                    value={activeToken.letterSpacing || "-0.02em"}
                    placeholder="-0.02em"
                    onChange={(e) =>
                      patchToken({ letterSpacing: Number(e.target.value) })
                    }
                    style={{
                      fontSize: 12,
                      background: "var(--ps-panel-raised)",
                      color: "#fff",
                      padding: "6px 8px",
                    }}
                  />
                </div>
              </div>

              {/* Text Transform & Color */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--ps-muted)",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Transform
                  </label>
                  <select
                    value={activeToken.textTransform || "none"}
                    onChange={(e) =>
                      patchToken({
                        textTransform: e.target.value as
                          "none" | "uppercase" | "capitalize" | "lowercase",
                      })
                    }
                    style={{
                      width: "100%",
                      background: "var(--ps-panel-raised)",
                      border: "1px solid var(--ps-line-strong)",
                      color: "#fff",
                      padding: "6px 8px",
                      borderRadius: 8,
                      fontSize: 12,
                      outline: "none",
                    }}
                  >
                    <option value="none">Normal</option>
                    <option value="uppercase">UPPERCASE</option>
                    <option value="capitalize">Capitalize</option>
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--ps-muted)",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Color Override
                  </label>
                  <input
                    type="color"
                    value={activeToken.textColor || "#111827"}
                    onChange={(e) => patchToken({ textColor: e.target.value })}
                    style={{
                      width: "100%",
                      height: 32,
                      padding: 0,
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      background: "transparent",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Custom Font Files Uploader */}
          <div
            style={{
              background: "var(--ps-panel-raised)",
              border: "1px solid var(--ps-line-strong)",
              borderRadius: 14,
              padding: "16px 16px",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#fff",
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Upload size={16} style={{ color: "var(--ps-primary)" }} /> Custom
              Font Uploads
            </div>
            <p
              style={{
                fontSize: 11.5,
                color: "var(--ps-muted)",
                margin: "0 0 12px",
                lineHeight: 1.45,
              }}
            >
              Upload .woff2, .ttf or .otf files for custom builder brand fonts.
            </p>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px 14px",
                borderRadius: 10,
                border: "1.5px dashed var(--ps-line-strong)",
                background: "var(--ps-bg)",
                cursor: "pointer",
                textAlign: "center",
                gap: 6,
              }}
            >
              <Upload size={20} style={{ color: "var(--ps-primary)" }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#fff" }}>
                Click to upload custom font files
              </span>
              <span style={{ fontSize: 10.5, color: "var(--ps-muted)" }}>
                Supports WOFF2, TTF, OTF (Max 1.5MB)
              </span>
              <input
                type="file"
                multiple
                accept=".woff2,.woff,.ttf,.otf"
                onChange={(e) => void handleUploadFonts(e.target.files)}
                style={{ display: "none" }}
              />
            </label>

            {fonts.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  marginTop: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--ps-muted)",
                    textTransform: "uppercase",
                  }}
                >
                  Installed Custom Fonts:
                </div>
                {fonts.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "var(--ps-bg)",
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid var(--ps-line)",
                    }}
                  >
                    <span
                      style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}
                    >
                      {f.family} ({f.format})
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        color: "var(--ps-success)",
                        fontWeight: 700,
                      }}
                    >
                      Ready
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Live Specimen Canvas */}
        <div
          className="ps-canvas-dots"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "28px 36px 80px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Visual Specimen Card */}
          <div
            style={{
              width:
                device === "desktop" ? "100%" : device === "tablet" ? 768 : 390,
              maxWidth: "100%",
              background: "#fff",
              borderRadius: device === "desktop" ? 18 : 28,
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 25px 70px rgba(0, 0, 0, 0.65)",
              overflow: "hidden",
              transition: "width 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Header Stage Bar */}
            <div
              style={{
                background: "#0f172a",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                padding: "12px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#f87171",
                  }}
                />
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#fbbf24",
                  }}
                />
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#34d399",
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#cbd5e1",
                    marginLeft: 8,
                  }}
                >
                  Live Typography Specimen — {device.toUpperCase()}
                </span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>
                Interactive Visual Hierarchy
              </span>
            </div>

            {/* Specimen Content Sheet */}
            <div
              style={{
                padding:
                  device === "mobile" ? "28px 20px 48px" : "44px 40px 60px",
                display: "flex",
                flexDirection: "column",
                gap: 32,
              }}
            >
              {TYPE_META.map((t) => {
                const tok: TypeToken = currentTypo[t.key]?.desktop ?? {};
                const isSelected = selectedTag === t.key;
                const fontF =
                  tok.fontFamily || (t.key.startsWith("h") ? "Inter" : "Inter");
                const fontSz =
                  tok.fontSize ??
                  (t.key === "h1"
                    ? 42
                    : t.key === "h2"
                      ? 30
                      : t.key === "h3"
                        ? 22
                        : t.key === "h4"
                          ? 18
                          : t.key === "h5"
                            ? 15
                            : t.key === "h6"
                              ? 12
                              : 15);
                const fontWt =
                  tok.fontWeight ?? (t.key.startsWith("h") ? "800" : "400");
                const lineH = tok.lineHeight ?? "1.3";
                const letSp = tok.letterSpacing ?? "normal";
                const trans = tok.textTransform ?? "none";
                const clr = tok.textColor ?? "#0f172a";

                return (
                  <div
                    key={t.key}
                    onClick={() => setSelectedTag(t.key)}
                    style={{
                      padding: "16px 18px",
                      borderRadius: 12,
                      border: isSelected
                        ? "2px solid var(--ps-primary)"
                        : "1px solid transparent",
                      background: isSelected
                        ? "rgba(109, 93, 252, 0.05)"
                        : "transparent",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      position: "relative",
                    }}
                  >
                    {/* Meta Specimen Badge */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: 0.8,
                          color: isSelected ? "var(--ps-primary)" : "#64748b",
                          background: isSelected
                            ? "rgba(109, 93, 252, 0.15)"
                            : "#f1f5f9",
                          padding: "2px 8px",
                          borderRadius: 6,
                        }}
                      >
                        {t.label} · {t.tag}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#94a3b8",
                          fontFamily: "monospace",
                        }}
                      >
                        {fontF} · {fontSz}px · {fontWt}
                      </span>
                    </div>

                    {/* Live Rendered Text */}
                    <div
                      style={{
                        fontFamily: `${fontF}, Inter, system-ui, sans-serif`,
                        fontSize:
                          typeof fontSz === "number" ? `${fontSz}px` : fontSz,
                        fontWeight: fontWt as any,
                        lineHeight: lineH,
                        letterSpacing: letSp,
                        textTransform: trans,
                        color: clr,
                      }}
                    >
                      {t.defaultSample}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
