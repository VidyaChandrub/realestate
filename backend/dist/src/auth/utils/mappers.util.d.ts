import { Organisation, User } from '@prisma/client';
export declare function toSafeUser(user: User): {
    id: string;
    org_id: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone_number: string | null;
    status: import("@prisma/client").$Enums.UserStatus;
    must_change_password: boolean;
    created_at: Date;
};
export declare function toSafeOrganisation(organisation: Organisation): {
    id: string;
    name: string;
    slug: string;
    status: import("@prisma/client").$Enums.OrgStatus;
    created_at: Date;
};
