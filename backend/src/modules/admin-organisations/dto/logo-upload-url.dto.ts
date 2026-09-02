import { Type } from 'class-transformer';
import { IsInt, IsString, MaxLength, Min } from 'class-validator';

// Body for POST /admin/organisations/:id/logo-upload-url. Returns a
// short-lived presigned PUT URL so the Super Admin org-detail edit form
// uploads a logo straight to R2, then stores the resulting public URL in
// the organisation's logoUrl. Field is always 'logo'; MIME/size are
// validated server-side by StorageService.
export class LogoUploadUrlDto {
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
