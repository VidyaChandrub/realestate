import { ArrayUnique, IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

// Signup wizard — Step 4 (Modules, skippable). Informational only — no
// enforcement reads Organisation.enabledModules yet (out of scope).
// Submit with enabledModules to save a selection, or skip:true to
// advance past this step without touching the org's saved list.
export class ModulesStepDto {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  enabledModules?: string[];

  @IsOptional()
  @IsBoolean()
  skip?: boolean;
}
