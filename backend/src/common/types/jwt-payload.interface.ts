export interface JwtPayload {
  sub: string;
  orgId: string | null;
  roles: string[];
  // Added automatically by JwtService when signing / verifying. Present on
  // every verified request; used by OrgApprovedGuard to reject access tokens
  // issued before the user's `tokenInvalidBefore` stamp.
  iat?: number;
  exp?: number;
}
