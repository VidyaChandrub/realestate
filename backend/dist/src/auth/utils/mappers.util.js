"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSafeUser = toSafeUser;
exports.toSafeOrganisation = toSafeOrganisation;
function toSafeUser(user) {
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
function toSafeOrganisation(organisation) {
    return {
        id: organisation.id,
        name: organisation.name,
        slug: organisation.slug,
        status: organisation.status,
        created_at: organisation.createdAt,
    };
}
//# sourceMappingURL=mappers.util.js.map