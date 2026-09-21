import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { TemplateContentDto } from './template-content.dto';

export const TEMPLATE_STATUS_VALUES = [
  'draft',
  'published',
  'scheduled',
  'password',
  'unpublished',
] as const;
export type TemplateStatusValue = (typeof TEMPLATE_STATUS_VALUES)[number];

export const TEMPLATE_KIND_VALUES = ['preset', 'custom'] as const;
export type TemplateKindValue = (typeof TEMPLATE_KIND_VALUES)[number];

export const TEMPLATE_PAGE_TYPE_VALUES = ['landing', 'thank-you'] as const;
export type TemplatePageTypeValue = (typeof TEMPLATE_PAGE_TYPE_VALUES)[number];

export const TEMPLATE_TIER_VALUES = ['free', 'paid', 'premium'] as const;
export type TemplateTierValue = (typeof TEMPLATE_TIER_VALUES)[number];

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  designId: string;

  // Base design display name — maps to LandingPageData.template on the frontend.
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  template: string;

  @IsOptional()
  @IsIn(TEMPLATE_KIND_VALUES)
  kind?: TemplateKindValue;

  @IsOptional()
  @IsIn(TEMPLATE_PAGE_TYPE_VALUES)
  pageType?: TemplatePageTypeValue;

  @IsOptional()
  @IsIn(TEMPLATE_STATUS_VALUES)
  status?: TemplateStatusValue;

  @IsOptional()
  @IsString()
  parentPageId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  thumbnail?: string;

  @IsOptional()
  @IsIn(TEMPLATE_TIER_VALUES)
  tier?: TemplateTierValue;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ValidateNested()
  @Type(() => TemplateContentDto)
  content: TemplateContentDto;
}
