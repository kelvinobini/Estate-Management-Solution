import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { BackendError } from "@/lib/auth/backend";

function apiUrl(): string {
  const url = process.env.API_URL;
  if (!url) throw new Error("API_URL environment variable is not set");
  return url;
}

/**
 * Authenticated fetch for Server Components and Server Actions. Assumes
 * middleware.ts has already ensured the access-token cookie is fresh for
 * this request — if the API still rejects it as unauthorized (e.g. the
 * account was deactivated mid-session), it sends the user back to /login
 * rather than rendering a broken page.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    redirect("/login");
  }

  const response = await fetch(`${apiUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    redirect("/login");
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? Array.isArray(body.message)
          ? body.message.join(", ")
          : String(body.message)
        : "Request failed";
    throw new BackendError(response.status, message);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
