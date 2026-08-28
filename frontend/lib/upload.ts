import { apiFetch } from "./api";

export type UploadField =
  | "amenityIcon"
  | "floorPlan"
  | "gallery"
  | "brochure"
  | "video";

interface FieldRule {
  /** `accept` attribute value for the <input type="file">. */
  accept: string;
  /** MIME allow-list, mirrors the backend (which is authoritative). */
  mimes: string[];
  maxBytes: number;
  label: string;
}

const MB = 1024 * 1024;
const IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export const UPLOAD_RULES: Record<UploadField, FieldRule> = {
  amenityIcon: {
    accept: "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.ico",
    mimes: [...IMAGE_MIMES, "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"],
    maxBytes: 512 * 1024,
    label: "amenity icon",
  },
  floorPlan: {
    accept: "image/png,image/jpeg,image/webp,image/gif",
    mimes: IMAGE_MIMES,
    maxBytes: 5 * MB,
    label: "floor plan",
  },
  gallery: {
    accept: "image/png,image/jpeg,image/webp,image/gif",
    mimes: IMAGE_MIMES,
    maxBytes: 5 * MB,
    label: "image",
  },
  brochure: {
    accept: "application/pdf",
    mimes: ["application/pdf"],
    maxBytes: 15 * MB,
    label: "brochure",
  },
  video: {
    accept: "video/mp4,video/webm,video/quicktime",
    mimes: ["video/mp4", "video/webm", "video/quicktime"],
    maxBytes: 100 * MB,
    label: "video",
  },
};

function humanSize(bytes: number): string {
  const mb = bytes / MB;
  return mb >= 1 ? `${Math.round(mb)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/** Client-side pre-check for fast feedback. Returns an error string, or null. */
export function checkFile(field: UploadField, file: File): string | null {
  const rule = UPLOAD_RULES[field];
  if (file.type && !rule.mimes.includes(file.type.toLowerCase())) {
    return `That ${rule.label} must be a ${rule.accept.replace(/,/g, ", ")} file.`;
  }
  if (file.size > rule.maxBytes) {
    return `That ${rule.label} is too large — the limit is ${humanSize(rule.maxBytes)}.`;
  }
  return null;
}

/** If `url` is any recognisable YouTube link, return its /embed/ URL. */
export function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id = "";
    if (host === "youtu.be") {
      id = u.pathname.slice(1);
    } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v") ?? "";
      else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2] ?? "";
      else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2] ?? "";
      else if (u.pathname.startsWith("/live/")) id = u.pathname.split("/")[2] ?? "";
    }
    id = id.split(/[?&/]/)[0];
    return /^[\w-]{11}$/.test(id)
      ? `https://www.youtube.com/embed/${id}`
      : null;
  } catch {
    return null;
  }
}

interface UploadUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}

/**
 * Full upload flow: ask the API for a short-lived presigned PUT URL, upload
 * the file bytes directly to R2 (never through our API), return the stable
 * public URL to store as the field value.
 */
export async function uploadFile(
  file: File,
  opts: { field: UploadField; projectId?: string; unitTypeId?: string },
): Promise<string> {
  const pre = checkFile(opts.field, file);
  if (pre) throw new Error(pre);

  const { uploadUrl, publicUrl } = await apiFetch<UploadUrlResponse>(
    "/org/projects/upload-url",
    {
      method: "POST",
      body: JSON.stringify({
        field: opts.field,
        filename: file.name,
        contentType: file.type,
        size: file.size,
        projectId: opts.projectId,
        unitTypeId: opts.unitTypeId,
      }),
    },
  );

  const put = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!put.ok) {
    throw new Error(`Upload to storage failed (${put.status}).`);
  }
  return publicUrl;
}
