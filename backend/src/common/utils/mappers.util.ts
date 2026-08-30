import { Organisation, Prisma, User } from '@prisma/client';

// Strips password_hash and other internal fields before a user ever reaches a response.
export function toSafeUser(user: User) {
  return {
    id: user.id,
    org_id: user.orgId,
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
    phone_number: user.phoneNumber,
    status: user.status,
    must_change_password: user.mustChangePassword,
    created_at: user.createdAt,
  };
}

export function toSafeOrganisation(organisation: Organisation) {
  return {
    id: organisation.id,
    name: organisation.name,
    slug: organisation.slug,
    city: organisation.city,
    status: organisation.status,
    created_at: organisation.createdAt,
    timezone: organisation.timezone,
    currency: organisation.currency,
    default_language: organisation.defaultLanguage,
    logo_url: organisation.logoUrl,
    favicon_url: organisation.faviconUrl,
    brand_colour: organisation.brandColour,
    website: organisation.website,
    address_line1: organisation.addressLine1,
    address_line2: organisation.addressLine2,
    state: organisation.state,
    postal_code: organisation.postalCode,
    country: organisation.country,
    subdomain: organisation.subdomain,
    subdomain_status: organisation.subdomainStatus,
    custom_domain: organisation.customDomain,
    custom_domain_status: organisation.customDomainStatus,
  };
}

const ORGANISATION_EDITABLE_FIELDS = [
  'name',
  'city',
  'timezone',
  'currency',
  'defaultLanguage',
  'logoUrl',
  'faviconUrl',
  'brandColour',
  'website',
  'addressLine1',
  'addressLine2',
  'state',
  'postalCode',
  'country',
] as const;

// Shared by the Super Admin and Org Admin organisation-update paths — both
// accept the same editable-profile-fields DTO shape (slug/status excluded).
// Only copies fields the caller actually sent, so a partial PATCH body
// doesn't clobber the rest with undefined.
export function buildOrganisationUpdateData(
  dto: Partial<Record<(typeof ORGANISATION_EDITABLE_FIELDS)[number], string>>,
): Prisma.OrganisationUpdateInput {
  const data: Prisma.OrganisationUpdateInput = {};
  for (const field of ORGANISATION_EDITABLE_FIELDS) {
    if (dto[field] !== undefined) {
      data[field] = dto[field];
    }
  }
  return data;
}
