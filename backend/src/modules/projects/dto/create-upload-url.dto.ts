import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { UPLOAD_FIELDS } from '../../../common/storage/storage.types';
import type { UploadField } from '../../../common/storage/storage.types';

export class CreateUploadUrlDto {
  @IsIn(UPLOAD_FIELDS as unknown as string[])
  field: UploadField;

  @IsString()
  @MaxLength(255)
  filename: string;

  @IsString()
  @MaxLength(255)
  contentType: string;

  // Byte size of the file the client is about to upload — checked against
  // the per-field cap before any URL is signed.
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size: number;

  // Optional scoping context — only used to build a tidy key path. orgId is
  // NEVER taken from here; it comes from the JWT.
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  unitTypeId?: string;
}
