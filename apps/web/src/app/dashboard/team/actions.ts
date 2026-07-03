"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { BackendError } from "@/lib/auth/backend";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export async function updateUserStatusAction(userId: string, status: "active" | "suspended"): Promise<ActionResult> {
  try {
    await api.patch(`/users/${userId}/status`, { status });
    revalidatePath("/dashboard/team");
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, message: error instanceof BackendError ? error.message : "Unable to update user status" };
  }
}
