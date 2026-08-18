export class Employer {
    id: string;
    userId?: string | null;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    lastLoginAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
