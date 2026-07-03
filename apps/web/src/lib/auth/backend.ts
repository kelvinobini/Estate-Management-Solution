export class BackendError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "BackendError";
  }
}

function apiUrl(): string {
  const url = process.env.API_URL;
  if (!url) throw new Error("API_URL environment variable is not set");
  return url;
}

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message: unknown }).message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(", ");
  }
  return fallback;
}

/**
 * Calls the NestJS backend and throws BackendError with the API's own error
 * message on non-2xx responses, so route handlers can relay a meaningful
 * message to the browser without leaking stack traces or internal detail.
 */
export async function backendFetch<T>(
  path: string,
  init: RequestInit & { bearerToken?: string } = {},
): Promise<T> {
  const { bearerToken, headers, ...rest } = init;
  const response = await fetch(`${apiUrl()}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
      ...headers,
    },
    cache: "no-store",
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new BackendError(response.status, extractMessage(body, "Request failed"));
  }

  return body as T;
}
