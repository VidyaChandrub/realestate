"use client";

import { useContext, useEffect, useState } from "react";
import { Building2, MapPin, IndianRupee, X, CheckCircle2, Send, ShieldCheck } from "lucide-react";
import type { Device, SectionInstance, SiteConfig } from "@/lib/prestate/types";
import type { Project, PublicProject, EnquiryUnit } from "@/lib/types";
import { apiFetch, submitLead } from "@/lib/api";
import { isFieldVisible } from "@/lib/prestate/form-logic";
import { bumpTracking } from "@/lib/prestate/tracking";
import { firePrestateLead } from "@/components/prestate/tracking-scripts";

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}
function isValidPhone(v: string): boolean {
  return v.replace(/\D/g, "").length >= 8;
}
const LEAD_SUCCESS_EVENT = "prestate:lead-success";
function openPopupById(popupId: string) {
  if (!popupId || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("prestate:open-popup", { detail: { popupId } }));
}

// Reuse contexts from canvas via importing or re-creating - we will pass them as props from canvas for simplicity
// This file exports ProjectEnquiryModal and ProjectSection that canvas will use with contexts provided

function wt() {
  // minimal wt tokens fallback
  return {
    primary: "#6D5DFC",
    primarySoft: "#eef0fe",
    surfaceMuted: "#f1f5f9",
    slate: "#64748b",
    ink: "#0f172a",
    border: "1px solid #e2e8f0",
    borderStrong: "#cbd5e1",
    muted: "#94a3b8",
    radius: 14,
    radiusSm: 10,
  };
}

// Minimal card styles inline - reuse wt from theme if available via props
export function ProjectEnquiryModal({
  open,
  onClose,
  project,
  pageId,
  live,
  form,
  heading,
  text,
  buttonLabel,
  units = [],
}: {
  open: boolean;
  onClose: () => void;
  project: Project | { id: string; name: string } | null;
  pageId: string;
  live: boolean;
  form: SiteConfig["form"] | undefined;
  heading: string;
  text: string;
  buttonLabel: string;
  units?: EnquiryUnit[];
}) {
  if (!open || !project) return null;
  const effectiveForm = form;
  const rawFields = effectiveForm?.fields?.length ? effectiveForm.fields : [{ id: "f1", type: "text", label: "Full Name", placeholder: "Your name", required: true } as unknown as SiteConfig["form"]["fields"][number], { id: "f2", type: "phone", label: "Phone", placeholder: "+91 98XXX XXXXX", required: true } as unknown as SiteConfig["form"]["fields"][number], { id: "f3", type: "email", label: "Email", placeholder: "you@email.com", required: false } as unknown as SiteConfig["form"]["fields"][number]];
  const fields = (Array.isArray(rawFields) ? rawFields : []) as SiteConfig["form"]["fields"];
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const visible = fields.filter((f) => isFieldVisible(f as unknown as import("@/lib/prestate/types").FormLeadField, fields as unknown as import("@/lib/prestate/types").FormLeadField[], values));

  const validate = (): boolean => {
    for (const f of visible) {
      const key = (f as { id?: string }).id || f.label;
      const v = (values[key] ?? "").trim();
      if ((f.required ?? false) && !v && f.type !== "checkbox") {
        setError(`${f.label} is required.`);
        return false;
      }
      if (v && f.type === "email" && !isValidEmail(v)) {
        setError("Please enter a valid email address.");
        return false;
      }
      if (v && f.type === "phone" && !isValidPhone(v)) {
        setError("Please enter a valid phone number.");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setError("");
    setSubmitting(true);
    const leadFields: Record<string, string> = {};
    for (const f of visible) {
      const key = (f as { id?: string }).id || f.label;
      leadFields[f.label] = String(values[key] ?? "");
    }
    // Include project name for convenience in data
    leadFields["Project"] = project.name;
    const selectedUnit = units.find((unit) => unit.id === values.unitId);
    leadFields["Unit"] = selectedUnit?.unitNo ?? "Any available unit";
    if (selectedUnit) leadFields["Unit ID"] = selectedUnit.id;
    try {
      if (live && pageId) {
        firePrestateLead();
        bumpTracking(pageId, "form");
        await submitLead({
          landingPageId: pageId,
          projectId: project.id,
          formName: effectiveForm?.name ?? heading,
          source: "website",
          fields: leadFields,
          unitId: selectedUnit?.id,
        });
        window.dispatchEvent(new CustomEvent(LEAD_SUCCESS_EVENT));
        const popupAfter = String((effectiveForm as unknown as { openPopupId?: string })?.openPopupId ?? "").trim();
        if (popupAfter) openPopupById(popupAfter);
      }
      setDone(true);
      setTimeout(() => {
        onClose();
        // reset after close
        setTimeout(() => {
          setDone(false);
          setValues({});
          setSubmitting(false);
        }, 300);
      }, 1600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed. Please try again.");
      setSubmitting(false);
    }
  };

  const W = wt();

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(8,10,20,.62)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: 480, maxWidth: "100%", background: "#fff", borderRadius: 18, boxShadow: "0 30px 80px rgba(8,10,20,.45)", overflow: "hidden" }}>
        <button type="button" aria-label="Close" onClick={onClose} style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: "50%", border: "none", background: "#f1f5f9", color: "#64748b", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
          <X size={16} />
        </button>
        {!done ? (
          <>
            <div style={{ background: `linear-gradient(135deg, ${W.primary} 0%, #6366f1 100%)`, padding: "22px 24px", color: "#fff" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", opacity: 0.9, display: "flex", alignItems: "center", gap: 6 }}>
                <Building2 size={12} /> {project.name}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, marginTop: 6, lineHeight: 1.2 }}>{heading || `Enquire About ${project.name}`}</div>
              {text ? <p style={{ fontSize: 13, opacity: 0.9, marginTop: 8, lineHeight: 1.5 }}>{text}</p> : null}
            </div>
            <div style={{ padding: "22px 22px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              {units.length > 0 ? (
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: W.slate, marginBottom: 5, display: "block" }}>
                    Preferred Unit
                  </label>
                  <select
                    value={values.unitId ?? ""}
                    onChange={(e) => setValues((p) => ({ ...p, unitId: e.target.value }))}
                    style={{ width: "100%", padding: "11px 12px", borderRadius: 10, border: `1px solid ${W.borderStrong}`, fontSize: 13.5 }}
                  >
                    <option value="">Any available unit</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.unitNo}{unit.tower ? ` · ${unit.tower}` : ""}{unit.floor ? ` · Floor ${unit.floor}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {visible.map((f, i) => {
                const key = (f as { id?: string }).id || f.label;
                const val = values[key] ?? "";
                return (
                  <div key={(f as { id?: string }).id || f.label || i}>
                    {f.type !== "checkbox" ? (
                      <label style={{ fontSize: 11.5, fontWeight: 700, color: W.slate, marginBottom: 5, display: "block" }}>
                        {f.label} {f.required ? "*" : ""}
                      </label>
                    ) : null}
                    {f.type === "select" && Array.isArray((f as unknown as { options?: string[] }).options) ? (
                      <select value={val} onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))} style={{ width: "100%", padding: "11px 12px", borderRadius: 10, border: `1px solid ${W.borderStrong}`, fontSize: 13.5 }}>
                        <option value="">Choose</option>
                        {((f as unknown as { options: string[] }).options).map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : f.type === "textarea" ? (
                      <textarea placeholder={f.placeholder} value={val} onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))} style={{ width: "100%", minHeight: 80, padding: "11px 12px", borderRadius: 10, border: `1px solid ${W.borderStrong}`, fontSize: 13.5 }} />
                    ) : f.type === "checkbox" ? (
                      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: W.slate }}>
                        <input type="checkbox" checked={val === "yes"} onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.checked ? "yes" : "" }))} />
                        {f.label}
                      </label>
                    ) : (
                      <input type={f.type === "email" ? "email" : f.type === "phone" ? "tel" : "text"} placeholder={f.placeholder} value={val} onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))} style={{ width: "100%", padding: "11px 12px", borderRadius: 10, border: `1px solid ${W.borderStrong}`, fontSize: 13.5 }} />
                    )}
                  </div>
                );
              })}
              {error ? <div style={{ padding: "9px 12px", borderRadius: 10, background: "#fef2f2", color: "#dc2626", fontSize: 12.5, fontWeight: 600 }}>{error}</div> : null}
              <button type="button" onClick={handleSubmit} disabled={submitting} style={{ marginTop: 4, width: "100%", padding: "12px 16px", borderRadius: 10, border: "none", background: W.primary, color: "#fff", fontWeight: 800, fontSize: 14, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Send size={16} /> {buttonLabel || "Submit Enquiry"}
              </button>
              <div style={{ textAlign: "center", fontSize: 11, color: W.muted, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <ShieldCheck size={12} /> Your details are safe with us
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "42px 22px 36px" }}>
            <span style={{ width: 58, height: 58, borderRadius: "50%", background: "#dcfce7", color: "#16a34a", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <CheckCircle2 size={28} />
            </span>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#0f172a" }}>Enquiry Sent!</div>
            <div style={{ fontSize: 13.5, color: "#64748b", marginTop: 8, lineHeight: 1.5 }}>Thank you for your interest in <b>{project.name}</b>. Our team will contact you shortly.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  onEnquire,
  compact,
}: {
  project: Project;
  onEnquire: () => void;
  compact?: boolean;
}) {
  const W = wt();
  const priceLabel = project.priceMin && project.priceMax ? `₹${(project.priceMin/100000).toFixed(0)}L – ₹${(project.priceMax/100000).toFixed(0)}L` : project.priceMin ? `From ₹${(project.priceMin/100000).toFixed(0)}L` : "Price on request";
  return (
    <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: `1px solid #e2e8f0`, boxShadow: "0 8px 24px rgba(15,23,42,.06)", display: "flex", flexDirection: "column" }}>
      <div style={{ height: compact ? 140 : 180, background: project.coverImageUrl ? `url(${project.coverImageUrl}) center/cover` : "linear-gradient(135deg, #eef0fe 0%, #ede9fe 100%)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {!project.coverImageUrl ? <Building2 size={36} color="#6D5DFC" style={{ opacity: 0.4 }} /> : null}
        <span style={{ position: "absolute", top: 10, left: 10, background: project.status === "active" ? "#16a34a" : "#64748b", color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", padding: "4px 8px", borderRadius: 999 }}>{project.status}</span>
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", lineHeight: 1.3 }}>{project.name}</div>
        {project.location || project.city ? (
          <div style={{ fontSize: 12.5, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
            <MapPin size={12} /> {project.location || `${project.locality ?? ""} ${project.city ?? ""}`.trim()}
          </div>
        ) : null}
        <div style={{ fontSize: 13, fontWeight: 700, color: W.primary, display: "flex", alignItems: "center", gap: 4 }}>
          <IndianRupee size={12} /> {priceLabel}
        </div>
        {project.possession ? <div style={{ fontSize: 11.5, color: "#94a3b8" }}>Possession: {project.possession}</div> : null}
        {project.amenities?.length ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            {project.amenities.slice(0, 3).map((a) => (
              <span key={a.name} style={{ fontSize: 10.5, fontWeight: 600, background: "#f1f5f9", color: "#475569", padding: "3px 8px", borderRadius: 999 }}>{a.name}</span>
            ))}
          </div>
        ) : null}
        <button type="button" onClick={onEnquire} style={{ marginTop: "auto", paddingTop: 12, width: "100%", padding: "10px 14px", borderRadius: 10, border: "none", background: W.primary, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          Enquire Now
        </button>
      </div>
    </div>
  );
}

export function ProjectSection({
  s,
  device,
  pageId,
  live,
  readOnly = false,
  form,
}: {
  s: SectionInstance;
  device: Device;
  pageId: string;
  live: boolean;
  readOnly?: boolean;
  form: SiteConfig["form"] | undefined;
}) {
  const st = (s.settings ?? {}) as Record<string, unknown>;
  const selectedProjectId = typeof st.selectedProjectId === "string" ? st.selectedProjectId : null;
  const layout = String(st.layout ?? st.design ?? "grid");
  const columns = Number(st.columns ?? 3);
  const heading = String(st.enquiryFormHeading ?? "Enquire About This Project");
  const text = String(st.enquiryFormText ?? "Share your details and our team will get back to you shortly.");
  const buttonLabel = String(st.enquiryButtonLabel ?? "Submit Enquiry");

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Project | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (live && !readOnly) {
          const res = await apiFetch<Project[]>(
            `/public/site/projects/${encodeURIComponent(pageId)}`,
          );
          if (!cancelled && Array.isArray(res)) setProjects(res);
        } else {
          const res = await apiFetch<{ data: Project[] }>("/org/projects?limit=100");
          if (!cancelled && Array.isArray(res.data)) setProjects(res.data);
        }
      } catch {
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, live, pageId]);

  const display = (() => {
    if (selectedProjectId) {
      const found = projects.find((p) => p.id === selectedProjectId);
      if (found) return [found];
      // If projects not loaded but selected id exists, show placeholder card
      if (!loading && projects.length === 0 && selectedProjectId) {
        return [{ id: selectedProjectId, name: "Selected Project", location: null, city: null, locality: null, reraId: null, possession: null, managerId: null, manager: null, status: "active", priceMin: null, priceMax: null, baseRate: null, landArea: null, towerCount: null, floorsDescription: null, amenities: [], bookingAmount: null, currency: "INR", priceIncludes: [], paymentPlan: null, offers: null, addressLine: null, pincode: null, latitude: null, longitude: null, connectivity: [], landmarks: null, specifications: null, marketing: null, requireBookingApproval: false, visibleToTelecallers: true, publishedToWebsite: false, coverImageUrl: null, galleryUrls: [], brochureUrl: null, reraCertificateUrl: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as unknown as Project];
      }
      return found ? [found] : projects;
    }
    return projects;
  })();

  const cols = Math.max(1, Math.min(4, columns || 3));
  const gridStyle: React.CSSProperties = layout === "list" ? { display: "flex", flexDirection: "column", gap: 16 } : layout === "carousel" ? { display: "flex", gap: 16, overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 8 } : { display: "grid", gridTemplateColumns: device === "mobile" ? "1fr" : `repeat(${Math.min(cols, 3)},1fr)`, gap: 16 };

  if (loading) {
    return <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading projects…</div>;
  }

  if (!display.length) {
    return (
      <div style={{ padding: "28px 20px", textAlign: "center", border: "1.5px dashed #e2e8f0", borderRadius: 14, color: "#64748b" }}>
        <Building2 size={28} style={{ opacity: 0.5, margin: "0 auto 8px" }} />
        <div style={{ fontWeight: 700, fontSize: 13 }}>No projects found</div>
        <div style={{ fontSize: 12.5, marginTop: 6 }}>{live ? "Projects will appear here once added to this organisation." : "Add projects in Organisation → Projects, then select one in this widget's Settings."}</div>
      </div>
    );
  }

  return (
    <>
      <div style={gridStyle}>
        {display.map((p) => (
          <div key={p.id} style={layout === "carousel" ? { minWidth: 300, scrollSnapAlign: "start", flexShrink: 0 } : undefined}>
            <ProjectCard project={p} onEnquire={() => setActive(p)} compact={layout === "list"} />
          </div>
        ))}
      </div>
      <ProjectEnquiryModal
        open={!!active}
        onClose={() => setActive(null)}
        project={active}
        pageId={pageId}
        live={live}
        form={form}
        heading={heading}
        text={text}
        buttonLabel={buttonLabel}
        units={active ? (active as PublicProject).unitTypes?.flatMap((type) => type.units) ?? [] : []}
      />
    </>
  );
}
