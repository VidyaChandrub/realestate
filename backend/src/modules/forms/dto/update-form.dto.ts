import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFormDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}