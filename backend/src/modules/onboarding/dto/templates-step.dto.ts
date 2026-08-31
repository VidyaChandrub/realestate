import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

// Signup wizard — Step 6 (Templates, mandatory). Replaces the org's
// template assignments wholesale — see OnboardingService.saveTemplates.
export class TemplatesStepDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  templateIds: string[];
}
