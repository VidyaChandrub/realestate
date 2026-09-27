import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AssignCustomDomainDto {
  @IsString()
  @IsNotEmpty()
  domainRequestId!: string;

  // The landing page to assign the domain to, or null/empty to unassign
  @IsOptional()
  @IsString()
  landingPageId?: string | null;
}
