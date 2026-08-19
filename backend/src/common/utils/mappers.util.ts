import { Organisation, User } from '@prisma/client';

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
  };
}
