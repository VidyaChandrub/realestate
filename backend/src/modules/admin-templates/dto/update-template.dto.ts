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

const TEMPLATE_STATUS_VALUES = [
  'draft',
  'published',
  'scheduled',
  'password',
  'unpublished',
] as const;
export type TemplateStatusValue = (typeof TEMPLATE_STATUS_VALUES)[number];

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  slug?: string;

  @IsOptional()
  @IsIn(TEMPLATE_STATUS_VALUES)
  status?: TemplateStatusValue;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  thumbnail?: string;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  // Replaced wholesale, not deep-merged — the builder always sends the full tree.
  @IsOptional()
  @ValidateNested()
  @Type(() => TemplateContentDto)
  content?: TemplateContentDto;
}

export { TEMPLATE_STATUS_VALUES };
