import { IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator';

// One amenity chip on a project. `iconUrl` is accepted for forward
// compatibility but the frontend always sends null — amenity-icon upload is
// out of scope (blocked on the S3/object-storage decision).
export class AmenityDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUrl({ require_tld: false })
  iconUrl?: string | null;
}
