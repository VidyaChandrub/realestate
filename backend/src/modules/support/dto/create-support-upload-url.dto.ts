import { Type } from 'class-transformer';
import { IsInt, IsString, Min, MaxLength } from 'class-validator';

// Support attachments carry no project/unit context — always land in the
// caller's org's "_unscoped" prefix (see StorageService.buildKey).
export class CreateSupportUploadUrlDto {
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
