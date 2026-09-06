import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestCustomDomainDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(253)
  domain!: string;

  // The org's selected landing page (template) the custom domain should serve.
  // Optional — defaults to the org's primary published page at approval time.
  @IsOptional()
  @IsString()
  landingPageId?: string;
}