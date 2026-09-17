import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Step 1 fields (freshly typed on a retry) plus which existing draft the
// user chose to resume or restart — used by the "you already started this"
// popup, see AuthService.resumeExistingDraft / restartExistingDraft.
export class ResolveDraftDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name: string;

  @IsEmail()
  work_email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone_number: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country: string;

  @IsString()
  @IsNotEmpty()
  existingUserId: string;
}
