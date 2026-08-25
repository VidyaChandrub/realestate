import { Type } from 'class-transformer';
import { IsDefined, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, ValidateIf, ValidateNested } from 'class-validator';
import { TemplateContentDto } from '../../admin-templates/dto/template-content.dto';

export class CreateLandingPageDto {
  // Omitted = create from scratch: sourceTemplateId is null and `content`
  // (built client-side by the same blank-page factories the Super Admin
  // builder uses) must be supplied instead.
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  // Required exactly when templateId is absent — a from-scratch page has no
  // source to copy content from, so the caller must provide the starting
  // { sections, config }. @ValidateNested() alone only validates a present
  // object's shape — it doesn't fail on undefined — so @IsDefined() is what
  // actually enforces presence here.
  @ValidateIf((dto: CreateLandingPageDto) => !dto.templateId)
  @IsDefined()
  @ValidateNested()
  @Type(() => TemplateContentDto)
  content?: TemplateContentDto;
}
