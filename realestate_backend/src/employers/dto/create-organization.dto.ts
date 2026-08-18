import { IsString, IsNotEmpty, IsOptional, IsUrl, IsEnum, IsNumber, IsEmail, IsArray, IsBoolean, IsDateString } from 'class-validator';
import { OrganizationType, CompanySize } from '@prisma/client';

export class CreateOrganizationDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    industry?: string;

    // Branding
    @IsUrl()
    @IsOptional()
    logoUrl?: string;

    @IsUrl()
    @IsOptional()
    coverImageUrl?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    galleryImages?: string[];

    // Business Info
    @IsUrl()
    @IsOptional()
    website?: string;

    @IsNumber()
    @IsOptional()
    foundedYear?: number;

    @IsEnum(CompanySize)
    @IsOptional()
    companySize?: CompanySize;

    @IsEnum(OrganizationType)
    @IsOptional()
    type?: OrganizationType;

    // Contact Info
    @IsEmail()
    @IsOptional()
    contactEmail?: string;

    @IsString()
    @IsOptional()
    contactPhone?: string;

    // Location
    @IsString()
    @IsOptional()
    country?: string;

    @IsString()
    @IsOptional()
    state?: string;

    @IsString()
    @IsOptional()
    city?: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsString()
    @IsOptional()
    postalCode?: string;

    // Culture
    @IsString()
    @IsOptional()
    mission?: string;

    @IsString()
    @IsOptional()
    vision?: string;

    @IsString()
    @IsOptional()
    cultureDescription?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    benefits?: string[];

    // Platform
    @IsBoolean()
    @IsOptional()
    isFeatured?: boolean;

    @IsDateString()
    @IsOptional()
    featuredUntil?: string;

    @IsString()
    @IsOptional()
    subscriptionPlanId?: string;
}
