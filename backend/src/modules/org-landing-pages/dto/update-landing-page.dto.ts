import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { TemplateContentDto } from '../../admin-templates/dto/template-content.dto';

export class UpdateLandingPageDto {
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
  @IsString()
  @MaxLength(200)
  thumbnail?: string;

  // Replaced wholesale, not deep-merged — the builder always sends the full tree.
  @IsOptional()
  @ValidateNested()
  @Type(() => TemplateContentDto)
  content?: TemplateContentDto;
}
