import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backendFetch } from "@/lib/auth/backend";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, expiredCookieOptions } from "@/lib/auth/cookies";

export async function POST() {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;

  if (refreshToken) {
    // Best-effort: even if the backend call fails, still clear local cookies
    // so the browser session ends.
    await backendFetch("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }

  store.set(ACCESS_TOKEN_COOKIE, "", expiredCookieOptions());
  store.set(REFRESH_TOKEN_COOKIE, "", expiredCookieOptions());
  return NextResponse.json({ loggedOut: true });
}
