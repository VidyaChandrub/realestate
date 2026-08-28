// Field types the storage service knows how to validate + place. Adding a
// new one here (with a rule below) is all another module needs to reuse
// this service for its own media.
export type UploadField =
  | 'amenityIcon'
  | 'floorPlan'
  | 'gallery'
  | 'brochure'
  | 'video';

export const UPLOAD_FIELDS: readonly UploadField[] = [
  'amenityIcon',
  'floorPlan',
  'gallery',
  'brochure',
  'video',
] as const;

export interface FieldRule {
  /** Allowed MIME types (exact match, lower-cased). */
  mimeTypes: readonly string[];
  /** Hard upper bound in bytes, enforced before a URL is ever signed. */
  maxBytes: number;
  /** Human label for error messages. */
  label: string;
}

const MB = 1024 * 1024;

const IMAGE_MIMES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

export const FIELD_RULES: Record<UploadField, FieldRule> = {
  amenityIcon: {
    mimeTypes: [...IMAGE_MIMES, 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'],
    maxBytes: 512 * 1024,
    label: 'amenity icon',
  },
  floorPlan: {
    mimeTypes: IMAGE_MIMES,
    maxBytes: 5 * MB,
    label: 'floor plan',
  },
  gallery: {
    mimeTypes: IMAGE_MIMES,
    maxBytes: 5 * MB,
    label: 'gallery image',
  },
  brochure: {
    mimeTypes: ['application/pdf'],
    maxBytes: 15 * MB,
    label: 'brochure',
  },
  video: {
    mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    maxBytes: 100 * MB,
    label: 'video',
  },
};

export interface CreateUploadUrlInput {
  /** Always the caller's own org (from the JWT) — never client-supplied. */
  orgId: string;
  field: UploadField;
  filename: string;
  contentType: string;
  size: number;
  /** Optional scoping context — used only to build a tidy key path. */
  projectId?: string;
  unitTypeId?: string;
}

export interface CreateUploadUrlResult {
  /** Short-lived presigned PUT URL — browser uploads the bytes directly. */
  uploadUrl: string;
  /** Stable public URL to store as the field value once the PUT succeeds. */
  publicUrl: string;
  /** The object key (for debugging / future cleanup tooling). */
  key: string;
  /** Seconds until `uploadUrl` expires. */
  expiresIn: number;
}
