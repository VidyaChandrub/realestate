"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Eye,
  Globe,
  ImagePlus,
  Layers,
  Link2,
  Menu,
  MessageCircle,
  Monitor,
  PanelBottom,
  PanelsTopLeft,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
} from "lucide-react";
import type {
  Device,
  FooterDesignId,
  HeaderDesignId,
  LandingPageData,
  MenuLink,
  SiteConfig,
} from "@/lib/prestate/types";
import {
  FOOTER_DESIGNS,
  HEADER_DESIGNS,
  defaultFooterSettings,
  defaultFooterStyle,
  defaultHeaderSettings,
  defaultHeaderStyle,
} from "@/lib/prestate/chrome-presets";
import { ensureConfig, siteThemeStyle } from "@/lib/prestate/site-config";
import {
  ChromeFooter,
  ChromeHeader,
} from "@/components/prestate/builder/chrome-renderers";
import { MediaPicker } from "@/components/media-picker";

function slugHref(label: string): string {
  return `#${label.toLowerCase().replace(/\s+/g, "-")}`;
}

const SECTION_SHORTCUTS = [
  { label: "Overview", href: "#overview" },
  { label: "Amenities", href: "#amenities" },
  { label: "Floor Plans", href: "#floor-plans" },
  { label: "Pricing", href: "#pricing" },
  { label: "Gallery", href: "#gallery" },
  { label: "Location", href: "#location" },
  { label: "Contact", href: "#contact" },
];

const DEVICES: { key: Device; icon: typeof Monitor; label: string }[] = [
  { key: "desktop", icon: Monitor, label: "Desktop" },
  { key: "tablet", icon: Tablet, label: "Tablet" },
  { key: "mobile", icon: Smartphone, label: "Mobile" },
];

// Mini-diagrams for Header Layouts
function HeaderDiagram({ id }: { id: string }) {
  if (id === "centered") {
    return (
      <div
        style={{
          height: 28,
          background: "#0b0f19",
          borderRadius: 6,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          padding: "3px 8px",
          border: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <div
          style={{
            width: 24,
            height: 6,
            background: "var(--ps-primary)",
            borderRadius: 3,
          }}
        />
        <div style={{ display: "flex", gap: 4 }}>
          <div
            style={{
              width: 14,
              height: 3,
              background: "rgba(255,255,255,.4)",
              borderRadius: 2,
            }}
          />
          <div
            style={{
              width: 14,
              height: 3,
              background: "rgba(255,255,255,.4)",
              borderRadius: 2,
            }}
          />
          <div
            style={{
              width: 14,
              height: 3,
              background: "rgba(255,255,255,.4)",
              borderRadius: 2,
            }}
          />
        </div>
      </div>
    );
  }
  if (id === "ribbon") {
    return (
      <div
        style={{
          height: 28,
          background: "#0b0f19",
          borderRadius: 6,
          display: "flex",
          flexDirection: "column",
          padding: "2px 6px",
          gap: 2,
          border: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: 4,
            background: "var(--ps-secondary)",
            borderRadius: 2,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flex: 1,
          }}
        >
          <div
            style={{
              width: 18,
              height: 6,
              background: "#fff",
              borderRadius: 2,
            }}
          />
          <div
            style={{
              width: 14,
              height: 6,
              background: "var(--ps-primary)",
              borderRadius: 2,
            }}
          />
        </div>
      </div>
    );
  }
  if (id === "minimal") {
    return (
      <div
        style={{
          height: 28,
          background: "#0b0f19",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 8px",
          border: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <div
          style={{ width: 20, height: 6, background: "#fff", borderRadius: 2 }}
        />
        <div
          style={{
            width: 12,
            height: 8,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              height: 1.5,
              background: "rgba(255,255,255,.8)",
              borderRadius: 1,
            }}
          />
          <div
            style={{
              height: 1.5,
              background: "rgba(255,255,255,.8)",
              borderRadius: 1,
            }}
          />
          <div
            style={{
              height: 1.5,
              background: "rgba(255,255,255,.8)",
              borderRadius: 1,
            }}
          />
        </div>
      </div>
    );
  }
  if (id === "overlay") {
    return (
      <div
        style={{
          height: 28,
          background: "#0b0f19",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 6px",
          border: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <div
          style={{
            width: "88%",
            height: 16,
            background: "rgba(255,255,255,.12)",
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 6px",
            border: "1px solid rgba(255,255,255,.2)",
          }}
        >
          <div
            style={{
              width: 12,
              height: 5,
              background: "var(--ps-primary)",
              borderRadius: 2,
            }}
          />
          <div
            style={{
              width: 10,
              height: 5,
              background: "var(--ps-secondary)",
              borderRadius: 999,
            }}
          />
        </div>
      </div>
    );
  }
  // Default: classic
  return (
    <div
      style={{
        height: 28,
        background: "#0b0f19",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 8px",
        border: "1px solid rgba(255,255,255,.08)",
      }}
    >
      <div
        style={{ width: 22, height: 6, background: "#fff", borderRadius: 2 }}
      />
      <div style={{ display: "flex", gap: 3 }}>
        <div
          style={{
            width: 8,
            height: 3,
            background: "rgba(255,255,255,.4)",
            borderRadius: 1,
          }}
        />
        <div
          style={{
            width: 8,
            height: 3,
            background: "rgba(255,255,255,.4)",
            borderRadius: 1,
          }}
        />
      </div>
      <div
        style={{
          width: 14,
          height: 7,
          background: "var(--ps-primary)",
          borderRadius: 3,
        }}
      />
    </div>
  );
}

// Mini-diagrams for Footer Layouts
function FooterDiagram({ id }: { id: string }) {
  if (id === "centered") {
    return (
      <div
        style={{
          height: 34,
          background: "#0b0f19",
          borderRadius: 6,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          padding: "4px",
          border: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <div
          style={{
            width: 16,
            height: 6,
            background: "var(--ps-primary)",
            borderRadius: 3,
          }}
        />
        <div style={{ display: "flex", gap: 3 }}>
          <div
            style={{
              width: 10,
              height: 2.5,
              background: "rgba(255,255,255,.4)",
              borderRadius: 1,
            }}
          />
          <div
            style={{
              width: 10,
              height: 2.5,
              background: "rgba(255,255,255,.4)",
              borderRadius: 1,
            }}
          />
          <div
            style={{
              width: 10,
              height: 2.5,
              background: "rgba(255,255,255,.4)",
              borderRadius: 1,
            }}
          />
        </div>
        <div
          style={{
            width: 28,
            height: 2,
            background: "rgba(255,255,255,.2)",
            borderRadius: 1,
          }}
        />
      </div>
    );
  }
  if (id === "newsletter") {
    return (
      <div
        style={{
          height: 34,
          background: "#0b0f19",
          borderRadius: 6,
          display: "flex",
          flexDirection: "column",
          padding: "3px 5px",
          gap: 3,
          border: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: 10,
            background: "rgba(109,93,252,0.25)",
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 4px",
          }}
        >
          <div
            style={{
              width: 18,
              height: 3,
              background: "#fff",
              borderRadius: 1,
            }}
          />
          <div
            style={{
              width: 10,
              height: 5,
              background: "var(--ps-primary)",
              borderRadius: 2,
            }}
          />
        </div>
        <div
          style={{ display: "flex", justifyContent: "space-between", gap: 3 }}
        >
          <div
            style={{
              flex: 1,
              height: 10,
              background: "rgba(255,255,255,.08)",
              borderRadius: 2,
            }}
          />
          <div
            style={{
              flex: 1,
              height: 10,
              background: "rgba(255,255,255,.08)",
              borderRadius: 2,
            }}
          />
          <div
            style={{
              flex: 1,
              height: 10,
              background: "rgba(255,255,255,.08)",
              borderRadius: 2,
            }}
          />
        </div>
      </div>
    );
  }
  if (id === "slimbar") {
    return (
      <div
        style={{
          height: 34,
          background: "#0b0f19",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 8px",
          border: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <div
          style={{ width: 18, height: 6, background: "#fff", borderRadius: 2 }}
        />
        <div style={{ display: "flex", gap: 3 }}>
          <div
            style={{
              width: 8,
              height: 2.5,
              background: "rgba(255,255,255,.4)",
              borderRadius: 1,
            }}
          />
          <div
            style={{
              width: 8,
              height: 2.5,
              background: "rgba(255,255,255,.4)",
              borderRadius: 1,
            }}
          />
        </div>
        <div
          style={{
            width: 14,
            height: 2.5,
            background: "rgba(255,255,255,.3)",
            borderRadius: 1,
          }}
        />
      </div>
    );
  }
  if (id === "cards") {
    return (
      <div
        style={{
          height: 34,
          background: "#0b0f19",
          borderRadius: 6,
          display: "flex",
          flexDirection: "column",
          padding: "3px",
          gap: 3,
          border: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <div style={{ display: "flex", gap: 3 }}>
          <div
            style={{
              flex: 1,
              height: 12,
              background: "rgba(109,93,252,0.2)",
              borderRadius: 3,
              border: "1px solid rgba(109,93,252,0.4)",
            }}
          />
          <div
            style={{
              flex: 1,
              height: 12,
              background: "rgba(205,164,94,0.2)",
              borderRadius: 3,
              border: "1px solid rgba(205,164,94,0.4)",
            }}
          />
        </div>
        <div
          style={{
            height: 8,
            background: "rgba(255,255,255,.06)",
            borderRadius: 2,
          }}
        />
      </div>
    );
  }
  // Default: columns
  return (
    <div
      style={{
        height: 34,
        background: "#0b0f19",
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        padding: "4px",
        gap: 3,
        border: "1px solid rgba(255,255,255,.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 3,
          flex: 1,
        }}
      >
        <div
          style={{
            flex: 1.2,
            height: "100%",
            background: "rgba(255,255,255,.15)",
            borderRadius: 2,
          }}
        />
        <div
          style={{
            flex: 0.9,
            height: "100%",
            background: "rgba(255,255,255,.08)",
            borderRadius: 2,
          }}
        />
        <div
          style={{
            flex: 0.9,
            height: "100%",
            background: "rgba(255,255,255,.08)",
            borderRadius: 2,
          }}
        />
        <div
          style={{
            flex: 0.9,
            height: "100%",
            background: "rgba(255,255,255,.08)",
            borderRadius: 2,
          }}
        />
      </div>
      <div
        style={{
          height: 2,
          background: "rgba(255,255,255,.15)",
          borderRadius: 1,
        }}
      />
    </div>
  );
}

export function HeaderFooterModule({
  site,
  pages,
  onPatch,
  onToast,
}: {
  site: LandingPageData;
  pages: LandingPageData[];
  onSelectSite: (id: string) => void;
  onPatch: (fn: (c: SiteConfig) => SiteConfig) => void;
  onToast: (m: string) => void;
}) {
  const cfg = ensureConfig(site);
  const { header, footer, brand } = cfg;
  const [activeTab, setActiveTab] = useState<"header" | "footer">("header");
  const [device, setDevice] = useState<Device>("desktop");
  const [viewMode, setViewMode] = useState<"focused" | "full">("focused");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const patchHeader = (partial: Partial<SiteConfig["header"]>) =>
    onPatch((c) => ({ ...c, header: { ...c.header, ...partial } }));
  const patchFooter = (partial: Partial<SiteConfig["footer"]>) =>
    onPatch((c) => ({ ...c, footer: { ...c.footer, ...partial } }));
  const patchHeaderSettings = (partial: Record<string, unknown>) =>
    patchHeader({ settings: { ...(header.settings ?? {}), ...partial } });
  const patchFooterSettings = (partial: Record<string, unknown>) =>
    patchFooter({ settings: { ...(footer.settings ?? {}), ...partial } });

  const links: MenuLink[] =
    Array.isArray(header.menuLinks) && header.menuLinks.length > 0
      ? header.menuLinks
      : (header.menu ?? []).map((label) => ({ label, href: slugHref(label) }));

  const setLinks = (next: MenuLink[]) =>
    patchHeader({ menuLinks: next, menu: next.map((l) => l.label) });

  const setHeaderDesign = (id: string) =>
    onPatch((c) => ({
      ...c,
      header: {
        ...c.header,
        design: id as HeaderDesignId,
        settings: defaultHeaderSettings(id as HeaderDesignId),
        style: defaultHeaderStyle(id as HeaderDesignId),
      },
    }));

  const setFooterDesign = (id: string) =>
    onPatch((c) => ({
      ...c,
      footer: {
        ...c.footer,
        design: id as FooterDesignId,
        settings: defaultFooterSettings(id as FooterDesignId),
        style: defaultFooterStyle(id as FooterDesignId),
      },
    }));

  const footerSettings = footer.settings ?? {};
  const footerLinkList: MenuLink[] = Array.isArray(footerSettings.links)
    ? (footerSettings.links as MenuLink[])
    : [];
  const copyrightValue =
    typeof footerSettings.copyrightText === "string" &&
    footerSettings.copyrightText
      ? footerSettings.copyrightText
      : footer.copyright;
  const reraValue =
    typeof footerSettings.reraText === "string" && footerSettings.reraText
      ? footerSettings.reraText
      : footer.rera;

  const patchFooterText = (
    settingsKey: "copyrightText" | "reraText",
    rootKey: "copyright" | "rera",
    v: string,
  ) =>
    onPatch((c) => ({
      ...c,
      footer: {
        ...c.footer,
        settings: { ...(c.footer.settings ?? {}), [settingsKey]: v },
        [rootKey]: v,
      },
    }));

  const handleSave = () => {
    setSavedSuccess(true);
    onToast(`Header & footer layout saved for ${site.name}`);
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
        ...siteThemeStyle(brand),
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
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Segmented header vs footer selector */}
          <div
            style={{
              display: "inline-flex",
              background: "rgba(0, 0, 0, 0.35)",
              borderRadius: 10,
              padding: 3,
              border: "1px solid var(--ps-line-strong)",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("header")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 16px",
                borderRadius: 8,
                border: "none",
                background:
                  activeTab === "header" ? "var(--ps-primary)" : "transparent",
                color: activeTab === "header" ? "#fff" : "var(--ps-slate)",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <PanelsTopLeft size={15} /> Header & Navigation
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("footer")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 16px",
                borderRadius: 8,
                border: "none",
                background:
                  activeTab === "footer" ? "var(--ps-primary)" : "transparent",
                color: activeTab === "footer" ? "#fff" : "var(--ps-slate)",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <PanelBottom size={15} /> Footer & Legal
            </button>
          </div>
        </div>

        {/* Center: Device Switcher & View Mode Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                    device === dev.key
                      ? "var(--ps-panel-raised)"
                      : "transparent",
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
            <button
              type="button"
              onClick={() => setViewMode("focused")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 10px",
                borderRadius: 7,
                border: "none",
                background:
                  viewMode === "focused"
                    ? "var(--ps-panel-raised)"
                    : "transparent",
                color: viewMode === "focused" ? "#fff" : "var(--ps-muted)",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Eye size={13} /> Focused View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("full")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 10px",
                borderRadius: 7,
                border: "none",
                background:
                  viewMode === "full"
                    ? "var(--ps-panel-raised)"
                    : "transparent",
                color: viewMode === "full" ? "#fff" : "var(--ps-muted)",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Layers size={13} /> Full Page
            </button>
          </div>
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
          <span>{savedSuccess ? "Saved!" : "Save Layout"}</span>
        </button>
      </div>

      {/* Main 2-Panel Layout */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Left Settings Sidebar */}
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
          {activeTab === "header" ? (
            <>
              {/* Section 1: Header Layout Presets */}
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
                  <PanelsTopLeft
                    size={16}
                    style={{ color: "var(--ps-primary)" }}
                  />{" "}
                  Header Layout Design
                </div>
                <p
                  style={{
                    fontSize: 11.5,
                    color: "var(--ps-muted)",
                    margin: "0 0 12px",
                    lineHeight: 1.45,
                  }}
                >
                  Select the structural arrangement for brand logo, menu links,
                  and call-to-actions.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 8,
                  }}
                >
                  {HEADER_DESIGNS.map((d) => {
                    const active = (header.design ?? "classic") === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setHeaderDesign(d.id)}
                        style={{
                          textAlign: "left",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: active
                            ? "2px solid var(--ps-primary)"
                            : "1px solid var(--ps-line)",
                          background: active
                            ? "rgba(109, 93, 252, 0.18)"
                            : "var(--ps-bg)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          transition: "all 0.12s",
                        }}
                      >
                        <div style={{ width: 68, flexShrink: 0 }}>
                          <HeaderDiagram id={d.id} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 800,
                              color: active ? "#9690ff" : "#fff",
                            }}
                          >
                            {d.name}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--ps-muted)",
                              marginTop: 2,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {d.desc}
                          </div>
                        </div>
                        {active ? (
                          <Check
                            size={16}
                            style={{ color: "#9690ff", flexShrink: 0 }}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Logo & Brand */}
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
                  <ImagePlus size={16} style={{ color: "var(--ps-primary)" }} />{" "}
                  Header Brand & Logo
                </div>
                <MediaPicker
                  kind="image"
                  label="Upload or paste Logo URL"
                  value={String(
                    (header.settings as Record<string, unknown>)?.logoUrl ?? "",
                  )}
                  onChange={(v) => patchHeaderSettings({ logoUrl: v })}
                />
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ps-muted)",
                    marginTop: 8,
                    lineHeight: 1.45,
                  }}
                >
                  Falls back to Brand Center logo if left blank.
                </div>
              </div>

              {/* Section 3: Navigation Menu Links */}
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Link2 size={16} style={{ color: "var(--ps-primary)" }} />{" "}
                    Navigation Menu Links
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--ps-muted)",
                    }}
                  >
                    {links.length} links
                  </span>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {links.map((l, i) => (
                    <div
                      key={`${i}-${l.label}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: "var(--ps-bg)",
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid var(--ps-line)",
                      }}
                    >
                      <input
                        className="ps-input"
                        value={l.label}
                        placeholder="Link Name"
                        onChange={(e) =>
                          setLinks(
                            links.map((x, j) =>
                              j === i ? { ...x, label: e.target.value } : x,
                            ),
                          )
                        }
                        style={{
                          flex: 1.2,
                          minWidth: 0,
                          fontSize: 12,
                          padding: "6px 8px",
                          background: "transparent",
                          color: "#fff",
                        }}
                      />
                      <input
                        className="ps-input"
                        value={l.href}
                        placeholder="#section"
                        onChange={(e) =>
                          setLinks(
                            links.map((x, j) =>
                              j === i ? { ...x, href: e.target.value } : x,
                            ),
                          )
                        }
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontFamily: "monospace",
                          fontSize: 11,
                          padding: "6px 8px",
                          background: "transparent",
                          color: "var(--ps-slate)",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setLinks(links.filter((_, idx) => idx !== i))
                        }
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--ps-muted)",
                          cursor: "pointer",
                          padding: 4,
                        }}
                        title="Remove link"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    marginTop: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setLinks([...links, { label: "New link", href: "#" }])
                    }
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px dashed var(--ps-primary)",
                      background: "rgba(109, 93, 252, 0.12)",
                      color: "#9690ff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <Plus size={14} /> Add Custom Link
                  </button>
                </div>

                {/* Quick Section Targets */}
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: "1px solid var(--ps-line)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      color: "var(--ps-muted)",
                      marginBottom: 6,
                    }}
                  >
                    Quick Section Presets:
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {SECTION_SHORTCUTS.map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => {
                          if (!links.some((l) => l.href === s.href)) {
                            setLinks([...links, s]);
                          }
                        }}
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: "var(--ps-slate)",
                          background: "var(--ps-bg)",
                          border: "1px solid var(--ps-line-strong)",
                          borderRadius: 6,
                          padding: "4px 8px",
                          cursor: "pointer",
                        }}
                      >
                        + {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 4: Header Actions & CTA Button */}
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
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Phone size={16} style={{ color: "var(--ps-primary)" }} />{" "}
                  Header Action Button (CTA)
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
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
                      Button Label
                    </label>
                    <input
                      className="ps-input"
                      value={header.cta || ""}
                      placeholder="e.g. Enquire Now / Book Visit"
                      onChange={(e) => patchHeader({ cta: e.target.value })}
                      style={{
                        width: "100%",
                        fontSize: 12.5,
                        background: "var(--ps-bg)",
                        color: "#fff",
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
                      Button Target Link
                    </label>
                    <input
                      className="ps-input"
                      value={header.ctaLink || ""}
                      placeholder="e.g. #contact / tel:+919876543210"
                      onChange={(e) => patchHeader({ ctaLink: e.target.value })}
                      style={{
                        width: "100%",
                        fontSize: 12.5,
                        background: "var(--ps-bg)",
                        color: "#fff",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Behavior & Display Options */}
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
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <SlidersHorizontal
                    size={16}
                    style={{ color: "var(--ps-primary)" }}
                  />{" "}
                  Behavior & Appearance
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: "#fff",
                        }}
                      >
                        Sticky Header
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ps-muted)" }}>
                        Pins navigation to the top when scrolling
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={header.sticky ?? true}
                      onChange={(e) =>
                        patchHeader({ sticky: e.target.checked })
                      }
                      style={{ width: 18, height: 18, cursor: "pointer" }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: "#fff",
                        }}
                      >
                        Transparent Over Hero
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ps-muted)" }}>
                        Blends background seamlessly over top hero banner
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={header.transparent ?? false}
                      onChange={(e) =>
                        patchHeader({ transparent: e.target.checked })
                      }
                      style={{ width: 18, height: 18, cursor: "pointer" }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: "#fff",
                        }}
                      >
                        Top Announcement Strip
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ps-muted)" }}>
                        Displays phone number and quick offer strip above header
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={header.showTopbar ?? true}
                      onChange={(e) =>
                        patchHeader({ showTopbar: e.target.checked })
                      }
                      style={{ width: 18, height: 18, cursor: "pointer" }}
                    />
                  </div>
                </div>
              </div>

              {/* Section 6: Floating Quick-Contact Dock */}
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
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <MessageCircle
                    size={16}
                    style={{ color: "var(--ps-primary)" }}
                  />{" "}
                  Floating Quick-Contact Dock
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div
                      style={{ fontSize: 12.5, fontWeight: 700, color: "#fff" }}
                    >
                      Enable Floating Dock
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ps-muted)" }}>
                      Pins WhatsApp & Call icons on screen corner
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={header.floatEnabled ?? true}
                    onChange={(e) =>
                      patchHeader({ floatEnabled: e.target.checked })
                    }
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                </div>
                {(
                  [
                    ["floatWhatsapp", "WhatsApp Direct Chat"],
                    ["floatCall", "One-Tap Phone Call"],
                    ["floatEnquire", "Enquire Popup Trigger"],
                    ["floatEmail", "Direct Email Link"],
                  ] as const
                ).map(([key, label]) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 0",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--ps-slate)",
                      }}
                    >
                      {label}
                    </span>
                    <input
                      type="checkbox"
                      checked={header[key] ?? true}
                      onChange={(e) => patchHeader({ [key]: e.target.checked })}
                      style={{ width: 16, height: 16, cursor: "pointer" }}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Section 1: Footer Layout Presets with Visual Diagram Previews */}
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
                  <PanelBottom
                    size={16}
                    style={{ color: "var(--ps-primary)" }}
                  />{" "}
                  Footer Layout Design
                </div>
                <p
                  style={{
                    fontSize: 11.5,
                    color: "var(--ps-muted)",
                    margin: "0 0 12px",
                    lineHeight: 1.45,
                  }}
                >
                  Choose the structural arrangement for columns, legal
                  disclaimers, and social links.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 8,
                  }}
                >
                  {FOOTER_DESIGNS.map((d) => {
                    const active = (footer.design ?? "columns") === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setFooterDesign(d.id)}
                        style={{
                          textAlign: "left",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: active
                            ? "2px solid var(--ps-primary)"
                            : "1px solid var(--ps-line)",
                          background: active
                            ? "rgba(109, 93, 252, 0.18)"
                            : "var(--ps-bg)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          transition: "all 0.12s",
                        }}
                      >
                        <div style={{ width: 68, flexShrink: 0 }}>
                          <FooterDiagram id={d.id} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 800,
                              color: active ? "#9690ff" : "#fff",
                            }}
                          >
                            {d.name}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--ps-muted)",
                              marginTop: 2,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {d.desc}
                          </div>
                        </div>
                        {active ? (
                          <Check
                            size={16}
                            style={{ color: "#9690ff", flexShrink: 0 }}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Footer Brand & Logo */}
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
                  <ImagePlus size={16} style={{ color: "var(--ps-primary)" }} />{" "}
                  Footer Brand Logo
                </div>
                <MediaPicker
                  kind="image"
                  label="Upload or paste Footer Logo"
                  value={String(footerSettings.logoUrl ?? "")}
                  onChange={(v) => patchFooterSettings({ logoUrl: v })}
                />
              </div>

              {/* Section 3: Compliance & Legal Information */}
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
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <ShieldCheck
                    size={16}
                    style={{ color: "var(--ps-primary)" }}
                  />{" "}
                  Compliance & RERA Badging
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
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
                      RERA Registration Number
                    </label>
                    <input
                      className="ps-input"
                      value={reraValue || ""}
                      placeholder="e.g. PRM/KA/RERA/1251/310/PR/170916/000000"
                      onChange={(e) =>
                        patchFooterText("reraText", "rera", e.target.value)
                      }
                      style={{
                        width: "100%",
                        fontSize: 12.5,
                        background: "var(--ps-bg)",
                        color: "#fff",
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
                      Copyright Text
                    </label>
                    <input
                      className="ps-input"
                      value={copyrightValue || ""}
                      placeholder={`© ${new Date().getFullYear()} ${site.name}. All rights reserved.`}
                      onChange={(e) =>
                        patchFooterText(
                          "copyrightText",
                          "copyright",
                          e.target.value,
                        )
                      }
                      style={{
                        width: "100%",
                        fontSize: 12.5,
                        background: "var(--ps-bg)",
                        color: "#fff",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Footer Navigation Links */}
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Link2 size={16} style={{ color: "var(--ps-primary)" }} />{" "}
                    Custom Footer Links
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--ps-muted)",
                    }}
                  >
                    {footerLinkList.length} links
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 11.5,
                    color: "var(--ps-muted)",
                    margin: "0 0 10px",
                    lineHeight: 1.45,
                  }}
                >
                  Leave empty to automatically reuse the primary header menu
                  links.
                </p>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {footerLinkList.map((l, i) => (
                    <div
                      key={`${i}-${l.label}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: "var(--ps-bg)",
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid var(--ps-line)",
                      }}
                    >
                      <input
                        className="ps-input"
                        value={l.label}
                        placeholder="Link Name"
                        onChange={(e) =>
                          patchFooterSettings({
                            links: footerLinkList.map((x, j) =>
                              j === i ? { ...x, label: e.target.value } : x,
                            ),
                          })
                        }
                        style={{
                          flex: 1.2,
                          minWidth: 0,
                          fontSize: 12,
                          padding: "6px 8px",
                          background: "transparent",
                          color: "#fff",
                        }}
                      />
                      <input
                        className="ps-input"
                        value={l.href}
                        placeholder="#section"
                        onChange={(e) =>
                          patchFooterSettings({
                            links: footerLinkList.map((x, j) =>
                              j === i ? { ...x, href: e.target.value } : x,
                            ),
                          })
                        }
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontFamily: "monospace",
                          fontSize: 11,
                          padding: "6px 8px",
                          background: "transparent",
                          color: "var(--ps-slate)",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          patchFooterSettings({
                            links: footerLinkList.filter((_, idx) => idx !== i),
                          })
                        }
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--ps-muted)",
                          cursor: "pointer",
                          padding: 4,
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    patchFooterSettings({
                      links: [
                        ...footerLinkList,
                        { label: "New link", href: "#" },
                      ],
                    })
                  }
                  style={{
                    width: "100%",
                    marginTop: 10,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px dashed var(--ps-primary)",
                    background: "rgba(109, 93, 252, 0.12)",
                    color: "#9690ff",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Plus size={14} /> Add Footer Link
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Live Visual Stage */}
        <div
          className="ps-canvas-dots"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 32px 80px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Browser Container Frame */}
          <div
            style={{
              width:
                device === "desktop" ? "100%" : device === "tablet" ? 768 : 390,
              maxWidth: "100%",
              background: "#fff",
              borderRadius: device === "desktop" ? 16 : 28,
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 25px 70px rgba(0, 0, 0, 0.65)",
              overflow: "hidden",
              transition: "width 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Window Browser Header Bar */}
            <div
              style={{
                background: "#0f172a",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", gap: 6 }}>
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
              </div>
              <div
                style={{
                  flex: 1,
                  background: "rgba(255, 255, 255, 0.07)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 6,
                  padding: "4px 12px",
                  fontSize: 11.5,
                  color: "#cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Globe size={12} style={{ color: "#94a3b8" }} />
                <span>
                  {site.domain
                    ? `https://${site.domain}`
                    : `https://preview.estatepro.com/${site.slug}`}
                </span>
              </div>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  background: "rgba(109,93,252,0.25)",
                  color: "#a5b4fc",
                  padding: "2px 8px",
                  borderRadius: 999,
                }}
              >
                {activeTab === "footer"
                  ? `${footer.design ?? "columns"} footer`
                  : `${header.design ?? "classic"} header`}
              </span>
            </div>

            {/* In Focused View for Footer, display Footer prominently at the top */}
            {viewMode === "focused" && activeTab === "footer" ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {/* Simulated Content Divider */}
                <div
                  style={{
                    padding: "16px 20px",
                    background: "#f1f5f9",
                    borderBottom: "1px dashed #cbd5e1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#475569",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Sparkles
                      size={14}
                      style={{ color: "var(--ps-primary)" }}
                    />{" "}
                    Live Footer Preview Stage ({footer.design ?? "columns"})
                  </span>
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    Live Real-Time Rendering
                  </span>
                </div>

                {/* Primary Live Footer */}
                <ChromeFooter
                  footer={footer}
                  header={header}
                  brand={brand}
                  device={device}
                  live={false}
                />
              </div>
            ) : viewMode === "focused" && activeTab === "header" ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {/* Primary Live Header */}
                <div style={{ position: "relative", zIndex: 10 }}>
                  <ChromeHeader
                    header={header}
                    brand={brand}
                    device={device}
                    live={false}
                  />
                </div>

                {/* Simulated Hero Section Banner */}
                <div
                  style={{
                    padding: device === "mobile" ? "60px 20px" : "80px 40px",
                    background:
                      "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
                    textAlign: "center",
                    borderTop: "1px dashed #e2e8f0",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "#fff",
                      border: "1px solid var(--ps-line)",
                      borderRadius: 999,
                      padding: "5px 14px",
                      fontSize: 11.5,
                      fontWeight: 800,
                      color: "var(--ps-primary)",
                      boxShadow: "0 2px 8px rgba(0,0,0,.04)",
                    }}
                  >
                    <Sparkles size={13} /> {site.name} Header Preview
                  </span>
                  <h2
                    style={{
                      fontSize: device === "mobile" ? 22 : 30,
                      fontWeight: 900,
                      color: "#0f172a",
                      margin: "14px 0 8px",
                      letterSpacing: -0.5,
                    }}
                  >
                    Live Navigation & Action Bar
                  </h2>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#64748b",
                      maxWidth: 460,
                      margin: "0 auto",
                      lineHeight: 1.6,
                    }}
                  >
                    Test responsive mobile drawer, logo display, and CTA button
                    actions in real time.
                  </p>
                </div>
              </div>
            ) : (
              /* Full Page View */
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ position: "relative", zIndex: 10 }}>
                  <ChromeHeader
                    header={header}
                    brand={brand}
                    device={device}
                    live={false}
                  />
                </div>
                <div
                  style={{
                    padding: "70px 30px",
                    background:
                      "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
                    textAlign: "center",
                    borderTop: "1px dashed #e2e8f0",
                    borderBottom: "1px dashed #e2e8f0",
                  }}
                >
                  <h3
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: "#0f172a",
                      margin: 0,
                    }}
                  >
                    Full Page Flow
                  </h3>
                  <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    Scroll down to view footer in page context.
                  </p>
                </div>
                <ChromeFooter
                  footer={footer}
                  header={header}
                  brand={brand}
                  device={device}
                  live={false}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
