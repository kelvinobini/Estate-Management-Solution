import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backendFetch, BackendError } from "@/lib/auth/backend";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  MFA_CHALLENGE_COOKIE,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
  mfaChallengeCookieOptions,
} from "@/lib/auth/cookies";

type LoginResult =
  | { status: "mfa_setup_required"; setupToken: string }
  | { status: "mfa_challenge"; mfaChallengeToken: string }
  | { status: "authenticated"; accessToken: string; refreshToken: string };

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body?.organisationSlug || !body?.email || !body?.password) {
    return NextResponse.json({ message: "organisationSlug, email and password are required" }, { status: 400 });
  }

  try {
    const result = await backendFetch<LoginResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const store = await cookies();

    if (result.status === "authenticated") {
      store.set(ACCESS_TOKEN_COOKIE, result.accessToken, accessTokenCookieOptions());
      store.set(REFRESH_TOKEN_COOKIE, result.refreshToken, refreshTokenCookieOptions());
      return NextResponse.json({ status: "authenticated" });
    }

    if (result.status === "mfa_challenge") {
      store.set(MFA_CHALLENGE_COOKIE, result.mfaChallengeToken, mfaChallengeCookieOptions());
      return NextResponse.json({ status: "mfa_challenge" });
    }

    // mfa_setup_required: the setup token is itself a scoped access token
    // (empty permissions) that only the mfa/enroll and mfa/confirm endpoints
    // will accept — see AuthController for the corresponding guard comment.
    store.set(ACCESS_TOKEN_COOKIE, result.setupToken, accessTokenCookieOptions());
    return NextResponse.json({ status: "mfa_setup_required" });
  } catch (error) {
    if (error instanceof BackendError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Unable to reach the server" }, { status: 502 });
  }
}
