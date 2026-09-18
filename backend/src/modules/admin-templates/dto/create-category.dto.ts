import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { TEMPLATE_TIER_VALUES, type TemplateTierValue } from './create-template.dto';

export class CreateTemplateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsIn(TEMPLATE_TIER_VALUES)
  tier?: TemplateTierValue;
}
