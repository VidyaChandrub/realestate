"use client";

import { useEffect, useRef, useState } from "react";
import type * as React from "react";
import {
  AlignCenter,
  ArrowRight,
  Bell,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock3,
  Code2,
  Copy,
  Download,
  Eye,
  FileDown,
  FilePlus2,
  FileText,
  GitBranch,
  Globe,
  GripVertical,
  Hash,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  Link2,
  Mail,
  MessageSquare,
  Monitor,
  Palette,
  Phone,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Send,
  Settings2,
  Share2,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Tablet,
  TextCursorInput,
  Trash2,
  Type,
  Upload,
  Users,
} from "lucide-react";
import { uid } from "@/lib/prestate/data";
import { FIELD_LOGIC_OPS } from "@/lib/prestate/form-logic";
import {
  loadFormLibrary,
  saveFormLibrary,
  newFormDefinition,
  embedSnippet as libEmbedSnippet,
} from "@/lib/prestate/forms-store";
import type { FormDefinition } from "@/lib/prestate/forms-store";
import type {
  Device,
  FieldLogicOp,
  FormLeadField,
  LandingPageData,
  SiteConfig,
  FormThankYouPage,
} from "@/lib/prestate/types";
import { ensureConfig, siteThemeStyle } from "@/lib/prestate/site-config";
import { MediaPicker } from "@/components/media-picker";

type FieldType =
  | "text"
  | "phone"
  | "email"
  | "number"
  | "select"
  | "radio"
  | "checkbox"
  | "date"
  | "time"
  | "textarea"
  | "file"
  | "hidden";

const FIELD_TYPES: { type: FieldType; label: string; icon: React.ReactNode }[] =
  [
    { type: "text", label: "Text input", icon: <TextCursorInput size={14} /> },
    { type: "phone", label: "Phone number", icon: <Phone size={14} /> },
    { type: "email", label: "Email address", icon: <Mail size={14} /> },
    { type: "number", label: "Number", icon: <Hash size={14} /> },
    { type: "select", label: "Dropdown menu", icon: <Settings2 size={14} /> },
    { type: "radio", label: "Radio choices", icon: <Circle size={14} /> },
    { type: "checkbox", label: "Checkbox", icon: <Check size={14} /> },
    { type: "date", label: "Date picker", icon: <Calendar size={14} /> },
    { type: "time", label: "Time picker", icon: <Clock3 size={14} /> },
    {
      type: "textarea",
      label: "Message box",
      icon: <MessageSquare size={14} />,
    },
    { type: "file", label: "File upload", icon: <Upload size={14} /> },
  ];

function newEmbedId(): string {
  return `emb_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
}

export function FormsModule({
  site,
  pages,
  onPatch,
  onToast,
  onCreateThankYouPage,
}: {
  site: LandingPageData;
  pages: LandingPageData[];
  onSelectSite: (id: string) => void;
  onPatch: (fn: (c: SiteConfig) => SiteConfig) => void;
  onToast: (m: string) => void;
  onCreateThankYouPage?: () => void;
}) {
  const cfg = ensureConfig(site);
  const form = cfg.form;
  const fields = form.fields;
  const [device, setDevice] = useState<Device>("desktop");
  const [activeTab, setActiveTab] = useState<
    "fields" | "delivery" | "brochure" | "library" | "embed"
  >("fields");
  const [selectedFieldId, setSelectedFieldId] = useState<string>(
    fields[0]?.id ?? "",
  );
  const [previewSubmitted, setPreviewSubmitted] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const selectedField =
    fields.find((f) => f.id === selectedFieldId) ?? fields[0];

  const patchForm = (partial: Partial<SiteConfig["form"]>) =>
    onPatch((c) => ({ ...c, form: { ...c.form, ...partial } }));

  const patchPdf = (patch: Partial<SiteConfig["form"]["pdf"]>) =>
    onPatch((c) => ({
      ...c,
      form: { ...c.form, pdf: { ...c.form.pdf, ...patch } },
    }));

  const setFields = (
    next: FormLeadField[] | ((prev: FormLeadField[]) => FormLeadField[]),
  ) => {
    onPatch((c) => {
      const value = typeof next === "function" ? next(c.form.fields) : next;
      return { ...c, form: { ...c.form, fields: value } };
    });
  };

  const patchField = (id: string, patch: Partial<FormLeadField>) =>
    setFields((f) => f.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  // Form library management
  const [library, setLibrary] = useState<FormDefinition[]>(() =>
    loadFormLibrary(),
  );
  const [newFormName, setNewFormName] = useState("");

  const refreshLibrary = () => setLibrary(loadFormLibrary());
  useEffect(() => {
    refreshLibrary();
  }, [site.id]);

  const createNewForm = () => {
    const name = newFormName.trim() || `Form — ${library.length + 1}`;
    const def = newFormDefinition(site.id, name);
    const next = [...library, def];
    saveFormLibrary(next);
    setLibrary(next);
    setNewFormName("");
    onToast(`Created template “${name}”`);
  };

  const addField = (type: FieldType) => {
    const meta = FIELD_TYPES.find((f) => f.type === type);
    const newFld: FormLeadField = {
      id: uid("fld"),
      type,
      label: meta?.label ?? type,
      placeholder:
        type === "select" || type === "radio"
          ? "Select an option"
          : type === "phone"
            ? "+91 98765 43210"
            : type === "email"
              ? "name@email.com"
              : "",
      required: type === "phone" || type === "text",
      options:
        type === "select" || type === "radio"
          ? ["2 BHK Luxury", "3 BHK Premium", "4 BHK Sky Villa"]
          : undefined,
    };
    setFields((f) => [...f, newFld]);
    setSelectedFieldId(newFld.id);
    setPreviewSubmitted(false);
    onToast(`Added field “${newFld.label}”`);
  };

  const moveField = (id: string, dir: -1 | 1) => {
    setFields((list) => {
      const i = list.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const next = [...list];
      const [item] = next.splice(i, 1);
      next.splice(j, 0, item);
      return next;
    });
  };

  const removeField = (id: string) => {
    setFields((x) => {
      const next = x.filter((y) => y.id !== id);
      setSelectedFieldId(next[0]?.id ?? "");
      return next;
    });
  };

  const handlePdfUpload = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      onToast("Please upload a PDF file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      patchPdf({ url: dataUrl, filename: file.name, enabled: true });
      patchForm({
        deliverableUrl: dataUrl,
        deliverableLabel: file.name.replace(/\.pdf$/i, ""),
      });
      onToast(`PDF Brochure attached: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const embedCode = libEmbedSnippet(
    form.embed?.id ?? "",
    typeof window !== "undefined" ? window.location.origin : "",
  );

  const copyText = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onToast(msg);
    } catch {
      onToast("Could not copy to clipboard");
    }
  };

  const handleSave = () => {
    setSavedSuccess(true);
    onToast(`Form configuration saved for ${site.name}`);
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
            <FileText size={16} style={{ color: "var(--ps-primary)" }} />{" "}
            Universal Form Builder
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--ps-muted)",
              borderLeft: "1px solid var(--ps-line-strong)",
              paddingLeft: 12,
            }}
          >
            {form.name || site.name} (Embed: {form.embed?.id ?? "ready"})
          </span>
        </div>

        {/* Center Tabs Switcher */}
        <div
          style={{
            display: "inline-flex",
            background: "rgba(0, 0, 0, 0.35)",
            borderRadius: 10,
            padding: 3,
            border: "1px solid var(--ps-line-strong)",
          }}
        >
          {[
            {
              key: "fields",
              label: "Fields & Structure",
              icon: TextCursorInput,
            },
            { key: "delivery", label: "Lead Alerts", icon: Bell },
            { key: "brochure", label: "Brochure & Thank-You", icon: FileDown },
            { key: "library", label: "Form Library", icon: LayoutTemplate },
            { key: "embed", label: "Embed Code", icon: Code2 },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 13px",
                borderRadius: 8,
                border: "none",
                background:
                  activeTab === tab.key ? "var(--ps-primary)" : "transparent",
                color: activeTab === tab.key ? "#fff" : "var(--ps-slate)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <tab.icon size={13} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right Actions: Device Switcher & Save */}
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
            {[
              { key: "desktop", icon: Monitor, label: "Desktop" },
              { key: "tablet", icon: Tablet, label: "Tablet" },
              { key: "mobile", icon: Smartphone, label: "Mobile" },
            ].map((dev) => (
              <button
                key={dev.key}
                type="button"
                onClick={() => setDevice(dev.key as any)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 10px",
                  borderRadius: 7,
                  border: "none",
                  background:
                    device === dev.key
                      ? "var(--ps-panel-raised)"
                      : "transparent",
                  color: device === dev.key ? "#fff" : "var(--ps-muted)",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <dev.icon size={13} />
                <span>{dev.label}</span>
              </button>
            ))}
          </div>

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
            <span>{savedSuccess ? "Saved!" : "Save Form"}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Panel Studio Layout */}
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
          {activeTab === "fields" ? (
            <>
              {/* Form Title & Basic Details */}
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
                  <TextCursorInput
                    size={16}
                    style={{ color: "var(--ps-primary)" }}
                  />{" "}
                  Form Heading & Button
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
                      Form Header Title
                    </label>
                    <input
                      className="ps-input"
                      value={form.name ?? ""}
                      placeholder="e.g. Schedule Exclusive Site Visit / Download Brochure"
                      onChange={(e) => patchForm({ name: e.target.value })}
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
                      Form Sub-Description
                    </label>
                    <input
                      className="ps-input"
                      value={form.description ?? ""}
                      placeholder="e.g. Register your interest for pre-launch pricing & unit options"
                      onChange={(e) =>
                        patchForm({ description: e.target.value })
                      }
                      style={{
                        width: "100%",
                        fontSize: 12,
                        background: "var(--ps-bg)",
                        color: "#fff",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
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
                        Submit Button Text
                      </label>
                      <input
                        className="ps-input"
                        value={form.submitLabel ?? ""}
                        placeholder="Submit Enquiry"
                        onChange={(e) =>
                          patchForm({ submitLabel: e.target.value })
                        }
                        style={{
                          width: "100%",
                          fontSize: 12,
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
                        Multi-Step Wizard
                      </label>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          height: 34,
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 12,
                            color: "#fff",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(form.multiStep)}
                            onChange={(e) =>
                              patchForm({ multiStep: e.target.checked })
                            }
                            style={{ width: 16, height: 16, cursor: "pointer" }}
                          />
                          Enable Multi-Step
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Field Palette */}
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
                  <Plus size={16} style={{ color: "var(--ps-primary)" }} /> Add
                  Input Field
                </div>
                <p
                  style={{
                    fontSize: 11.5,
                    color: "var(--ps-muted)",
                    margin: "0 0 10px",
                    lineHeight: 1.45,
                  }}
                >
                  Click to add custom real estate form inputs.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 6,
                  }}
                >
                  {FIELD_TYPES.map((ft) => (
                    <button
                      key={ft.type}
                      type="button"
                      onClick={() => addField(ft.type)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid var(--ps-line)",
                        background: "var(--ps-bg)",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.12s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.borderColor =
                          "var(--ps-primary)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.borderColor = "var(--ps-line)")
                      }
                    >
                      <span style={{ color: "var(--ps-primary)" }}>
                        {ft.icon}
                      </span>
                      <span>{ft.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Added Fields List & Config */}
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
                    marginBottom: 10,
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
                    <SlidersHorizontal
                      size={16}
                      style={{ color: "var(--ps-primary)" }}
                    />{" "}
                    Form Fields ({fields.length})
                  </div>
                  <span style={{ fontSize: 11, color: "var(--ps-muted)" }}>
                    Drag or select to configure
                  </span>
                </div>

                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {fields.map((f, i) => {
                    const isSelected = (selectedField?.id ?? "") === f.id;
                    return (
                      <div
                        key={f.id}
                        onClick={() => setSelectedFieldId(f.id)}
                        style={{
                          background: isSelected
                            ? "rgba(109, 93, 252, 0.18)"
                            : "var(--ps-bg)",
                          border: isSelected
                            ? "2px solid var(--ps-primary)"
                            : "1px solid var(--ps-line)",
                          borderRadius: 10,
                          padding: "10px 12px",
                          cursor: "pointer",
                          transition: "all 0.12s",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <GripVertical
                            size={14}
                            style={{ color: "var(--ps-muted)", flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 12.5,
                                fontWeight: 800,
                                color: isSelected ? "#9690ff" : "#fff",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              {f.label || "Untitled Field"}
                              {f.required ? (
                                <span
                                  style={{
                                    color: "var(--ps-danger)",
                                    fontSize: 11,
                                  }}
                                >
                                  *
                                </span>
                              ) : null}
                            </div>
                            <div
                              style={{
                                fontSize: 10.5,
                                color: "var(--ps-muted)",
                                textTransform: "uppercase",
                                marginTop: 2,
                              }}
                            >
                              {f.type}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 2 }}>
                            <button
                              type="button"
                              disabled={i === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveField(f.id, -1);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--ps-muted)",
                                cursor: i === 0 ? "default" : "pointer",
                                padding: 3,
                                opacity: i === 0 ? 0.3 : 1,
                              }}
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={i === fields.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveField(f.id, 1);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--ps-muted)",
                                cursor:
                                  i === fields.length - 1
                                    ? "default"
                                    : "pointer",
                                padding: 3,
                                opacity: i === fields.length - 1 ? 0.3 : 1,
                              }}
                            >
                              <ChevronDown size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeField(f.id);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--ps-muted)",
                                cursor: "pointer",
                                padding: 3,
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* If selected, show inline configuration options */}
                        {isSelected ? (
                          <div
                            style={{
                              marginTop: 12,
                              paddingTop: 10,
                              borderTop: "1px solid var(--ps-line)",
                              display: "flex",
                              flexDirection: "column",
                              gap: 8,
                            }}
                          >
                            <div>
                              <label
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  color: "var(--ps-muted)",
                                }}
                              >
                                Field Label
                              </label>
                              <input
                                className="ps-input"
                                value={f.label ?? ""}
                                onChange={(e) =>
                                  patchField(f.id, { label: e.target.value })
                                }
                                style={{
                                  width: "100%",
                                  fontSize: 12,
                                  marginTop: 2,
                                  background: "var(--ps-panel-raised)",
                                  color: "#fff",
                                }}
                              />
                            </div>
                            <div>
                              <label
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  color: "var(--ps-muted)",
                                }}
                              >
                                Placeholder Text
                              </label>
                              <input
                                className="ps-input"
                                value={f.placeholder ?? ""}
                                onChange={(e) =>
                                  patchField(f.id, {
                                    placeholder: e.target.value,
                                  })
                                }
                                style={{
                                  width: "100%",
                                  fontSize: 12,
                                  marginTop: 2,
                                  background: "var(--ps-panel-raised)",
                                  color: "#fff",
                                }}
                              />
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                paddingTop: 4,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  color: "var(--ps-slate)",
                                }}
                              >
                                Required Input
                              </span>
                              <input
                                type="checkbox"
                                checked={Boolean(f.required)}
                                onChange={(e) =>
                                  patchField(f.id, {
                                    required: e.target.checked,
                                  })
                                }
                                style={{
                                  width: 16,
                                  height: 16,
                                  cursor: "pointer",
                                }}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : activeTab === "delivery" ? (
            <>
              {/* Lead Delivery & Instant Notification Settings */}
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
                  <Bell size={16} style={{ color: "var(--ps-primary)" }} /> Lead
                  Routing & Alerts
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
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
                      Lead Notification Email
                    </label>
                    <input
                      className="ps-input"
                      value={form.notifyEmail ?? ""}
                      placeholder="e.g. sales@estatepro.com, leads@mybrand.com"
                      onChange={(e) =>
                        patchForm({ notifyEmail: e.target.value })
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
                      Instant WhatsApp Lead Alert Number
                    </label>
                    <input
                      className="ps-input"
                      value={form.whatsapp ?? ""}
                      placeholder="e.g. 919876543210"
                      onChange={(e) => patchForm({ whatsapp: e.target.value })}
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
            </>
          ) : activeTab === "brochure" ? (
            <>
              {/* PDF Brochure & Thank You Settings */}
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
                  <FileDown size={16} style={{ color: "var(--ps-primary)" }} />{" "}
                  Instant Brochure PDF Gate
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
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
                      Upload Project Brochure (PDF)
                    </label>
                    <input
                      ref={pdfInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePdfUpload(file);
                      }}
                      style={{ width: "100%", fontSize: 12, color: "#fff" }}
                    />
                  </div>
                  {form.pdf?.filename ? (
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "rgba(52, 211, 153, 0.15)",
                        border: "1px solid rgba(52, 211, 153, 0.3)",
                        color: "var(--ps-success)",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      Attached: {form.pdf.filename}
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : activeTab === "library" ? (
            <>
              {/* Form Templates Library */}
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
                  <LayoutTemplate
                    size={16}
                    style={{ color: "var(--ps-primary)" }}
                  />{" "}
                  Reusable Form Templates ({library.length})
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input
                    className="ps-input"
                    value={newFormName ?? ""}
                    placeholder="New Form Template Name..."
                    onChange={(e) => setNewFormName(e.target.value)}
                    style={{
                      flex: 1,
                      fontSize: 12,
                      background: "var(--ps-bg)",
                      color: "#fff",
                    }}
                  />
                  <button
                    type="button"
                    onClick={createNewForm}
                    style={{
                      background: "var(--ps-primary)",
                      border: "none",
                      color: "#fff",
                      padding: "0 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Create
                  </button>
                </div>

                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {library.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: "var(--ps-bg)",
                        border: "1px solid var(--ps-line)",
                        borderRadius: 10,
                        padding: "10px 12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 12.5,
                            fontWeight: 800,
                            color: "#fff",
                          }}
                        >
                          {item.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ps-muted)" }}>
                          {item.fields.length} input fields
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          patchForm({ fields: item.fields, name: item.name });
                          onToast(`Loaded “${item.name}” template`);
                        }}
                        style={{
                          background: "rgba(109, 93, 252, 0.2)",
                          border: "1px solid var(--ps-primary)",
                          color: "#9690ff",
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Load
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Embed Code generator */}
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
                  <Code2 size={16} style={{ color: "var(--ps-primary)" }} />{" "}
                  Universal Embed Snippet
                </div>
                <p
                  style={{
                    fontSize: 11.5,
                    color: "var(--ps-muted)",
                    margin: "0 0 10px",
                    lineHeight: 1.45,
                  }}
                >
                  Embed this form on external landing pages, WordPress, Webflow,
                  or custom domains.
                </p>
                <div
                  style={{
                    background: "var(--ps-bg)",
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid var(--ps-line)",
                    fontSize: 11.5,
                    fontFamily: "monospace",
                    color: "#a5b4fc",
                    wordBreak: "break-all",
                    marginBottom: 10,
                  }}
                >
                  {embedCode}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyText(embedCode, "Embed code copied to clipboard")
                  }
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    background: "var(--ps-primary)",
                    border: "none",
                    color: "#fff",
                    padding: "9px 14px",
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <Copy size={14} /> Copy Embed Code
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Live Interactive Form Stage */}
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
          {/* Mockup Card */}
          <div
            style={{
              width:
                device === "desktop" ? 560 : device === "tablet" ? 480 : 380,
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
                  Live Interactive Form Preview
                </span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc" }}>
                {form.multiStep ? "Multi-Step" : "Single Step"}
              </span>
            </div>

            {/* Live Form Content */}
            <div
              style={{
                padding: device === "mobile" ? "26px 20px" : "36px 32px",
              }}
            >
              {previewSubmitted ? (
                <div style={{ textAlign: "center", padding: "30px 10px" }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      background: "rgba(52, 211, 153, 0.15)",
                      color: "#10b981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 16px",
                    }}
                  >
                    <Check size={26} />
                  </div>
                  <h3
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: "#0f172a",
                      margin: "0 0 8px",
                    }}
                  >
                    Enquiry Submitted Successfully!
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#64748b",
                      margin: "0 0 20px",
                    }}
                  >
                    Thank you for your interest. Our representative will contact
                    you shortly with the official brochure and pricing.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPreviewSubmitted(false)}
                    style={{
                      background: "var(--ps-primary)",
                      color: "#fff",
                      border: "none",
                      padding: "8px 18px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ← Test Again
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setPreviewSubmitted(true);
                  }}
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: 20,
                        fontWeight: 900,
                        color: "#0f172a",
                        margin: "0 0 6px",
                      }}
                    >
                      {form.name || "Schedule a Private Viewing"}
                    </h3>
                    {form.description ? (
                      <p
                        style={{
                          fontSize: 12.5,
                          color: "#64748b",
                          margin: 0,
                          lineHeight: 1.5,
                        }}
                      >
                        {form.description}
                      </p>
                    ) : null}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {fields.length === 0 ? (
                      <div
                        style={{
                          padding: "30px 10px",
                          textAlign: "center",
                          color: "#94a3b8",
                          fontSize: 13,
                          border: "1.5px dashed #cbd5e1",
                          borderRadius: 10,
                        }}
                      >
                        No fields added yet. Click &quot;Add Input Field&quot;
                        in the left sidebar.
                      </div>
                    ) : null}

                    {fields.map((f) => (
                      <div
                        key={f.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <label
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#334155",
                          }}
                        >
                          {f.label}{" "}
                          {f.required ? (
                            <span style={{ color: "#ef4444" }}>*</span>
                          ) : null}
                        </label>

                        {f.type === "textarea" ? (
                          <textarea
                            placeholder={
                              f.placeholder || "Enter your message..."
                            }
                            rows={3}
                            style={{
                              width: "100%",
                              padding: "9px 12px",
                              borderRadius: 8,
                              border: "1px solid #cbd5e1",
                              fontSize: 13,
                              color: "#0f172a",
                              outline: "none",
                              resize: "none",
                            }}
                          />
                        ) : f.type === "select" ? (
                          <select
                            style={{
                              width: "100%",
                              padding: "9px 12px",
                              borderRadius: 8,
                              border: "1px solid #cbd5e1",
                              fontSize: 13,
                              color: "#0f172a",
                              outline: "none",
                            }}
                          >
                            {(f.options ?? ["Option 1", "Option 2"]).map(
                              (opt) => (
                                <option key={opt}>{opt}</option>
                              ),
                            )}
                          </select>
                        ) : f.type === "checkbox" ? (
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              fontSize: 12.5,
                              color: "#475569",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              style={{ width: 16, height: 16 }}
                            />
                            <span>
                              I agree to receive project updates & official
                              brochure via WhatsApp/Email
                            </span>
                          </label>
                        ) : (
                          <input
                            type={
                              f.type === "email"
                                ? "email"
                                : f.type === "number"
                                  ? "number"
                                  : "text"
                            }
                            placeholder={
                              f.placeholder || `Enter ${f.label.toLowerCase()}`
                            }
                            style={{
                              width: "100%",
                              padding: "9px 12px",
                              borderRadius: 8,
                              border: "1px solid #cbd5e1",
                              fontSize: 13,
                              color: "#0f172a",
                              outline: "none",
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {fields.length > 0 ? (
                    <button
                      type="submit"
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: 10,
                        background: "var(--ps-primary)",
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: 800,
                        border: "none",
                        cursor: "pointer",
                        boxShadow: "0 4px 14px rgba(109,93,252,0.35)",
                        marginTop: 6,
                      }}
                    >
                      {form.submitLabel || "Submit Enquiry"}
                    </button>
                  ) : null}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
