import { IsArray, IsObject } from 'class-validator';

// Deliberately shallow: `sections`/`config` are the builder's arbitrary,
// frontend-owned JSON tree — validated only at this top level so the actual
// widget/section content passes through untouched (no whitelist-stripping
// of nested keys, since we never attach a stricter nested DTO type to them).
export class TemplateContentDto {
  @IsArray()
  sections: unknown[];

  @IsObject()
  config: Record<string, unknown>;
}
