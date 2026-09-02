const ACCESS_TOKEN_KEY = "be.access_token";

export interface DecodedSession {
  sub: string;
  orgId: string | null;
  roles: string[];
}

/** Decodes the ID-payload of the stored backend JWT access token. Returns
 *  null when there's no token or it can't be parsed (e.g. the mock sessions,
 *  which use `mock-access-…` tokens instead of real JWTs). */
export function decodeAccessToken(): DecodedSession | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return null;

  // Real issuer tokens are standard `a.b.c` JWTs; mock tokens are not.
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const payload = parts[1];
  try {
    const json = decodeBase64Url(payload);
    const data = JSON.parse(json) as {
      sub?: string;
      orgId?: string | null;
      roles?: string[];
    };
    if (!data.sub) return null;
    return {
      sub: data.sub,
      orgId: data.orgId ?? null,
      roles: Array.isArray(data.roles) ? data.roles : [],
    };
  } catch {
    return null;
  }
}

/** True when the logged-in org user holds one of the given role keys in the
 *  backend sense (admin / manager / sales). Defaults to false if unknown. */
export function hasRole(...roleKeys: string[]): boolean {
  const session = decodeAccessToken();
  if (!session) return false;
  return roleKeys.some((key) => session.roles.includes(key));
}

/** True for org users who can see the whole lead inbox and assign leads
 *  (i.e. backend `admin`). Non-admins only see their assigned leads. */
export function isOrgAdmin(): boolean {
  return hasRole("admin");
}

function decodeBase64Url(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  if (typeof atob === "function") {
    return atob(padded);
  }
  return Buffer.from(padded, "base64").toString("utf8");
}