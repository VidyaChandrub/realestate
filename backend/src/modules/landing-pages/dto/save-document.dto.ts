import { IsObject, IsOptional } from 'class-validator';

// The full Elementor-style builder tree:
// { settings, header, footer, rows }
export class SaveDocumentDto {
  @IsObject()
  document: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  seo?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  tracking?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  domain?: Record<string, unknown>;
}
