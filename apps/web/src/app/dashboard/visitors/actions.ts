"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { BackendError } from "@/lib/auth/backend";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

function revalidateVisitor(visitorId: string) {
  revalidatePath(`/dashboard/visitors/${visitorId}`);
  revalidatePath("/dashboard/visitors");
}

export async function blacklistVisitorAction(visitorId: string, reason: string): Promise<ActionResult> {
  try {
    await api.patch(`/visitors/${visitorId}/blacklist`, { reason });
    revalidateVisitor(visitorId);
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, message: error instanceof BackendError ? error.message : "Unable to blacklist visitor" };
  }
}

export async function unblacklistVisitorAction(visitorId: string): Promise<ActionResult> {
  try {
    await api.patch(`/visitors/${visitorId}/unblacklist`);
    revalidateVisitor(visitorId);
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, message: error instanceof BackendError ? error.message : "Unable to remove from blacklist" };
  }
}
