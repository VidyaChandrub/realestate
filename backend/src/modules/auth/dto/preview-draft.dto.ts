import { IsNotEmpty, IsString } from 'class-validator';

// "Continue previous setup" — fetches the untouched draft the Step 1
// collision matched (by id, since the match may have been on phone number
// with a brand-new email typed this time — there's no guaranteed email to
// look it up by). Never writes anything; same no-password read trade-off as
// ResumeSignupDto, see AuthService.resumeSignup. The frontend prefills Step
// 1 with whatever this returns so the person can review/edit before
// continuing, rather than jumping straight past it.
export class PreviewDraftDto {
  @IsString()
  @IsNotEmpty()
  existingUserId: string;
}
