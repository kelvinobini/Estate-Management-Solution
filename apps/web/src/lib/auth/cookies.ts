export interface AuthCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
}

export const ACCESS_TOKEN_COOKIE = "ems_access_token";
export const REFRESH_TOKEN_COOKIE = "ems_refresh_token";
export const MFA_CHALLENGE_COOKIE = "ems_mfa_challenge_token";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const MFA_CHALLENGE_TTL_SECONDS = 5 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

function isSecure(): boolean {
  return process.env.COOKIE_SECURE === "true";
}

function baseOptions(maxAgeSeconds: number): AuthCookieOptions {
  return {
    httpOnly: true,
    secure: isSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function accessTokenCookieOptions(): AuthCookieOptions {
  return baseOptions(ACCESS_TOKEN_TTL_SECONDS);
}

export function refreshTokenCookieOptions(): AuthCookieOptions {
  return baseOptions(REFRESH_TOKEN_TTL_SECONDS);
}

export function mfaChallengeCookieOptions(): AuthCookieOptions {
  return baseOptions(MFA_CHALLENGE_TTL_SECONDS);
}

export function expiredCookieOptions(): AuthCookieOptions {
  return { ...baseOptions(0), maxAge: 0 };
}
