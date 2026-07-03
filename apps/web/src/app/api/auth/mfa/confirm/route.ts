import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backendFetch, BackendError } from "@/lib/auth/backend";
import { ACCESS_TOKEN_COOKIE, expiredCookieOptions } from "@/lib/auth/cookies";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.code) {
    return NextResponse.json({ message: "code is required" }, { status: 400 });
  }

  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  try {
    await backendFetch<{ mfaEnabled: true }>("/auth/mfa/confirm", {
      method: "POST",
      bearerToken: accessToken,
      body: JSON.stringify({ code: body.code }),
    });

    // The setup-scoped access token carries no permissions and no refresh
    // token was ever issued for it; clear it so the user re-authenticates
    // through the normal login flow and gets a real session.
    store.set(ACCESS_TOKEN_COOKIE, "", expiredCookieOptions());
    return NextResponse.json({ mfaEnabled: true });
  } catch (error) {
    if (error instanceof BackendError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Unable to reach the server" }, { status: 502 });
  }
}
