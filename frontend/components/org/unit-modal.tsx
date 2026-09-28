"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import {
  Building2,
  Camera,
  Car,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  CreditCard,
  Eye,
  Maximize2,
  Plus,
  Tag,
  UploadCloud,
  X,
} from "lucide-react";
import type {
  OrgCatalogOption,
  ProjectDetail,
  UnitStatus,
} from "@/lib/types";
import { uploadFile } from "@/lib/upload";

export interface UnitFormState {
  configuration: string;
  variantLabel: string;
  unitNo: string;
  tower: string;
  floor: string;
  area: string;
  customValues: Record<string, string>;
  facing: string;
  parking: string;
  price: string;
  status: UnitStatus;
  floorPlanUrl: string;
  galleryUrls: string[];
}


const STATUS_CONFIG: Record<
  UnitStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  available: {
    label: "Available",
    bg: "#ecfdf5",
    text: "#065f46",
    border: "#a7f3d0",
    dot: "#10b981",
  },
  held: {
    label: "Held / Blocked",
    bg: "#fef3c7",
    text: "#92400e",
    border: "#fde68a",
    dot: "#f59e0b",
  },
  booked: {
    label: "Booked",
    bg: "#ffe4e6",
    text: "#9f1239",
    border: "#fecdd3",
    dot: "#f43f5e",
  },
  sold: {
    label: "Sold",
    bg: "#f1f5f9",
    text: "#475569",
    border: "#cbd5e1",
    dot: "#64748b",
  },
};

interface UnitDesignModalProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  project: ProjectDetail | null;
  unitForm: UnitFormState;
  setUnitForm: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: () => Promise<void>;
  busy?: boolean;
  error?: string | null;
  attempted?: boolean;
  groupWord?: string;
  facingOptions?: OrgCatalogOption[];
  parkingOptions?: OrgCatalogOption[];
  variantOptions?: OrgCatalogOption[];
  configurationOptions?: (OrgCatalogOption | string)[];
  areaUnit?: string;
}

export function UnitDesignModal({
  open,
  onClose,
  mode,
  project,
  unitForm,
  setUnitForm,
  onSubmit,
  busy = false,
  error = null,
  attempted = false,
  groupWord = "Tower",
  facingOptions = [],
  parkingOptions = [],
  variantOptions = [],
  configurationOptions = [],
  areaUnit = "sq.ft.",
}: UnitDesignModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Local state for offer price (as shown in mock)
  const [offerPrice, setOfferPrice] = useState(() => {
    return unitForm.customValues?.offerPrice || "";
  });

  // Calculate price per sq.ft.
  const numPrice = Number(offerPrice || unitForm.price) || 0;
  const numArea = Number(unitForm.area) || 0;
  const calculatedRate =
    numArea > 0 && numPrice > 0 ? Math.round(numPrice / numArea) : null;
  const [ratePerSqft, setRatePerSqft] = useState<string>(() =>
    calculatedRate ? String(calculatedRate) : "",
  );

  useEffect(() => {
    if (calculatedRate) {
      setRatePerSqft(String(calculatedRate));
    }
  }, [calculatedRate]);

  // Escape key closes modal
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, busy]);

  if (!open) return null;

  // Active gallery photos (fully dynamic from unit form)
  const displayPhotos = unitForm.galleryUrls || [];

  const currentStatus = STATUS_CONFIG[unitForm.status] || STATUS_CONFIG.available;

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const added: string[] = [];
      for (const file of Array.from(files)) {
        try {
          const url = await uploadFile(file, {
            field: "gallery",
            projectId: project?.id,
          });
          added.push(url);
        } catch {
          // If upload fails in offline/dev, create object URL for instant preview
          const localUrl = URL.createObjectURL(file);
          added.push(localUrl);
        }
      }
      setUnitForm((f: { galleryUrls: any; }) => ({
        ...f,
        galleryUrls: [...(f.galleryUrls || []), ...added],
      }));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = (idxToRemove: number) => {
    setUnitForm((f: { galleryUrls: any; }) => {
      const updated = (f.galleryUrls || []).filter((_: any, i: number) => i !== idxToRemove);
      return { ...f, galleryUrls: updated };
    });
    if (activePhotoIdx >= displayPhotos.length - 1) {
      setActivePhotoIdx(Math.max(0, displayPhotos.length - 2));
    }
  };

  const nextPhoto = () => {
    if (displayPhotos.length === 0) return;
    setActivePhotoIdx((prev) => (prev + 1) % displayPhotos.length);
  };

  const prevPhoto = () => {
    if (displayPhotos.length === 0) return;
    setActivePhotoIdx((prev) =>
      prev === 0 ? displayPhotos.length - 1 : prev - 1,
    );
  };

  // Format money helper
  const formattedPrice = Number(offerPrice || unitForm.price)
    ? `₹ ${Number(offerPrice || unitForm.price).toLocaleString("en-IN")}`
    : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      />

      {/* Modal Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "1140px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          borderRadius: "20px",
          boxShadow:
            "0 25px 60px -15px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(226, 232, 240, 0.8)",
          overflow: "hidden",
          color: "#0f172a",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        }}
      >
        <style>{`
          @media (max-width: 980px) {
            .unit-modal-grid {
              grid-template-columns: 1fr !important;
            }
            .unit-modal-prop-row1,
            .unit-modal-prop-row2 {
              grid-template-columns: 1fr !important;
            }
            .unit-modal-pricing-row {
              grid-template-columns: 1fr 1fr !important;
            }
          }
          @media (max-width: 600px) {
            .unit-modal-pricing-row {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>

        {/* --- Header --- */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 28px",
            borderBottom: "1px solid #f1f5f9",
            background: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Project building thumbnail */}
            <img
              src={
                project?.coverImageUrl ||
                project?.galleryUrls?.[0] ||
                "/templates/hero-building.jpg"
              }
              alt={project?.name || "Project"}
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                objectFit: "cover",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            />
            <div>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#0f172a",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                {mode === "create" ? "Add unit" : "Edit unit"}
              </h2>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                  color: "#64748b",
                  marginTop: 3,
                  flexWrap: "wrap",
                }}
              >
                <span>
                  Project:{" "}
                  <strong style={{ color: "#1e293b", fontWeight: 600 }}>
                    {project?.name || "Skyview Residency"}
                  </strong>
                </span>
                <span style={{ color: "#cbd5e1" }}>|</span>
                <span>
                  {groupWord}:{" "}
                  <strong style={{ color: "#1e293b", fontWeight: 600 }}>
                    {unitForm.tower || "Tower A"}
                  </strong>
                </span>
                <span style={{ color: "#cbd5e1" }}>|</span>
                <span>
                  {mode === "create"
                    ? "Add a new unit to this project"
                    : "Update unit details"}
                </span>
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f8fafc";
              e.currentTarget.style.color = "#0f172a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.color = "#64748b";
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* --- Scrollable Body (2 columns) --- */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 28px",
            background: "#fafbfc",
          }}
        >
          {error ? (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              {error}
            </div>
          ) : null}

          <div
            className="unit-modal-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 380px",
              gap: 24,
              alignItems: "start",
            }}
          >
            {/* === LEFT COLUMN: FORM SECTIONS === */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              {/* Card 1: Property details */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 16,
                  border: "1px solid #e2e8f0",
                  padding: "22px 24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                }}
              >
                {/* Section Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "#f1f5f9",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#334155",
                    }}
                  >
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      Property details
                    </h3>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: 12.5,
                        color: "#64748b",
                      }}
                    >
                      Define the basic details of this unit.
                    </p>
                  </div>
                </div>

                {/* Grid Row 1: Listing number, Unit type, Plot variant */}
                <div
                  className="unit-modal-prop-row1"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 16,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#1e293b",
                        marginBottom: 6,
                      }}
                    >
                      Listing number{" "}
                      <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="B-1204"
                      value={unitForm.unitNo}
                      onChange={(e) =>
                        setUnitForm((f: any) => ({ ...f, unitNo: e.target.value }))
                      }
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 10,
                        border: `1px solid ${attempted && !unitForm.unitNo.trim()
                            ? "#ef4444"
                            : "#cbd5e1"
                          }`,
                        fontSize: 13.5,
                        color: "#0f172a",
                        background: "#ffffff",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    {attempted && !unitForm.unitNo.trim() ? (
                      <span
                        style={{
                          fontSize: 11.5,
                          color: "#ef4444",
                          marginTop: 4,
                          display: "block",
                        }}
                      >
                        Listing number is required
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#1e293b",
                        marginBottom: 6,
                      }}
                    >
                      Unit type
                    </label>
                    <div style={{ position: "relative" }}>
                      <select
                        value={unitForm.configuration || "Apartment"}
                        onChange={(e) =>
                          setUnitForm((f: any) => ({
                            ...f,
                            configuration: e.target.value,
                          }))
                        }
                        style={{
                          width: "100%",
                          padding: "9px 32px 9px 12px",
                          borderRadius: 10,
                          border: "1px solid #cbd5e1",
                          fontSize: 13.5,
                          color: "#0f172a",
                          background: "#ffffff",
                          outline: "none",
                          appearance: "none",
                          cursor: "pointer",
                          boxSizing: "border-box",
                        }}
                      >
                        <option value="">Select configuration</option>
                        {configurationOptions.map((opt) => {
                          const label = typeof opt === "string" ? opt : opt.label;
                          const key = typeof opt === "string" ? opt : opt.id;
                          return (
                            <option key={key} value={label}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown
                        size={15}
                        style={{
                          position: "absolute",
                          right: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#94a3b8",
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#1e293b",
                        marginBottom: 6,
                      }}
                    >
                      Plot variant
                    </label>
                    <div style={{ position: "relative" }}>
                      <select
                        value={unitForm.variantLabel}
                        onChange={(e) =>
                          setUnitForm((f: any) => ({
                            ...f,
                            variantLabel: e.target.value,
                          }))
                        }
                        style={{
                          width: "100%",
                          padding: "9px 32px 9px 12px",
                          borderRadius: 10,
                          border: "1px solid #cbd5e1",
                          fontSize: 13.5,
                          color: "#0f172a",
                          background: "#ffffff",
                          outline: "none",
                          appearance: "none",
                          cursor: "pointer",
                          boxSizing: "border-box",
                        }}
                      >
                        <option value="">Select variant (optional)</option>
                        {variantOptions.map((v) => (
                          <option key={v.id} value={v.label}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={15}
                        style={{
                          position: "absolute",
                          right: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#94a3b8",
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "#94a3b8",
                        marginTop: 4,
                      }}
                    >
                      Optional — e.g. Type A, Corner, etc.
                    </div>
                  </div>
                </div>

                {/* Grid Row 2: Facing, Parking, Area */}
                <div
                  className="unit-modal-prop-row2"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 16,
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#1e293b",
                        marginBottom: 6,
                      }}
                    >
                      Facing
                    </label>
                    <div style={{ position: "relative" }}>
                      <select
                        value={unitForm.facing}
                        onChange={(e) =>
                          setUnitForm((f: any) => ({ ...f, facing: e.target.value }))
                        }
                        style={{
                          width: "100%",
                          padding: "9px 32px 9px 12px",
                          borderRadius: 10,
                          border: "1px solid #cbd5e1",
                          fontSize: 13.5,
                          color: "#0f172a",
                          background: "#ffffff",
                          outline: "none",
                          appearance: "none",
                          cursor: "pointer",
                          boxSizing: "border-box",
                        }}
                      >
                        <option value="">Select facing (optional)</option>
                        {facingOptions.map((opt) => (
                          <option key={opt.id} value={opt.label}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={15}
                        style={{
                          position: "absolute",
                          right: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#94a3b8",
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#1e293b",
                        marginBottom: 6,
                      }}
                    >
                      Parking
                    </label>
                    <div style={{ position: "relative" }}>
                      <select
                        value={unitForm.parking}
                        onChange={(e) =>
                          setUnitForm((f: any) => ({ ...f, parking: e.target.value }))
                        }
                        style={{
                          width: "100%",
                          padding: "9px 32px 9px 12px",
                          borderRadius: 10,
                          border: "1px solid #cbd5e1",
                          fontSize: 13.5,
                          color: "#0f172a",
                          background: "#ffffff",
                          outline: "none",
                          appearance: "none",
                          cursor: "pointer",
                          boxSizing: "border-box",
                        }}
                      >
                        <option value="">Select parking (optional)</option>
                        {parkingOptions.map((opt) => (
                          <option key={opt.id} value={opt.label}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={15}
                        style={{
                          position: "absolute",
                          right: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#94a3b8",
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "#94a3b8",
                        marginTop: 4,
                      }}
                    >
                      Select parking options
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#1e293b",
                        marginBottom: 6,
                      }}
                    >
                      Area ({areaUnit})
                    </label>
                    <input
                      type="number"
                      placeholder="1,200"
                      value={unitForm.area}
                      onChange={(e) =>
                        setUnitForm((f: any) => ({ ...f, area: e.target.value }))
                      }
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 10,
                        border: "1px solid #cbd5e1",
                        fontSize: 13.5,
                        color: "#0f172a",
                        background: "#ffffff",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Pricing & status */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 16,
                  border: "1px solid #e2e8f0",
                  padding: "22px 24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                }}
              >
                {/* Section Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "#f1f5f9",
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#334155",
                      }}
                    >
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 15,
                          fontWeight: 700,
                          color: "#0f172a",
                        }}
                      >
                        Pricing &amp; status
                      </h3>
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontSize: 12.5,
                          color: "#64748b",
                        }}
                      >
                        Set the pricing and availability status for this unit.
                      </p>
                    </div>
                  </div>

                  {/* Header status pill badge */}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 12px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      background: currentStatus.bg,
                      color: currentStatus.text,
                      border: `1px solid ${currentStatus.border}`,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: currentStatus.dot,
                      }}
                    />
                    {currentStatus.label}
                  </div>
                </div>

                {/* 4 Inputs: Status, Base price, Offer price, Price per sq.ft. */}
                <div
                  className="unit-modal-pricing-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
                    gap: 16,
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#1e293b",
                        marginBottom: 6,
                      }}
                    >
                      Status
                    </label>
                    <div style={{ position: "relative" }}>
                      <select
                        value={unitForm.status}
                        onChange={(e) =>
                          setUnitForm((f: any) => ({
                            ...f,
                            status: e.target.value as UnitStatus,
                          }))
                        }
                        style={{
                          width: "100%",
                          padding: "9px 32px 9px 24px",
                          borderRadius: 10,
                          border: "1px solid #cbd5e1",
                          fontSize: 13.5,
                          color: "#0f172a",
                          background: "#ffffff",
                          outline: "none",
                          appearance: "none",
                          cursor: "pointer",
                          boxSizing: "border-box",
                        }}
                      >
                        <option value="available">Available</option>
                        <option value="held">Held / Blocked</option>
                        <option value="booked">Booked</option>
                        <option value="sold">Sold</option>
                      </select>
                      <span
                        style={{
                          position: "absolute",
                          left: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: currentStatus.dot,
                        }}
                      />
                      <ChevronDown
                        size={15}
                        style={{
                          position: "absolute",
                          right: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#94a3b8",
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#1e293b",
                        marginBottom: 6,
                      }}
                    >
                      Base price (₹)
                    </label>
                    <input
                      type="text"
                      placeholder="8,500,000"
                      value={unitForm.price}
                      onChange={(e) =>
                        setUnitForm((f: any) => ({ ...f, price: e.target.value }))
                      }
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 10,
                        border: "1px solid #cbd5e1",
                        fontSize: 13.5,
                        color: "#0f172a",
                        background: "#ffffff",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#1e293b",
                        marginBottom: 6,
                      }}
                    >
                      Offer price (₹)
                    </label>
                    <input
                      type="text"
                      placeholder="7,900,000"
                      value={offerPrice}
                      onChange={(e) => {
                        setOfferPrice(e.target.value);
                        setUnitForm((f: { customValues: any; }) => ({
                          ...f,
                          customValues: {
                            ...f.customValues,
                            offerPrice: e.target.value,
                          },
                        }));
                      }}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 10,
                        border: "1px solid #cbd5e1",
                        fontSize: 13.5,
                        color: "#0f172a",
                        background: "#ffffff",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#1e293b",
                        marginBottom: 6,
                      }}
                    >
                      Price per {areaUnit} (₹)
                    </label>
                    <input
                      type="text"
                      placeholder="8,500"
                      value={ratePerSqft}
                      onChange={(e) => setRatePerSqft(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 10,
                        border: "1px solid #cbd5e1",
                        fontSize: 13.5,
                        color: "#0f172a",
                        background: "#ffffff",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Media */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 16,
                  border: "1px solid #e2e8f0",
                  padding: "22px 24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                }}
              >
                {/* Section Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "#f1f5f9",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#334155",
                    }}
                  >
                    <Camera size={18} />
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      Media
                    </h3>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: 12.5,
                        color: "#64748b",
                      }}
                    >
                      Upload photos and gallery images for this unit.
                    </p>
                  </div>
                </div>

                {/* Media Row: Dropzone, Thumbnails, Add Button */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    flexWrap: "wrap",
                  }}
                >
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />

                  {/* Drag & drop upload box */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: "1.5px dashed #cbd5e1",
                      borderRadius: 14,
                      background: "#f8fafc",
                      padding: "16px 22px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      minWidth: 200,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#94a3b8";
                      e.currentTarget.style.background = "#f1f5f9";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#cbd5e1";
                      e.currentTarget.style.background = "#f8fafc";
                    }}
                  >
                    <UploadCloud size={24} style={{ color: "#3b82f6" }} />
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: "#1e293b",
                        marginTop: 2,
                      }}
                    >
                      Drag &amp; drop images here
                    </span>
                    <span style={{ fontSize: 11.5, color: "#64748b" }}>
                      or click to{" "}
                      <span
                        style={{
                          color: "#2563eb",
                          fontWeight: 600,
                          textDecoration: "underline",
                        }}
                      >
                        browse
                      </span>
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        color: "#94a3b8",
                        marginTop: 2,
                      }}
                    >
                      JPG, PNG, WebP (Max 10 MB each)
                    </span>
                  </div>

                  {/* Existing/Uploaded Thumbnails */}
                  {(unitForm.galleryUrls || []).map((url, i) => (
                    <div
                      key={url + i}
                      style={{
                        position: "relative",
                        width: 78,
                        height: 78,
                        borderRadius: 12,
                        overflow: "hidden",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={url}
                        alt={`Unit photo ${i + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePhoto(i);
                        }}
                        aria-label="Remove image"
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: "rgba(15, 23, 42, 0.75)",
                          color: "#ffffff",
                          border: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {/* Add photos square button */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: 78,
                      height: 78,
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      background: "#f1f5f9",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#e2e8f0";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#f1f5f9";
                    }}
                  >
                    <Plus size={18} style={{ color: "#475569" }} />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#475569",
                      }}
                    >
                      {uploading ? "Uploading…" : "Add photos"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* === RIGHT COLUMN: LIVE INTERACTIVE PREVIEW === */}
            <div>
              {/* Preview Header */}
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#0f172a",
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  <Eye size={17} />
                  <span>Preview</span>
                </div>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 12,
                    color: "#64748b",
                  }}
                >
                  This is how the unit will appear in listings.
                </p>
              </div>

              {/* Preview Card */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 16,
                  border: "1px solid #e2e8f0",
                  overflow: "hidden",
                  boxShadow: "0 4px 20px rgba(15, 23, 42, 0.06)",
                }}
              >
                {/* Hero Image Carousel */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: 200,
                    background: "#0f172a",
                    overflow: "hidden",
                  }}
                >
                  {displayPhotos.length > 0 ? (
                    <>
                      <img
                        src={displayPhotos[activePhotoIdx] || displayPhotos[0]}
                        alt="Listing preview"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />

                      {/* Carousel navigation arrows */}
                      {displayPhotos.length > 1 ? (
                        <>
                          <button
                            type="button"
                            onClick={prevPhoto}
                            aria-label="Previous photo"
                            style={{
                              position: "absolute",
                              left: 10,
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: "rgba(15, 23, 42, 0.5)",
                              backdropFilter: "blur(4px)",
                              color: "#ffffff",
                              border: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              padding: 0,
                              transition: "background 0.15s ease",
                            }}
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={nextPhoto}
                            aria-label="Next photo"
                            style={{
                              position: "absolute",
                              right: 10,
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: "rgba(15, 23, 42, 0.5)",
                              backdropFilter: "blur(4px)",
                              color: "#ffffff",
                              border: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              padding: 0,
                              transition: "background 0.15s ease",
                            }}
                          >
                            <ChevronRight size={16} />
                          </button>
                        </>
                      ) : null}

                      {/* Photo counter badge */}
                      <div
                        style={{
                          position: "absolute",
                          right: 12,
                          bottom: 10,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: "rgba(15, 23, 42, 0.7)",
                          backdropFilter: "blur(4px)",
                          color: "#ffffff",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        <Camera size={12} />
                        <span>
                          {activePhotoIdx + 1}/{displayPhotos.length}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                        color: "#94a3b8",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          background: "rgba(255, 255, 255, 0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Camera size={20} style={{ color: "#cbd5e1" }} />
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: "#94a3b8",
                        }}
                      >
                        No photos uploaded
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Content Area */}
                <div style={{ padding: "18px 20px" }}>
                  {/* Title and Status Badge */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: 20,
                        fontWeight: 800,
                        color: "#0f172a",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {unitForm.unitNo || "—"}
                    </h4>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 600,
                        background: currentStatus.bg,
                        color: currentStatus.text,
                        border: `1px solid ${currentStatus.border}`,
                      }}
                    >
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: currentStatus.dot,
                        }}
                      />
                      {currentStatus.label}
                    </div>
                  </div>

                  {/* Subtitle */}
                  <div
                    style={{
                      fontSize: 12.5,
                      color: "#64748b",
                      marginBottom: 16,
                    }}
                  >
                    {[
                      unitForm.configuration || null,
                      unitForm.tower ? `${groupWord} ${unitForm.tower}` : null,
                      unitForm.floor ? `Floor ${unitForm.floor}` : null,
                    ]
                      .filter(Boolean)
                      .join(" | ") || "—"}
                  </div>

                  {/* 2x2 Feature Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "14px 12px",
                      paddingTop: 14,
                      borderTop: "1px solid #f1f5f9",
                    }}
                  >
                    {/* Price */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <Tag
                        size={17}
                        style={{ color: "#334155", marginTop: 2, flexShrink: 0 }}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: 14.5,
                            fontWeight: 800,
                            color: "#0f172a",
                            lineHeight: 1.2,
                          }}
                        >
                          {formattedPrice || "—"}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#64748b",
                            marginTop: 2,
                          }}
                        >
                          {Number(ratePerSqft) > 0
                            ? `₹ ${Number(ratePerSqft).toLocaleString("en-IN")} per ${areaUnit}`
                            : "Rate not set"}
                        </div>
                      </div>
                    </div>

                    {/* Area */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <Maximize2
                        size={17}
                        style={{ color: "#334155", marginTop: 2, flexShrink: 0 }}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#64748b",
                            lineHeight: 1.2,
                          }}
                        >
                          Area
                        </div>
                        <div
                          style={{
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: "#1e293b",
                            marginTop: 2,
                          }}
                        >
                          {unitForm.area
                            ? `${Number(unitForm.area).toLocaleString("en-IN")} ${areaUnit}`
                            : "—"}
                        </div>
                      </div>
                    </div>

                    {/* Facing */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <Compass
                        size={17}
                        style={{ color: "#334155", marginTop: 2, flexShrink: 0 }}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#64748b",
                            lineHeight: 1.2,
                          }}
                        >
                          Facing
                        </div>
                        <div
                          style={{
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: "#1e293b",
                            marginTop: 2,
                          }}
                        >
                          {unitForm.facing || "—"}
                        </div>
                      </div>
                    </div>

                    {/* Parking */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <Car
                        size={17}
                        style={{ color: "#334155", marginTop: 2, flexShrink: 0 }}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#64748b",
                            lineHeight: 1.2,
                          }}
                        >
                          Parking
                        </div>
                        <div
                          style={{
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: "#1e293b",
                            marginTop: 2,
                          }}
                        >
                          {unitForm.parking || "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Footer --- */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 12,
            padding: "16px 28px",
            background: "#ffffff",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              padding: "10px 22px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#334155",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: busy ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (busy) return;
              e.currentTarget.style.background = "#f8fafc";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ffffff";
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={busy}
            style={{
              padding: "10px 26px",
              borderRadius: 10,
              border: "none",
              background: "#059669",
              color: "#ffffff",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: busy ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
              transition: "all 0.15s ease",
              opacity: busy ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (busy) return;
              e.currentTarget.style.background = "#047857";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#059669";
            }}
          >
            {busy ? "Saving…" : mode === "create" ? "Create unit" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
