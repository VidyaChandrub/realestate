import { IsNotEmpty, IsString } from 'class-validator';
import { OnboardingAccountDto } from './onboarding-account.dto';

// Step 1 fields (freshly typed on a retry) plus which existing draft the
// user chose to resume or restart — used by the "you already started this"
// popup, see AuthService.resumeExistingDraft / restartExistingDraft.
export class ResolveDraftDto extends OnboardingAccountDto {
  @IsString()
  @IsNotEmpty()
  existingUserId: string;
}
