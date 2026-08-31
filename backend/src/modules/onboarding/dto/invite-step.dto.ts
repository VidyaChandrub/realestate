import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const INVITE_ROLES = ['manager', 'sales'] as const;

// Email + role only — the invited person supplies their own name later
// (see provisionInvitedUser / Issue 2 investigation: there's currently no
// first-login profile step for that; recommended separately, not built
// here).
class InviteEntryDto {
  @IsEmail()
  email: string;

  @IsIn(INVITE_ROLES)
  role: (typeof INVITE_ROLES)[number];
}

// Signup wizard — Step 7 (Invite team, skippable). Each entry fires
// TeamService.invite() immediately — see OnboardingService.sendInvites for
// why a per-entry failure doesn't block the others or onboarding progress.
export class InviteStepDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => InviteEntryDto)
  invites: InviteEntryDto[];
}
