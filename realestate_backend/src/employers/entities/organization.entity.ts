import { VerificationStatus, CompanySize, OrganizationType } from '@prisma/client';

export class Organization {
    id: string;

    // Basic Info
    name: string;
    description: string | null;
    industry: string | null;

    // Branding
    logoUrl: string | null;
    coverImageUrl: string | null;
    galleryImages?: string[] | null;

    // Business Info
    website: string | null;
    foundedYear?: number | null;
    companySize?: CompanySize | null;
    type?: OrganizationType | null;

    // Contact Info
    contactEmail?: string | null;
    contactPhone?: string | null;

    // Location (Headquarters)
    country?: string | null;
    state?: string | null;
    city?: string | null;
    address?: string | null;
    postalCode?: string | null;

    // Employer Branding / Culture
    mission?: string | null;
    vision?: string | null;
    cultureDescription?: string | null;
    benefits?: string[] | null;

    // Platform Related
    verificationStatus: VerificationStatus;
    isFeatured?: boolean;
    featuredUntil?: Date | null;

    subscriptionPlanId?: string | null;

    // Stats
    jobsCount?: number;
    employeesCount?: number;

    // Audit
    createdAt: Date;
    updatedAt: Date;

    isDeleted: boolean;
    deletedAt?: Date | null;
}
