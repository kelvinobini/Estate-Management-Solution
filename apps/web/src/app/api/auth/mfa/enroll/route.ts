import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backendFetch, BackendError } from "@/lib/auth/backend";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";

export async function POST() {
  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  try {
    const result = await backendFetch<{ provisioningUri: string }>("/auth/mfa/enroll", {
      method: "POST",
      bearerToken: accessToken,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BackendError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Unable to reach the server" }, { status: 502 });
  }
}
