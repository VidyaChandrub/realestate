import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import {
  TEMPLATE_KIND_VALUES,
  TEMPLATE_PAGE_TYPE_VALUES,
} from './create-template.dto';
import { TEMPLATE_STATUS_VALUES } from './update-template.dto';

export class ListTemplatesQueryDto {
  @IsOptional()
  @IsIn(TEMPLATE_KIND_VALUES)
  kind?: (typeof TEMPLATE_KIND_VALUES)[number];

  @IsOptional()
  @IsIn(TEMPLATE_STATUS_VALUES)
  status?: (typeof TEMPLATE_STATUS_VALUES)[number];

  @IsOptional()
  @IsIn(TEMPLATE_PAGE_TYPE_VALUES)
  pageType?: (typeof TEMPLATE_PAGE_TYPE_VALUES)[number];

  @IsOptional()
  @IsString()
  search?: string;

  // Omit sections/config from list rows unless explicitly requested.
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeContent?: boolean = false;
}
