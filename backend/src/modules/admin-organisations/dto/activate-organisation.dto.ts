import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class ActivateOrganisationDto {
  @IsOptional()
  @IsUUID()
  planId?: string;

  @IsOptional()
  @IsEnum(['monthly', 'yearly'] as const)
  billingCycle?: 'monthly' | 'yearly';

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  templateIds?: string[];

  @IsOptional()
  @IsString()
  currency?: string;
}
