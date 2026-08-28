import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  CreateUploadUrlInput,
  CreateUploadUrlResult,
  FIELD_RULES,
  UploadField,
} from './storage.types';

// Presigned PUT URLs are valid for 10 minutes — long enough for a slow
// mobile upload, short enough that a leaked URL is near-useless.
const PRESIGN_TTL_SECONDS = 10 * 60;

/**
 * Generic object-storage helper for the whole backend (Cloudflare R2, which
 * is S3-compatible). Only wired into Projects for now, but any module can
 * `imports: [StorageModule]` and call this — see storage.types.ts to add a
 * new field rule.
 *
 * The bucket is public-read: everything issued here is a marketing asset
 * (icons, floor plans, brochures, walkthrough videos) meant to be visible
 * on public landing pages. No PII, documents, or user data goes in it. The
 * protection that matters is WRITE scoping — every key is prefixed with the
 * caller's own orgId, taken from the JWT, never from the request body.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private client: S3Client | null = null;

  private env() {
    const {
      R2_ENDPOINT,
      R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY,
      R2_BUCKET_NAME,
      R2_PUBLIC_URL,
    } = process.env;
    if (
      !R2_ENDPOINT ||
      !R2_ACCESS_KEY_ID ||
      !R2_SECRET_ACCESS_KEY ||
      !R2_BUCKET_NAME ||
      !R2_PUBLIC_URL
    ) {
      this.logger.error(
        'R2 storage is not configured — set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME and R2_PUBLIC_URL in the environment.',
      );
      throw new ServiceUnavailableException(
        'File uploads are not configured on this server yet.',
      );
    }
    return {
      // Full S3-API endpoint URL. For Cloudflare R2 this is
      // https://<account-id>.r2.cloudflarestorage.com — but keeping it as
      // one var means pointing at MinIO / Backblaze / another provider is a
      // pure config change.
      endpoint: R2_ENDPOINT.replace(/\/+$/, ''),
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      bucket: R2_BUCKET_NAME,
      // No trailing slash — we join with `/${key}` below.
      publicUrl: R2_PUBLIC_URL.replace(/\/+$/, ''),
    };
  }

  private s3(): S3Client {
    if (this.client) return this.client;
    const { endpoint, accessKeyId, secretAccessKey } = this.env();
    this.client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      // Newer AWS SDKs default to adding an `x-amz-checksum-crc32` to every
      // request. For a *presigned* PUT that checksum is baked in at signing
      // time against an empty body, so the real browser upload then fails a
      // checksum check on R2. Only send checksums when the operation
      // actually requires one.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
    return this.client;
  }

  /** True when all five R2_* vars are present — lets callers 501 cleanly. */
  isConfigured(): boolean {
    return Boolean(
      process.env.R2_ENDPOINT &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_BUCKET_NAME &&
        process.env.R2_PUBLIC_URL,
    );
  }

  async createUploadUrl(
    input: CreateUploadUrlInput,
  ): Promise<CreateUploadUrlResult> {
    const rule = FIELD_RULES[input.field];
    if (!rule) {
      throw new BadRequestException(`Unknown upload field "${input.field}".`);
    }

    // --- validate BEFORE signing anything ---
    const contentType = (input.contentType || '').toLowerCase().trim();
    if (!rule.mimeTypes.includes(contentType)) {
      throw new BadRequestException(
        `A ${rule.label} must be one of: ${rule.mimeTypes.join(', ')}.`,
      );
    }
    if (!Number.isFinite(input.size) || input.size <= 0) {
      throw new BadRequestException('A valid file size is required.');
    }
    if (input.size > rule.maxBytes) {
      throw new BadRequestException(
        `That ${rule.label} is too large — the limit is ${formatMb(rule.maxBytes)}.`,
      );
    }

    const { bucket, publicUrl } = this.env();
    const key = this.buildKey(input);

    const uploadUrl = await getSignedUrl(
      this.s3(),
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: PRESIGN_TTL_SECONDS },
    );

    return {
      uploadUrl,
      publicUrl: `${publicUrl}/${key}`,
      key,
      expiresIn: PRESIGN_TTL_SECONDS,
    };
  }

  // Key layout is decided here, server-side. Everything org-scoped lives
  // under a single top-level `org/` prefix (leaving room for a future
  // `public/` or `system/` prefix). The orgId segment is the caller's own
  // (from the JWT) so no org can ever get a URL that writes into another
  // org's prefix.
  private buildKey(input: CreateUploadUrlInput): string {
    const safeName = sanitizeFilename(input.filename);
    const unique = `${randomUUID()}-${safeName}`;
    const parts = ['org', input.orgId];

    if (input.projectId) {
      parts.push('projects', input.projectId);
      if (input.unitTypeId) {
        parts.push('unit-types', input.unitTypeId);
      } else if (input.field === 'amenityIcon') {
        parts.push('amenities');
      } else {
        // Unit-type media uploaded from the "new unit type" form, before
        // the row exists — reparenting isn't worth it, the file is small.
        parts.push('unit-types', '_pending');
      }
    } else {
      parts.push('_unscoped');
    }
    parts.push(input.field, unique);
    return parts.join('/');
  }
}

function formatMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${Math.round(mb)} MB` : `${Math.round(bytes / 1024)} KB`;
}

function sanitizeFilename(name: string): string {
  const base = (name || 'file').split(/[\\/]/).pop() || 'file';
  const cleaned = base
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 100);
  return cleaned || 'file';
}
