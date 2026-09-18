import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { UploadField, UPLOAD_FIELDS } from '../../../common/storage/storage.types';

export class CreateMediaUploadUrlDto {
  @IsEnum(UPLOAD_FIELDS)
  field: string = 'media';

  @IsString()
  @IsNotEmpty()
  filename!: string;

  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @IsNumber()
  @Min(1)
  size!: number;

  @IsString()
  @IsOptional()
  folder?: string;

  @IsString()
  @IsOptional()
  category?: string;
}
