"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { youtubeEmbedUrl } from "@/lib/upload";
import { Reveal } from "@/components/superadmin/reveal";
import { ProjectPageHead } from "@/components/org/project-tabs";
import type { ProjectDetail } from "@/lib/types";

function compactRupees(value: number | null): string {
  if (value == null) return "—";
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(2).replace(/\.?0+$/, "")} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

/** A floor-plan / cover tile: the real image if one is uploaded, else the
 *  striped 📐 placeholder (matches the design reference).
 *
 *  `openMode="window"` renders a non-anchor clickable (opens via
 *  window.open + stopPropagation) — use it when the tile sits inside a
 *  <Link>, since <a> inside <a> is invalid HTML / hydration error. */
function MediaTile({
  url,
  caption,
  height = 150,
  topOnly = false,
  openMode = "anchor",
}: {
  url: string | null;
  caption?: string;
  height?: number;
  topOnly?: boolean;
  openMode?: "anchor" | "window";
}) {
  const radius = topOnly ? ("14px 14px 0 0" as const) : 14;

  if (!url) {
    return (
      <div className="media plan" style={{ height, borderRadius: radius }}>
        <span>📐</span>
        {caption ? <span className="cap">{caption}</span> : null}
      </div>
    );
  }

  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={caption ?? ""}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      {caption ? <span className="cap">{caption}</span> : null}
    </>
  );

  const style = {
    height,
    borderRadius: radius,
    textDecoration: "none",
    cursor: "pointer",
  } as const;

  if (openMode === "window") {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={caption ? `Open ${caption}` : "Open media"}
        className="media"
        style={style}
        onClick={(e) => {
          e.stopPropagation();
          openInNewTab(url);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            openInNewTab(url);
          }
        }}
      >
        {inner}
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="media"
      style={style}
    >
      {inner}
    </a>
  );
}

/** Walkthrough video tile — YouTube embed or an HTML5 player for uploads.
 *  Same `.media` card treatment as the image tiles. */
function VideoTile({ url, caption }: { url: string; caption?: string }) {
  const embed = youtubeEmbedUrl(url);
  return (
    <div
      className="media"
      style={{ height: 190, borderRadius: 14, background: "#000" }}
    >
      {embed ? (
        <iframe
          src={embed}
          title={caption ?? "Walkthrough video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
        />
      ) : (
        <video
          src={url}
          controls
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
        />
      )}
      {caption ? <span className="cap">{caption}</span> : null}
    </div>
  );
}

export default function OrgProjectOverviewPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { accessToken } = useAuth();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!accessToken || !id) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setNotFound(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    apiFetch<ProjectDetail>(`/org/projects/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(setProject)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [accessToken, id]);

  if (notFound) {
    return (
      <>
        <ProjectPageHead active="overview" />
        <div className="card">
          <div className="card-b">
            <p className="muted">Project not found.</p>
            <Link href="/org/projects" className="btn btn-ghost btn-sm">
              ← Back to projects
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (loading || !project) {
    return (
      <>
        <ProjectPageHead active="overview" />
        <div className="card">
          <div className="card-b">
            <p className="muted">Loading…</p>
          </div>
        </div>
      </>
    );
  }

  const priceRange =
    project.priceMin != null || project.priceMax != null
      ? `${compactRupees(project.priceMin)} – ${compactRupees(project.priceMax)}`
      : "—";

  const configuration =
    project.unitTypes.length > 0
      ? project.unitTypes.map((u) => u.name).join(", ")
      : "—";

  const galleryImages = project.unitTypes.flatMap((u) => u.galleryUrls ?? []);
  const hasFloorPlans = project.unitTypes.some((u) => u.floorPlanUrl);
  const videoTypes = project.unitTypes.filter((u) => u.videoUrl);

  const specs: { k: string; v: string; mono?: boolean }[] = [
    { k: "Location", v: project.location || "—" },
    { k: "Configuration", v: configuration },
    { k: "Price range", v: priceRange },
    { k: "Base rate", v: project.baseRate != null ? `₹${project.baseRate.toLocaleString("en-IN")}/sqft` : "—" },
    { k: "Land area", v: project.landArea != null ? `${project.landArea} acres` : "—" },
    {
      k: "Towers",
      v: [
        project.towerCount != null ? `${project.towerCount} towers` : null,
        project.floorsDescription || null,
      ]
        .filter(Boolean)
        .join(" · ") || "—",
    },
    { k: "Units planned", v: String(project.rollup.totalUnitsPlanned) },
    { k: "Units available", v: `${project.rollup.unitsAvailable} of ${project.rollup.unitsCreated}` },
    { k: "Possession", v: project.possession || "—" },
    { k: "RERA", v: project.reraId || "—", mono: true },
  ];

  return (
    <>
      <ProjectPageHead
        active="overview"
        project={{
          name: project.name,
          status: project.status,
          location: project.location,
          reraId: project.reraId,
          manager: project.manager?.name ?? null,
        }}
        actions={
          <>
            {/* Inert for now — public project pages aren't built yet. */}
            <button className="btn btn-ghost" type="button">
              🔗 Public page
            </button>
            <Link
              href={`/org/projects/${id}/units`}
              className="btn btn-ghost"
            >
              📦 Manage inventory
            </Link>
            <Link
              href={`/org/projects/${id}/edit`}
              className="btn btn-primary"
            >
              ✏️ Edit project
            </Link>
          </>
        }
      />

      <div className="grid g-2-1">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Reveal delay={2}>
            <div className="card">
              <div className="card-h">
                <span className="t">Project details</span>
                <span
                  className={`badge ${project.status === "active" ? "b-green" : "b-gray"}`}
                >
                  {project.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="card-b">
                <div className="spec-grid">
                  {specs.map((s) => (
                    <div className="sp" key={s.k}>
                      <div className="k">{s.k}</div>
                      <div className={`v${s.mono ? " mono" : ""}`}>{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={3}>
            <div className="card">
              <div className="card-h">
                <span className="t">Unit types</span>
                <Link
                  className="x"
                  href={`/org/projects/${id}/units`}
                  style={{ color: "var(--brand)" }}
                >
                  Manage inventory →
                </Link>
              </div>
              <div className="card-b">
                {project.unitTypes.length === 0 ? (
                  <p className="muted">
                    No unit types yet — add them from the Units tab.
                  </p>
                ) : (
                  <div className="grid g3">
                    {project.unitTypes.map((u) => (
                      <Link
                        key={u.id}
                        href={`/org/projects/${id}/units`}
                        className="card hover"
                        style={{ textDecoration: "none" }}
                      >
                        <MediaTile
                          url={u.floorPlanUrl}
                          caption={u.name}
                          height={120}
                          topOnly
                          openMode="window"
                        />
                        <div style={{ padding: 14 }}>
                          <b>{u.name}</b>
                          <div className="muted" style={{ fontSize: 12.5 }}>
                            {[
                              u.builtupSqft ? `${u.builtupSqft} sqft` : null,
                              u.price != null ? compactRupees(u.price) : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </div>
                          <span
                            className={`badge ${u.availableUnits > 0 ? "b-green" : "b-amber"}`}
                            style={{ marginTop: 8 }}
                          >
                            {u.availableUnits} available
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Reveal>

          <Reveal delay={3}>
            <div className="card">
              <div className="card-h">
                <span className="t">Amenities</span>
              </div>
              <div
                className="card-b"
                style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
              >
                {project.amenities.length === 0 ? (
                  <span className="muted">None added.</span>
                ) : (
                  project.amenities.map((a) => (
                    <span
                      className="chip"
                      key={a.name}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      {a.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.iconUrl}
                          alt=""
                          width={16}
                          height={16}
                          style={{ borderRadius: 3, objectFit: "cover" }}
                        />
                      ) : null}
                      {a.name}
                    </span>
                  ))
                )}
              </div>
            </div>
          </Reveal>

          {project.unitTypes.length > 0 && hasFloorPlans ? (
            <Reveal delay={3}>
              <div className="card">
                <div className="card-h">
                  <span className="t">Floor plans</span>
                </div>
                <div className="card-b">
                  <div className="grid g3">
                    {project.unitTypes.map((u) => (
                      <MediaTile
                        key={u.id}
                        url={u.floorPlanUrl}
                        caption={u.name}
                        height={170}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          ) : null}

          {videoTypes.length > 0 ? (
            <Reveal delay={3}>
              <div className="card">
                <div className="card-h">
                  <span className="t">Walkthrough videos</span>
                </div>
                <div className="card-b">
                  <div className="grid g2">
                    {videoTypes.map((u) => (
                      <VideoTile
                        key={u.id}
                        url={u.videoUrl as string}
                        caption={u.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          ) : null}

          {galleryImages.length > 0 ? (
            <Reveal delay={3}>
              <div className="card">
                <div className="card-h">
                  <span className="t">Gallery</span>
                  <span className="x muted">{galleryImages.length} images</span>
                </div>
                <div className="card-b">
                  <div className="gallery">
                    {galleryImages.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="thumb"
                        style={{ display: "block" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Reveal delay={2}>
            <div className="card">
              <div className="card-h">
                <span className="t">Inventory</span>
              </div>
              <div
                className="card-b"
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="muted">Units created</span>
                  <b>{project.rollup.unitsCreated}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="muted">Available</span>
                  <b>{project.rollup.unitsAvailable}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="muted">Booked</span>
                  <b>{project.rollup.unitsBooked}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="muted">Held</span>
                  <b>{project.rollup.unitsHeld}</b>
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={3}>
            <div className="card">
              <div className="card-h">
                <span className="t">Manager</span>
              </div>
              <div className="card-b">
                <b>{project.manager?.name || "Unassigned"}</b>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </>
  );
}
