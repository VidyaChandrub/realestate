export interface JwtPayload {
    sub: string;
    orgId: string | null;
    roles: string[];
}
