import { getStoredTokens, storeTokens, clearTokens } from "../auth/token-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message: unknown }).message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(", ");
  }
  return fallback;
}

async function rawFetch(
  path: string,
  init: RequestInit & { bearerToken?: string } = {},
): Promise<{ response: Response; body: unknown }> {
  const { bearerToken, headers, ...rest } = init;
  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
      ...headers,
    },
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json().catch(() => null) : null;
  return { response, body };
}

/**
 * Set once by AuthProvider at startup, so any 401-after-failed-refresh
 * anywhere in the app can force a sign-out and return to the login screen —
 * there's no BFF here to do this server-side the way the web app's
 * proxy.ts does, so it has to live in the client.
 */
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

let refreshPromise: Promise<string | null> | null = null;

/** Rotates the stored refresh token for a new access+refresh pair, deduping concurrent callers onto one in-flight request. */
async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const tokens = await getStoredTokens();
    if (!tokens) return null;

    const { response, body } = await rawFetch("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });

    if (!response.ok) {
      await clearTokens();
      return null;
    }

    const { accessToken, refreshToken } = body as { accessToken: string; refreshToken: string };
    await storeTokens({ accessToken, refreshToken });
    return accessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

/**
 * Called once at app startup: if a refresh token is stored, proactively
 * rotates it to confirm the session is still valid (rather than waiting for
 * some arbitrary first request to 401). Returns whether the app should land
 * on an authenticated screen.
 */
export async function validateStoredSession(): Promise<boolean> {
  const tokens = await getStoredTokens();
  if (!tokens) return false;
  const accessToken = await refreshAccessToken();
  return accessToken !== null;
}

/**
 * Authenticated fetch for the gate/visitor app: attaches the stored access
 * token, and on a 401 transparently refreshes once and retries — mirrors
 * the silent-rotation the web app's proxy.ts does server-side, except here
 * it happens client-side since there's no BFF in front of a mobile app.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tokens = await getStoredTokens();
  let { response, body } = await rawFetch(path, { ...init, bearerToken: tokens?.accessToken ?? undefined });

  if (response.status === 401 && tokens) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      ({ response, body } = await rawFetch(path, { ...init, bearerToken: newAccessToken }));
    } else {
      onSessionExpired?.();
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, extractMessage(body, "Request failed"));
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined }),
};
