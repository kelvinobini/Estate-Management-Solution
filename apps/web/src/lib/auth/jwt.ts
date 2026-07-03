export interface AccessTokenClaims {
  sub: string;
  organisation_id: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
  iss?: string;
}

/**
 * Decodes (does NOT cryptographically verify) the payload of a JWT. Safe here
 * because the token only ever reaches this code by round-tripping through our
 * own httpOnly cookie, having already been verified once by the NestJS API
 * that issued it — this is purely for reading claims to drive UI, not an
 * authorization decision. Every actual request is re-authorized by the API.
 */
export function decodeAccessToken(token: string): AccessTokenClaims | null {
  try {
    const [, payloadSegment] = token.split(".");
    if (!payloadSegment) return null;
    return JSON.parse(base64UrlDecode(payloadSegment)) as AccessTokenClaims;
  } catch {
    return null;
  }
}

/**
 * Uses atob/TextDecoder rather than Node's Buffer so this also works
 * unmodified in middleware.ts, which runs on the Edge runtime.
 */
function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/").padEnd(segment.length + ((4 - (segment.length % 4)) % 4), "=");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

export function isExpired(claims: AccessTokenClaims, skewSeconds = 10): boolean {
  return claims.exp * 1000 <= Date.now() + skewSeconds * 1000;
}
