import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { TemplateContentDto } from './template-content.dto';

// Presets don't have server-side factories (those live in the frontend's
// page-templates.ts), so the caller rebuilds the factory-default content and
// sends it here rather than the backend reimplementing the section library.
export class ResetTemplateDto {
  @ValidateNested()
  @Type(() => TemplateContentDto)
  content: TemplateContentDto;
}
