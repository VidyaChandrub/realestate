import { IsObject, IsOptional, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateTypographySetDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsObject()
  tokens?: Record<string, unknown>;
}
