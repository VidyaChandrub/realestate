import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { LandingPageCategory } from '@prisma/client';

export class UpdateLandingPageDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsIn(Object.values(LandingPageCategory))
  category?: LandingPageCategory;

  @IsOptional()
  @IsString()
  thumbnail?: string;
}
