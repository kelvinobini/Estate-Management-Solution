import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backendFetch, BackendError } from "./backend";
import { ACCESS_TOKEN_COOKIE } from "./cookies";

/**
 * Shared body for narrow, purpose-built Route Handlers that forward a single
 * client-initiated mutation to the backend using the httpOnly access-token
 * cookie. Each caller still declares its own route file (so the app's
 * client-callable surface stays an explicit, reviewable list rather than a
 * generic pass-through), but the auth/error handling boilerplate lives here.
 */
export async function proxyToBackend(path: string, init: RequestInit = {}): Promise<NextResponse> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  try {
    const result = await backendFetch(path, { ...init, bearerToken: accessToken });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BackendError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Unable to reach the server" }, { status: 502 });
  }
}
