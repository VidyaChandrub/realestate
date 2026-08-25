"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UnitType = {
  id: number;
  name: string;
  carpet: string;
  builtUp: string;
  price: string;
  total: string;
  available: string;
  gallery?: string[];
  floorPlan?: string;
  video?: string;
  brochure?: string;
};

type Amenity = {
  name: string;
  icon?: string;
};

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });

const makeUnitType = (): UnitType => ({
  id: Date.now() + Math.random(),
  name: "",
  carpet: "",
  builtUp: "",
  price: "",
  total: "",
  available: "",
  gallery: [],
});

const AMENITY_OPTIONS: Amenity[] = [
  { name: "Swimming pool" },
  { name: "Clubhouse & gym" },
  { name: "Landscaped garden" },
  { name: "2-level parking" },
  { name: "Kids play area" },
  { name: "24×7 security" },
  { name: "Power backup" },
  { name: "Sports court" },
  { name: "Yoga deck" },
];

export default function AddNewProjectPage() {
  const router = useRouter();
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [amenityDraft, setAmenityDraft] = useState("");

  const addUnitType = () => {
    setUnitTypes((prev) => [...prev, makeUnitType()]);
  };

  const updateUnitType = (id: number, patch: Partial<UnitType>) => {
    setUnitTypes((prev) =>
      prev.map((unit) => (unit.id === id ? { ...unit, ...patch } : unit)),
    );
  };

  const removeUnitType = (id: number) => {
    setUnitTypes((prev) => prev.filter((unit) => unit.id !== id));
  };

  const addUnitFiles = async (id: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const items = await Promise.all(
      Array.from(files)
        .filter((file) => file.type.startsWith("image/"))
        .map((file) => readAsDataUrl(file)),
    );

    if (items.length === 0) return;
    setUnitTypes((prev) =>
      prev.map((unit) =>
        unit.id === id
          ? { ...unit, gallery: [...(unit.gallery ?? []), ...items] }
          : unit,
      ),
    );
  };

  const setUnitUpload = async (
    id: number,
    kind: "floorPlan" | "video" | "brochure",
    files: FileList | null,
  ) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (kind === "video" && !file.type.startsWith("video/")) return;
    if (kind === "floorPlan" && !file.type.startsWith("image/")) return;
    if (kind === "brochure" && !/^application\/pdf$|^image\//.test(file.type)) return;
    const dataUrl = await readAsDataUrl(file);
    updateUnitType(id, { [kind]: dataUrl } as Partial<UnitType>);
  };

  const removeUnitMedia = (id: number, kind: "gallery" | "floorPlan" | "video" | "brochure", index?: number) => {
    setUnitTypes((prev) =>
      prev.map((unit) => {
        if (unit.id !== id) return unit;
        if (kind === "gallery" && typeof index === "number") {
          return { ...unit, gallery: (unit.gallery ?? []).filter((_, i) => i !== index) };
        }
        return { ...unit, [kind]: undefined } as UnitType;
      }),
    );
  };

  const addAmenity = () => {
    const value = amenityDraft.trim();
    if (!value) return;
    setAmenities((prev) =>
      prev.some((item) => item.name.toLowerCase() === value.toLowerCase())
        ? prev
        : [...prev, { name: value }],
    );
    setAmenityDraft("");
  };

  const removeAmenity = (name: string) => {
    setAmenities((prev) => prev.filter((item) => item.name !== name));
  };

  const setAmenityIcon = async (name: string, file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const icon = await readAsDataUrl(file);
    setAmenities((prev) =>
      prev.map((item) => (item.name === name ? { ...item, icon } : item)),
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          borderRadius: 22,
          overflow: "hidden",
          border: "1px solid rgba(148, 163, 184, 0.22)",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            padding: "22px 26px 18px",
            background: "linear-gradient(135deg, #1f2937 0%, #3b0a5c 35%, #8b1b5d 70%, #f59e0b 100%)",
            color: "#fff",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 12px",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              ✦ New project
            </div>
            <h1 style={{ margin: "12px 0 0", fontSize: 28, lineHeight: 1.2, color: "#fff" }}>
              Create a project
            </h1>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}>
              Add your property details, unit mix, media, and amenities in one workspace.
            </div>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.16)",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#34d399",
                display: "inline-block",
              }}
            />
            Draft
          </div>
        </div>

        <div
          style={{
            background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
            padding: 22,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.8fr) minmax(280px, 0.95fr)",
              gap: 20,
              alignItems: "start",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <SectionLabel>Basics</SectionLabel>
              <div className="grid g3">
                <div className="field">
                  <label>Project name *</label>
                  <input className="inp" placeholder="e.g. Riverside Heights" />
                </div>
                <div className="field">
                  <label>Location</label>
                  <input className="inp" placeholder="e.g. SG Highway, Ahmedabad" />
                </div>
                <div className="field">
                  <label>RERA ID</label>
                  <input className="inp mono" placeholder="PR/GJ/AHM/2026/00842" />
                </div>
              </div>

              <div className="grid g3" style={{ marginTop: 12 }}>
                <div className="field">
                  <label>Possession</label>
                  <input className="inp" placeholder="e.g. Dec 2027" />
                </div>
                <div className="field">
                  <label>Project manager *</label>
                  <input className="inp" placeholder="Full name" />
                </div>
                <div className="field">
                  <label>Status</label>
                  <select defaultValue="active">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <SectionLabel>Configuration & pricing</SectionLabel>
              <div className="grid g4">
                <div className="field">
                  <label>Price from</label>
                  <input className="inp" placeholder="₹68 L" />
                </div>
                <div className="field">
                  <label>Price to</label>
                  <input className="inp" placeholder="₹2.4 Cr" />
                </div>
                <div className="field">
                  <label>Base rate / sqft</label>
                  <input className="inp" placeholder="₹5,800" />
                </div>
                <div className="field">
                  <label>Land area (acres)</label>
                  <input className="inp" placeholder="6.2" />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <SectionLabel>Unit types</SectionLabel>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={addUnitType}
                  style={{
                    borderRadius: 10,
                    padding: "8px 12px",
                    minHeight: 0,
                    background: "rgba(109, 40, 217, 0.08)",
                    color: "var(--brand, #6d28d9)",
                    borderColor: "rgba(109, 40, 217, 0.2)",
                  }}
                >
                  ＋ Add unit type
                </button>
              </div>

              {unitTypes.length === 0 ? (
                <div
                  style={{
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: 16,
                    padding: 16,
                    background: "rgba(15, 23, 42, 0.02)",
                  }}
                >
                  <div className="muted" style={{ fontSize: 13 }}>
                    No unit types yet — add one per configuration (e.g. 2 BHK — Type A).
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {unitTypes.map((unit, index) => (
                    <div
                      key={unit.id}
                      style={{
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                        borderRadius: 16,
                        padding: 14,
                        background: "rgba(15, 23, 42, 0.02)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 12,
                        }}
                      >
                        <strong style={{ fontSize: 14 }}>
                          {unit.name.trim() || `Unit type ${index + 1}`}
                        </strong>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => removeUnitType(unit.id)}
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid g3">
                        <div className="field">
                          <label>Name</label>
                          <input
                            className="inp"
                            placeholder="2 BHK — Type A"
                            value={unit.name}
                            onChange={(e) => updateUnitType(unit.id, { name: e.target.value })}
                          />
                        </div>
                        <div className="field">
                          <label>Carpet (sqft)</label>
                          <input
                            className="inp"
                            placeholder="742"
                            value={unit.carpet}
                            onChange={(e) => updateUnitType(unit.id, { carpet: e.target.value })}
                          />
                        </div>
                        <div className="field">
                          <label>Built-up (sqft)</label>
                          <input
                            className="inp"
                            placeholder="1180"
                            value={unit.builtUp}
                            onChange={(e) => updateUnitType(unit.id, { builtUp: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid g3" style={{ marginTop: 12 }}>
                        <div className="field">
                          <label>Price</label>
                          <input
                            className="inp"
                            placeholder="₹68 L"
                            value={unit.price}
                            onChange={(e) => updateUnitType(unit.id, { price: e.target.value })}
                          />
                        </div>
                        <div className="field">
                          <label>Total units</label>
                          <input
                            className="inp"
                            placeholder="96"
                            value={unit.total}
                            onChange={(e) => updateUnitType(unit.id, { total: e.target.value })}
                          />
                        </div>
                        <div className="field">
                          <label>Available</label>
                          <input
                            className="inp"
                            placeholder="42"
                            value={unit.available}
                            onChange={(e) => updateUnitType(unit.id, { available: e.target.value })}
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed rgba(148, 163, 184, 0.22)", display: "grid", gap: 12 }}>
                        <div className="field">
                          <label>Images</label>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {(unit.gallery ?? []).map((src, i) => (
                              <span key={`${unit.id}-gallery-${i}`} style={{ position: "relative", display: "inline-flex" }}>
                                {/* eslint-disable-next-line @next/next/no-img-element -- local data URL uploads */}
                                <img
                                  src={src}
                                  alt=""
                                  width={54}
                                  height={54}
                                  style={{ borderRadius: 10, objectFit: "cover", border: "1px solid rgba(148,163,184,0.25)" }}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeUnitMedia(unit.id, "gallery", i)}
                                  style={{
                                    position: "absolute",
                                    top: -6,
                                    right: -6,
                                    width: 18,
                                    height: 18,
                                    borderRadius: "50%",
                                    border: "none",
                                    background: "#fff",
                                    boxShadow: "0 0 0 1px rgba(148,163,184,0.3)",
                                    cursor: "pointer",
                                    fontSize: 10,
                                  }}
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                            <label
                              style={{
                                width: 54,
                                height: 54,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 10,
                                border: "1px dashed rgba(148,163,184,0.4)",
                                cursor: "pointer",
                                color: "var(--faint, #64748b)",
                                background: "rgba(255,255,255,0.4)",
                              }}
                            >
                              ＋
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={(e) => {
                                  addUnitFiles(unit.id, e.target.files);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          </div>
                        </div>

                        <div className="grid g3">
                          <div className="field">
                            <label>Floor plan</label>
                            {unit.floorPlan ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {/* eslint-disable-next-line @next/next/no-img-element -- local data URL uploads */}
                                <img
                                  src={unit.floorPlan}
                                  alt="Floor plan"
                                  style={{ width: "100%", height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(148,163,184,0.25)" }}
                                />
                                <div style={{ display: "flex", gap: 6 }}>
                                  <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>
                                    Replace
                                    <input
                                      type="file"
                                      accept="image/*"
                                      style={{ display: "none" }}
                                      onChange={(e) => {
                                        setUnitUpload(unit.id, "floorPlan", e.target.files);
                                        e.target.value = "";
                                      }}
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => removeUnitMedia(unit.id, "floorPlan")}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label
                                style={{
                                  height: 72,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: 10,
                                  border: "1px dashed rgba(148,163,184,0.4)",
                                  cursor: "pointer",
                                  color: "var(--faint, #64748b)",
                                }}
                              >
                                📐 Upload floor plan
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    setUnitUpload(unit.id, "floorPlan", e.target.files);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            )}
                          </div>

                          <div className="field">
                            <label>Video</label>
                            {unit.video ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <video src={unit.video} controls style={{ width: "100%", height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(148,163,184,0.25)", background: "#000" }} />
                                <div style={{ display: "flex", gap: 6 }}>
                                  <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>
                                    Replace
                                    <input
                                      type="file"
                                      accept="video/*"
                                      style={{ display: "none" }}
                                      onChange={(e) => {
                                        setUnitUpload(unit.id, "video", e.target.files);
                                        e.target.value = "";
                                      }}
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => removeUnitMedia(unit.id, "video")}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label
                                style={{
                                  height: 72,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: 10,
                                  border: "1px dashed rgba(148,163,184,0.4)",
                                  cursor: "pointer",
                                  color: "var(--faint, #64748b)",
                                }}
                              >
                                🎬 Upload video
                                <input
                                  type="file"
                                  accept="video/*"
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    setUnitUpload(unit.id, "video", e.target.files);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            )}
                          </div>

                          <div className="field">
                            <label>Brochure PDF</label>
                            {unit.brochure ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <a
                                  href={unit.brochure}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    height: 72,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderRadius: 8,
                                    border: "1px solid rgba(148,163,184,0.25)",
                                    background: "rgba(109, 40, 217, 0.05)",
                                    color: "var(--brand, #6d28d9)",
                                    fontWeight: 600,
                                  }}
                                >
                                  View brochure
                                </a>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>
                                    Replace
                                    <input
                                      type="file"
                                      accept="application/pdf,image/*"
                                      style={{ display: "none" }}
                                      onChange={(e) => {
                                        setUnitUpload(unit.id, "brochure", e.target.files);
                                        e.target.value = "";
                                      }}
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => removeUnitMedia(unit.id, "brochure")}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label
                                style={{
                                  height: 72,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: 10,
                                  border: "1px dashed rgba(148,163,184,0.4)",
                                  cursor: "pointer",
                                  color: "var(--faint, #64748b)",
                                }}
                              >
                                📄 Upload brochure
                                <input
                                  type="file"
                                  accept="application/pdf,image/*"
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    setUnitUpload(unit.id, "brochure", e.target.files);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 18 }}>
                <SectionLabel>Amenities</SectionLabel>
                {amenities.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {amenities.map((item) => (
                      <span
                        key={item.name}
                        className="chip"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "rgba(109, 40, 217, 0.06)",
                          borderColor: "rgba(109, 40, 217, 0.2)",
                          color: "var(--brand, #6d28d9)",
                        }}
                      >
                        {item.icon ? (
                          /* eslint-disable-next-line @next/next/no-img-element -- local data URL upload */
                          <img
                            src={item.icon}
                            alt=""
                            width={14}
                            height={14}
                            style={{ borderRadius: 4, objectFit: "cover" }}
                          />
                        ) : null}
                        {item.name}
                        <label title="Upload icon" style={{ cursor: "pointer", display: "inline-flex" }}>
                          🖼
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              setAmenityIcon(item.name, e.target.files?.[0] ?? null);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          aria-label={`Remove ${item.name}`}
                          onClick={() => removeAmenity(item.name)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "inherit",
                            cursor: "pointer",
                            fontWeight: 700,
                            padding: 0,
                            lineHeight: 1,
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="muted" style={{ fontSize: 13 }}>
                    No amenities selected yet — pick from the quick list or add your own.
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <input
                    className="inp"
                    placeholder="Custom amenity — e.g. Tennis court"
                    value={amenityDraft}
                    onChange={(e) => setAmenityDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addAmenity();
                      }
                    }}
                  />
                  <button className="btn btn-ghost" type="button" onClick={addAmenity}>
                    ＋ Add
                  </button>
                </div>

                <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                  Quick add:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                  {AMENITY_OPTIONS.filter(
                    (option) => !amenities.some((item) => item.name === option.name),
                  ).map((option) => (
                    <button
                      key={option.name}
                      type="button"
                      className="chip"
                      style={{ cursor: "pointer" }}
                      onClick={() => setAmenities((prev) => [...prev, option])}
                    >
                      ＋ {option.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <aside
              style={{
                position: "sticky",
                top: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{
                  border: "1px solid rgba(109, 40, 217, 0.14)",
                  borderRadius: 18,
                  padding: 18,
                  background: "linear-gradient(180deg, rgba(109,40,217,0.08), rgba(219,39,119,0.04))",
                  boxShadow: "0 16px 32px rgba(89, 28, 116, 0.06)",
                }}
              >
                <div
                  className="eyebrow"
                  style={{ marginBottom: 8, fontSize: 11, letterSpacing: "0.08em" }}
                >
                  Project snapshot
                </div>
                <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.2, color: "var(--fg)" }}>
                  Untitled project
                </h3>
                <div className="muted" style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5 }}>
                  Location not added yet
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  <span className="chip" style={{ borderColor: "var(--line)" }}>
                    Active
                  </span>
                  <span className="chip" style={{ borderColor: "var(--line)" }}>
                    No configs yet
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 10,
                    marginTop: 16,
                  }}
                >
                  <div>
                    <div className="muted" style={{ fontSize: 11, textTransform: "uppercase" }}>
                      Manager
                    </div>
                    <div style={{ marginTop: 4, fontWeight: 600 }}>Unassigned</div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 11, textTransform: "uppercase" }}>
                      Units
                    </div>
                    <div style={{ marginTop: 4, fontWeight: 600 }}>0</div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 11, textTransform: "uppercase" }}>
                      Price from
                    </div>
                    <div style={{ marginTop: 4, fontWeight: 600 }}>—</div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 11, textTransform: "uppercase" }}>
                      Available
                    </div>
                    <div style={{ marginTop: 4, fontWeight: 600 }}>0</div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  borderRadius: 18,
                  padding: 18,
                  background: "rgba(15, 23, 42, 0.02)",
                }}
              >
                <div
                  className="muted"
                  style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}
                >
                  Quick checklist
                </div>
                <ul
                  style={{
                    margin: "10px 0 0",
                    paddingLeft: 18,
                    display: "grid",
                    gap: 8,
                    color: "var(--fg)",
                  }}
                >
                  <li>• Add project name</li>
                  <li>• Add location</li>
                  <li>• Assign manager</li>
                  <li>• Add at least one unit</li>
                </ul>
              </div>
            </aside>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              marginTop: 18,
              paddingTop: 18,
              borderTop: "1px solid rgba(148, 163, 184, 0.18)",
            }}
          >
            <span className="muted" style={{ fontSize: 12.5 }}>
              Configurations & inventory roll up from unit types automatically.
            </span>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button className="btn btn-ghost" type="button" onClick={() => router.push("/org/projects")}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => router.push("/org/projects")}
                style={{
                  background: "linear-gradient(135deg,#6d28d9,#db2777)",
                  border: "none",
                  boxShadow: "0 12px 24px rgba(109, 40, 217, 0.25)",
                }}
              >
                Create project
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="muted"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 11.5,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        margin: "18px 0 12px",
        color: "var(--muted, #64748b)",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: "linear-gradient(135deg, #6d28d9, #db2777)",
          boxShadow: "0 0 0 4px rgba(109, 40, 217, 0.12)",
        }}
      />
      {children}
    </div>
  );
}
