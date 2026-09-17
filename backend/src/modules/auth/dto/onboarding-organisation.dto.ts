import { Equals, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const INDUSTRIES = ['developer', 'broker', 'channel', 'mixed'] as const;
const TEAM_SIZES = ['Just me', '2–10', '11–50', '50+'] as const;

// Signup wizard — Step 2 (Organisation), now the FINAL step of the
// simplified 2-step wizard. Creates the Organisation itself; the caller is
// authenticated (JwtAuthGuard only — no orgId on the token yet, so
// OrgAdminGuard can't be used here).
//
// Deliberately no `subdomain` field — the simplified onboarding UI doesn't
// show one, and every organisation gets a unique auto-generated one instead
// (see AuthService.createOrganisationStep). Removed here rather than just
// dropped by the frontend so a direct API call can't set a custom one
// either — server-side enforcement for what the UI no longer offers.
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

  // Moved here from the removed Business Details step.
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  // Terms of Service & Privacy Policy — moved here from the removed
  // Templates step. Must be explicitly `true`; recorded as
  // User.termsAcceptedAt.
  @Equals(true, { message: 'You must agree to the Terms of Service & Privacy Policy.' })
  agreedToTerms: boolean;

  // Never shown by the wizard UI (no custom-domain input exists there) —
  // left available for other callers of this DTO shape, unrelated to the
  // subdomain removal above.
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
