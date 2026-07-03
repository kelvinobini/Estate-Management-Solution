"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { BackendError } from "@/lib/auth/backend";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

async function run(work: () => Promise<unknown>, failureMessage: string): Promise<ActionResult> {
  try {
    await work();
    revalidatePath("/dashboard/gate");
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, message: error instanceof BackendError ? error.message : failureMessage };
  }
}

export async function checkOutGatePassAction(gatePassId: string): Promise<ActionResult> {
  return run(() => api.patch(`/gate-passes/${gatePassId}/check-out`), "Unable to check out");
}

export async function revokeGatePassAction(gatePassId: string): Promise<ActionResult> {
  return run(() => api.patch(`/gate-passes/${gatePassId}/revoke`), "Unable to revoke gate pass");
}
