import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backendFetch, BackendError } from "@/lib/auth/backend";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  MFA_CHALLENGE_COOKIE,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
  expiredCookieOptions,
} from "@/lib/auth/cookies";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.code) {
    return NextResponse.json({ message: "code is required" }, { status: 400 });
  }

  const store = await cookies();
  const mfaChallengeToken = store.get(MFA_CHALLENGE_COOKIE)?.value;
  if (!mfaChallengeToken) {
    return NextResponse.json({ message: "MFA challenge expired, please log in again" }, { status: 401 });
  }

  try {
    const result = await backendFetch<{ accessToken: string; refreshToken: string }>("/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({ mfaChallengeToken, code: body.code }),
    });

    store.set(ACCESS_TOKEN_COOKIE, result.accessToken, accessTokenCookieOptions());
    store.set(REFRESH_TOKEN_COOKIE, result.refreshToken, refreshTokenCookieOptions());
    store.set(MFA_CHALLENGE_COOKIE, "", expiredCookieOptions());
    return NextResponse.json({ status: "authenticated" });
  } catch (error) {
    if (error instanceof BackendError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Unable to reach the server" }, { status: 502 });
  }
}
