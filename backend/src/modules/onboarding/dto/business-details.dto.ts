import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

// Signup wizard — Step 3 (Business Details). The org already exists by
// this point (created at Step 2), so this is a normal PATCH.
export class BusinessDetailsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reraLicenseNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  gstin?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'brandColour must be a hex colour like #4f46e5',
  })
  brandColour?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;
}
