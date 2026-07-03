import "server-only";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "./cookies";
import { decodeAccessToken, isExpired, type AccessTokenClaims } from "./jwt";

export interface Session {
  userId: string;
  organisationId: string;
  role: string;
  permissions: string[];
}

function toSession(claims: AccessTokenClaims): Session {
  return {
    userId: claims.sub,
    organisationId: claims.organisation_id,
    role: claims.role,
    permissions: claims.permissions,
  };
}

/**
 * Reads the current session from the httpOnly access-token cookie for use in
 * Server Components/Actions. Returns null if there is no token or it has
 * expired — callers that require auth should redirect via requireSession().
 * Expiry here only gates what we render; every real API call is
 * re-authorized server-side by the NestJS API regardless.
 */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;

  const claims = decodeAccessToken(token);
  if (!claims || isExpired(claims)) return null;

  return toSession(claims);
}

export function hasPermission(session: Session, permissionCode: string): boolean {
  return session.permissions.includes(permissionCode);
}
