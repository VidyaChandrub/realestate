"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Camera,
  Car,
  ChevronLeft,
  ChevronRight,
  Compass,
  Eye,
  Maximize2,
  Tag,
  X,
} from "lucide-react";
import type { ProjectDetail, UnitStatus } from "@/lib/types";

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
  available: { label: "Available", bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0", dot: "#10b981" },
  held: { label: "Held / Blocked", bg: "#fef3c7", text: "#92400e", border: "#fde68a", dot: "#f59e0b" },
  booked: { label: "Booked", bg: "#ffe4e6", text: "#9f1239", border: "#fecdd3", dot: "#f43f5e" },
  sold: { label: "Sold", bg: "#f1f5f9", text: "#475569", border: "#cbd5e1", dot: "#64748b" },
};

/** Already-formatted preview values — the page owns currency, units and labels. */
export interface UnitPreview {
  /** e.g. "2 BHK · Tower A · Floor 12" — or the project type when there's no configuration. */
  subtitle: string;
  price: string | null;
  pricePerArea: string | null;
  area: string | null;
}

/**
 * Add / edit unit dialog. The form itself is supplied by the page as
 * `children` and is driven entirely by the project type's unit field
 * template (role fields, custom fields, labels) — this component is only the
 * frame: header, live preview card and footer.
 */
export function UnitDesignModal({
  open,
  onClose,
  mode,
  project,
  unitForm,
  onSubmit,
  busy = false,
  error = null,
  submitLabel,
  preview,
  children,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  project: ProjectDetail | null;
  unitForm: UnitFormState;
  onSubmit: () => Promise<void>;
  busy?: boolean;
  error?: string | null;
  /** Primary button text for create mode (e.g. "Add unit" / "Add plot" / "Add listing"). */
  submitLabel: string;
  preview: UnitPreview;
  /** The dynamic, template-driven form. */
  children: ReactNode;
}) {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

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

  const displayPhotos = unitForm.galleryUrls || [];
  const photoIdx = activePhotoIdx < displayPhotos.length ? activePhotoIdx : 0;
  const currentStatus = STATUS_CONFIG[unitForm.status] || STATUS_CONFIG.available;

  const nextPhoto = () => {
    if (displayPhotos.length === 0) return;
    setActivePhotoIdx((prev) => (prev + 1) % displayPhotos.length);
  };
  const prevPhoto = () => {
    if (displayPhotos.length === 0) return;
    setActivePhotoIdx((prev) => (prev === 0 ? displayPhotos.length - 1 : prev - 1));
  };

  const arrowStyle = (side: "left" | "right") => ({
    position: "absolute" as const,
    [side]: 10,
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
  });

  const feature = (icon: ReactNode, label: string, value: string | null, sub?: string | null) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      {icon}
      <div>
        <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.2 }}>{label}</div>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b", marginTop: 2 }}>{value || "—"}</div>
        {sub ? <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{sub}</div> : null}
      </div>
    </div>
  );
  const iconStyle = { color: "#334155", marginTop: 2, flexShrink: 0 };

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
        onClick={() => {
          if (!busy) onClose();
        }}
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
          boxShadow: "0 25px 60px -15px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(226, 232, 240, 0.8)",
          overflow: "hidden",
          color: "#0f172a",
        }}
      >
        <style>{`
          @media (max-width: 980px) {
            .unit-modal-grid { grid-template-columns: 1fr !important; }
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
            {project?.coverImageUrl || project?.galleryUrls?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.coverImageUrl || project.galleryUrls?.[0]}
                alt={project.name}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  objectFit: "cover",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              />
            ) : null}
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
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
                {project?.name ? (
                  <>
                    <span>
                      Project: <strong style={{ color: "#1e293b", fontWeight: 600 }}>{project.name}</strong>
                    </span>
                    <span style={{ color: "#cbd5e1" }}>|</span>
                  </>
                ) : null}
                <span>{mode === "create" ? "Add a new unit to this project" : "Update unit details"}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
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
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* --- Scrollable Body (2 columns) --- */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", background: "#fafbfc" }}>
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
            style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "start" }}
          >
            {/* === LEFT COLUMN: template-driven form (from the page) === */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: 16,
                border: "1px solid #e2e8f0",
                padding: "18px 22px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                minWidth: 0,
              }}
            >
              {children}
            </div>

            {/* === RIGHT COLUMN: LIVE PREVIEW === */}
            <div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#0f172a", fontWeight: 700, fontSize: 15 }}>
                  <Eye size={17} />
                  <span>Preview</span>
                </div>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                  This is how the unit will appear in listings.
                </p>
              </div>

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
                <div style={{ position: "relative", width: "100%", height: 200, background: "#0f172a", overflow: "hidden" }}>
                  {displayPhotos.length > 0 ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={displayPhotos[photoIdx]}
                        alt="Listing preview"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      {displayPhotos.length > 1 ? (
                        <>
                          <button type="button" onClick={prevPhoto} aria-label="Previous photo" style={arrowStyle("left")}>
                            <ChevronLeft size={16} />
                          </button>
                          <button type="button" onClick={nextPhoto} aria-label="Next photo" style={arrowStyle("right")}>
                            <ChevronRight size={16} />
                          </button>
                        </>
                      ) : null}
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
                          color: "#ffffff",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        <Camera size={12} />
                        <span>
                          {photoIdx + 1}/{displayPhotos.length}
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
                      <Camera size={20} style={{ color: "#cbd5e1" }} />
                      <span style={{ fontSize: 12, fontWeight: 500 }}>No photos uploaded</span>
                    </div>
                  )}
                </div>

                <div style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <h4 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
                      {unitForm.unitNo || "New unit"}
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
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: currentStatus.dot }} />
                      {currentStatus.label}
                    </div>
                  </div>

                  <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 16 }}>{preview.subtitle || "—"}</div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "14px 12px",
                      paddingTop: 14,
                      borderTop: "1px solid #f1f5f9",
                    }}
                  >
                    {feature(<Tag size={17} style={iconStyle} />, "Price", preview.price, preview.pricePerArea)}
                    {feature(<Maximize2 size={17} style={iconStyle} />, "Area", preview.area)}
                    {feature(<Compass size={17} style={iconStyle} />, "Facing", unitForm.facing || null)}
                    {feature(<Car size={17} style={iconStyle} />, "Parking", unitForm.parking || null)}
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
          <button className="btn btn-ghost" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" type="button" onClick={() => void onSubmit()} disabled={busy}>
            {busy ? "Saving…" : mode === "create" ? submitLabel : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
