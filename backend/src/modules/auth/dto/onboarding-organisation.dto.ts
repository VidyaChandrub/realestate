import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const INDUSTRIES = ['developer', 'broker', 'channel', 'mixed'] as const;
const TEAM_SIZES = ['Just me', '2–10', '11–50', '50+'] as const;

// Signup wizard — Step 2 (Organisation). Creates the Organisation itself;
// the caller is authenticated (JwtAuthGuard only — no orgId on the token
// yet, so OrgAdminGuard can't be used here).
export class OnboardingOrganisationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  company_name: string;

  // "What describes you best?" — previously collected in the wizard UI and
  // discarded, never persisted. Same fixed set as Org Settings → General's
  // Industry field (Organisation.industry).
  @IsOptional()
  @IsIn(INDUSTRIES)
  industry?: (typeof INDUSTRIES)[number];

  @IsOptional()
  @IsIn(TEAM_SIZES)
  teamSize?: (typeof TEAM_SIZES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(63)
  subdomain?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(253)
  custom_domain?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}
