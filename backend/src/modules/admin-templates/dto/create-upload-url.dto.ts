import { Type } from 'class-transformer';
import { IsInt, IsString, MaxLength, Min } from 'class-validator';

// Body for POST /admin/templates/:id/upload-url. Returns a short-lived
// presigned PUT URL so the builder uploads an image straight to R2 and
// stores the resulting URL in `content` (instead of a base64 data URI).
// The field is always `builderImage`; MIME/size are validated server-side.
export class CreateUploadUrlDto {
  @IsString()
  @MaxLength(255)
  filename: string;

  @IsString()
  @MaxLength(255)
  contentType: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  size: number;
}
