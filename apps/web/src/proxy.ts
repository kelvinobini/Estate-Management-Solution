import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { decodeAccessToken, isExpired } from "@/lib/auth/jwt";

const PUBLIC_PATHS = ["/", "/login", "/mfa"];

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith("/api/auth/") ||
    // The landing page's "Request access" form — unauthenticated by design, see InquiriesController.submit.
    pathname.startsWith("/api/inquiries") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  );
}

/**
 * Gatekeeps every non-public route and transparently rotates an expired
 * access token using the refresh cookie before the request reaches a Server
 * Component — the alternative (letting each page discover a 401 on its own)
 * would bounce a user with a perfectly valid session to the login screen
 * once every 15 minutes. Named `proxy` (not `middleware`) per Next.js 16's
 * renamed convention — see https://nextjs.org/docs/messages/middleware-to-proxy.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (claims && !isExpired(claims)) {
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    return redirectToLogin(request);
  }

  const refreshResponse = await fetch(new URL("/api/auth/refresh", request.url), {
    method: "POST",
    headers: { cookie: request.headers.get("cookie") ?? "" },
  });

  if (!refreshResponse.ok) {
    return redirectToLogin(request);
  }

  const response = NextResponse.next();
  // Multiple Set-Cookie headers must stay separate entries — Headers.get()
  // would incorrectly comma-join them (cookie Expires values contain commas
  // too), so each one is appended individually via getSetCookie().
  for (const cookie of refreshResponse.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
