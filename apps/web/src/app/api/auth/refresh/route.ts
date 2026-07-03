import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backendFetch, BackendError } from "@/lib/auth/backend";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
  expiredCookieOptions,
} from "@/lib/auth/cookies";

export async function POST() {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  try {
    const result = await backendFetch<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });

    store.set(ACCESS_TOKEN_COOKIE, result.accessToken, accessTokenCookieOptions());
    store.set(REFRESH_TOKEN_COOKIE, result.refreshToken, refreshTokenCookieOptions());
    return NextResponse.json({ status: "refreshed" });
  } catch (error) {
    store.set(ACCESS_TOKEN_COOKIE, "", expiredCookieOptions());
    store.set(REFRESH_TOKEN_COOKIE, "", expiredCookieOptions());
    if (error instanceof BackendError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Unable to reach the server" }, { status: 502 });
  }
}
