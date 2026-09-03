import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Email + role only — the invited person supplies their own name later
class InviteEntryDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  role: string;
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
