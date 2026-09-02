import { Type } from 'class-transformer';
import { IsInt, IsString, MaxLength, Min } from 'class-validator';

// Body for POST /org/settings/logo-upload-url and .../favicon-upload-url.
// Returns a short-lived presigned PUT URL so the Org Admin branding form
// uploads straight to R2, then stores the public URL via PATCH /org/settings.
// Field ('logo' | 'favicon') comes from the route, never the body; the key
// is scoped to the caller's own org (JWT), never a client value.
export class AssetUploadUrlDto {
  @IsString()
  @MaxLength(255)
  filename: string;

  @IsString()
  @MaxLength(100)
  contentType: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  size: number;
}
