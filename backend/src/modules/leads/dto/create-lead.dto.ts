import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateLeadDto {
  /** Landing page the form belongs to — used to resolve orgId on a public POST. */
  @IsOptional()
  @IsString()
  landingPageId?: string;

  @IsOptional()
  @IsString()
  formName?: string;

  @IsOptional()
  @IsString()
  source?: string;

  /** Free-form field values captured by the form (label/key -> value). */
  @IsObject()
  data: Record<string, unknown>;
}
