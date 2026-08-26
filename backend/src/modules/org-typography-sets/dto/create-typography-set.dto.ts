import { IsNotEmpty, IsObject, IsString, MaxLength } from 'class-validator';

export class CreateTypographySetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  // Deliberately shallow: the design-system token payload (TemplateTypography)
  // is the builder's arbitrary, frontend-owned JSON tree — same principle as
  // TemplateContentDto.config, no nested DTO whitelisting the h1..p keys.
  @IsObject()
  tokens: Record<string, unknown>;
}
