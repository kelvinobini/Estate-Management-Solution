import "server-only";
import { BackendError } from "@/lib/auth/backend";

export type SafeResult<T> = { data: T; forbidden: false } | { data: null; forbidden: true };

/** Wraps a Server Component data load, turning a backend 403 into a renderable "forbidden" state instead of a crash. */
export async function fetchOrForbidden<T>(loader: () => Promise<T>): Promise<SafeResult<T>> {
  try {
    return { data: await loader(), forbidden: false };
  } catch (error) {
    if (error instanceof BackendError && error.status === 403) {
      return { data: null, forbidden: true };
    }
    throw error;
  }
}
