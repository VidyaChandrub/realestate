import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFormDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  // The FormDefinition JSON — the builder's arbitrary, frontend-owned tree
  // (fields, embed, logic, styling, integrations…). Same principle as
  // CreateTypographySetDto.tokens: no nested whitelisting of editor keys.
  @IsObject()
  content: Record<string, unknown>;
}