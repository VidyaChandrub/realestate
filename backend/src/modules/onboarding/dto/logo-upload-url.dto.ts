import { IsNumber, IsPositive, IsString, MaxLength } from 'class-validator';

// Signup wizard — Business Details step logo upload. Field is always
// 'logo' (not client-chosen), so it isn't part of this DTO.
export class LogoUploadUrlDto {
  @IsString()
  @MaxLength(255)
  filename: string;

  @IsString()
  @MaxLength(100)
  contentType: string;

  @IsNumber()
  @IsPositive()
  size: number;
}
