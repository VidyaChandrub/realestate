import { IsEmail } from 'class-validator';

// No password — deliberate simplification, see AuthService.resumeSignup.
// This is not a login variant: it only ever re-admits a caller to their
// own still-in-progress signup, never a completed/live account.
export class ResumeSignupDto {
  @IsEmail()
  email: string;
}
